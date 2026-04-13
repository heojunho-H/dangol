import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { buildDealWhere, buildDealOrderBy } from "../services/deal-filters.js";
import { convertDealToCustomer } from "../services/customer-conversion.js";

export const dealsRouter = Router();
dealsRouter.use(authMiddleware);

/** Express v5 params can be string | string[]; coerce to string. */
function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

// ─── List deals ───
dealsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wId = req.workspaceId;
    const query = req.query as Record<string, string | undefined>;

    const where = buildDealWhere(wId, query);
    const orderBy = buildDealOrderBy(query.sort);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          stage: { select: { id: true, name: true, color: true, type: true } },
          manager: { select: { id: true, name: true } },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    res.json({
      deals,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Stats (dashboard aggregates) ───
dealsRouter.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wId = req.workspaceId;

    const [totalDeals, totalAmount, byStage, byStatus] = await Promise.all([
      prisma.deal.count({ where: { workspaceId: wId } }),
      prisma.deal.aggregate({
        where: { workspaceId: wId },
        _sum: { amount: true },
      }),
      prisma.deal.groupBy({
        by: ["stageId"],
        where: { workspaceId: wId },
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.deal.groupBy({
        by: ["status"],
        where: { workspaceId: wId },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    // Get stage names for the groupBy
    const stages = await prisma.pipelineStage.findMany({
      where: { workspaceId: wId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, color: true, type: true },
    });

    const stageMap = new Map(stages.map((s) => [s.id, s]));

    const wonStatus = byStatus.find((s) => s.status === "WON");
    const winRate =
      totalDeals > 0 ? ((wonStatus?._count?.id || 0) / totalDeals) * 100 : 0;

    res.json({
      totalDeals,
      totalAmount: totalAmount._sum.amount || 0,
      winRate: Math.round(winRate * 10) / 10,
      wonAmount: wonStatus?._sum?.amount || 0,
      byStage: byStage.map((s) => ({
        stageId: s.stageId,
        stage: stageMap.get(s.stageId),
        count: s._count.id,
        amount: s._sum.amount || 0,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
        amount: s._sum.amount || 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get single deal ───
dealsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deal = await prisma.deal.findFirst({
      where: { id: paramId(req), workspaceId: req.workspaceId },
      include: {
        stage: { select: { id: true, name: true, color: true, type: true } },
        manager: { select: { id: true, name: true } },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { id: true, name: true } } },
        },
        attachedFiles: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!deal) {
      res.status(404).json({ error: "딜을 찾을 수 없습니다" });
      return;
    }

    res.json(deal);
  } catch (err) {
    next(err);
  }
});

// ─── Create deal ───
dealsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wId = req.workspaceId;
    const {
      company,
      stageId,
      contact,
      position,
      service,
      quantity,
      amount,
      managerId,
      status,
      date,
      phone,
      email,
      memo,
      customFieldValues,
    } = req.body;

    if (!company) {
      res.status(400).json({ error: "company는 필수입니다" });
      return;
    }

    // If no stageId, use first stage
    let resolvedStageId = stageId;
    if (!resolvedStageId) {
      const firstStage = await prisma.pipelineStage.findFirst({
        where: { workspaceId: wId },
        orderBy: { sortOrder: "asc" },
      });
      if (!firstStage) {
        res.status(400).json({ error: "파이프라인 스테이지가 없습니다" });
        return;
      }
      resolvedStageId = firstStage.id;
    }

    const deal = await prisma.deal.create({
      data: {
        workspaceId: wId,
        company,
        stageId: resolvedStageId,
        contact: contact || "",
        position: position || "",
        service: service || "",
        quantity: quantity ? Number(quantity) : 0,
        amount: amount ? Number(amount) : 0,
        managerId: managerId || null,
        status: status || "IN_PROGRESS",
        date: date ? new Date(date) : new Date(),
        phone: phone || "",
        email: email || "",
        memo: memo || "",
        customFieldValues: customFieldValues
          ? JSON.stringify(customFieldValues)
          : "{}",
      },
      include: {
        stage: { select: { id: true, name: true, color: true, type: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    // Auto-create "created" activity log
    await prisma.activityLog.create({
      data: {
        workspaceId: wId,
        dealId: deal.id,
        type: "created",
        title: `딜 "${company}" 생성`,
        userId: req.userId,
      },
    });

    res.status(201).json(deal);
  } catch (err) {
    next(err);
  }
});

// ─── Update deal ───
dealsRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.deal.findFirst({
      where: { id: paramId(req), workspaceId: req.workspaceId },
    });

    if (!existing) {
      res.status(404).json({ error: "딜을 찾을 수 없습니다" });
      return;
    }

    const data: Record<string, unknown> = {};
    const fields = [
      "company",
      "contact",
      "position",
      "service",
      "phone",
      "email",
      "memo",
      "status",
      "stageId",
      "managerId",
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) data[f] = req.body[f];
    }
    if (req.body.quantity !== undefined) data.quantity = Number(req.body.quantity);
    if (req.body.amount !== undefined) data.amount = Number(req.body.amount);
    if (req.body.date !== undefined) data.date = new Date(req.body.date);
    if (req.body.customFieldValues !== undefined) {
      data.customFieldValues = JSON.stringify(req.body.customFieldValues);
    }

    const deal = await prisma.deal.update({
      where: { id: paramId(req) },
      data,
      include: {
        stage: { select: { id: true, name: true, color: true, type: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    if (existing.status !== "WON" && deal.status === "WON") {
      await convertDealToCustomer(deal.id);
    }

    res.json(deal);
  } catch (err) {
    next(err);
  }
});

// ─── Stage change (with activity log) ───
dealsRouter.patch(
  "/:id/stage",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { stageId } = req.body;
      if (!stageId) {
        res.status(400).json({ error: "stageId는 필수입니다" });
        return;
      }

      const existing = await prisma.deal.findFirst({
        where: { id: paramId(req), workspaceId: req.workspaceId },
      });

      if (!existing) {
        res.status(404).json({ error: "딜을 찾을 수 없습니다" });
        return;
      }

      // Get old stage name for logging
      const oldStage = await prisma.pipelineStage.findFirst({
        where: { id: existing.stageId, workspaceId: req.workspaceId },
        select: { name: true },
      });

      const newStage = await prisma.pipelineStage.findFirst({
        where: { id: stageId, workspaceId: req.workspaceId },
      });

      if (!newStage) {
        res.status(400).json({ error: "유효하지 않은 스테이지입니다" });
        return;
      }

      // Determine status from stage type
      let newStatus = existing.status;
      if (newStage.type === "WON") newStatus = "WON";
      else if (newStage.type === "LOST") newStatus = "LOST";
      else if (existing.status !== "IN_PROGRESS") newStatus = "IN_PROGRESS";

      const deal = await prisma.deal.update({
        where: { id: paramId(req) },
        data: { stageId, status: newStatus },
        include: {
          stage: { select: { id: true, name: true, color: true, type: true } },
          manager: { select: { id: true, name: true } },
        },
      });

      // Auto-create stage_change activity log
      await prisma.activityLog.create({
        data: {
          workspaceId: req.workspaceId,
          dealId: deal.id,
          type: "stage_change",
          title: `스테이지 변경: ${oldStage?.name || "알 수 없음"} → ${newStage.name}`,
          userId: req.userId,
        },
      });

      if (existing.status !== "WON" && deal.status === "WON") {
        await convertDealToCustomer(deal.id);
      }

      res.json(deal);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Delete deal ───
dealsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.deal.findFirst({
      where: { id: paramId(req), workspaceId: req.workspaceId },
    });

    if (!existing) {
      res.status(404).json({ error: "딜을 찾을 수 없습니다" });
      return;
    }

    await prisma.deal.delete({ where: { id: paramId(req) } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Bulk update ───
dealsRouter.post(
  "/bulk-update",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids, data } = req.body as {
        ids: string[];
        data: { status?: string; managerId?: string; stageId?: string };
      };

      if (!ids?.length || !data) {
        res.status(400).json({ error: "ids와 data는 필수입니다" });
        return;
      }

      const updateData: Record<string, unknown> = {};
      if (data.status) updateData.status = data.status;
      if (data.managerId !== undefined) updateData.managerId = data.managerId || null;
      if (data.stageId) updateData.stageId = data.stageId;

      const result = await prisma.deal.updateMany({
        where: { id: { in: ids }, workspaceId: req.workspaceId },
        data: updateData,
      });

      if (data.status === "WON" || data.stageId) {
        const affected = await prisma.deal.findMany({
          where: { id: { in: ids }, workspaceId: req.workspaceId, status: "WON", customerId: null },
          select: { id: true },
        });
        for (const d of affected) {
          await convertDealToCustomer(d.id);
        }
      }

      res.json({ updated: result.count });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Bulk delete ───
dealsRouter.post(
  "/bulk-delete",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids } = req.body as { ids: string[] };

      if (!ids?.length) {
        res.status(400).json({ error: "ids는 필수입니다" });
        return;
      }

      const result = await prisma.deal.deleteMany({
        where: { id: { in: ids }, workspaceId: req.workspaceId },
      });

      res.json({ deleted: result.count });
    } catch (err) {
      next(err);
    }
  }
);
