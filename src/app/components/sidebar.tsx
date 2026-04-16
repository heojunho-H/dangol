import { NavLink, useNavigate } from "react-router";
import { Resizable } from "re-resizable";
import { useState, useRef, useEffect } from "react";
import {
  Home,
  LayoutDashboard,
  HelpCircle,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Clock,
  MoreHorizontal,
  Link2,
  Copy,
  PenLine,
  ArrowRightLeft,
  Trash2,
} from "lucide-react";
import { useRecentItems } from "./recent-items-context";
import {
  usePages,
  useCreatePage,
  useUpdatePage,
  useDeletePage,
  type PageRow,
  type PageScope,
} from "../hooks/use-pages";

interface StaticNavItem {
  id: string;
  icon: typeof Home;
  label: string;
  to: string;
}

interface StaticNavSection {
  label: string | null;
  items: StaticNavItem[];
}

const topSections: StaticNavSection[] = [
  {
    label: null,
    items: [
      { id: "home", icon: Home, label: "홈", to: "/home" },
      { id: "dashboard", icon: LayoutDashboard, label: "대시보드", to: "/dashboard" },
    ],
  },
];

const bottomSections: StaticNavSection[] = [
  {
    label: "스마트 리마인드",
    items: [{ id: "wip", icon: Clock, label: "기능추가중", to: "/home" }],
  },
];

type PageSectionMeta = {
  label: string;
  scope: PageScope;
  basePath: string;
  defaultNewName: string;
};

const pageSections: PageSectionMeta[] = [
  { label: "영업관리", scope: "deal", basePath: "/dealflow", defaultNewName: "새 영업관리 페이지" },
  { label: "고객관리", scope: "customer", basePath: "/customers", defaultNewName: "새 고객관리 페이지" },
];

function buildPagePath(basePath: string, page: PageRow): string {
  return `${basePath}/${page.id}`;
}

