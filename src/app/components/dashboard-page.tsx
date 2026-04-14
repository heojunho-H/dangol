import { useState } from "react";
import { Plus, X, Pencil, LayoutDashboard } from "lucide-react";
import { SalesPage } from "./sales-page";
import { CustomerDashboardPage } from "./customer-dashboard-page";

interface DashboardTab {
  id: string;
  label: string;
  builtin?: "sales" | "customer";
}

const DEFAULT_TABS: DashboardTab[] = [
  { id: "sales", label: "영업 대시보드", builtin: "sales" },
  { id: "customer", label: "고객 대시보드", builtin: "customer" },
];

export function DashboardPage() {
  const [tabs, setTabs] = useState<DashboardTab[]>(DEFAULT_TABS);
  const [activeId, setActiveId] = useState<string>(DEFAULT_TABS[0].id);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const active = tabs.find((t) => t.id === activeId);

  const addDashboard = () => {
    const id = `custom-${Date.now()}`;
    const newTab: DashboardTab = { id, label: `새 대시보드 ${tabs.filter((t) => !t.builtin).length + 1}` };
    setTabs((prev) => [...prev, newTab]);
    setActiveId(id);
  };

  const removeTab = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (activeId === id) {
      const remaining = tabs.filter((t) => t.id !== id);
      if (remaining.length > 0) setActiveId(remaining[0].id);
    }
  };

  const renameTab = (id: string, label: string) => {
    if (label.trim()) setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, label: label.trim() } : t)));
    setRenamingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#E0E3E8] bg-white overflow-x-auto">
        {tabs.map((t) => {
          const isActive = t.id === activeId;
          return (
            <div key={t.id} className="relative group">
              {renamingId === t.id ? (
                <input
                  autoFocus
                  defaultValue={t.label}
                  className="text-[0.85rem] border border-[#1A472A] rounded px-2 py-1 mb-[1px] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renameTab(t.id, (e.target as HTMLInputElement).value);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={(e) => renameTab(t.id, e.target.value)}
                />
              ) : (
                <button
                  onClick={() => setActiveId(t.id)}
                  onDoubleClick={() => setRenamingId(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-[0.8rem] border-b-2 transition-colors ${
                    isActive ? "border-[#1A472A] text-[#1A472A]" : "border-transparent text-[#666] hover:text-[#1A1A1A]"
                  }`}
                >
                  <LayoutDashboard size={12} />
                  <span>{t.label}</span>
                  {!t.builtin && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingId(t.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#EFF5F1] cursor-pointer"
                    >
                      <Pencil size={10} className="text-[#999]" />
                    </span>
                  )}
                  {!t.builtin && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTab(t.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#FEF2F2] cursor-pointer"
                    >
                      <X size={10} className="text-[#999] hover:text-[#DC2626]" />
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
        <button
          onClick={addDashboard}
          className="flex items-center gap-1 px-2.5 py-2 text-[0.75rem] text-[#999] hover:text-[#1A472A] transition-colors"
          title="새 대시보드 추가"
        >
          <Plus size={12} /> 추가
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#FAFBFC]">
        {active?.builtin === "sales" && <SalesPage />}
        {active?.builtin === "customer" && <CustomerDashboardPage />}
        {active && !active.builtin && (
          <div className="p-10 max-w-[640px] mx-auto text-center">
            <div className="w-14 h-14 rounded-full bg-[#EFF5F1] flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard size={22} className="text-[#1A472A]" />
            </div>
            <h2 className="text-[1.1rem] text-[#1A1A1A] mb-2">{active.label}</h2>
            <p className="text-[0.85rem] text-[#999] mb-6">
              비어있는 대시보드예요. 보고 싶은 지표·차트를 골라 내 업무에 맞는 대시보드를 만들어 보세요.
            </p>
            <div className="text-[0.75rem] text-[#BBB]">
              위젯 선택 UI는 곧 추가될 예정이에요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
