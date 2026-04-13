import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

export const contractsRouter = Router();
contractsRouter.use(authMiddleware);

function paramId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

// List contracts (optionally filtered by customerId)
contractsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId, renewalStatus } = req.query as Record<string, string | undefined>;
      const where: Record<string, unknown> = { workspaceId: req.workspaceId };
      if (customerId) where.customerId = customerId;
      if (renewalStatus) where.renewalStatus = renewalStatus;
      const contracts = await prisma.contract.findMany({
        where,
        orderBy: { startDate: "desc" },
        include: {
          customer: { select: { id: true, name: true, company: true } },
          sourceDeal: { select: { id: true, company: true } },
        },
      });
      res.json(contracts);
    } catch (err) {
      next(err);
    }
  }
);

contractsRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contract = await prisma.contract.findFirst({
        where: { id: paramId(req), workspaceId: req.workspaceId },
        include: {
          customer: true,
          sourceDeal: true,
        },
      });
      if (!contract) {
        res.status(404).json({ error: "계약을 찾을 수 없습니다" });
        return;
      }
      res.json(contract);
    } catch (err) {
      next(err);
    }
  }
);

contractsRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        customerId,
        sourceDealId,
        service,
        quantity,
        amount,
        startDate,
        endDate,
        renewalStatus,
        memo,
      } = req.body;
      if (!customerId) {
        res.status(400).json({ error: "customerId는 필수입니다" });
        return;
      }
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, workspaceId: req.workspaceId },
      });
      if (!customer) {
        res.status(400).json({ error: "유효하지 않은 고객입니다" });
        return;
      }
      const contract = await prisma.contract.create({
        data: {
          workspaceId: req.workspaceId,
          customerId,
          sourceDealId: sourceDealId || null,
          service: service || "",
          quantity: quantity ? Number(quantity) : 0,
          amount: amount ? Number(amount) : 0,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          renewalStatus: renewalStatus || "ACTIVE",
          memo: memo || "",
        },
      });
      // keep customer aggregates in sync for manual inserts
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          purchaseCount: { increment: 1 },
          totalRevenue: { increment: contract.amount },
          firstPurchaseAt: customer.firstPurchaseAt ?? contract.startDate,
          lastPurchaseAt:
            !customer.lastPurchaseAt || contract.startDate > customer.lastPurchaseAt
              ? contract.startDate
              : customer.lastPurchaseAt,
        },
      });
      res.status(201).json(contract);
    } catch (err) {
      next(err);
    }
  }
);

contractsRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req);
      const existing = await prisma.contract.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });
      if (!existing) {
        res.status(404).json({ error: "계약을 찾을 수 없습니다" });
        return;
      }
      const data: Record<string, unknown> = {};
      const simple = ["service", "renewalStatus", "memo"];
      for (const f of simple) if (req.body[f] !== undefined) data[f] = req.body[f];
      if (req.body.quantity !== undefined) data.quantity = Number(req.body.quantity);
      if (req.body.amount !== undefined) data.amount = Number(req.body.amount);
      if (req.body.startDate !== undefined) data.startDate = new Date(req.body.startDate);
      if (req.body.endDate !== undefined)
        data.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
      const contract = await prisma.contract.update({ where: { id }, data });
      res.json(contract);
    } catch (err) {
      next(err);
    }
  }
);

contractsRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = paramId(req);
      const existing = await prisma.contract.findFirst({
        where: { id, workspaceId: req.workspaceId },
      });
      if (!existing) {
        res.status(404).json({ error: "계약을 찾을 수 없습니다" });
        return;
      }
      await prisma.contract.delete({ where: { id } });
      await prisma.customer.update({
        where: { id: existing.customerId },
        data: {
          purchaseCount: { decrement: 1 },
          totalRevenue: { decrement: existing.amount },
        },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
