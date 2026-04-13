import { Router, Request, Response, NextFunction } from "express";
import { mapColumns } from "../services/column-mapping.js";
import { recommendDashboard } from "../services/dashboard-recommendation.js";

export const aiRouter = Router();

aiRouter.post(
  "/column-mapping",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { excelColumns, targetFields } = req.body;

      if (!Array.isArray(excelColumns) || !Array.isArray(targetFields)) {
        res
          .status(400)
          .json({ error: "excelColumns와 targetFields는 배열이어야 합니다" });
        return;
      }

      console.log(
        `[column-mapping] ${excelColumns.length} columns → ${targetFields.length} fields`
      );

      const result = await mapColumns({ excelColumns, targetFields });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

aiRouter.post(
  "/dashboard-recommendation",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { deals, availableWidgets } = req.body;

      if (!Array.isArray(deals) || !Array.isArray(availableWidgets)) {
        res
          .status(400)
          .json({ error: "deals와 availableWidgets는 배열이어야 합니다" });
        return;
      }

      console.log(
        `[dashboard-rec] ${deals.length} deals, ${availableWidgets.length} widgets`
      );

      const result = await recommendDashboard({ deals, availableWidgets });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
