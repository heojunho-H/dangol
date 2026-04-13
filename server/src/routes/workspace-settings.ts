import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const workspaceSettingsRouter = Router();
workspaceSettingsRouter.use(authMiddleware);

async function getOrCreate(workspaceId: string) {
  const existing = await prisma.workspaceSettings.findUnique({ where: { workspaceId } });
  if (existing) return existing;
  return prisma.workspaceSettings.create({
    data: { workspaceId, autoConvertWonToCustomer: true },
  });
}

workspaceSettingsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await getOrCreate(req.workspaceId);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);

workspaceSettingsRouter.patch(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getOrCreate(req.workspaceId);
      const data: Record<string, unknown> = {};
      if (req.body.autoConvertWonToCustomer !== undefined) {
        data.autoConvertWonToCustomer = !!req.body.autoConvertWonToCustomer;
      }
      const settings = await prisma.workspaceSettings.update({
        where: { workspaceId: req.workspaceId },
        data,
      });
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);
