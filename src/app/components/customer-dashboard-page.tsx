import { useEffect, useMemo, useRef, useState } from "react";
import {
  Settings2,
  Heart,
  Repeat,
  DollarSign,
  CalendarClock,
  TrendingUp,
  Sparkles,
  GripVertical,
  X,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LifecycleStage {
  id: string;
  name: string;
  color: string;
  type: string;
}

interface CustomerStats {
  totalCustomers: number;
  totalRevenue: number;
  returningCount: number;
  returningRate: number;
  byStage: { stageId: string | null; stage: LifecycleStage | null; count: number }[];
}

type WidgetKind = "kpi" | "panel";
interface WidgetDef {
  id: string;
  label: string;
  kind: WidgetKind;
}

const WIDGETS: WidgetDef[] = [
  { id: "kpi-total", label: "전체 고객", kind: "kpi" },
  { id: "kpi-returning", label: "재구매율", kind: "kpi" },
  { id: "kpi-revenue", label: "누적 매출", kind: "kpi" },
  { id: "kpi-renewals", label: "갱신 예정", kind: "kpi" },
  { id: "health", label: "고객 헬스 분포", kind: "panel" },
  { id: "retention", label: "리텐션 추이", kind: "panel" },
  { id: "lifecycle", label: "라이프사이클 분포", kind: "panel" },
  { id: "renewals", label: "갱신 예정 계약", kind: "panel" },
  { id: "upsell", label: "업셀 기회", kind: "panel" },
  { id: "returning-summary", label: "재구매 고객 요약", kind: "panel" },
];

const DEFAULT_ORDER = WIDGETS.filter(
  (w) => !["upsell", "returning-summary"].includes(w.id),
).map((w) => w.id);

const healthData = [
  { name: "활발", value: 48, color: "#2CBF60" },
  { name: "주의", value: 22, color: "#F59E0B" },
  { name: "이탈위험", value: 8, color: "#EF4444" },
];

const retentionData = [
  { month: "11월", retention: 92 },
  { month: "12월", retention: 88 },
  { month: "1월", retention: 91 },
  { month: "2월", retention: 86 },
  { month: "3월", retention: 89 },
  { month: "4월", retention: 93 },
];

const renewalsDue = [
  { name: "TechVision Inc.", days: 12, amount: "₩45M" },
  { name: "DataFlow Systems", days: 28, amount: "₩32M" },
  { name: "GlobalTrade Co.", days: 47, amount: "₩18M" },
  { name: "MediCare Health", days: 68, amount: "₩12M" },
];

const upsellPicks = [
  { name: "TechVision Inc.", reason: "사용량 한도 근접 — 프로 플랜 제안", score: 92 },
  { name: "DataFlow Systems", reason: "유사 고객군이 추가 모듈 도입", score: 84 },
  { name: "MediCare Health", reason: "최근 응대 응답성 상승", score: 78 },
];

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("dangol_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CustomerDashboardPage() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_ORDER);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/customers/stats", { headers: { ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    fetch("/api/widget-config?scope=customer", { headers: { ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        try {
          const order = JSON.parse(data.widgetOrder || "[]");
          if (Array.isArray(order) && order.length > 0) setWidgetOrder(order);
        } catch {}
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const persistOrder = (next: string[]) => {
    setWidgetOrder(next);
    fetch("/api/widget-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ scope: "customer", widgetOrder: next }),
    }).catch(() => {});
  };

  const toggleWidget = (id: string) => {
    const next = widgetOrder.includes(id)
      ? widgetOrder.filter((w) => w !== id)
      : [...widgetOrder, id];
    persistOrder(next);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...widgetOrder];
    const [item] = next.splice(dragIdx, 1);
    next.splice(idx, 0, item);
    setWidgetOrder(next);
    setDragIdx(idx);
  };

  const totalCustomers = stats?.totalCustomers ?? 0;
  const returningRate = stats?.returningRate ?? 0;
  const totalRevenueMan = stats?.totalRevenue ?? 0;
  const revenueLabel =
    totalRevenueMan >= 10000
      ? `₩${(totalRevenueMan / 10000).toFixed(1)}억`
      : `₩${totalRevenueMan.toLocaleString()}만`;

  const funnelData = (stats?.byStage || [])
    .filter((s) => s.stage)
    .map((s) => ({ stage: s.stage!.name, count: s.count, color: s.stage!.color }));

  const enabledKpis = useMemo(
    () =>
      widgetOrder.filter((id) => WIDGETS.find((w) => w.id === id)?.kind === "kpi"),
    [widgetOrder],
  );
  const enabledPanels = useMemo(
    () =>
      widgetOrder.filter((id) => WIDGETS.find((w) => w.id === id)?.kind === "panel"),
    [widgetOrder],
  );

  const kpiMap: Record<string, { label: string; value: string; icon: any; changeColor: string }> = {
    "kpi-total": { label: "전체 고객", value: `${totalCustomers}명`, icon: Heart, changeColor: "#1A73E8" },
    "kpi-returning": { label: "재구매율", value: `${returningRate}%`, icon: Repeat, changeColor: "#2CBF60" },
    "kpi-revenue": { label: "누적 매출", value: revenueLabel, icon: DollarSign, changeColor: "#2CBF60" },
    "kpi-renewals": { label: "갱신 예정", value: `${renewalsDue.length}건`, icon: CalendarClock, changeColor: "#F59E0B" },
  };

  const renderPanel = (id: string) => {
    switch (id) {
      case "health":
        return (
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">고객 헬스 분포</h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={healthData} dataKey="value" nameKey="name" innerRadius={36} outerRadius={60}>
                  {healthData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: "10px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-3 justify-center mt-2">
              {healthData.map((d) => (
                <div key={d.name} className="flex items-center gap-1 text-[0.75rem] text-[#666]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name} {d.value}
                </div>
              ))}
            </div>
          </div>
        );
      case "retention":
        return (
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">리텐션 추이</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E8" vertical={false} />
                <XAxis dataKey="month" stroke="#999" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#999" fontSize={10} tickLine={false} axisLine={false} domain={[80, 100]} />
                <Tooltip contentStyle={{ fontSize: "10px" }} />
                <Bar dataKey="retention" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      case "lifecycle":
        return (
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">라이프사이클 분포</h3>
            {funnelData.length === 0 ? (
              <div className="text-[#999] text-[0.85rem] py-8 text-center">고객 없음</div>
            ) : (
              <div className="space-y-2 mt-2">
                {funnelData.map((s) => (
                  <div key={s.stage}>
                    <div className="flex justify-between text-[0.8rem] mb-1">
                      <span className="text-[#444]">{s.stage}</span>
                      <span className="text-[#999]">{s.count}명</span>
                    </div>
                    <div className="h-2 bg-[#F0F1F3] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (s.count / Math.max(1, totalCustomers)) * 100)}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "renewals":
        return (
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4 col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#1A1A1A] text-[1.1rem]">갱신 예정 계약</h3>
              <span className="text-[#999] text-[0.8rem]">90일 이내</span>
            </div>
            <div className="space-y-2">
              {renewalsDue.map((r) => (
                <div key={r.name} className="flex items-center justify-between p-3 bg-[#F7F8FA] rounded-md">
                  <div className="flex items-center gap-3">
                    <CalendarClock size={14} className="text-[#F59E0B]" />
                    <span className="text-[#1A1A1A] text-[0.9rem]">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#666] text-[0.85rem]">D-{r.days}</span>
                    <span className="text-[#1A1A1A] text-[0.9rem]">{r.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "upsell":
        return (
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4 col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-[#1A73E8]" />
              <h3 className="text-[#1A1A1A] text-[1.1rem]">업셀 기회</h3>
            </div>
            <div className="space-y-3">
              {upsellPicks.map((u) => (
                <div key={u.name} className="pb-3 border-b border-[#F0F1F3] last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#1A1A1A] text-[0.9rem]">{u.name}</span>
                    <span className="text-[0.75rem] text-[#1A73E8]">{u.score}</span>
                  </div>
                  <p className="text-[#666] text-[0.8rem]">{u.reason}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case "returning-summary":
        return (
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-[#2CBF60]" />
              <h3 className="text-[#1A1A1A] text-[1rem]">재구매 고객</h3>
            </div>
            <p className="text-[#1A1A1A] text-[24px]">{stats?.returningCount ?? 0}명</p>
            <p className="text-[#999] text-[0.8rem]">전체 고객 중 {returningRate}%</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#1A1A1A] text-[27px]">고객관리 대시보드</h1>
          <p className="text-[#999] text-[0.9rem]">고객 헬스·리텐션·업셀 현황</p>
        </div>
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex items-center gap-2 text-[#1A73E8] text-[0.9rem] hover:underline"
          >
            <Settings2 size={12} />
            대시보드 설정
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E0E3E8] rounded-lg shadow-lg z-30 p-3">
              <p className="text-[0.75rem] text-[#999] mb-2 px-1">활성 위젯 (드래그로 순서 변경)</p>
              <div className="space-y-1 mb-3">
                {widgetOrder.map((id, idx) => {
                  const w = WIDGETS.find((x) => x.id === id);
                  if (!w) return null;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={() => {
                        setDragIdx(null);
                        persistOrder(widgetOrder);
                      }}
                      className="flex items-center gap-2 p-2 rounded hover:bg-[#F7F8FA] cursor-grab"
                      style={{ background: dragIdx === idx ? "#F0F7F2" : undefined }}
                    >
                      <GripVertical size={12} className="text-[#CCC]" />
                      <span className="flex-1 text-[0.8rem] text-[#1A1A1A]">{w.label}</span>
                      <button
                        onClick={() => toggleWidget(id)}
                        className="p-1 rounded hover:bg-[#FEF2F2]"
                        title="제거"
                      >
                        <X size={11} className="text-[#999]" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[0.75rem] text-[#999] mb-2 px-1">추가할 위젯</p>
              <div className="space-y-1">
                {WIDGETS.filter((w) => !widgetOrder.includes(w.id)).map((w) => (
                  <button
                    key={w.id}
                    onClick={() => toggleWidget(w.id)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-[#F7F8FA] text-left"
                  >
                    <Plus size={12} className="text-[#999]" />
                    <span className="flex-1 text-[0.8rem] text-[#666]">{w.label}</span>
                  </button>
                ))}
                {WIDGETS.filter((w) => !widgetOrder.includes(w.id)).length === 0 && (
                  <p className="text-[0.75rem] text-[#BBB] px-2 py-1">모든 위젯이 활성화됨</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {enabledKpis.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {enabledKpis.map((id) => {
            const kpi = kpiMap[id];
            if (!kpi) return null;
            return (
              <div key={id} className="bg-white border border-[#E0E3E8] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon size={13} className="text-[#999]" />
                  <span className="text-[0.7rem]" style={{ color: kpi.changeColor }}>—</span>
                </div>
                <p className="text-[#1A1A1A] text-[24px] mb-0.5">{kpi.value}</p>
                <p className="text-[#999] text-[0.85rem]">{kpi.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {enabledPanels.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {enabledPanels.map((id) => (
            <div key={id} className="contents">
              {renderPanel(id)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
