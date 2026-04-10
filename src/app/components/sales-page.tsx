import { useState } from "react";
import {
  Settings2,
  Plus,
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
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

const pipelineData = [
  { stage: "리드", count: 24, value: 120 },
  { stage: "검증", count: 15, value: 85 },
  { stage: "제안", count: 8, value: 64 },
  { stage: "성사", count: 4, value: 48 },
];

const revenueData = [
  { month: "1월", value: 42 },
  { month: "2월", value: 58 },
  { month: "3월", value: 45 },
  { month: "4월", value: 72 },
  { month: "5월", value: 68 },
  { month: "6월", value: 85 },
];

const topDeals = [
  { name: "MediCare 시스템", value: "₩120M", progress: 95, status: "성사" },
  { name: "GlobalTrade 플랫폼", value: "₩78M", progress: 72, status: "제안" },
  { name: "TechVision ERP", value: "₩45M", progress: 55, status: "검증" },
];

const activities = [
  { action: "김현수님이 MediCare 딜을 성사로 이동", time: "30분 전" },
  { action: "박지영님이 GlobalTrade 제안서 전송", time: "1시간 전" },
  { action: "이준호님이 새 리드 ABC Corp 추가", time: "2시간 전" },
  { action: "최미란님이 TechVision 미팅 일정 등록", time: "3시간 전" },
];

const pipelineInfo = {
  stage: "검증 단계",
  deals: 15,
  avgValue: "₩5,000만",
  conversionRate: "34.2%",
};

export function SalesPage() {
  const [pipelineActive, setPipelineActive] = useState(true);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#1A1A1A] text-[27px]">영업관리</h1>
          <p className="text-[#999] text-[0.9rem]">영업 파이프라인 및 실적 현황</p>
        </div>
        <button className="flex items-center gap-2 text-[#1A73E8] text-[0.9rem] hover:underline">
          <Settings2 size={12} />
          대시보드 설정
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "총 파이프라인", value: "₩295.5M", change: "+12.5%", icon: DollarSign, changeColor: "#2CBF60" },
          { label: "이번 달 매출", value: "₩85M", change: "+23.1%", icon: TrendingUp, changeColor: "#2CBF60" },
          { label: "전환율", value: "34.2%", change: "+5.4%", icon: Target, changeColor: "#2CBF60" },
          { label: "활성 딜", value: "24건", change: "+3", icon: Activity, changeColor: "#1A73E8" },
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
            {/* Revenue Forecast */}
            <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
              <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">매출 전망</h3>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E8" vertical={false} />
                  <XAxis dataKey="month" stroke="#999" fontSize={16} tickLine={false} axisLine={false} />
                  <YAxis stroke="#999" fontSize={16} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}M`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #E0E3E8", borderRadius: "6px", fontSize: "9px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#1A73E8" strokeWidth={2} dot={{ r: 2.5, fill: "#1A73E8", strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top Deals */}
            <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
              <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">주요 딜</h3>
              <div className="space-y-3">
                {topDeals.map((deal) => (
                  <div key={deal.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#1A1A1A] text-[0.85rem]">{deal.name}</span>
                      <span className="text-[#1A73E8] text-[0.85rem]">{deal.value}</span>
                    </div>
                    <div className="h-1.5 bg-[#F0F1F3] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${deal.progress}%`,
                          backgroundColor: deal.progress > 80 ? "#2CBF60" : "#1A73E8",
                        }}
                      />
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

          {/* Pipeline Chart */}
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1A1A1A] text-[1.2rem]">영업 파이프라인</h3>
              <div className="flex items-center gap-4 text-[0.85rem]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#1A73E8]" />
                  <span className="text-[#666]">딜 수</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#2CBF60]" />
                  <span className="text-[#666]">금액 (M)</span>
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E3E8" vertical={false} />
                <XAxis dataKey="stage" stroke="#999" fontSize={17} tickLine={false} axisLine={{ stroke: "#E0E3E8" }} />
                <YAxis stroke="#999" fontSize={16} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#fff", border: "1px solid #E0E3E8", borderRadius: "6px", fontSize: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                />
                <Bar dataKey="count" fill="#1A73E8" radius={[4, 4, 0, 0]} barSize={22} name="딜 수" key="bar-count" />
                <Bar dataKey="value" fill="#2CBF60" radius={[4, 4, 0, 0]} barSize={22} name="금액 (M)" key="bar-value" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert Banner */}
          <div className="bg-[#FFA726] rounded-lg px-5 py-3 flex items-center gap-3">
            <AlertTriangle size={14} className="text-white shrink-0" />
            <p className="text-white text-[0.9rem]">
              <strong>알림:</strong> 5건의 휴면 리드에 대한 재참여가 필요합니다. 검토 후 조치가 필요합니다.
            </p>
          </div>
        </div>

        {/* Right Summary Panel */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#1A1A1A] text-[1rem]">파이프라인 정보</h3>
              <button
                onClick={() => setPipelineActive(!pipelineActive)}
                className="text-[#1A73E8]"
              >
                {pipelineActive ? (
                  <ToggleRight size={19} />
                ) : (
                  <ToggleLeft size={19} className="text-[#D1D5DB]" />
                )}
              </button>
            </div>
            <p className="text-[0.8rem] text-[#999] mb-3">파이프라인 활성</p>

            <div className="space-y-3">
              {[
                { label: "단계", value: pipelineInfo.stage },
                { label: "딜 수", value: pipelineInfo.deals },
                { label: "평균 금액", value: pipelineInfo.avgValue },
                { label: "전환율", value: pipelineInfo.conversionRate },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#F0F1F3] last:border-0">
                  <span className="text-[#999] text-[0.85rem]">{item.label}</span>
                  <span className="text-[#1A1A1A] text-[0.9rem]">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white border border-[#E0E3E8] rounded-lg p-4">
            <h3 className="text-[#1A1A1A] text-[1.1rem] mb-3">빠른 통계</h3>
            <div className="space-y-2.5">
              {[
                { label: "이번 주 미팅", value: "12건", color: "#1A73E8" },
                { label: "완료된 태스크", value: "28건", color: "#2CBF60" },
                { label: "신규 리드", value: "7건", color: "#FFA726" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[#666] text-[0.85rem]">{s.label}</span>
                  <span className="text-[0.9rem]" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}