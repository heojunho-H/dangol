import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";

export interface WebFormField {
  key: string;
  label: string;
  required: boolean;
}

export interface WebFormRow {
  id: string;
  workspace_id: string;
  name: string;
  fields: WebFormField[];
  submit_token: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionRow {
  id: string;
  workspace_id: string;
  form_id: string;
  deal_id: string | null;
  payload: Record<string, unknown>;
  form_fields_snapshot: WebFormField[];
  created_at: string;
}

const WEBFORM_SELECT =
  "id, workspace_id, name, fields, submit_token, active, created_at, updated_at";

export function useWebForms() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["web_forms", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("web_forms")
        .select(WEBFORM_SELECT)
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WebFormRow[];
    },
  });
}

export function useCreateWebForm() {
  const qc = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  return useMutation({
    mutationFn: async (input: { name: string; fields: WebFormField[] }) => {
      const { data, error } = await supabase
        .from("web_forms")
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          fields: input.fields,
        })
        .select(WEBFORM_SELECT)
        .single();
      if (error) throw error;
      return data as unknown as WebFormRow;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["web_forms", workspaceId] });
    },
  });
}

export function useFormSubmissions(formId: string | null) {
  return useQuery({
    queryKey: ["form_submissions", formId],
    enabled: !!formId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("id, workspace_id, form_id, deal_id, payload, form_fields_snapshot, created_at")
        .eq("form_id", formId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as FormSubmissionRow[];
    },
  });
}
