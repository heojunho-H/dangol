import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  locked: boolean;
  options: CustomFieldOption[];
  visible: boolean;
  sort_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const CUSTOM_FIELD_SELECT =
  "id, workspace_id, scope, key, label, type, required, locked, options, visible, sort_order, deleted_at, created_at, updated_at";

export function useCustomFields(scope: FieldScope) {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["custom_fields", workspaceId, scope],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select(CUSTOM_FIELD_SELECT)
        .eq("workspace_id", workspaceId)
        .eq("scope", scope)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CustomFieldRow[];
    },
  });
}

export interface CreateCustomFieldInput {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: (string | CustomFieldOption)[];
  visible?: boolean;
  sort_order?: number;
}

function normalizeOptions(
  options?: (string | CustomFieldOption)[]
): CustomFieldOption[] {
  if (!options) return [];
  return options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
}

export function useCreateCustomField(scope: FieldScope) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (input: CreateCustomFieldInput) => {
      const { data, error } = await supabase
        .from("custom_fields")
        .insert({
          workspace_id: workspaceId,
          scope,
          key: input.key,
          label: input.label,
          type: input.type,
          required: input.required ?? false,
          options: normalizeOptions(input.options),
          visible: input.visible ?? true,
          sort_order: input.sort_order ?? 0,
        })
        .select(CUSTOM_FIELD_SELECT)
        .single();
      if (error) throw error;
      return data as CustomFieldRow;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["custom_fields", workspaceId, scope] });
    },
  });
}

export interface UpdateCustomFieldPatch {
  label?: string;
  type?: FieldType;
  required?: boolean;
  options?: (string | CustomFieldOption)[];
  visible?: boolean;
  sort_order?: number;
}

export function useUpdateCustomField(scope: FieldScope) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async ({
      key,
      patch,
    }: {
      key: string;
      patch: UpdateCustomFieldPatch;
    }) => {
      const payload: Record<string, unknown> = {};
      if (patch.label !== undefined) payload.label = patch.label;
      if (patch.type !== undefined) payload.type = patch.type;
      if (patch.required !== undefined) payload.required = patch.required;
      if (patch.options !== undefined)
        payload.options = normalizeOptions(patch.options);
      if (patch.visible !== undefined) payload.visible = patch.visible;
      if (patch.sort_order !== undefined) payload.sort_order = patch.sort_order;

      const { data, error } = await supabase
        .from("custom_fields")
        .update(payload)
        .eq("workspace_id", workspaceId)
        .eq("scope", scope)
        .eq("key", key)
        .is("deleted_at", null)
        .select(CUSTOM_FIELD_SELECT)
        .maybeSingle();
      if (error) throw error;
      return data as CustomFieldRow | null;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["custom_fields", workspaceId, scope] });
    },
  });
}

export function useDeleteCustomField(scope: FieldScope) {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase
        .from("custom_fields")
        .update({ deleted_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId)
        .eq("scope", scope)
        .eq("key", key);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["custom_fields", workspaceId, scope] });
    },
  });
}
