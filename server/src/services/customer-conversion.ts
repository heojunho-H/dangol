import prisma from "../lib/prisma.js";

/**
 * Convert a WON deal to a customer + contract.
 * - Idempotent: if deal already has customerId, returns existing.
 * - Reuses existing customer in workspace matched by company name.
 * - Creates a Contract record from the deal amount.
 * - Sets the customer to "활성" lifecycle stage by default.
 */
export async function convertDealToCustomer(dealId: string): Promise<{
  customerId: string;
  contractId: string;
  reused: boolean;
}> {
  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) throw new Error("Deal not found");
  if (deal.status !== "WON") throw new Error("Deal is not WON");

  if (deal.customerId) {
    const contract = await prisma.contract.findFirst({
      where: { customerId: deal.customerId, name: deal.service || deal.company },
    });
    return {
      customerId: deal.customerId,
      contractId: contract?.id ?? "",
      reused: true,
    };
  }

  const activeStage = await prisma.customerLifecycleStage.findFirst({
    where: { workspaceId: deal.workspaceId, type: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
  });

  const existingCustomer = await prisma.customer.findFirst({
    where: { workspaceId: deal.workspaceId, company: deal.company },
  });

  const customer = existingCustomer
    ? existingCustomer
    : await prisma.customer.create({
        data: {
          workspaceId: deal.workspaceId,
          name: deal.contact || deal.company,
          company: deal.company,
          title: deal.position,
          email: deal.email,
          phone: deal.phone,
          status: "활성",
          lifecycleStageId: activeStage?.id ?? null,
        },
      });

  const contract = await prisma.contract.create({
    data: {
      workspaceId: deal.workspaceId,
      customerId: customer.id,
      name: deal.service || deal.company,
      amount: deal.amount,
      status: "ACTIVE",
      startDate: deal.date,
    },
  });

  await prisma.deal.update({
    where: { id: deal.id },
    data: { customerId: customer.id },
  });

  return {
    customerId: customer.id,
    contractId: contract.id,
    reused: !!existingCustomer,
  };
}
