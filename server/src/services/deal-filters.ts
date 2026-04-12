/**
 * Build Prisma `where` clause from query parameters for Deal listing.
 */
export function buildDealWhere(
  workspaceId: string,
  query: Record<string, string | undefined>
) {
  const where: Record<string, unknown> = { workspaceId };

  // Stage filter (comma-separated stageIds)
  if (query.stageId) {
    const ids = query.stageId.split(",").filter(Boolean);
    if (ids.length === 1) where.stageId = ids[0];
    else if (ids.length > 1) where.stageId = { in: ids };
  }

  // Status filter
  if (query.status) {
    const statuses = query.status.split(",").filter(Boolean);
    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { in: statuses };
  }

  // Manager filter
  if (query.managerId) {
    if (query.managerId === "none") where.managerId = null;
    else where.managerId = query.managerId;
  }

  // Search (company, contact, service, + customFieldValues JSON)
  if (query.search) {
    where.OR = [
      { company: { contains: query.search } },
      { contact: { contains: query.search } },
      { service: { contains: query.search } },
      { customFieldValues: { contains: query.search } },
    ];
  }

  // Custom field filters: query params prefixed `cf_` match against the JSON
  // blob stored in `customFieldValues`. Supports comma-separated values (in).
  // Each `cf_<key>=v1,v2` adds an AND clause requiring the JSON to contain
  // at least one of `"key":"v_i"` (string) or `"key":v_i` (number/bool).
  const cfAnd: Record<string, unknown>[] = [];
  for (const [qk, qv] of Object.entries(query)) {
    if (!qk.startsWith("cf_") || !qv) continue;
    const key = qk.slice(3);
    if (!key) continue;
    const values = qv.split(",").map((s) => s.trim()).filter(Boolean);
    if (values.length === 0) continue;
    const escape = (s: string) => s.replace(/"/g, '\\"');
    const or = values.flatMap((v) => [
      { customFieldValues: { contains: `"${escape(key)}":"${escape(v)}"` } },
      { customFieldValues: { contains: `"${escape(key)}":${v}` } },
    ]);
    cfAnd.push({ OR: or });
  }
  if (cfAnd.length > 0) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...cfAnd];
  }

  // Date range
  if (query.dateFrom || query.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (query.dateFrom) dateFilter.gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.lte = new Date(query.dateTo);
    where.date = dateFilter;
  }

  // Amount range (만원 단위)
  if (query.amountMin || query.amountMax) {
    const amountFilter: Record<string, number> = {};
    if (query.amountMin) amountFilter.gte = Number(query.amountMin);
    if (query.amountMax) amountFilter.lte = Number(query.amountMax);
    where.amount = amountFilter;
  }

  return where;
}

/**
 * Build Prisma `orderBy` from query parameter.
 * Format: "field:asc" or "field:desc" (default: date:desc)
 */
export function buildDealOrderBy(sortParam?: string) {
  if (!sortParam) return { date: "desc" as const };

  const [field, dir] = sortParam.split(":");
  const direction = dir === "asc" ? "asc" : "desc";
  const allowed = [
    "company",
    "amount",
    "date",
    "status",
    "createdAt",
    "updatedAt",
  ];
  if (allowed.includes(field)) {
    return { [field]: direction };
  }
  return { date: "desc" as const };
}