export function Sidebar() {
  const navigate = useNavigate();
  const { recentChats, removeRecentChat, renameRecentChat } = useRecentItems();

  const { data: dealPages = [] } = usePages("deal");
  const { data: customerPages = [] } = usePages("customer");
  const createPageMut = useCreatePage();
  const updatePageMut = useUpdatePage();
  const deletePageMut = useDeletePage();

  const pagesByScope: Record<PageScope, PageRow[]> = {
    deal: dealPages,
    customer: customerPages,
  };

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<
    | {
        pageId: string;
        pageName: string;
        scope: PageScope;
        basePath: string;
        x: number;
        y: number;
      }
    | null
  >(null);
  const [recentContextMenu, setRecentContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingPageId, setRenamingPageId] = useState<string | null>(null);
  const [recentRenaming, setRecentRenaming] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const toggle = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

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

  useEffect(() => {
    if (renamingPageId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingPageId]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  const handleCreatePage = (meta: PageSectionMeta) => {
    const existing = pagesByScope[meta.scope];
    const nextSortOrder =
      existing.length === 0 ? 0 : Math.max(...existing.map((p) => p.sort_order)) + 1;
    const siblingCount = existing.filter((p) =>
      p.name.startsWith(meta.defaultNewName)
    ).length;
    const name =
      siblingCount === 0 ? meta.defaultNewName : `${meta.defaultNewName} ${siblingCount + 1}`;
    createPageMut.mutate(
      { scope: meta.scope, name, sort_order: nextSortOrder },
      {
        onSuccess: (page) => {
          showToast(`"${page.name}" 페이지가 추가되었습니다.`);
          if (collapsed[meta.label]) {
            setCollapsed((prev) => ({ ...prev, [meta.label]: false }));
          }
          navigate(buildPagePath(meta.basePath, page));
        },
        onError: (err) => showToast(`페이지 추가 실패: ${(err as Error).message}`),
      }
    );
  };

  const handleContextAction = (
    action: string,
    ctx: { pageId: string; pageName: string; scope: PageScope; basePath: string }
  ) => {
    setContextMenu(null);
    switch (action) {
      case "copy-link": {
        const url = `${window.location.origin}${ctx.basePath}/${ctx.pageId}`;
        navigator.clipboard
          .writeText(url)
          .then(() => showToast("링크가 클립보드에 복사되었습니다."))
          .catch(() => showToast("링크 복사에 실패했습니다."));
        break;
      }
      case "duplicate": {
        const existing = pagesByScope[ctx.scope];
        const nextSortOrder =
          existing.length === 0 ? 0 : Math.max(...existing.map((p) => p.sort_order)) + 1;
        createPageMut.mutate(
          { scope: ctx.scope, name: `${ctx.pageName} (복사본)`, sort_order: nextSortOrder },
          {
            onSuccess: (page) => {
              showToast(`"${ctx.pageName}" 페이지가 복제되었습니다.`);
              navigate(buildPagePath(ctx.basePath, page));
            },
          }
        );
        break;
      }
      case "rename": {
        setRenamingPageId(ctx.pageId);
        break;
      }
      case "move": {
        showToast(`"${ctx.pageName}" 페이지 옮기기 — 대상 카테고리를 선택하세요.`);
        break;
      }
      case "trash": {
        deletePageMut.mutate(
          { id: ctx.pageId, scope: ctx.scope },
          {
            onSuccess: () =>
              showToast(`"${ctx.pageName}" 페이지가 휴지통으로 이동되었습니다.`),
          }
        );
        break;
      }
    }
  };

  const handleRenameSubmit = (pageId: string, newName: string) => {
    const trimmed = newName.trim();
    if (trimmed) {
      updatePageMut.mutate(
        { id: pageId, patch: { name: trimmed } },
        {
          onSuccess: () => showToast(`"${trimmed}"(으)로 이름이 변경되었습니다.`),
        }
      );
    }
    setRenamingPageId(null);
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

  const renderStaticSection = (section: StaticNavSection, key: string) => (
    <div key={key}>
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
            <p className="text-[#999] text-[0.7rem] tracking-wide uppercase">{section.label}</p>
          </button>
        </div>
      )}
      {(!section.label || !collapsed[section.label!]) && (
        <div className="space-y-0.5">
          {section.items.map((item) => (
            <NavLink
              key={item.id}
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
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );

  const renderPageSection = (meta: PageSectionMeta) => {
    const pages = pagesByScope[meta.scope];
    return (
      <div key={meta.label}>
        <div className="flex items-center mb-1 px-3 py-1 rounded-md group">
          <button
            onClick={() => toggle(meta.label)}
            className="flex items-center gap-1.5 flex-1 hover:bg-[#F7F8FA] rounded-md transition-colors"
          >
            {collapsed[meta.label] ? (
              <ChevronRight size={11} className="text-[#999]" />
            ) : (
              <ChevronDown size={11} className="text-[#999]" />
            )}
            <p className="text-[#999] text-[0.7rem] tracking-wide uppercase">{meta.label}</p>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreatePage(meta);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#E8EEFF] transition-all"
            title="페이지 추가"
          >
            <Plus size={11} className="text-[#999] hover:text-[#1A472A]" />
          </button>
        </div>
        {!collapsed[meta.label] && (
          <div className="space-y-0.5">
            {pages.length === 0 ? (
              <button
                onClick={() => handleCreatePage(meta)}
                className="w-full text-left px-3 py-[5px] rounded-md text-[0.8rem] text-[#999] hover:text-[#1A472A] hover:bg-[#F7F8FA] transition-colors"
              >
                + 첫 페이지 만들기
              </button>
            ) : (
              pages.map((page) => (
                <div key={page.id} className="relative group/item">
                  {renamingPageId === page.id ? (
                    <div className="flex items-center gap-2.5 px-3 py-[6px]">
                      <FileText size={13} strokeWidth={1.8} className="text-[#1A472A] shrink-0" />
                      <input
                        ref={renameRef}
                        defaultValue={page.name}
                        className="flex-1 text-[0.9rem] text-[#1A1A1A] bg-white border border-[#1A472A] rounded px-1.5 py-0.5 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            handleRenameSubmit(page.id, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setRenamingPageId(null);
                        }}
                        onBlur={(e) => handleRenameSubmit(page.id, e.target.value)}
                      />
                    </div>
                  ) : (
                    <NavLink
                      to={buildPagePath(meta.basePath, page)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-[6px] rounded-md text-[0.9rem] transition-colors ${
                          isActive
                            ? "bg-[#EFF5F1] text-[#1A472A]"
                            : "text-[#444] hover:text-[#1A1A1A] hover:bg-[#F7F8FA]"
                        }`
                      }
                    >
                      <FileText size={13} strokeWidth={1.8} />
                      <span className="flex-1 truncate">{page.name}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setContextMenu({
                            pageId: page.id,
                            pageName: page.name,
                            scope: meta.scope,
                            basePath: meta.basePath,
                            x: rect.right + 4,
                            y: rect.top,
                          });
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-0.5 rounded hover:bg-[#E0E3E8] transition-all shrink-0"
                      >
                        <MoreHorizontal size={11} className="text-[#999]" />
                      </button>
                    </NavLink>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

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
        <nav className="flex-1 px-2 py-4 space-y-4 overflow-y-auto sidebar-scroll">
          {topSections.map((section, i) => renderStaticSection(section, `top-${i}`))}
          {pageSections.map(renderPageSection)}
          {bottomSections.map((section, i) => renderStaticSection(section, `bot-${i}`))}

          {/* 최근 항목 */}
          <div>
            <div className="flex items-center mb-1 px-3 py-1 rounded-md group">
              <button
                onClick={() => toggle("최근 항목")}
                className="flex items-center gap-1.5 flex-1 hover:bg-[#F7F8FA] rounded-md transition-colors"
              >
                {collapsed["최근 항목"] ? (
                  <ChevronRight size={11} className="text-[#999]" />
                ) : (
                  <ChevronDown size={11} className="text-[#999]" />
                )}
                <p className="text-[#999] text-[0.8rem] tracking-wide uppercase">최근 항목</p>
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
                            if (e.key === "Enter")
                              handleRecentRenameSubmit(item.id, (e.target as HTMLInputElement).value);
                            if (e.key === "Escape") setRecentRenaming(null);
                          }}
                          onBlur={(e) => handleRecentRenameSubmit(item.id, e.target.value)}
                        />
                      </div>
                    ) : (
                      <button className="flex items-center w-full px-3 py-[5px] rounded-md text-[0.85rem] text-[#444] hover:text-[#1A1A1A] hover:bg-[#F7F8FA] transition-colors text-left">
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

        <div className="px-2 py-3 border-t border-[#E0E3E8]">
          <button className="flex items-center gap-2.5 px-3 py-[6px] rounded-md text-[0.9rem] text-[#999] hover:text-[#444] hover:bg-[#F7F8FA] w-full transition-colors">
            <HelpCircle size={13} strokeWidth={1.8} />
            <span>고객센터</span>
          </button>
        </div>
      </aside>

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
                onClick={() =>
                  handleContextAction(menuItem.action, {
                    pageId: contextMenu.pageId,
                    pageName: contextMenu.pageName,
                    scope: contextMenu.scope,
                    basePath: contextMenu.basePath,
                  })
                }
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[0.75rem] transition-colors ${
                  (menuItem as { danger?: boolean }).danger
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
                  (menuItem as { danger?: boolean }).danger
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
