import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";
import type { FieldScope } from "./use-custom-fields";

export type ViewType = "table" | "kanban" | "timeline";

export interface SavedViewFilter {
  id?: string;
  field: string;
  op: string;
  value: string;
}

export interface SavedViewSort {
  field: string;
  dir: "asc" | "desc";
}

export interface SavedViewColumnConfig {
  key: string;
  visible?: boolean;
  width?: number;
  order?: number;
}

export interface SavedViewRow {
  id: string;
  workspace_id: string;
  scope: FieldScope;
  name: string;
  view_type: ViewType;
  filters: SavedViewFilter[];
  sorts: SavedViewSort[];
  group_by: string;
  search_query: string;
  column_config: SavedViewColumnConfig[];
  created_at: string;
  updated_at: string;
}

export function useSavedViews(scope: FieldScope) {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["saved_views", workspaceId, scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_views")
        .select(
          "id, workspace_id, scope, name, view_type, filters, sorts, group_by, search_query, column_config, created_at, updated_at"
        )
        .eq("workspace_id", workspaceId)
        .eq("scope", scope)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SavedViewRow[];
    },
  });
}
