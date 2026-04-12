import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const widgetConfigRouter = Router();
widgetConfigRouter.use(authMiddleware);

// Get widget config
widgetConfigRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await prisma.widgetConfig.findUnique({
        where: { workspaceId: req.workspaceId },
      });

      res.json(
        config || {
          widgetOrder: "[]",
          widgetSizes: "{}",
        }
      );
    } catch (err) {
      next(err);
    }
  }
);

// Upsert widget config
widgetConfigRouter.put(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { widgetOrder, widgetSizes } = req.body;

      const config = await prisma.widgetConfig.upsert({
        where: { workspaceId: req.workspaceId },
        update: {
          ...(widgetOrder !== undefined && {
            widgetOrder: JSON.stringify(widgetOrder),
          }),
          ...(widgetSizes !== undefined && {
            widgetSizes: JSON.stringify(widgetSizes),
          }),
        },
        create: {
          workspaceId: req.workspaceId,
          widgetOrder: widgetOrder ? JSON.stringify(widgetOrder) : "[]",
          widgetSizes: widgetSizes ? JSON.stringify(widgetSizes) : "{}",
        },
      });

      res.json(config);
    } catch (err) {
      next(err);
    }
  }
);
