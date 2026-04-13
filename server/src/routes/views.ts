import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const viewsRouter = Router();
viewsRouter.use(authMiddleware);

// List all views
function normalizeScope(raw: unknown): string | undefined {
  if (raw === "customer") return "customer";
  if (raw === "sales") return "sales";
  return undefined;
}

viewsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scope = normalizeScope(req.query.scope);
    const views = await prisma.savedView.findMany({
      where: { workspaceId: req.workspaceId, ...(scope && { scope }) },
      orderBy: { createdAt: "asc" },
    });
    res.json(views);
  } catch (err) {
    next(err);
  }
});

// Create view
viewsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, viewType, filters, sorts, groupBy, searchQuery } = req.body;
    const scope = normalizeScope(req.body.scope) ?? "sales";
    if (!name || !viewType) {
      res.status(400).json({ error: "name과 viewType은 필수입니다" });
      return;
    }

    const view = await prisma.savedView.create({
      data: {
        workspaceId: req.workspaceId,
        scope,
        name,
        viewType,
        filters: filters ? JSON.stringify(filters) : "[]",
        sorts: sorts ? JSON.stringify(sorts) : "[]",
        groupBy: groupBy || "",
        searchQuery: searchQuery || "",
      },
    });

    res.status(201).json(view);
  } catch (err) {
    next(err);
  }
});

// Update view
viewsRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.savedView.findFirst({
      where: { id, workspaceId: req.workspaceId },
    });

    if (!existing) {
      res.status(404).json({ error: "뷰를 찾을 수 없습니다" });
      return;
    }

    const data: Record<string, unknown> = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.viewType !== undefined) data.viewType = req.body.viewType;
    if (req.body.filters !== undefined) data.filters = JSON.stringify(req.body.filters);
    if (req.body.sorts !== undefined) data.sorts = JSON.stringify(req.body.sorts);
    if (req.body.groupBy !== undefined) data.groupBy = req.body.groupBy;
    if (req.body.searchQuery !== undefined) data.searchQuery = req.body.searchQuery;

    const view = await prisma.savedView.update({ where: { id }, data });
    res.json(view);
  } catch (err) {
    next(err);
  }
});

// Delete view
viewsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.savedView.findFirst({
      where: { id, workspaceId: req.workspaceId },
    });

    if (!existing) {
      res.status(404).json({ error: "뷰를 찾을 수 없습니다" });
      return;
    }

    await prisma.savedView.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
