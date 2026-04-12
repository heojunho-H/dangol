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
