import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const customKpisRouter = Router();
customKpisRouter.use(authMiddleware);

// List custom KPIs
customKpisRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const kpis = await prisma.customKpiDef.findMany({
        where: { workspaceId: req.workspaceId },
        orderBy: { createdAt: "asc" },
      });
      res.json(kpis);
    } catch (err) {
      next(err);
    }
  }
);

// Create custom KPI
customKpisRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, formula, numerator, denominator, suffix } = req.body;
      if (!name || !formula) {
        res.status(400).json({ error: "name과 formula는 필수입니다" });
        return;
      }

      const kpi = await prisma.customKpiDef.create({
        data: {
          workspaceId: req.workspaceId,
          name,
          formula,
          numerator: numerator || null,
          denominator: denominator || null,
          suffix: suffix || "%",
        },
      });

      res.status(201).json(kpi);
    } catch (err) {
      next(err);
    }
  }
);

// Delete custom KPI
customKpisRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await prisma.customKpiDef.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!existing) {
        res.status(404).json({ error: "KPI를 찾을 수 없습니다" });
        return;
      }

      await prisma.customKpiDef.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
