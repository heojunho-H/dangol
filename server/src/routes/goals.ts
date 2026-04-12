import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const goalsRouter = Router();
goalsRouter.use(authMiddleware);

// List goals
goalsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await prisma.goalDef.findMany({
      where: { workspaceId: req.workspaceId },
      orderBy: { createdAt: "asc" },
    });
    res.json(goals);
  } catch (err) {
    next(err);
  }
});

// Create goal
goalsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, targetAmount, period } = req.body;
    if (!name || targetAmount === undefined || !period) {
      res.status(400).json({ error: "name, targetAmount, period는 필수입니다" });
      return;
    }

    const goal = await prisma.goalDef.create({
      data: {
        workspaceId: req.workspaceId,
        name,
        targetAmount: Number(targetAmount),
        period,
      },
    });

    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

// Delete goal
goalsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.goalDef.findFirst({
      where: { id, workspaceId: req.workspaceId },
    });

    if (!existing) {
      res.status(404).json({ error: "목표를 찾을 수 없습니다" });
      return;
    }

    await prisma.goalDef.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
