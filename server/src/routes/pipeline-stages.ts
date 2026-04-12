import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const pipelineStagesRouter = Router();
pipelineStagesRouter.use(authMiddleware);

// List all stages (sorted)
pipelineStagesRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stages = await prisma.pipelineStage.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "asc" },
      });
      res.json(stages);
    } catch (err) {
      next(err);
    }
  }
);

// Create stage
pipelineStagesRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, color, type } = req.body;
      if (!name) {
        res.status(400).json({ error: "name은 필수입니다" });
        return;
      }

      // Set sortOrder to max + 1
      const maxStage = await prisma.pipelineStage.findFirst({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "desc" },
      });
      const sortOrder = (maxStage?.sortOrder ?? -1) + 1;

      const stage = await prisma.pipelineStage.create({
        data: {
          workspaceId: req.workspaceId,
          name,
          color: color || "#3B82F6",
          type: type || "ACTIVE",
          sortOrder,
        },
      });

      res.status(201).json(stage);
    } catch (err) {
      next(err);
    }
  }
);

// Update stage
pipelineStagesRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await prisma.pipelineStage.findFirst({
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

      const stage = await prisma.pipelineStage.update({ where: { id }, data });
      res.json(stage);
    } catch (err) {
      next(err);
    }
  }
);

// Delete stage (requires ?migrateTo= to reassign deals)
pipelineStagesRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const migrateTo = (req.query.migrateTo as string) || "";

      const existing = await prisma.pipelineStage.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!existing) {
        res.status(404).json({ error: "스테이지를 찾을 수 없습니다" });
        return;
      }

      // Check if there are deals in this stage
      const dealCount = await prisma.deal.count({ where: { stageId: id } });

      if (dealCount > 0) {
        if (!migrateTo) {
          res.status(400).json({
            error: `이 스테이지에 ${dealCount}개의 딜이 있습니다. migrateTo 파라미터로 이관할 스테이지를 지정하세요.`,
          });
          return;
        }

        // Verify target stage
        const target = await prisma.pipelineStage.findFirst({
          where: { id: migrateTo, workspaceId: req.workspaceId },
        });
        if (!target) {
          res.status(400).json({ error: "이관 대상 스테이지를 찾을 수 없습니다" });
          return;
        }

        await prisma.deal.updateMany({
          where: { stageId: id },
          data: { stageId: migrateTo },
        });
      }

      await prisma.pipelineStage.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// Reorder stages
pipelineStagesRouter.put(
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
          prisma.pipelineStage.updateMany({
            where: { id, workspaceId: req.workspaceId },
            data: { sortOrder: idx },
          })
        )
      );

      const stages = await prisma.pipelineStage.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { sortOrder: "asc" },
      });

      res.json(stages);
    } catch (err) {
      next(err);
    }
  }
);
