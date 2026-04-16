import { Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, session, activeWorkspaceId } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[0.85rem] text-[#999]">
        불러오는 중…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // 로그인은 됐는데 seed 트리거가 아직 안 끝났거나 워크스페이스가 없는 경우 — 짧은 대기
  if (!activeWorkspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[0.85rem] text-[#999]">
        워크스페이스 준비 중…
      </div>
    );
  }

  return <>{children}</>;
}
