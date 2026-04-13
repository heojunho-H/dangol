import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const customerCustomFieldsRouter = Router();
customerCustomFieldsRouter.use(authMiddleware);

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

customerCustomFieldsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fields = await prisma.customerCustomField.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "asc" },
      });
      res.json(fields);
    } catch (err) {
      next(err);
    }
  }
);

customerCustomFieldsRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { key, label, type, required, locked, options, visible } = req.body;
      if (!key || !label || !type) {
        res.status(400).json({ error: "key, label, type는 필수입니다" });
        return;
      }
      const max = await prisma.customerCustomField.findFirst({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "desc" },
      });
      const field = await prisma.customerCustomField.create({
        data: {
          workspaceId: req.workspaceId,
          key,
          label,
          type,
          required: !!required,
          locked: !!locked,
          options: options ? JSON.stringify(options) : "[]",
          visible: visible !== false,
          sortOrder: (max?.sortOrder ?? -1) + 1,
        },
      });
      res.status(201).json(field);
    } catch (err) {
      next(err);
    }
  }
);

customerCustomFieldsRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req);
      const existing = await prisma.customerCustomField.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });
      if (!existing) {
        res.status(404).json({ error: "필드를 찾을 수 없습니다" });
        return;
      }
      const data: Record<string, unknown> = {};
      const simple = ["label", "type", "required", "visible"];
      for (const f of simple) if (req.body[f] !== undefined) data[f] = req.body[f];
      if (req.body.options !== undefined) data.options = JSON.stringify(req.body.options);
      const field = await prisma.customerCustomField.update({ where: { id }, data });
      res.json(field);
    } catch (err) {
      next(err);
    }
  }
);

customerCustomFieldsRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req);
      const existing = await prisma.customerCustomField.findFirst({
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
      await prisma.customerCustomField.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

customerCustomFieldsRouter.put(
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
          prisma.customerCustomField.updateMany({
            where: { id, workspaceId: req.workspaceId },
            data: { sortOrder: idx },
          })
        )
      );
      const fields = await prisma.customerCustomField.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "asc" },
      });
      res.json(fields);
    } catch (err) {
      next(err);
    }
  }
);
