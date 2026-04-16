import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "multi-select"
  | "date"
  | "person"
  | "phone"
  | "email"
  | "file";

export type FieldScope = "deal" | "customer";

export interface CustomFieldOption {
  value: string;
  label: string;
  archived?: boolean;
}

export interface CustomFieldRow {
  id: string;
  workspace_id: string;
  scope: FieldScope;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: CustomFieldOption[];
  visible: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomFields(scope: FieldScope) {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["custom_fields", workspaceId, scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select(
          "id, workspace_id, scope, key, label, type, required, options, visible, sort_order, deleted_at, created_at, updated_at"
        )
        .eq("workspace_id", workspaceId)
        .eq("scope", scope)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomFieldRow[];
    },
  });
}
