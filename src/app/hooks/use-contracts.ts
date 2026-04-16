import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";

export type ContractStatus = "ACTIVE" | "RENEWED" | "EXPIRED" | "CHURNED";

export interface ContractRow {
  id: string;
  workspace_id: string;
  customer_id: string;
  name: string;
  amount: number;
  status: ContractStatus;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

const CONTRACT_SELECT =
  "id, workspace_id, customer_id, name, amount, status, start_date, end_date, created_at, updated_at";

export function useContracts(customerId?: string) {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["contracts", workspaceId, customerId ?? null],
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select(CONTRACT_SELECT)
        .eq("workspace_id", workspaceId)
        .order("start_date", { ascending: false });
      if (customerId) query = query.eq("customer_id", customerId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ContractRow[];
    },
  });
}

export type ContractInsertInput = Partial<
  Omit<ContractRow, "id" | "workspace_id" | "created_at" | "updated_at">
> & { customer_id: string; name: string };

export function useCreateContract() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (input: ContractInsertInput) => {
      const { data, error } = await supabase
        .from("contracts")
        .insert({ workspace_id: workspaceId, ...input })
        .select(CONTRACT_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as ContractRow;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["contracts", workspaceId] });
    },
  });
}

export type ContractPatch = Partial<
  Omit<ContractRow, "id" | "workspace_id" | "created_at" | "updated_at">
>;

export function useUpdateContract() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ContractPatch }) => {
      const { data, error } = await supabase
        .from("contracts")
        .update(patch)
        .eq("id", id)
        .select(CONTRACT_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as ContractRow;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["contracts", workspaceId] });
      const prev = qc.getQueryData<ContractRow[]>(["contracts", workspaceId, null]);
      if (prev) {
        qc.setQueryData<ContractRow[]>(
          ["contracts", workspaceId, null],
          prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["contracts", workspaceId, null], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["contracts", workspaceId] });
    },
  });
}

export function useDeleteContract() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["contracts", workspaceId] });
    },
  });
}
