import { useEffect, useState } from "react";
import {
  Settings2,
  Heart,
  DollarSign,
  CalendarClock,
  Sparkles,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DashboardData {
  kpi: {
    totalCustomers: number;
    newThisMonth: number;
    totalLtv: number; // 만원
    avgContract: number; // 만원
    renewalsCount: number;
    churnRate: number;
  };
  health: { active: number; warning: number; risk: number; total: number; avgHealth: number };
  retention: { month: string; rate: number }[];
  ltv: { total: number; avgContract: number; contractCount: number; wonAmount: number };
  renewals: { contractId: string; company: string; name: string; amount: number; daysUntil: number }[];
  upsell: { customerId: string; company: string; healthScore: number; score: number; reason: string }[];
  lifecycle: { stage: string; type: string; color: string; count: number }[];
}

const EMPTY: DashboardData = {
  kpi: { totalCustomers: 0, newThisMonth: 0, totalLtv: 0, avgContract: 0, renewalsCount: 0, churnRate: 0 },
  health: { active: 0, warning: 0, risk: 0, total: 0, avgHealth: 0 },
  retention: [],
  ltv: { total: 0, avgContract: 0, contractCount: 0, wonAmount: 0 },
  renewals: [],
  upsell: [],
  lifecycle: [],
};

function formatManwon(manwon: number): string {
  if (manwon >= 10000) return `₩${(manwon / 10000).toFixed(2)}억`;
  if (manwon >= 1000) return `₩${(manwon / 1000).toFixed(1)}천만`;
  return `₩${manwon.toLocaleString()}만`;
}

async function fetchDashboard(wid: string): Promise<DashboardData | null> {
  const { data, error } = await supabase.rpc("customer_dashboard", { wid });
  if (error) {
    console.error("[customer_dashboard rpc]", error);
    return null;
  }
  return data as DashboardData;
}

export function CustomerDashboardPage() {
  const { activeWorkspaceId } = useAuth();
  const [healthActive, setHealthActive] = useState(true);
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchDashboard(activeWorkspaceId).then((d) => {
      if (cancelled) return;
      if (d) {
        setData(d);
        setHasData(d.kpi.totalCustomers > 0);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  const kpiCards = [
    {
      label: "전체 고객",
      value: `${data.kpi.totalCustomers}명`,
      change: data.kpi.newThisMonth > 0 ? `+${data.kpi.newThisMonth} 이번 달` : "—",
      icon: Users,
      changeColor: "#1A73E8",
    },
    {
      label: "이탈률",
      value: `${data.kpi.churnRate}%`,
      change: data.kpi.churnRate > 10 ? "주의" : "안정",
      icon: data.kpi.churnRate > 10 ? TrendingDown : TrendingUp,
      changeColor: data.kpi.churnRate > 10 ? "#EF4444" : "#2CBF60",
    },
    {
      label: "누적 LTV",
      value: formatManwon(data.kpi.totalLtv),
      change: `평균 계약 ${formatManwon(data.kpi.avgContract)}`,
      icon: DollarSign,
      changeColor: "#2CBF60",
    },
    {
      label: "갱신 예정",
      value: `${data.kpi.renewalsCount}건`,
      change: "90일 이내",
      icon: CalendarClock,
      changeColor: "#FFA726",
    },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#1A1A1A] text-[27px]">고객관리</h1>
          <p className="text-[#999] text-[0.9rem]">고객 헬스·리텐션·업셀 현황</p>
        </div>
        <button className="flex items-center gap-2 text-[#1A73E8] text-[0.9rem] hover:underline">
          <Settings2 size={12} />
          대시보드 설정
        </button>
      </div>

      {!loading && !hasData && (
        <div className="bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-lg p-6 text-center">
          <p className="text-[#64748B] text-[0.9rem]">
            아직 고객 데이터가 없습니다. 영업관리에서 딜이 수주확정되면 자동으로 고객으로 등록됩니다.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon size={13} className="text-[#999]" />
              <span className="text-[0.7rem]" style={{ color: kpi.changeColor }}>
                {kpi.change}
              </span>
            </div>
            <p className="text-[#1A1A1A] text-[24px] mb-0.5">{kpi.value}</p>
            <p className="text-[#999] text-[0.85rem]">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-4 gap-5">
        {/* Left 3 cols */}
        <div className="col-span-3 space-y-5">
          {/* Top Row Cards */}
          <div className="grid grid-cols-3 gap-4">
            {/* Retention Trend */}
            <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
              <h3 className="text-[#1A1A1A] text-[1.1rem] mb-1">리텐션 추이</h3>
              <p className="text-[0.75rem] text-[#999] mb-3">최근 6개월 잔존율</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={data.retention}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E8" vertical={false} />
                  <XAxis dataKey="month" stroke="#999" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#999"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E0E3E8",
                      borderRadius: "6px",
                      fontSize: "11px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: "#10B981", strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Renewals Due */}
            <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
              <h3 className="text-[#1A1A1A] text-[1.1rem] mb-1">갱신 예정 계약</h3>
              <p className="text-[0.75rem] text-[#999] mb-3">90일 이내</p>
              <div className="space-y-3 max-h-[160px] overflow-y-auto">
                {data.renewals.length === 0 && (
                  <p className="text-[0.8rem] text-[#999]">예정된 갱신이 없습니다</p>
                )}
                {data.renewals.slice(0, 5).map((r) => (
                  <div key={r.contractId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#1A1A1A] text-[0.85rem] truncate">{r.company || r.name}</span>
                      <span className="text-[#1A73E8] text-[0.85rem]">{formatManwon(r.amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[0.75rem] text-[#999]">
                      <CalendarClock size={10} className="text-[#F59E0B]" />
                      D-{r.daysUntil}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LTV summary */}
            <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
              <h3 className="text-[#1A1A1A] text-[1.1rem] mb-1">LTV & 평균 계약</h3>
              <p className="text-[0.75rem] text-[#999] mb-3">전체 계약 합계 기준</p>
              <div className="space-y-3">
                <div>
                  <p className="text-[0.75rem] text-[#999] mb-1">총 LTV</p>
                  <p className="text-[#1A1A1A] text-[1.4rem]">{formatManwon(data.ltv.total)}</p>
                </div>
                <div>
                  <p className="text-[0.75rem] text-[#999] mb-1">평균 계약 금액</p>
                  <p className="text-[#1A1A1A] text-[1.1rem]">{formatManwon(data.ltv.avgContract)}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#F0F1F3]">
                  <span className="text-[0.75rem] text-[#999]">전체 계약 수</span>
                  <span className="text-[0.85rem] text-[#1A1A1A]">{data.ltv.contractCount}건</span>
                </div>
              </div>
            </div>
          </div>

          {/* Lifecycle Distribution */}
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1A1A1A] text-[1.2rem]">라이프사이클 스테이지별 고객 수</h3>
              <div className="flex items-center gap-3 text-[0.75rem] text-[#666]">
                {data.lifecycle.map((l) => (
                  <span key={l.stage} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded" style={{ background: l.color }} />
                    {l.stage}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.lifecycle} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E8" vertical={false} />
                <XAxis dataKey="stage" stroke="#999" fontSize={12} tickLine={false} axisLine={{ stroke: "#E0E3E8" }} />
                <YAxis stroke="#999" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #E0E3E8",
                    borderRadius: "6px",
                    fontSize: "11px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32} name="고객 수">
                  {data.lifecycle.map((d) => (
                    <Cell key={d.stage} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert Banner */}
          {data.health.risk > 0 && (
            <div className="bg-[#FFA726] rounded-lg px-5 py-3 flex items-center gap-3">
              <AlertTriangle size={14} className="text-white shrink-0" />
              <p className="text-white text-[0.9rem]">
                <strong>알림:</strong> 이탈 위험 신호가 감지된 고객 {data.health.risk}명이 있습니다. AI 제안을 확인하세요.
              </p>
            </div>
          )}
        </div>

        {/* Right Summary Panel */}
        <div className="col-span-1 space-y-4">
          {/* Health Summary */}
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1A1A1A] text-[1rem]">고객 헬스 분포</h3>
              <button
                onClick={() => setHealthActive(!healthActive)}
                className="text-[#1A73E8]"
                aria-label="toggle"
              >
                {healthActive ? (
                  <ToggleRight size={19} />
                ) : (
                  <ToggleLeft size={19} className="text-[#D1D5DB]" />
                )}
              </button>
            </div>
            <p className="text-[0.8rem] text-[#999] mb-3">헬스 스코어 요약</p>

            <div className="space-y-3">
              {[
                { label: "활발 (80+)", value: `${data.health.active}명`, color: "#2CBF60", icon: Heart },
                { label: "주의 (50-79)", value: `${data.health.warning}명`, color: "#F59E0B", icon: AlertTriangle },
                { label: "이탈 위험 (<50)", value: `${data.health.risk}명`, color: "#EF4444", icon: TrendingDown },
                { label: "평균 스코어", value: `${data.health.avgHealth}`, color: "#1A1A1A", icon: Heart },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-2 border-b border-[#F0F1F3] last:border-0"
                >
                  <span className="text-[#999] text-[0.85rem]">{item.label}</span>
                  <span className="text-[0.9rem]" style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Upsell Opportunities */}
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} className="text-[#1A73E8]" />
              <h3 className="text-[#1A1A1A] text-[1.1rem]">업셀 기회 Top 5</h3>
            </div>
            <div className="space-y-2.5">
              {data.upsell.length === 0 && (
                <p className="text-[0.8rem] text-[#999]">충분한 데이터가 모이면 추천이 표시됩니다</p>
              )}
              {data.upsell.map((u) => (
                <div
                  key={u.customerId}
                  className="pb-2.5 border-b border-[#F0F1F3] last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[#1A1A1A] text-[0.85rem] truncate">{u.company}</span>
                    <span className="text-[0.75rem] text-[#1A73E8]">{u.score}</span>
                  </div>
                  <p className="text-[#666] text-[0.75rem] leading-tight">{u.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
