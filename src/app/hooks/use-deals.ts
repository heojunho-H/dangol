import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";

export type DealStatus = "IN_PROGRESS" | "WON" | "LOST";

export interface DealStageJoined {
  id: string;
  name: string;
  color: string;
  type: "ACTIVE" | "WON" | "LOST";
}

export interface DealRow {
  id: string;
  workspace_id: string;
  page_id: string;
  company: string;
  stage_id: string | null;
  contact: string;
  position: string;
  service: string;
  quantity: number;
  amount: number;
  manager_user_id: string | null;
  status: DealStatus;
  date: string;
  phone: string;
  email: string;
  memo: string;
  custom_field_values: Record<string, unknown>;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
  stage: DealStageJoined | null;
}

const DEAL_SELECT =
  "id, workspace_id, page_id, company, stage_id, contact, position, service, quantity, amount, manager_user_id, status, date, phone, email, memo, custom_field_values, customer_id, created_at, updated_at, stage:pipeline_stages(id, name, color, type)";

export function useDeals(pageId: string | undefined) {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["deals", workspaceId, pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(DEAL_SELECT)
        .eq("workspace_id", workspaceId)
        .eq("page_id", pageId!)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
    },
  });
}

export type DealInsertInput = Partial<
  Omit<DealRow, "id" | "workspace_id" | "page_id" | "created_at" | "updated_at" | "stage">
> & { company: string };

export function useCreateDeal(pageId: string | undefined) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (input: DealInsertInput) => {
      if (!pageId) throw new Error("pageId is required to create a deal");
      const { data, error } = await supabase
        .from("deals")
        .insert({ workspace_id: workspaceId, page_id: pageId, ...input })
        .select(DEAL_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as DealRow;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deals", workspaceId, pageId] });
    },
  });
}

export type DealPatch = Partial<
  Omit<DealRow, "id" | "workspace_id" | "page_id" | "created_at" | "updated_at" | "stage">
>;

export function useUpdateDeal(pageId: string | undefined) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: DealPatch }) => {
      const { data, error } = await supabase
        .from("deals")
        .update(patch)
        .eq("id", id)
        .select(DEAL_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as DealRow;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["deals", workspaceId, pageId] });
      const prev = qc.getQueryData<DealRow[]>(["deals", workspaceId, pageId]);
      if (prev) {
        qc.setQueryData<DealRow[]>(
          ["deals", workspaceId, pageId],
          prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["deals", workspaceId, pageId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deals", workspaceId, pageId] });
    },
  });
}

export function useDeleteDeal(pageId: string | undefined) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["deals", workspaceId, pageId] });
      const prev = qc.getQueryData<DealRow[]>(["deals", workspaceId, pageId]);
      if (prev) {
        qc.setQueryData<DealRow[]>(
          ["deals", workspaceId, pageId],
          prev.filter((d) => d.id !== id)
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["deals", workspaceId, pageId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deals", workspaceId, pageId] });
    },
  });
}
