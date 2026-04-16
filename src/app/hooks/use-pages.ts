import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";

export type PageScope = "deal" | "customer";

export interface PageRow {
  id: string;
  workspace_id: string;
  scope: PageScope;
  name: string;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const PAGE_SELECT =
  "id, workspace_id, scope, name, sort_order, deleted_at, created_at, updated_at";

export function usePages(scope: PageScope) {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["pages", workspaceId, scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select(PAGE_SELECT)
        .eq("workspace_id", workspaceId)
        .eq("scope", scope)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PageRow[];
    },
  });
}

export interface CreatePageInput {
  scope: PageScope;
  name: string;
  sort_order?: number;
}

export function useCreatePage() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (input: CreatePageInput) => {
      const { data, error } = await supabase
        .from("pages")
        .insert({
          workspace_id: workspaceId,
          scope: input.scope,
          name: input.name,
          sort_order: input.sort_order ?? 0,
        })
        .select(PAGE_SELECT)
        .single();
      if (error) throw error;
      return data as PageRow;
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["pages", workspaceId, vars.scope] });
    },
  });
}

export interface UpdatePagePatch {
  name?: string;
  sort_order?: number;
}

export function useUpdatePage() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdatePagePatch }) => {
      const { data, error } = await supabase
        .from("pages")
        .update(patch)
        .eq("id", id)
        .select(PAGE_SELECT)
        .single();
      if (error) throw error;
      return data as PageRow;
    },
    onSettled: (data) => {
      if (data) qc.invalidateQueries({ queryKey: ["pages", workspaceId, data.scope] });
      else qc.invalidateQueries({ queryKey: ["pages", workspaceId] });
    },
  });
}

export function useDeletePage() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async ({ id }: { id: string; scope: PageScope }) => {
      const { error } = await supabase
        .from("pages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: ["pages", workspaceId, vars.scope] });
    },
  });
}
