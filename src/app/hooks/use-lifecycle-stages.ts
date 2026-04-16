import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useActiveWorkspaceId } from "../lib/auth-context";

export type LifecycleStageType = "ONBOARDING" | "ACTIVE" | "DORMANT" | "CHURNED";

export interface LifecycleStageRow {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  type: LifecycleStageType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useLifecycleStages() {
  const workspaceId = useActiveWorkspaceId();
  return useQuery({
    queryKey: ["customer_lifecycle_stages", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_lifecycle_stages")
        .select("id, workspace_id, name, color, type, sort_order, created_at, updated_at")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LifecycleStageRow[];
    },
  });
}
