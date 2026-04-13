import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const customersRouter = Router();
customersRouter.use(authMiddleware);

// List customers
customersRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as Record<string, string | undefined>;
      const where: Record<string, unknown> = { workspaceId: req.workspaceId };

      if (query.search) {
        where.OR = [
          { name: { contains: query.search } },
          { company: { contains: query.search } },
          { email: { contains: query.search } },
        ];
      }

      if (query.status) where.status = query.status;
      if (query.lifecycleStageId) where.lifecycleStageId = query.lifecycleStageId;

      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
      const skip = (page - 1) * limit;

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            lifecycleStage: { select: { id: true, name: true, color: true, type: true } },
          },
        }),
        prisma.customer.count({ where }),
      ]);

      res.json({
        customers,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Stats (dashboard aggregates)
customersRouter.get(
  "/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wId = req.workspaceId;
      const [total, byStage, totalRevenue, returningCount] = await Promise.all([
        prisma.customer.count({ where: { workspaceId: wId } }),
        prisma.customer.groupBy({
          by: ["lifecycleStageId"],
          where: { workspaceId: wId },
          _count: { id: true },
        }),
        prisma.customer.aggregate({
          where: { workspaceId: wId },
          _sum: { totalRevenue: true },
        }),
        prisma.customer.count({
          where: { workspaceId: wId, purchaseCount: { gt: 1 } },
        }),
      ]);
      const stages = await prisma.customerLifecycleStage.findMany({
        where: { workspaceId: wId },
        orderBy: { sortOrder: "asc" },
      });
      const stageMap = new Map(stages.map((s) => [s.id, s]));
      res.json({
        totalCustomers: total,
        totalRevenue: totalRevenue._sum.totalRevenue || 0,
        returningCount,
        returningRate: total > 0 ? Math.round((returningCount / total) * 1000) / 10 : 0,
        byStage: byStage.map((s) => ({
          stageId: s.lifecycleStageId,
          stage: s.lifecycleStageId ? stageMap.get(s.lifecycleStageId) : null,
          count: s._count.id,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get single customer (with contracts, source deals, activity timeline)
customersRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const customer = await prisma.customer.findFirst({
        where: { id, workspaceId: req.workspaceId },
        include: {
          lifecycleStage: { select: { id: true, name: true, color: true, type: true } },
          contracts: { orderBy: { startDate: "desc" } },
          sourceDeals: {
            orderBy: { date: "desc" },
            include: {
              stage: { select: { id: true, name: true, color: true, type: true } },
            },
          },
        },
      });

      if (!customer) {
        res.status(404).json({ error: "고객을 찾을 수 없습니다" });
        return;
      }

      // Aggregate activity logs from all linked deals
      const dealIds = customer.sourceDeals.map((d) => d.id);
      const activityLogs = dealIds.length
        ? await prisma.activityLog.findMany({
            where: { dealId: { in: dealIds } },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { user: { select: { id: true, name: true } } },
          })
        : [];

      res.json({ ...customer, activityLogs });
    } catch (err) {
      next(err);
    }
  }
);

// Create customer
customersRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        name,
        title,
        company,
        status,
        email,
        phone,
        location,
        lifecycleStageId,
        healthScore,
        tags,
        customFieldValues,
      } = req.body;
      if (!name) {
        res.status(400).json({ error: "name은 필수입니다" });
        return;
      }

      const customer = await prisma.customer.create({
        data: {
          workspaceId: req.workspaceId,
          name,
          title: title || "",
          company: company || "",
          status: status || "활성",
          email: email || "",
          phone: phone || "",
          location: location || "",
          lifecycleStageId: lifecycleStageId || null,
          healthScore: healthScore !== undefined ? Number(healthScore) : null,
          tags: tags ? JSON.stringify(tags) : "[]",
          customFieldValues: customFieldValues ? JSON.stringify(customFieldValues) : "{}",
        },
      });

      res.status(201).json(customer);
    } catch (err) {
      next(err);
    }
  }
);

// Update customer
customersRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await prisma.customer.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!existing) {
        res.status(404).json({ error: "고객을 찾을 수 없습니다" });
        return;
      }

      const data: Record<string, unknown> = {};
      const fields = [
        "name",
        "title",
        "company",
        "status",
        "email",
        "phone",
        "location",
        "avatar",
        "lifecycleStageId",
      ];
      for (const f of fields) {
        if (req.body[f] !== undefined) data[f] = req.body[f];
      }
      if (req.body.healthScore !== undefined) {
        data.healthScore =
          req.body.healthScore === null ? null : Number(req.body.healthScore);
      }
      if (req.body.tags !== undefined) data.tags = JSON.stringify(req.body.tags);
      if (req.body.customFieldValues !== undefined) {
        data.customFieldValues = JSON.stringify(req.body.customFieldValues);
      }

      const customer = await prisma.customer.update({ where: { id }, data });
      res.json(customer);
    } catch (err) {
      next(err);
    }
  }
);

// Delete customer
customersRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const existing = await prisma.customer.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!existing) {
        res.status(404).json({ error: "고객을 찾을 수 없습니다" });
        return;
      }

      await prisma.customer.delete({ where: { id } });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
