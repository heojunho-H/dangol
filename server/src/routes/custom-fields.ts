import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const customFieldsRouter = Router();
customFieldsRouter.use(authMiddleware);

// List all fields (sorted)
customFieldsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fields = await prisma.customField.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "asc" },
      });
      res.json(fields);
    } catch (err) {
      next(err);
    }
  }
);

// Create field
customFieldsRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key, label, type, required, options } = req.body;
      if (!key || !label || !type) {
        res.status(400).json({ error: "key, label, type은 필수입니다" });
        return;
      }

      // Check key uniqueness within workspace
      const existing = await prisma.customField.findUnique({
        where: { workspaceId_key: { workspaceId: req.workspaceId, key } },
      });
      if (existing) {
        res.status(409).json({ error: `key "${key}"가 이미 존재합니다` });
        return;
      }

      const maxField = await prisma.customField.findFirst({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "desc" },
      });
      const sortOrder = (maxField?.sortOrder ?? -1) + 1;

      const field = await prisma.customField.create({
        data: {
          workspaceId: req.workspaceId,
          key,
          label,
          type,
          required: required || false,
          locked: false,
          options: options ? JSON.stringify(options) : "[]",
          visible: true,
          sortOrder,
        },
      });

      res.status(201).json(field);
    } catch (err) {
      next(err);
    }
  }
);

// Update field
customFieldsRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await prisma.customField.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!existing) {
        res.status(404).json({ error: "필드를 찾을 수 없습니다" });
        return;
      }

      const data: Record<string, unknown> = {};
      if (req.body.label !== undefined) data.label = req.body.label;
      if (req.body.required !== undefined) data.required = req.body.required;
      if (req.body.visible !== undefined) data.visible = req.body.visible;
      if (req.body.options !== undefined) {
        data.options = JSON.stringify(req.body.options);
      }

      const field = await prisma.customField.update({ where: { id }, data });
      res.json(field);
    } catch (err) {
      next(err);
    }
  }
);

// Delete field (locked fields cannot be deleted)
customFieldsRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await prisma.customField.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!existing) {
        res.status(404).json({ error: "필드를 찾을 수 없습니다" });
        return;
      }

      if (existing.locked) {
        res.status(400).json({ error: "잠긴 필드는 삭제할 수 없습니다" });
        return;
      }

      await prisma.customField.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// Reorder fields
customFieldsRouter.put(
  "/reorder",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { order } = req.body as { order: string[] };
      if (!order?.length) {
        res.status(400).json({ error: "order 배열은 필수입니다" });
        return;
      }

      await Promise.all(
        order.map((id, idx) =>
          prisma.customField.updateMany({
            where: { id, workspaceId: req.workspaceId },
            data: { sortOrder: idx },
          })
        )
      );

      const fields = await prisma.customField.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "asc" },
      });

      res.json(fields);
    } catch (err) {
      next(err);
    }
  }
);
