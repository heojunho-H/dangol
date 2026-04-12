import prisma from "../lib/prisma.js";

const DEFAULT_STAGES = [
  { name: "신규", color: "#3B82F6", type: "ACTIVE", sortOrder: 0 },
  { name: "유선상담", color: "#06B6D4", type: "ACTIVE", sortOrder: 1 },
  { name: "견적서 발송", color: "#8B5CF6", type: "ACTIVE", sortOrder: 2 },
  { name: "유선견적상담", color: "#6366F1", type: "ACTIVE", sortOrder: 3 },
  { name: "가격조율", color: "#F59E0B", type: "ACTIVE", sortOrder: 4 },
  { name: "일정조율", color: "#F97316", type: "ACTIVE", sortOrder: 5 },
  { name: "수주확정", color: "#10B981", type: "WON", sortOrder: 6 },
];

const DEFAULT_FIELDS = [
  { key: "company", label: "기업명", type: "text", required: true, locked: true, sortOrder: 0 },
  { key: "stage", label: "진행상태", type: "select", required: false, locked: true, sortOrder: 1 },
  { key: "contact", label: "담당자명", type: "text", required: false, locked: false, sortOrder: 2 },
  { key: "position", label: "직책", type: "text", required: false, locked: false, sortOrder: 3 },
  { key: "service", label: "희망서비스", type: "text", required: true, locked: false, sortOrder: 4 },
  { key: "amount", label: "견적금액", type: "number", required: false, locked: false, sortOrder: 5 },
  { key: "quantity", label: "총수량", type: "number", required: false, locked: false, sortOrder: 6 },
  { key: "manager", label: "담당자", type: "person", required: false, locked: false, sortOrder: 7 },
  { key: "status", label: "상태", type: "select", required: false, locked: false, sortOrder: 8 },
  { key: "date", label: "문의 등록일", type: "date", required: false, locked: false, sortOrder: 9 },
  { key: "phone", label: "전화번호", type: "phone", required: false, locked: false, sortOrder: 10 },
  { key: "email", label: "이메일", type: "email", required: false, locked: false, sortOrder: 11 },
  { key: "memo", label: "메모", type: "text", required: false, locked: false, sortOrder: 12 },
];

const DEFAULT_VIEWS = [
  { name: "전체 딜", viewType: "table" },
  { name: "파이프라인", viewType: "kanban" },
  { name: "일정", viewType: "timeline" },
];

export async function seedWorkspace(workspaceId: string): Promise<void> {
  await prisma.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((s) => ({ ...s, workspaceId })),
  });

  await prisma.customField.createMany({
    data: DEFAULT_FIELDS.map((f) => ({ ...f, workspaceId, visible: true })),
  });

  await prisma.savedView.createMany({
    data: DEFAULT_VIEWS.map((v) => ({ ...v, workspaceId })),
  });

  await prisma.widgetConfig.create({
    data: {
      workspaceId,
      widgetOrder: JSON.stringify([
        "kpi-deals",
        "kpi-winrate",
        "kpi-amount",
        "kpi-winrate-amount",
        "funnel",
        "donut",
      ]),
    },
  });
}
