import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const customersRouter = Router();
customersRouter.use(authMiddleware);

// ─── Dashboard aggregates: 6 widgets ───
customersRouter.get(
  "/dashboard",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wId = req.workspaceId;
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const ninetyDaysFromNow = new Date(now);
      ninetyDaysFromNow.setDate(now.getDate() + 90);

      const [stages, customers, contracts, wonDeals] = await Promise.all([
        prisma.customerLifecycleStage.findMany({
          where: { workspaceId: wId },
          orderBy: { sortOrder: "asc" },
        }),
        prisma.customer.findMany({
          where: { workspaceId: wId },
          select: {
            id: true,
            company: true,
            healthScore: true,
            lifecycleStageId: true,
            createdAt: true,
          },
        }),
        prisma.contract.findMany({
          where: { workspaceId: wId },
          select: {
            id: true,
            customerId: true,
            name: true,
            amount: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        }),
        prisma.deal.findMany({
          where: { workspaceId: wId, status: "WON" },
          select: { id: true, amount: true, date: true, customerId: true },
        }),
      ]);

      // 1) Health distribution buckets
      const health = { active: 0, warning: 0, risk: 0, total: customers.length };
      let healthSum = 0;
      for (const c of customers) {
        healthSum += c.healthScore;
        if (c.healthScore >= 80) health.active += 1;
        else if (c.healthScore >= 50) health.warning += 1;
        else health.risk += 1;
      }
      const avgHealth = customers.length > 0 ? Math.round(healthSum / customers.length) : 0;

      // 2) Retention / churn — last 6 months: % of customers existing at month start still not churned at month end
      const churnedStageId = stages.find((s) => s.type === "CHURNED")?.id;
      const retention: { month: string; rate: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const cohort = customers.filter((c) => c.createdAt <= monthStart);
        const survived = cohort.filter(
          (c) => !churnedStageId || c.lifecycleStageId !== churnedStageId
        );
        const rate = cohort.length > 0 ? Math.round((survived.length / cohort.length) * 1000) / 10 : 0;
        retention.push({ month: `${monthStart.getMonth() + 1}월`, rate });
      }
      const churnRate = customers.length > 0 && churnedStageId
        ? Math.round(
            (customers.filter((c) => c.lifecycleStageId === churnedStageId).length /
              customers.length) * 1000
          ) / 10
        : 0;

      // 3) LTV + average contract amount (만원 단위)
      const ltvByCustomer = new Map<string, number>();
      for (const ct of contracts) {
        ltvByCustomer.set(ct.customerId, (ltvByCustomer.get(ct.customerId) || 0) + ct.amount);
      }
      const totalLtv = Array.from(ltvByCustomer.values()).reduce((a, b) => a + b, 0);
      const avgContract = contracts.length > 0
        ? Math.round(contracts.reduce((s, c) => s + c.amount, 0) / contracts.length)
        : 0;

      // 4) Renewals due (next 90 days)
      const customerMap = new Map(customers.map((c) => [c.id, c]));
      const renewals = contracts
        .filter((c) => c.endDate && c.endDate >= now && c.endDate <= ninetyDaysFromNow)
        .map((c) => {
          const days = Math.ceil((c.endDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            contractId: c.id,
            customerId: c.customerId,
            company: customerMap.get(c.customerId)?.company || "",
            name: c.name,
            amount: c.amount,
            daysUntil: days,
          };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 10);

      // 5) Upsell Top 5 — customers with healthy score but low contract count
      const contractCountByCustomer = new Map<string, number>();
      for (const ct of contracts) {
        contractCountByCustomer.set(ct.customerId, (contractCountByCustomer.get(ct.customerId) || 0) + 1);
      }
      const upsell = customers
        .filter((c) => c.healthScore >= 70)
        .map((c) => {
          const contractCount = contractCountByCustomer.get(c.id) || 0;
          const ltv = ltvByCustomer.get(c.id) || 0;
          // Score: prefer high health + low contract count + non-zero LTV
          const score = Math.round(
            c.healthScore * 0.6 +
              (contractCount === 0 ? 30 : Math.max(0, 25 - contractCount * 5)) +
              (ltv > 0 ? 10 : 0)
          );
          return {
            customerId: c.id,
            company: c.company,
            healthScore: c.healthScore,
            contractCount,
            ltv,
            score,
            reason:
              contractCount === 0
                ? "헬스 양호 — 첫 추가 계약 제안 적합"
                : `현재 계약 ${contractCount}건 — 추가 모듈 제안 가능`,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      // 6) Lifecycle distribution
      const stageCounts = new Map(stages.map((s) => [s.id, 0]));
      for (const c of customers) {
        if (c.lifecycleStageId) {
          stageCounts.set(c.lifecycleStageId, (stageCounts.get(c.lifecycleStageId) || 0) + 1);
        }
      }
      const lifecycle = stages.map((s) => ({
        stageId: s.id,
        stage: s.name,
        type: s.type,
        color: s.color,
        count: stageCounts.get(s.id) || 0,
      }));

      // KPI summary
      const wonAmount = wonDeals.reduce((s, d) => s + d.amount, 0);
      const newThisMonth = customers.filter(
        (c) => c.createdAt >= new Date(now.getFullYear(), now.getMonth(), 1)
      ).length;

      res.json({
        kpi: {
          totalCustomers: customers.length,
          newThisMonth,
          totalLtv,
          avgContract,
          renewalsCount: renewals.length,
          churnRate,
        },
        health: { ...health, avgHealth },
        retention,
        ltv: { total: totalLtv, avgContract, contractCount: contracts.length, wonAmount },
        renewals,
        upsell,
        lifecycle,
      });
    } catch (err) {
      next(err);
    }
  }
);

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

      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
      const skip = (page - 1) * limit;

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
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

// Get single customer
customersRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const customer = await prisma.customer.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });

      if (!customer) {
        res.status(404).json({ error: "고객을 찾을 수 없습니다" });
        return;
      }

      res.json(customer);
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
      const { name, title, company, status, email, phone, location } = req.body;
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
      ];
      for (const f of fields) {
        if (req.body[f] !== undefined) data[f] = req.body[f];
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
