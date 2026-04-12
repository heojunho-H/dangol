import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { join, extname } from "path";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? process.env.UPLOAD_DIR
  : join(import.meta.dirname, "../../uploads");
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const filesRouter = Router({ mergeParams: true });
filesRouter.use(authMiddleware);

// Upload file to a deal
filesRouter.post(
  "/",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dealId = Array.isArray(req.params.dealId)
        ? req.params.dealId[0]
        : req.params.dealId;

      if (!req.file) {
        res.status(400).json({ error: "파일이 필요합니다" });
        return;
      }

      // Verify deal belongs to workspace
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, workspaceId: req.workspaceId },
      });
      if (!deal) {
        res.status(404).json({ error: "딜을 찾을 수 없습니다" });
        return;
      }

      const fileType = (req.body.type as string) || "기타";

      const attached = await prisma.attachedFile.create({
        data: {
          workspaceId: req.workspaceId,
          dealId,
          name: req.file.originalname,
          type: fileType,
          size: req.file.size,
          storagePath: req.file.filename,
          mimeType: req.file.mimetype,
        },
      });

      // Auto-create activity log
      await prisma.activityLog.create({
        data: {
          workspaceId: req.workspaceId,
          dealId,
          type: "file",
          title: `파일 업로드: ${req.file.originalname}`,
          userId: req.userId,
        },
      });

      res.status(201).json(attached);
    } catch (err) {
      next(err);
    }
  }
);

// Download file
export const fileDownloadRouter = Router();
fileDownloadRouter.use(authMiddleware);

fileDownloadRouter.get(
  "/:id/download",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const file = await prisma.attachedFile.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!file) {
        res.status(404).json({ error: "파일을 찾을 수 없습니다" });
        return;
      }

      const filePath = join(UPLOAD_DIR, file.storagePath);
      if (!existsSync(filePath)) {
        res.status(404).json({ error: "파일이 서버에 존재하지 않습니다" });
        return;
      }

      res.download(filePath, file.name);
    } catch (err) {
      next(err);
    }
  }
);

// Delete file
fileDownloadRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const file = await prisma.attachedFile.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!file) {
        res.status(404).json({ error: "파일을 찾을 수 없습니다" });
        return;
      }

      // Delete physical file
      const filePath = join(UPLOAD_DIR, file.storagePath);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }

      await prisma.attachedFile.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
