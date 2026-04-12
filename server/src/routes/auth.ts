import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  getRefreshTokenExpiry,
} from "../lib/auth.js";
import { authMiddleware } from "../middleware/auth.js";
import { seedWorkspace } from "../services/workspace-seed.js";

export const authRouter = Router();

// ─── Register ───
authRouter.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, name, workspaceName } = req.body;

      if (!email || !password || !name || !workspaceName) {
        res
          .status(400)
          .json({ error: "email, password, name, workspaceName은 필수입니다" });
        return;
      }

      // Check email uniqueness
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: "이미 사용 중인 이메일입니다" });
        return;
      }

      const passwordHash = await hashPassword(password);

      // Create workspace + user in transaction
      const slug =
        workspaceName
          .toLowerCase()
          .replace(/[^a-z0-9가-힣]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 50) +
        "-" +
        randomUUID().slice(0, 6);

      const workspace = await prisma.workspace.create({
        data: { name: workspaceName, slug },
      });

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: "OWNER",
          workspaceId: workspace.id,
        },
      });

      // Seed default data
      await seedWorkspace(workspace.id);

      // Generate tokens
      const accessToken = signAccessToken({
        userId: user.id,
        workspaceId: workspace.id,
        role: user.role,
      });

      const refreshToken = randomUUID();
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: getRefreshTokenExpiry(),
        },
      });

      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Login ───
authRouter.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "email과 password는 필수입니다" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { workspace: true },
      });

      if (!user) {
        res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" });
        return;
      }

      const accessToken = signAccessToken({
        userId: user.id,
        workspaceId: user.workspaceId,
        role: user.role,
      });

      const refreshToken = randomUUID();
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: getRefreshTokenExpiry(),
        },
      });

      res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        workspace: {
          id: user.workspace.id,
          name: user.workspace.name,
          slug: user.workspace.slug,
        },
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Refresh ───
authRouter.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: "refreshToken은 필수입니다" });
        return;
      }

      const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!stored || stored.expiresAt < new Date()) {
        if (stored) {
          await prisma.refreshToken.delete({ where: { id: stored.id } });
        }
        res.status(401).json({ error: "유효하지 않거나 만료된 리프레시 토큰입니다" });
        return;
      }

      // Rotate: delete old, create new
      await prisma.refreshToken.delete({ where: { id: stored.id } });

      const accessToken = signAccessToken({
        userId: stored.user.id,
        workspaceId: stored.user.workspaceId,
        role: stored.user.role,
      });

      const newRefreshToken = randomUUID();
      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: stored.user.id,
          expiresAt: getRefreshTokenExpiry(),
        },
      });

      res.json({ accessToken, refreshToken: newRefreshToken });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Logout ───
authRouter.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await prisma.refreshToken
          .delete({ where: { token: refreshToken } })
          .catch(() => {}); // ignore if not found
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Me (protected) ───
authRouter.get(
  "/me",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { workspace: true },
      });

      if (!user) {
        res.status(404).json({ error: "사용자를 찾을 수 없습니다" });
        return;
      }

      res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        workspace: {
          id: user.workspace.id,
          name: user.workspace.name,
          slug: user.workspace.slug,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
