import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";

export type PipelineStageType = "ACTIVE" | "WON" | "LOST";

export interface PipelineStageRow {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  type: PipelineStageType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function usePipelineStages() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["pipeline_stages", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id, workspace_id, name, color, type, sort_order, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PipelineStageRow[];
    },
  });
}
