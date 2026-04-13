import { Router, Request, Response, NextFunction } from "express";
import cors from "cors";
import prisma from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

function paramId(req: Request, key = "id"): string {
  const v = req.params[key];
  return Array.isArray(v) ? v[0] : v;
}

// ─── Authed router: CRUD for forms ───
export const formsRouter = Router();
formsRouter.use(authMiddleware);

formsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forms = await prisma.webForm.findMany({
      where: { workspaceId: req.workspaceId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { submissions: true } } },
    });
    res.json(forms.map((f) => ({ ...f, fields: JSON.parse(f.fields) })));
  } catch (err) {
    next(err);
  }
});

formsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, fields } = req.body as { name?: string; fields?: unknown };
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "name은 필수입니다" });
      return;
    }
    const form = await prisma.webForm.create({
      data: {
        workspaceId: req.workspaceId,
        name,
        fields: JSON.stringify(Array.isArray(fields) ? fields : []),
      },
    });
    res.status(201).json({ ...form, fields: JSON.parse(form.fields) });
  } catch (err) {
    next(err);
  }
});

formsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = await prisma.webForm.findFirst({
      where: { id: paramId(req), workspaceId: req.workspaceId },
    });
    if (!form) {
      res.status(404).json({ error: "폼을 찾을 수 없습니다" });
      return;
    }
    res.json({ ...form, fields: JSON.parse(form.fields) });
  } catch (err) {
    next(err);
  }
});

formsRouter.get(
  "/:id/submissions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await prisma.webForm.findFirst({
        where: { id: paramId(req), workspaceId: req.workspaceId },
      });
      if (!form) {
        res.status(404).json({ error: "폼을 찾을 수 없습니다" });
        return;
      }
      const submissions = await prisma.formSubmission.findMany({
        where: { formId: form.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { deal: { select: { id: true, company: true } } },
      });
      res.json(
        submissions.map((s) => ({ ...s, payload: JSON.parse(s.payload) }))
      );
    } catch (err) {
      next(err);
    }
  }
);

formsRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.webForm.findFirst({
      where: { id: paramId(req), workspaceId: req.workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "폼을 찾을 수 없습니다" });
      return;
    }
    const data: Record<string, unknown> = {};
    if (typeof req.body.name === "string") data.name = req.body.name;
    if (Array.isArray(req.body.fields)) data.fields = JSON.stringify(req.body.fields);
    if (typeof req.body.active === "boolean") data.active = req.body.active;
    const form = await prisma.webForm.update({ where: { id: existing.id }, data });
    res.json({ ...form, fields: JSON.parse(form.fields) });
  } catch (err) {
    next(err);
  }
});

formsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.webForm.findFirst({
      where: { id: paramId(req), workspaceId: req.workspaceId },
    });
    if (!existing) {
      res.status(404).json({ error: "폼을 찾을 수 없습니다" });
      return;
    }
    await prisma.webForm.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Public router: form submission (no auth, wildcard CORS) ───
// Mounted separately so external websites can POST directly from browsers.
export const publicFormsRouter = Router();
publicFormsRouter.use(cors({ origin: "*", credentials: false }));

publicFormsRouter.post(
  "/:formId/submit",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const formId = paramId(req, "formId");
      const form = await prisma.webForm.findUnique({ where: { id: formId } });
      if (!form || !form.active) {
        res.status(404).json({ error: "폼을 찾을 수 없습니다" });
        return;
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const company = String(body.company ?? "").trim();
      if (!company) {
        res.status(400).json({ error: "company는 필수입니다" });
        return;
      }

      const firstStage = await prisma.pipelineStage.findFirst({
        where: { workspaceId: form.workspaceId },
        orderBy: { sortOrder: "asc" },
      });
      if (!firstStage) {
        res.status(500).json({ error: "파이프라인 스테이지가 설정되지 않았습니다" });
        return;
      }

      const known = ["contact", "position", "service", "phone", "email"] as const;
      const dealData: Record<string, unknown> = {
        workspaceId: form.workspaceId,
        stageId: firstStage.id,
        company,
        memo: typeof body.message === "string" ? String(body.message) : "",
      };
      for (const k of known) {
        if (typeof body[k] === "string") dealData[k] = body[k];
      }

      const deal = await prisma.deal.create({ data: dealData as never });

      const submission = await prisma.formSubmission.create({
        data: {
          workspaceId: form.workspaceId,
          formId: form.id,
          payload: JSON.stringify(body),
          dealId: deal.id,
        },
      });

      await prisma.activityLog.create({
        data: {
          workspaceId: form.workspaceId,
          dealId: deal.id,
          type: "created",
          title: `웹 폼 "${form.name}" 수신 → 딜 자동 생성`,
          // 웹 폼 제출은 시스템 이벤트지만 ActivityLog.userId가 필수라 폼 소유 워크스페이스의 첫 유저로 기록.
          userId: (
            await prisma.user.findFirst({
              where: { workspaceId: form.workspaceId },
              orderBy: { createdAt: "asc" },
              select: { id: true },
            })
          )?.id ?? "",
        },
      }).catch(() => {});

      res.status(201).json({ success: true, submissionId: submission.id, dealId: deal.id });
    } catch (err) {
      next(err);
    }
  }
);
