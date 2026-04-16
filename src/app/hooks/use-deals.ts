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
  "id, workspace_id, company, stage_id, contact, position, service, quantity, amount, manager_user_id, status, date, phone, email, memo, custom_field_values, customer_id, created_at, updated_at, stage:pipeline_stages(id, name, color, type)";

export function useDeals() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["deals", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select(DEAL_SELECT)
        .eq("workspace_id", workspaceId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DealRow[];
    },
  });
}

export type DealInsertInput = Partial<
  Omit<DealRow, "id" | "workspace_id" | "created_at" | "updated_at" | "stage">
> & { company: string };

export function useCreateDeal() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (input: DealInsertInput) => {
      const { data, error } = await supabase
        .from("deals")
        .insert({ workspace_id: workspaceId, ...input })
        .select(DEAL_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as DealRow;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deals", workspaceId] });
    },
  });
}

export type DealPatch = Partial<
  Omit<DealRow, "id" | "workspace_id" | "created_at" | "updated_at" | "stage">
>;

export function useUpdateDeal() {
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
      await qc.cancelQueries({ queryKey: ["deals", workspaceId] });
      const prev = qc.getQueryData<DealRow[]>(["deals", workspaceId]);
      if (prev) {
        qc.setQueryData<DealRow[]>(
          ["deals", workspaceId],
          prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["deals", workspaceId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deals", workspaceId] });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["deals", workspaceId] });
      const prev = qc.getQueryData<DealRow[]>(["deals", workspaceId]);
      if (prev) {
        qc.setQueryData<DealRow[]>(
          ["deals", workspaceId],
          prev.filter((d) => d.id !== id)
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["deals", workspaceId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["deals", workspaceId] });
    },
  });
}
