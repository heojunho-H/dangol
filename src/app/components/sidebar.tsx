import { NavLink, useNavigate } from "react-router";
import { Resizable } from "re-resizable";
import { useState, useRef, useEffect } from "react";
import {
  Home,
  LayoutDashboard,
  Building2,
  HelpCircle,
  Plus,
  Star,
  ChevronDown,
  ChevronRight,
  Zap,
  Settings,
  TrendingUp,
  Target,
  FileText,
  DollarSign,
  Bell,
  Clock,
  CalendarCheck,
  MoreHorizontal,
  Link2,
  Copy,
  PenLine,
  ArrowRightLeft,
  Trash2,
} from "lucide-react";
import { useRecentItems } from "./recent-items-context";

let salesPageCounter = 0;

interface NavItem {
  id: string;
  icon: any;
  label: string;
  to: string;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: null,
    items: [
      { id: "home", icon: Home, label: "홈", to: "/" },
      { id: "sales-dashboard", icon: LayoutDashboard, label: "영업관리 대시보드", to: "/sales" },
    ],
  },
  {
    label: "영업관리",
    items: [
      { id: "pipeline", icon: FileText, label: "새 영업관리 페이지", to: "/dealflow/pipeline" },
    ],
  },
  {
    label: "고객관리",
    items: [],
  },
  {
    label: "스마트 리마인드",
    items: [
      { id: "alarm", icon: Bell, label: "알림 센터", to: "/" },
      { id: "followup", icon: CalendarCheck, label: "후속 조치", to: "/" },
      { id: "schedule", icon: Clock, label: "예정 일정", to: "/" },
    ],
  },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { recentChats, removeRecentChat, renameRecentChat } = useRecentItems();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{ id: string; label: string; to: string; x: number; y: number } | null>(null);
  const [recentContextMenu, setRecentContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null); // stores item.id
  const [recentRenaming, setRecentRenaming] = useState<string | null>(null);
  const [renamedLabels, setRenamedLabels] = useState<Record<string, string>>({}); // keyed by item.id
  const [navData, setNavData] = useState(navSections);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const toggle = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        setRecentContextMenu(null);
      }
    };
    if (contextMenu || recentContextMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contextMenu, recentContextMenu]);

  // Auto-focus rename input
  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renaming]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  const getDisplayLabel = (itemId: string, fallbackLabel: string) =>
    renamedLabels[itemId] ?? fallbackLabel;

  const handleContextAction = (action: string, ctx: { id: string; label: string; to: string }) => {
    setContextMenu(null);
    const displayName = getDisplayLabel(ctx.id, ctx.label);
    switch (action) {
      case "copy-link": {
        const url = `${window.location.origin}${ctx.to}`;
        navigator.clipboard.writeText(url).then(() => {
          showToast("링크가 클립보드에 복사되었습니다.");
        }).catch(() => {
          showToast("링크 복사에 실패했습니다.");
        });
        break;
      }
      case "duplicate": {
        const dupId = `dup-${Date.now()}`;
        setNavData((prev) =>
          prev.map((section) => {
            const idx = section.items.findIndex((i) => i.id === ctx.id);
            if (idx === -1) return section;
            const original = section.items[idx];
            const newItem: NavItem = {
              id: dupId,
              icon: original.icon,
              label: `${displayName} (복사본)`,
              to: `/dealflow/${dupId}`,
            };
            const newItems = [...section.items];
            newItems.splice(idx + 1, 0, newItem);
            return { ...section, items: newItems };
          })
        );
        showToast(`"${displayName}" 페이지가 복제되었습니다.`);
        break;
      }
      case "rename": {
        setRenaming(ctx.id);
        break;
      }
      case "move": {
        showToast(`"${displayName}" 페이지 옮기기 — 대상 카테고리를 선택하세요.`);
        break;
      }
      case "trash": {
        setNavData((prev) =>
          prev.map((section) => ({
            ...section,
            items: section.items.filter((i) => i.id !== ctx.id),
          }))
        );
        showToast(`"${displayName}" 페이지가 휴지통으로 이동되었습니다.`);
        break;
      }
    }
  };

  const handleRenameSubmit = (itemId: string, newName: string) => {
    if (newName.trim()) {
      setRenamedLabels((prev) => ({ ...prev, [itemId]: newName.trim() }));
      showToast(`"${newName.trim()}"(으)로 이름이 변경되었습니다.`);
    }
    setRenaming(null);
  };

  const handleRecentRenameSubmit = (id: string, newName: string) => {
    if (newName.trim()) {
      renameRecentChat(id, newName.trim());
      showToast(`"${newName.trim()}"(으)로 이름이 변경되었습니다.`);
    }
    setRecentRenaming(null);
  };

  const contextMenuItems = [
    { action: "copy-link", label: "링크 복사", icon: Link2, shortcut: "" },
    { action: "duplicate", label: "복제", icon: Copy, shortcut: "⌘D" },
    { action: "rename", label: "이름 바꾸기", icon: PenLine, shortcut: "⌘⇧R" },
    { action: "move", label: "옮기기", icon: ArrowRightLeft, shortcut: "⌘⇧P" },
    { action: "trash", label: "휴지통으로 이동", icon: Trash2, shortcut: "", danger: true },
  ];

  const recentContextMenuItems = [
    { action: "rename", label: "이름 바꾸기", icon: PenLine, shortcut: "⌘⇧R" },
    { action: "trash", label: "휴지통으로 이동", icon: Trash2, shortcut: "", danger: true },
  ];

  return (
    <Resizable
      defaultSize={{ width: 256, height: "100%" }}
      minWidth={144}
      maxWidth={288}
      enable={{ right: true }}
      handleStyles={{
        right: {
          width: "4px",
          right: "-2px",
          cursor: "col-resize",
        },
      }}
      handleClasses={{}}
      className="h-full"
    >
      <aside className="h-full bg-white border-r border-[#E0E3E8] flex flex-col overflow-hidden">
        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto sidebar-scroll">
          {navData.map((section, si) => (
            <div key={si}>
              {section.label && (
                <div className="flex items-center mb-1 px-3 py-1 rounded-md group">
                  <button
                    onClick={() => toggle(section.label!)}
                    className="flex items-center gap-1.5 flex-1 hover:bg-[#F7F8FA] rounded-md transition-colors"
                  >
                    {collapsed[section.label!] ? (
                      <ChevronRight size={11} className="text-[#999]" />
                    ) : (
                      <ChevronDown size={11} className="text-[#999]" />
                    )}
                    <p className="text-[#999] text-[0.7rem] tracking-wide uppercase">
                      {section.label}
                    </p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      salesPageCounter += 1;
                      const pageId = `new-${Date.now()}`;
                      const newLabel = `새 영업관리 페이지${salesPageCounter > 1 ? ` ${salesPageCounter}` : ""}`;
                      const isEngSales = section.label === "영업관리";
                      const isCustomers = section.label === "고객관리";
                      const targetTo = isEngSales
                        ? `/dealflow/${pageId}`
                        : isCustomers
                        ? `/customers/${pageId}`
                        : "/";
                      const newItem: NavItem = {
                        id: pageId,
                        icon: FileText,
                        label: isCustomers ? "새 고객관리 페이지" : newLabel,
                        to: targetTo,
                      };
                      setNavData((prev) =>
                        prev.map((s) =>
                          s.label === section.label
                            ? { ...s, items: [...s.items, newItem] }
                            : s
                        )
                      );
                      if (collapsed[section.label!]) {
                        setCollapsed((prev) => ({ ...prev, [section.label!]: false }));
                      }
                      showToast(`"${newItem.label}" 페이지가 추가되었습니다.`);
                      if (isEngSales || isCustomers) {
                        navigate(targetTo);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#E8EEFF] transition-all"
                    title="페이지 추가"
                  >
                    <Plus size={11} className="text-[#999] hover:text-[#1A472A]" />
                  </button>
                </div>
              )}
              {(!section.label || !collapsed[section.label!]) && (
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <div key={item.id} className="relative group/item">
                    {renaming === item.id ? (
                      <div className="flex items-center gap-2.5 px-3 py-[6px]">
                        <item.icon size={13} strokeWidth={1.8} className="text-[#1A472A] shrink-0" />
                        <input
                          ref={renameRef}
                          defaultValue={getDisplayLabel(item.id, item.label)}
                          className="flex-1 text-[0.9rem] text-[#1A1A1A] bg-white border border-[#1A472A] rounded px-1.5 py-0.5 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameSubmit(item.id, (e.target as HTMLInputElement).value);
                            if (e.key === "Escape") setRenaming(null);
                          }}
                          onBlur={(e) => handleRenameSubmit(item.id, e.target.value)}
                        />
                      </div>
                    ) : (
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-[6px] rounded-md text-[0.9rem] transition-colors ${
                            isActive
                              ? "bg-[#EFF5F1] text-[#1A472A]"
                              : "text-[#444] hover:text-[#1A1A1A] hover:bg-[#F7F8FA]"
                          }`
                        }
                      >
                        <item.icon size={13} strokeWidth={1.8} />
                        <span className="flex-1">{getDisplayLabel(item.id, item.label)}</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setContextMenu({ id: item.id, label: item.label, to: item.to, x: rect.right + 4, y: rect.top });
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:bg-[#E0E3E8] transition-all shrink-0"
                        >
                          <MoreHorizontal size={11} className="text-[#999]" />
                        </button>
                      </NavLink>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          ))}

          {/* 최근 항목 */}
          <div>
            <div className="flex items-center mb-1 px-3 py-1 rounded-md group">
              <button
                onClick={() => toggle("최근 항목")}
                className="flex items-center gap-1.5 flex-1 hover:bg-[#F7F8FA] rounded-md transition-colors"
              >
                {collapsed["최근 목"] ? (
                  <ChevronRight size={11} className="text-[#999]" />
                ) : (
                  <ChevronDown size={11} className="text-[#999]" />
                )}
                <p className="text-[#999] text-[0.8rem] tracking-wide uppercase">최근 항목</p>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`"최근 항목" 카테고리에 새 페이지를 추가합니다.`);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#E8EEFF] transition-all"
                title="페이지 추가"
              >
                <Plus size={11} className="text-[#999] hover:text-[#1A472A]" />
              </button>
            </div>
            {!collapsed["최근 항목"] && (
            <div className="space-y-0.5 max-h-[288px] overflow-y-auto recent-scroll">
              {recentChats.map((item) => (
                <div key={item.id} className="relative group/recent">
                  {recentRenaming === item.id ? (
                    <div className="flex items-center px-3 py-[5px]">
                      <input
                        autoFocus
                        defaultValue={item.title}
                        className="flex-1 text-[0.85rem] text-[#1A1A1A] bg-white border border-[#1A472A] rounded px-1.5 py-0.5 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRecentRenameSubmit(item.id, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setRecentRenaming(null);
                        }}
                        onBlur={(e) => handleRecentRenameSubmit(item.id, e.target.value)}
                      />
                    </div>
                  ) : (
                    <button
                      className="flex items-center w-full px-3 py-[5px] rounded-md text-[0.85rem] text-[#444] hover:text-[#1A1A1A] hover:bg-[#F7F8FA] transition-colors text-left"
                    >
                      <span className="flex-1 truncate">{item.title}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setRecentContextMenu({ id: item.id, x: rect.right + 4, y: rect.top });
                          setContextMenu(null);
                        }}
                        className="opacity-0 group-hover/recent:opacity-100 p-0.5 rounded hover:bg-[#E0E3E8] transition-all shrink-0 cursor-pointer"
                      >
                        <MoreHorizontal size={11} className="text-[#999]" />
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            )}
          </div>
        </nav>

        {/* Help */}
        <div className="px-2 py-3 border-t border-[#E0E3E8]">
          <button className="flex items-center gap-2.5 px-3 py-[6px] rounded-md text-[0.9rem] text-[#999] hover:text-[#444] hover:bg-[#F7F8FA] w-full transition-colors">
            <HelpCircle size={13} strokeWidth={1.8} />
            <span>고객센터</span>
          </button>
        </div>
      </aside>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-[100] bg-white rounded-xl border border-[#E0E3E8] py-1.5 min-w-[176px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div className="px-3 py-1.5 text-[0.6rem] text-[#999] tracking-wide uppercase">페이지</div>
          {contextMenuItems.map((menuItem) => (
            <div key={menuItem.action}>
              {menuItem.action === "trash" && (
                <div className="mx-2 my-1 border-t border-[#E0E3E8]" />
              )}
              <button
                onClick={() => handleContextAction(menuItem.action, contextMenu)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[0.75rem] transition-colors ${
                  (menuItem as any).danger
                    ? "text-[#EF4444] hover:bg-[#FEF2F2]"
                    : "text-[#333] hover:bg-[#F7F8FA]"
                }`}
              >
                <menuItem.icon size={12} strokeWidth={1.6} />
                <span className="flex-1 text-left">{menuItem.label}</span>
                {menuItem.shortcut && (
                  <span className="text-[0.6rem] text-[#BBB]">{menuItem.shortcut}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recent Context Menu */}
      {recentContextMenu && (
        <div
          ref={menuRef}
          className="fixed z-[100] bg-white rounded-xl border border-[#E0E3E8] py-1.5 min-w-[176px]"
          style={{
            left: recentContextMenu.x,
            top: recentContextMenu.y,
            boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div className="px-3 py-1.5 text-[0.6rem] text-[#999] tracking-wide uppercase">페이지</div>
          {recentContextMenuItems.map((menuItem) => (
            <div key={menuItem.action}>
              {menuItem.action === "trash" && (
                <div className="mx-2 my-1 border-t border-[#E0E3E8]" />
              )}
              <button
                onClick={() => {
                  setRecentContextMenu(null);
                  if (menuItem.action === "rename") {
                    setRecentRenaming(recentContextMenu.id);
                  } else if (menuItem.action === "trash") {
                    const item = recentChats.find((c) => c.id === recentContextMenu.id);
                    removeRecentChat(recentContextMenu.id);
                    showToast(`"${item?.title}" 항목이 휴지통으로 이동되었습니다.`);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[0.75rem] transition-colors ${
                  (menuItem as any).danger
                    ? "text-[#EF4444] hover:bg-[#FEF2F2]"
                    : "text-[#333] hover:bg-[#F7F8FA]"
                }`}
              >
                <menuItem.icon size={12} strokeWidth={1.6} />
                <span className="flex-1 text-left">{menuItem.label}</span>
                {menuItem.shortcut && (
                  <span className="text-[0.6rem] text-[#BBB]">{menuItem.shortcut}</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-[#1A1A1A] text-white text-[0.75rem] px-5 py-3 rounded-xl shadow-lg"
          style={{ animation: "fadeInUp 0.2s ease-out" }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </Resizable>
  );
}