import { useState } from "react";
import {
  Settings2,
  Heart,
  Repeat,
  DollarSign,
  CalendarClock,
  Sparkles,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Users,
} from "lucide-react";
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
} from "recharts";

const lifecycleData = [
  { stage: "온보딩", count: 12, color: "#3B82F6" },
  { stage: "활성", count: 48, color: "#10B981" },
  { stage: "휴면", count: 18, color: "#F59E0B" },
  { stage: "이탈", count: 6, color: "#9CA3AF" },
];

const retentionData = [
  { month: "11월", rate: 92 },
  { month: "12월", rate: 88 },
  { month: "1월", rate: 91 },
  { month: "2월", rate: 86 },
  { month: "3월", rate: 89 },
  { month: "4월", rate: 93 },
];

const renewalsDue = [
  { name: "MediCare", amount: "₩45M", days: 12 },
  { name: "TechVision", amount: "₩32M", days: 28 },
  { name: "GlobalTrade", amount: "₩18M", days: 47 },
];

const upsellPicks = [
  { name: "DataFlow Systems", reason: "사용량 한도 근접 — 프로 플랜 제안", score: 92 },
  { name: "MediCare Health", reason: "유사 고객군이 추가 모듈 도입", score: 84 },
  { name: "TechVision Inc.", reason: "최근 응대 응답성 상승", score: 78 },
];

const activities = [
  { action: "MediCare 계약이 갱신되었습니다 (+₩45M)", time: "30분 전" },
  { action: "TechVision 헬스 스코어가 주의 단계로 하락", time: "1시간 전" },
  { action: "신규 고객 ABC Corp 온보딩 시작", time: "2시간 전" },
  { action: "DataFlow에 업셀 제안 이메일 전송", time: "3시간 전" },
];

const healthInfo = {
  active: 48,
  warning: 22,
  risk: 8,
  avgHealth: 72,
};

export function CustomerDashboardPage() {
  const [healthActive, setHealthActive] = useState(true);

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

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "전체 고객", value: "84명", change: "+6", icon: Users, changeColor: "#1A73E8" },
          { label: "재구매율", value: "38.1%", change: "+4.2%", icon: Repeat, changeColor: "#2CBF60" },
          { label: "누적 LTV", value: "₩1.42억", change: "+12.5%", icon: DollarSign, changeColor: "#2CBF60" },
          { label: "갱신 예정", value: "12건", change: "90일 이내", icon: CalendarClock, changeColor: "#FFA726" },
        ].map((kpi) => (
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
              <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">리텐션 추이</h3>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={retentionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E8" vertical={false} />
                  <XAxis dataKey="month" stroke="#999" fontSize={16} tickLine={false} axisLine={false} />
                  <YAxis stroke="#999" fontSize={16} tickLine={false} axisLine={false} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #E0E3E8", borderRadius: "6px", fontSize: "9px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} dot={{ r: 2.5, fill: "#10B981", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Renewals Due */}
            <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
              <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">갱신 예정 계약</h3>
              <div className="space-y-3">
                {renewalsDue.map((r) => (
                  <div key={r.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#1A1A1A] text-[0.85rem]">{r.name}</span>
                      <span className="text-[#1A73E8] text-[0.85rem]">{r.amount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[0.75rem] text-[#999]">
                      <CalendarClock size={10} className="text-[#F59E0B]" />
                      D-{r.days}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
              <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">활동 피드</h3>
              <div className="space-y-2.5">
                {activities.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 pb-2.5 border-b border-[#F0F1F3] last:border-0 last:pb-0"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] mt-[6px] shrink-0" />
                    <div>
                      <p className="text-[#1A1A1A] text-[0.85rem]">{a.action}</p>
                      <p className="text-[#999] text-[0.8rem]">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lifecycle Distribution */}
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1A1A1A] text-[1.2rem]">라이프사이클 스테이지별 고객 수</h3>
              <div className="flex items-center gap-4 text-[0.85rem]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#10B981]" />
                  <span className="text-[#666]">고객 수</span>
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={lifecycleData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E8" vertical={false} />
                <XAxis dataKey="stage" stroke="#999" fontSize={17} tickLine={false} axisLine={{ stroke: "#E0E3E8" }} />
                <YAxis stroke="#999" fontSize={16} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #E0E3E8", borderRadius: "6px", fontSize: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={32} name="고객 수">
                  {lifecycleData.map((d) => (
                    <Bar key={d.stage} dataKey="count" fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert Banner */}
          <div className="bg-[#FFA726] rounded-lg px-5 py-3 flex items-center gap-3">
            <AlertTriangle size={14} className="text-white shrink-0" />
            <p className="text-white text-[0.9rem]">
              <strong>알림:</strong> 이탈 위험 신호가 감지된 고객 {healthInfo.risk}명이 있습니다. AI 제안을 확인하세요.
            </p>
          </div>
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
                { label: "활발", value: `${healthInfo.active}명`, color: "#2CBF60", icon: Heart },
                { label: "주의", value: `${healthInfo.warning}명`, color: "#F59E0B", icon: AlertTriangle },
                { label: "이탈 위험", value: `${healthInfo.risk}명`, color: "#EF4444", icon: TrendingUp },
                { label: "평균 스코어", value: `${healthInfo.avgHealth}`, color: "#1A1A1A", icon: Heart },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#F0F1F3] last:border-0">
                  <span className="text-[#999] text-[0.85rem]">{item.label}</span>
                  <span className="text-[0.9rem]" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upsell Opportunities */}
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={13} className="text-[#1A73E8]" />
              <h3 className="text-[#1A1A1A] text-[1.1rem]">업셀 기회</h3>
            </div>
            <div className="space-y-2.5">
              {upsellPicks.map((u) => (
                <div key={u.name} className="pb-2.5 border-b border-[#F0F1F3] last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[#1A1A1A] text-[0.85rem]">{u.name}</span>
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
