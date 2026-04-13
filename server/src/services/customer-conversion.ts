import prisma from "../lib/prisma.js";

/**
 * Deal → Customer 전환.
 * - WorkspaceSettings.autoConvertWonToCustomer가 OFF면 skip.
 * - 동일 회사가 이미 Customer로 있으면 재구매로 처리 (누적 카운터 업데이트).
 * - 없으면 새 Customer 생성.
 * - 항상 Contract 생성 + Deal.customerId 링크.
 */
export async function convertDealToCustomer(dealId: string): Promise<void> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { stage: true },
  });
  if (!deal) return;
  if (deal.status !== "WON") return;

  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId: deal.workspaceId },
  });
  if (settings && !settings.autoConvertWonToCustomer) return;

  const company = deal.company?.trim();
  if (!company) return;

  const existing = await prisma.customer.findFirst({
    where: { workspaceId: deal.workspaceId, company },
  });

  const purchaseDate = deal.date ?? new Date();
  const amount = deal.amount ?? 0;

  let customerId: string;

  if (existing) {
    customerId = existing.id;
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: existing.name || deal.contact || existing.name,
        title: existing.title || deal.position,
        email: existing.email || deal.email,
        phone: existing.phone || deal.phone,
        purchaseCount: { increment: 1 },
        totalRevenue: { increment: amount },
        firstPurchaseAt: existing.firstPurchaseAt ?? purchaseDate,
        lastPurchaseAt:
          !existing.lastPurchaseAt || purchaseDate > existing.lastPurchaseAt
            ? purchaseDate
            : existing.lastPurchaseAt,
      },
    });
  } else {
    const defaultStage = await prisma.customerLifecycleStage.findFirst({
      where: { workspaceId: deal.workspaceId },
      orderBy: { sortOrder: "asc" },
    });

    const created = await prisma.customer.create({
      data: {
        workspaceId: deal.workspaceId,
        name: deal.contact || company,
        company,
        title: deal.position,
        email: deal.email,
        phone: deal.phone,
        status: "활성",
        lifecycleStageId: defaultStage?.id,
        purchaseCount: 1,
        totalRevenue: amount,
        firstPurchaseAt: purchaseDate,
        lastPurchaseAt: purchaseDate,
      },
    });
    customerId = created.id;
  }

  await prisma.contract.create({
    data: {
      workspaceId: deal.workspaceId,
      customerId,
      sourceDealId: deal.id,
      service: deal.service,
      quantity: deal.quantity,
      amount,
      startDate: purchaseDate,
      renewalStatus: "ACTIVE",
    },
  });

  await prisma.deal.update({
    where: { id: deal.id },
    data: { customerId },
  });
}
