// ─────────────────────────────────────────────────────────────
// Dangol CRM · Public form submission Edge Function
//
// 외부 웹사이트에서 임베드된 <form>이 POST 하는 엔드포인트.
// 인증 없음 (anon); 대신 service_role 로 DB에 직접 쓴다.
// RLS 우회가 필요한 이유: 제출자는 워크스페이스 멤버가 아님.
//
// URL:
//   POST /functions/v1/submit-form/<formId>
//   POST /functions/v1/submit-form?formId=<id>
// Body: JSON 또는 application/x-www-form-urlencoded
//   { company, contact?, position?, service?, phone?, email?, message?, ... }
// ─────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return (await req.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const obj: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      obj[k] = typeof v === "string" ? v : "";
    });
    return obj;
  }
  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json(405, { error: "POST만 허용됩니다" });

  const url = new URL(req.url);
  // path: /submit-form/<formId>  또는  /submit-form?formId=<id>
  const pathParts = url.pathname.split("/").filter(Boolean);
  const formIdFromPath = pathParts[pathParts.indexOf("submit-form") + 1];
  const formId = formIdFromPath || url.searchParams.get("formId") || "";
  if (!formId) return json(400, { error: "formId가 필요합니다" });

  const body = await parseBody(req);
  const company = String(body.company ?? "").trim();
  if (!company) return json(400, { error: "company는 필수입니다" });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: form, error: formErr } = await sb
    .from("web_forms")
    .select("id, workspace_id, name, fields, active")
    .eq("id", formId)
    .maybeSingle();
  if (formErr || !form || !form.active) {
    return json(404, { error: "폼을 찾을 수 없습니다" });
  }

  const { data: stage, error: stageErr } = await sb
    .from("pipeline_stages")
    .select("id")
    .eq("workspace_id", form.workspace_id)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (stageErr || !stage) {
    return json(500, { error: "파이프라인 스테이지가 설정되지 않았습니다" });
  }

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : "");
  const dealRow = {
    workspace_id: form.workspace_id,
    stage_id: stage.id,
    company,
    contact: str("contact"),
    position: str("position"),
    service: str("service"),
    phone: str("phone"),
    email: str("email"),
    memo: str("message"),
  };

  const { data: deal, error: dealErr } = await sb
    .from("deals")
    .insert(dealRow)
    .select("id")
    .single();
  if (dealErr || !deal) {
    return json(500, { error: "딜 생성 실패", detail: dealErr?.message });
  }

  const { data: submission, error: subErr } = await sb
    .from("form_submissions")
    .insert({
      workspace_id: form.workspace_id,
      form_id: form.id,
      payload: body,
      form_fields_snapshot: form.fields ?? [],
      deal_id: deal.id,
    })
    .select("id")
    .single();
  if (subErr) {
    return json(500, { error: "제출 기록 실패", detail: subErr.message });
  }

  await sb.from("activity_logs").insert({
    workspace_id: form.workspace_id,
    deal_id: deal.id,
    type: "created",
    title: `웹 폼 "${form.name}" 수신 → 딜 자동 생성`,
  });

  return json(201, {
    success: true,
    submissionId: submission.id,
    dealId: deal.id,
  });
});
