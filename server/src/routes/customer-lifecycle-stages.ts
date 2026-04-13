import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const customerLifecycleStagesRouter = Router();
customerLifecycleStagesRouter.use(authMiddleware);

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

customerLifecycleStagesRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stages = await prisma.customerLifecycleStage.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "asc" },
      });
      res.json(stages);
    } catch (err) {
      next(err);
    }
  }
);

customerLifecycleStagesRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, color, type } = req.body;
      if (!name) {
        res.status(400).json({ error: "name은 필수입니다" });
        return;
      }
      const max = await prisma.customerLifecycleStage.findFirst({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "desc" },
      });
      const stage = await prisma.customerLifecycleStage.create({
        data: {
          workspaceId: req.workspaceId,
          name,
          color: color || "#3B82F6",
          type: type || "ACTIVE",
          sortOrder: (max?.sortOrder ?? -1) + 1,
        },
      });
      res.status(201).json(stage);
    } catch (err) {
      next(err);
    }
  }
);

customerLifecycleStagesRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req);
      const existing = await prisma.customerLifecycleStage.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });
      if (!existing) {
        res.status(404).json({ error: "스테이지를 찾을 수 없습니다" });
        return;
      }
      const data: Record<string, unknown> = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.color !== undefined) data.color = req.body.color;
      if (req.body.type !== undefined) data.type = req.body.type;
      const stage = await prisma.customerLifecycleStage.update({ where: { id }, data });
      res.json(stage);
    } catch (err) {
      next(err);
    }
  }
);

customerLifecycleStagesRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req);
      const migrateTo = (req.query.migrateTo as string) || "";
      const existing = await prisma.customerLifecycleStage.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });
      if (!existing) {
        res.status(404).json({ error: "스테이지를 찾을 수 없습니다" });
        return;
      }
      const count = await prisma.customer.count({ where: { lifecycleStageId: id } });
      if (count > 0) {
        if (!migrateTo) {
          res.status(400).json({
            error: `이 스테이지에 ${count}명의 고객이 있습니다. migrateTo 파라미터로 이관할 스테이지를 지정하세요.`,
          });
          return;
        }
        const target = await prisma.customerLifecycleStage.findFirst({
          where: { id: migrateTo, workspaceId: req.workspaceId },
        });
        if (!target) {
          res.status(400).json({ error: "이관 대상 스테이지를 찾을 수 없습니다" });
          return;
        }
        await prisma.customer.updateMany({
          where: { lifecycleStageId: id },
          data: { lifecycleStageId: migrateTo },
        });
      }
      await prisma.customerLifecycleStage.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

customerLifecycleStagesRouter.put(
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
          prisma.customerLifecycleStage.updateMany({
            where: { id, workspaceId: req.workspaceId },
            data: { sortOrder: idx },
          })
        )
      );
      const stages = await prisma.customerLifecycleStage.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "asc" },
      });
      res.json(stages);
    } catch (err) {
      next(err);
    }
  }
);
