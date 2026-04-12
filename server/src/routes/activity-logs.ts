import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const activityLogsRouter = Router({ mergeParams: true });
activityLogsRouter.use(authMiddleware);

// List activity logs for a deal
activityLogsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dealId = Array.isArray(req.params.dealId)
        ? req.params.dealId[0]
        : req.params.dealId;

      const logs = await prisma.activityLog.findMany({
        where: { dealId, workspaceId: req.workspaceId },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      });

      res.json(logs);
    } catch (err) {
      next(err);
    }
  }
);

// Create activity log for a deal
activityLogsRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dealId = Array.isArray(req.params.dealId)
        ? req.params.dealId[0]
        : req.params.dealId;

      const { type, title, detail } = req.body;
      if (!type || !title) {
        res.status(400).json({ error: "type과 title은 필수입니다" });
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

      const log = await prisma.activityLog.create({
        data: {
          workspaceId: req.workspaceId,
          dealId,
          type,
          title,
          detail: detail || "",
          userId: req.userId,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      res.status(201).json(log);
    } catch (err) {
      next(err);
    }
  }
);
