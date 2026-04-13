import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const widgetConfigRouter = Router();
widgetConfigRouter.use(authMiddleware);

// Get widget config
function resolveScope(raw: unknown): string {
  return raw === "customer" ? "customer" : "sales";
}

widgetConfigRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scope = resolveScope(req.query.scope);
      const config = await prisma.widgetConfig.findUnique({
        where: { workspaceId_scope: { workspaceId: req.workspaceId, scope } },
      });

      res.json(
        config || {
          scope,
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
      const scope = resolveScope(req.body.scope ?? req.query.scope);

      const config = await prisma.widgetConfig.upsert({
        where: { workspaceId_scope: { workspaceId: req.workspaceId, scope } },
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
          scope,
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
