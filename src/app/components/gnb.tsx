import { useEffect, useRef, useState } from "react";
import { Search, RefreshCw, Bell, ChevronDown, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";

export function GNB() {
  const { user, workspaces, activeWorkspaceId, signOut } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "사용자";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const onSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    nav("/login", { replace: true });
  };

  return (
    <header className="h-[42px] min-h-[42px] bg-white border-b border-[#E0E3E8] flex items-center px-5 gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded bg-[#1A472A] flex items-center justify-center text-white text-[0.6rem]">
          D
        </div>
        <span className="text-[#1A472A] text-[1.2rem]">dangol CRM</span>
      </div>

      <div className="flex items-center gap-1.5 text-[0.9rem] text-[#999] ml-4">
        <span className="text-[#666]">CRM</span>
        <span>›</span>
        <span className="text-[#1A1A1A]">개요</span>
      </div>

      <div className="flex-1" />

      <div className="relative w-[256px]">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
        <input
          type="text"
          placeholder="등록된 고객 정보 검색"
          className="w-full bg-[#F7F8FA] border border-[#E0E3E8] rounded-md pl-9 pr-4 py-[6px] text-[0.9rem] text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[#1A73E8] transition-colors"
        />
      </div>

      <button className="w-8 h-8 flex items-center justify-center rounded-md border border-[#E0E3E8] text-[#666] hover:bg-[#F7F8FA] transition-colors">
        <RefreshCw size={11} />
      </button>

      <button className="relative w-8 h-8 flex items-center justify-center rounded-md text-[#666] hover:bg-[#F7F8FA] transition-colors">
        <Bell size={13} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-[#E8453A] rounded-full" />
      </button>

      <div ref={menuRef} className="relative pl-3 border-l border-[#E0E3E8]">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-[#F7F8FA] transition-colors cursor-pointer"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#2CBF60] flex items-center justify-center text-white text-[0.7rem] font-semibold">
              {avatarLetter}
            </div>
          )}
          <span className="text-[0.9rem] text-[#1A1A1A] max-w-[120px] truncate">{displayName}</span>
          <ChevronDown size={11} className="text-[#999]" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] w-[240px] bg-white border border-[#E0E3E8] rounded-lg shadow-[0_8px_32px_rgba(15,17,23,0.12)] py-1.5 z-50">
            <div className="px-3.5 py-2.5 border-b border-[#F0F1F4]">
              <div className="text-[0.85rem] font-semibold text-[#1A1A1A] truncate">{displayName}</div>
              <div className="text-[0.72rem] text-[#999] truncate mt-0.5">{user?.email}</div>
              {activeWorkspace && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[0.68rem] text-[#1A472A] bg-[#EFF5F1] px-2 py-0.5 rounded">
                  {activeWorkspace.name}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[0.85rem] text-[#1A1A1A] hover:bg-[#F7F8FA] transition-colors cursor-pointer"
            >
              <LogOut size={13} className="text-[#666]" />
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
