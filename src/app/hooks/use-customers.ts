import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";

export interface CustomerLifecycleStageJoined {
  id: string;
  name: string;
  color: string;
  type: "ONBOARDING" | "ACTIVE" | "DORMANT" | "CHURNED";
}

export interface CustomerRow {
  id: string;
  workspace_id: string;
  page_id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  lifecycle_stage_id: string | null;
  health_score: number;
  custom_field_values: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  lifecycle_stage: CustomerLifecycleStageJoined | null;
}

const CUSTOMER_SELECT =
  "id, workspace_id, page_id, name, company, title, email, phone, location, status, lifecycle_stage_id, health_score, custom_field_values, created_at, updated_at, lifecycle_stage:customer_lifecycle_stages(id, name, color, type)";

export function useCustomers(pageId: string | undefined) {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["customers", workspaceId, pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(CUSTOMER_SELECT)
        .eq("workspace_id", workspaceId)
        .eq("page_id", pageId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CustomerRow[];
    },
  });
}

export type CustomerInsertInput = Partial<
  Omit<CustomerRow, "id" | "workspace_id" | "page_id" | "created_at" | "updated_at" | "lifecycle_stage">
> & { name: string };

export function useCreateCustomer(pageId: string | undefined) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (input: CustomerInsertInput) => {
      if (!pageId) throw new Error("pageId is required to create a customer");
      const { data, error } = await supabase
        .from("customers")
        .insert({ workspace_id: workspaceId, page_id: pageId, ...input })
        .select(CUSTOMER_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as CustomerRow;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["customers", workspaceId, pageId] });
    },
  });
}

export type CustomerPatch = Partial<
  Omit<CustomerRow, "id" | "workspace_id" | "page_id" | "created_at" | "updated_at" | "lifecycle_stage">
>;

export function useUpdateCustomer(pageId: string | undefined) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: CustomerPatch }) => {
      const { data, error } = await supabase
        .from("customers")
        .update(patch)
        .eq("id", id)
        .select(CUSTOMER_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as CustomerRow;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["customers", workspaceId, pageId] });
      const prev = qc.getQueryData<CustomerRow[]>(["customers", workspaceId, pageId]);
      if (prev) {
        qc.setQueryData<CustomerRow[]>(
          ["customers", workspaceId, pageId],
          prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["customers", workspaceId, pageId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["customers", workspaceId, pageId] });
    },
  });
}

export function useDeleteCustomer(pageId: string | undefined) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["customers", workspaceId, pageId] });
      const prev = qc.getQueryData<CustomerRow[]>(["customers", workspaceId, pageId]);
      if (prev) {
        qc.setQueryData<CustomerRow[]>(
          ["customers", workspaceId, pageId],
          prev.filter((c) => c.id !== id)
        );
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["customers", workspaceId, pageId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["customers", workspaceId, pageId] });
    },
  });
}
