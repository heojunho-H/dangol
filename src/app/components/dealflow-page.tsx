import React, { useState, useMemo, useCallback } from "react";
import { useParams } from "react-router";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Search,
  Filter,
  Plus,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  X,
  MoreHorizontal,
  Pencil,
  GripVertical,
  Sparkles,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  PieChart as PieIcon,
  Table2,
  TrendingUp,
  Grid3X3,
  Gauge,
  StickyNote,
  Calendar,
  Phone,
  Mail,
  Info,
  ArrowUpDown,
  ListFilter,
  Users,
  Target,
  DollarSign,
  Activity,
  Clock,
  AlertTriangle,
  Zap,
  LayoutGrid,
  ChevronUp,
  Columns3,
  CalendarRange,
  User,
  Settings,
  Palette,
  Trash2,
  Lock,
  Unlock,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";

/* ─── DESIGN TOKENS ─── */
const T = {
  primary: "#1A472A",
  primaryDark: "#133D22",
  success: "#2CBF60",
  warning: "#F59E0B",
  danger: "#EF4444",
  textPrimary: "#1A1A1A",
  textSecondary: "#999",
  border: "#E0E3E8",
  surface: "#FFFFFF",
  bg: "#F8F9FA",
  widgetBg: "#F1F5F9",
};

/* ─── PIPELINE STAGE TYPE ─── */
interface PipelineStage {
  id: string;
  name: string;
  color: string;
  type: "active" | "won" | "lost";
}

const DEFAULT_STAGES: PipelineStage[] = [
  { id: "s1", name: "신규",        color: "#3B82F6", type: "active" },
  { id: "s2", name: "유선상담",     color: "#06B6D4", type: "active" },
  { id: "s3", name: "견적서 발송",  color: "#8B5CF6", type: "active" },
  { id: "s4", name: "유선견적상담", color: "#6366F1", type: "active" },
  { id: "s5", name: "가격조율",     color: "#F59E0B", type: "active" },
  { id: "s6", name: "일정조율",     color: "#F97316", type: "active" },
  { id: "s7", name: "수주확정",     color: "#10B981", type: "won" },
];

const STAGE_PALETTE = [
  "#3B82F6", "#06B6D4", "#8B5CF6", "#6366F1", "#F59E0B",
  "#F97316", "#10B981", "#EF4444", "#EC4899", "#14B8A6",
  "#84CC16", "#A855F7", "#F43F5E", "#0EA5E9", "#D946EF",
];

function buildStageColors(stages: PipelineStage[]): Record<string, string> {
  const map: Record<string, string> = {};
  stages.forEach((s) => { map[s.name] = s.color; });
  return map;
}

/* ─── SAVED VIEW TYPE ─── */
interface SavedView {
  id: string;
  name: string;
  viewType: ViewType;
  stageFilter: string;
  statusFilter: string;
  searchQuery: string;
}

const DEFAULT_VIEWS: SavedView[] = [
  { id: "v1", name: "전체 딜",     viewType: "table",    stageFilter: "전체", statusFilter: "전체", searchQuery: "" },
  { id: "v2", name: "파이프라인",  viewType: "kanban",   stageFilter: "전체", statusFilter: "전체", searchQuery: "" },
  { id: "v3", name: "일정",       viewType: "timeline", stageFilter: "전체", statusFilter: "전체", searchQuery: "" },
];

/* ─── CUSTOM FIELD TYPE ─── */
type FieldType = "text" | "number" | "select" | "multi-select" | "date" | "person" | "phone" | "email" | "file";

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  locked: boolean;
  options?: string[];
  visible: boolean;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "텍스트",
  number: "숫자",
  select: "��택(단일)",
  "multi-select": "선택(다중)",
  date: "날짜",
  person: "사람",
  phone: "전화번호",
  email: "이메일",
  file: "파일 첨부",
};

const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: "📝", number: "💰", select: "📋", "multi-select": "🏷️",
  date: "📅", person: "👤", phone: "📞", email: "✉️", file: "📎",
};

const DEFAULT_FIELDS: CustomField[] = [
  { id: "f1",  key: "company",  label: "기업명",           type: "text",    required: true,  locked: true,  visible: true },
  { id: "f2",  key: "stage",    label: "진행상태",         type: "select",  required: false, locked: false, visible: true, options: [] },
  { id: "f3",  key: "contact",  label: "담당자",           type: "text",    required: false, locked: false, visible: true },
  { id: "f4",  key: "position", label: "직책",             type: "text",    required: false, locked: false, visible: false },
  { id: "f5",  key: "service",  label: "희망서비스",       type: "text",    required: false, locked: false, visible: true },
  { id: "f6",  key: "amount",   label: "견적금액(VAT미포함)", type: "number",  required: false, locked: false, visible: true },
  { id: "f7",  key: "quantity", label: "총수량",           type: "number",  required: false, locked: false, visible: true },
  { id: "f8",  key: "manager",  label: "고객책임자",       type: "person",  required: false, locked: false, visible: true },
  { id: "f9",  key: "status",   label: "성공여부",         type: "select",  required: false, locked: false, visible: true, options: ["진행중", "성공", "실패"] },
  { id: "f10", key: "date",     label: "등록일",           type: "date",    required: false, locked: false, visible: true },
  { id: "f11", key: "phone",    label: "전화번호",         type: "phone",   required: false, locked: false, visible: false },
  { id: "f12", key: "email",    label: "이메일",           type: "email",   required: false, locked: false, visible: false },
  { id: "f13", key: "memo",     label: "비고",             type: "text",    required: false, locked: false, visible: false },
];

/* ─── SAMPLE DATA ─── */
const statusColors: Record<string, { bg: string; text: string }> = {
  진행중: { bg: "#F1F5F9", text: "#64748B" },
  성공: { bg: "#ECFDF5", text: "#059669" },
  실패: { bg: "#FEF2F2", text: "#DC2626" },
};

interface Deal {
  id: number;
  company: string;
  stage: string;
  contact: string;
  position: string;
  service: string;
  quantity: number;
  amount: string;
  manager: string;
  status: string;
  date: string;
  [key: string]: unknown;
}


/* ─── SAMPLE DEALS (onboarding 완료 시 로드) ─── */
const SAMPLE_DEALS: Deal[] = [
  { id: 1,  company: "(주)테크솔루션",     stage: "수주확정",    contact: "김영호", position: "이사",  service: "ERP 구축",            quantity: 120, amount: "₩3,200만", manager: "박지은", status: "성공",  date: "2026-03-15" },
  { id: 2,  company: "스마트팩토리(주)",   stage: "가격조율",    contact: "이수진", position: "부장",  service: "MES 도입",            quantity: 85,  amount: "₩2,800만", manager: "김태현", status: "진행중", date: "2026-03-18" },
  { id: 3,  company: "(주)글로벌트레이드", stage: "견적서 발송", contact: "박민수", position: "과장",  service: "SCM 컨설팅",          quantity: 200, amount: "₩5,500만", manager: "이서연", status: "진행중", date: "2026-03-20" },
  { id: 4,  company: "디지털커머스(주)",   stage: "신규",        contact: "최지아", position: "대리",  service: "CRM 솔루션",          quantity: 50,  amount: "₩1,200만", manager: "박지은", status: "진행중", date: "2026-03-22" },
  { id: 5,  company: "(주)바이오헬스",     stage: "유선상담",    contact: "정대현", position: "팀장",  service: "데이터 분석",         quantity: 30,  amount: "₩980만",  manager: "김태현", status: "진행중", date: "2026-03-25" },
  { id: 6,  company: "에너지플러스(주)",   stage: "일정조율",    contact: "한소희", position: "차장",  service: "IoT 플랫폼",          quantity: 150, amount: "₩4,100만", manager: "이서연", status: "진행중", date: "2026-03-28" },
  { id: 7,  company: "(주)푸드테크",       stage: "유선견적상담",contact: "오재석", position: "과장",  service: "POS 시스템",          quantity: 90,  amount: "₩1,500만", manager: "박지은", status: "진행중", date: "2026-04-01" },
  { id: 8,  company: "클라우드원(주)",     stage: "수주확정",    contact: "윤미래", position: "부장",  service: "클라우드 마이그레이션",quantity: 40,  amount: "₩6,200만", manager: "김태현", status: "성공",  date: "2026-04-03" },
  { id: 9,  company: "(주)핀테크랩",       stage: "견적서 발송", contact: "서준혁", position: "이사",  service: "결제 시스템",         quantity: 60,  amount: "₩2,300만", manager: "이서연", status: "진행중", date: "2026-04-05" },
  { id: 10, company: "모빌리티솔루션(주)", stage: "신규",        contact: "강하은", position: "대리",  service: "차량 관제 시스템",    quantity: 200, amount: "₩8,500만", manager: "박지은", status: "진행중", date: "2026-04-07" },
  { id: 11, company: "(주)헬스케어AI",     stage: "가격조율",    contact: "윤성민", position: "팀장",  service: "의료 AI 솔루션",      quantity: 1,   amount: "₩1.2억",   manager: "김태현", status: "진행중", date: "2026-03-10" },
  { id: 12, company: "리테일허브(주)",     stage: "수주확정",    contact: "조은지", position: "과장",  service: "POS 통합 시스템",     quantity: 300, amount: "₩4,700만", manager: "이서연", status: "성공",  date: "2026-02-28" },
  { id: 13, company: "(주)스마트물류",     stage: "유선상담",    contact: "임재현", position: "부장",  service: "WMS 도입",            quantity: 80,  amount: "₩3,400만", manager: "박지은", status: "실패",  date: "2026-02-14" },
  { id: 14, company: "에듀테크파트너(주)", stage: "유선견적상담",contact: "노지수", position: "이사",  service: "LMS 구축",            quantity: 500, amount: "₩9,800만", manager: "김태현", status: "진행중", date: "2026-04-08" },
  { id: 15, company: "(주)그린에너지",     stage: "일정조율",    contact: "배소연", position: "차장",  service: "에너지 모니터링",     quantity: 100, amount: "₩2,100만", manager: "이서연", status: "진행중", date: "2026-01-20" },
];

/* ─── WIDGET DEFINITIONS ─── */
interface WidgetDef {
  id: string;
  name: string;
  description: string;
  category: "kpi" | "chart" | "table" | "utility";
  icon: typeof BarChart3;
  colSpan: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
}

const WIDGET_CATEGORIES = [
  { key: "kpi" as const, label: "KPI 지표", icon: Zap },
  { key: "chart" as const, label: "차트", icon: BarChart3 },
  { key: "table" as const, label: "테이블", icon: Table2 },
  { key: "utility" as const, label: "유틸리티", icon: StickyNote },
];

const allWidgets: WidgetDef[] = [
  { id: "kpi-deals", name: "총 딜 수", description: "현재 진행중인 전체 딜 수를 표시합니다", category: "kpi", icon: BarChart3, colSpan: 1 },
  { id: "kpi-winrate", name: "수주율 (건수)", description: "건수 기준 수주 성공률을 표시합니다", category: "kpi", icon: Target, colSpan: 1 },
  { id: "kpi-amount", name: "총 견적 금액", description: "전체 견적 금액 합계를 표시합니다", category: "kpi", icon: DollarSign, colSpan: 1 },
  { id: "kpi-winrate-amount", name: "수주율 (금액)", description: "금액 기준 수주 성공률을 표시합니다", category: "kpi", icon: TrendingUp, colSpan: 1 },
  { id: "kpi-active", name: "활성 딜", description: "현재 진행중인 딜 건수를 표시합니다", category: "kpi", icon: Activity, colSpan: 1 },
  { id: "kpi-avg-cycle", name: "평균 영업 주기", description: "딜 생성부터 종료까지 평균 일수입니다", category: "kpi", icon: Clock, colSpan: 1 },
  { id: "kpi-at-risk", name: "위험 딜", description: "장기 미진행 또는 지연된 딜 수입니다", category: "kpi", icon: AlertTriangle, colSpan: 1 },
  { id: "kpi-new-month", name: "이달 신규", description: "이번 달 새로 생성된 딜 건수입니다", category: "kpi", icon: Plus, colSpan: 1 },
  { id: "funnel", name: "파이프라인 퍼널", description: "각 스테이지별 딜 분포를 막대 차트로 표시합니다", category: "chart", icon: Filter, colSpan: 3 },
  { id: "donut", name: "성공여부 분포", description: "딜의 성공/실패/진행중 비율을 도넛 차트로 표시합니다", category: "chart", icon: PieIcon, colSpan: 1 },
  { id: "trend", name: "월별 추이", description: "최근 6개월간 딜 수와 금액 추이를 꺾은선 그래프로 표시합니다", category: "chart", icon: TrendingUp, colSpan: 2 },
  { id: "stage-bar", name: "스테이지별 금액", description: "각 스테이지별 누적 금액을 가로 막대로 표시합니다", category: "chart", icon: BarChart3, colSpan: 2 },
  { id: "performance", name: "담당자별 성과", description: "영업 담당자별 딜 수, 수주율, 금액을 테이블로 표시합니다", category: "table", icon: Users, colSpan: 2 },
  { id: "recent-deals", name: "최근 딜 목록", description: "최근 등록된 딜 5건을 간략히 표시합니다", category: "table", icon: Table2, colSpan: 2 },
  { id: "memo", name: "메모", description: "자유롭게 텍스트 메모를 작성할 수 있습니다", category: "utility", icon: StickyNote, colSpan: 1 },
  { id: "shortcuts", name: "빠른 실행", description: "자주 사용하는 기능에 빠르게 접근합니다", category: "utility", icon: Zap, colSpan: 1 },
];

/* ─── AMOUNT PARSER (₩3,200만 → 3200, ₩1.8억 → 18000) ─── */
function parseAmt(s: string): number {
  const cleaned = s.replace(/[₩,\s]/g, "");
  const m = cleaned.match(/^(\d+(?:\.\d+)?)(억|만)?$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (m[2] === "억") return Math.round(n * 10000);
  if (m[2] === "만") return Math.round(n);
  return Math.round(n / 10000); // 원 단위로 입력된 경우 만 단위로 변환
}

function fmtAmt(manWon: number): string {
  if (manWon >= 10000) return `₩${(manWon / 10000).toFixed(1)}억`;
  if (manWon > 0) return `₩${manWon}만`;
  return "₩0";
}

const DEFAULT_ACTIVE_WIDGETS = ["kpi-deals", "kpi-winrate", "kpi-amount", "kpi-winrate-amount", "funnel", "donut"];

/* ─── ONBOARDING FLOW ─── */
function OnboardingFlow({ onComplete }: { onComplete: (deals: Deal[]) => void }) {
  const [step, setStep] = useState(1);
  const [fileSelected, setFileSelected] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const excelColumns = [
    { name: "회사명", preview: "(주)테크솔루션" },
    { name: "담당자", preview: "김영호" },
    { name: "직책", preview: "이사" },
    { name: "연락처", preview: "010-1234-5678" },
    { name: "email", preview: "kim@tech.co.kr" },
    { name: "서비스", preview: "ERP 구축" },
    { name: "수량", preview: "120" },
    { name: "금액", preview: "32000000" },
    { name: "영업담당", preview: "박지은" },
    { name: "상태", preview: "견적서 발송" },
    { name: "등록일자", preview: "2026-03-15" },
  ];

  const dealflowFields = [
    { name: "기업명", required: true },
    { name: "담당자명", required: false },
    { name: "직책", required: false },
    { name: "전화번호", required: false },
    { name: "이메일", required: false },
    { name: "희망서비스", required: true },
    { name: "총수량", required: false },
    { name: "견적금액", required: false },
    { name: "담당자", required: false },
    { name: "진행상태", required: false },
    { name: "문의 등록일", required: false },
  ];

  const [mappings, setMappings] = useState<Record<string, string>>({
    기업명: "회사명",
    담당자명: "담당자",
    직책: "직책",
    전화번호: "연락처",
    이메일: "email",
    희망서비스: "서비스",
    총수량: "수량",
    견적금액: "금액",
    담당자: "영업담당",
    진행상태: "상태",
    "문의 등록일": "등록일자",
  });

  const autoMap = () => {
    setMappings({
      기업명: "회사명",
      담당자명: "담당자",
      직책: "직책",
      전화번호: "연락처",
      이메일: "email",
      희망서비스: "서비스",
      총수량: "수량",
      견적금액: "금액",
      담당자: "영업담당",
      진행상태: "상태",
      "문의 등록일": "등록일자",
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ background: T.bg }}>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[0.8rem]"
              style={{
                background: step >= s ? T.primary : "#E0E3E8",
                color: step >= s ? "#fff" : "#999",
              }}
            >
              {step > s ? "✓" : s}
            </div>
            <span
              className="text-[0.8rem]"
              style={{ color: step >= s ? T.textPrimary : "#999" }}
            >
              {s === 1 ? "파일 업로드" : s === 2 ? "컬럼 매핑" : "완료"}
            </span>
            {s < 3 && <div className="w-12 h-px" style={{ background: step > s ? T.primary : "#E0E3E8" }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl p-10 w-full max-w-[480px]" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "#EBF5FF" }}>
              <FileSpreadsheet size={22} color={T.primary} />
            </div>
            <h2 className="text-[22px] text-[#1A1A1A] mb-2">영업 데이터를 가져오세요</h2>
            <p className="text-[0.85rem] text-[#999] mb-8">기존 Excel 파일을 업로드하면 자동으로 딜 데이터가 생성됩니다.</p>

            <div
              className="w-full rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors mb-4"
              style={{
                border: `2px dashed ${dragOver ? T.primary : "#E0E3E8"}`,
                background: dragOver ? "#F0F7FF" : "#FAFBFC",
                minHeight: 180,
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); setFileSelected(true); }}
              onClick={() => setFileSelected(true)}
            >
              <Upload size={26} color="#999" className="mb-3" />
              {fileSelected ? (
                <p className="text-[0.85rem]" style={{ color: T.primary }}>sample_deals.xlsx 선택됨</p>
              ) : (
                <>
                  <p className="text-[0.85rem] text-[#666] mb-1">여기에 파일을 끌어다 놓으세요</p>
                  <p className="text-[0.8rem]" style={{ color: T.primary }}>또는 파일 선택</p>
                </>
              )}
            </div>
            <p className="text-[0.75rem] text-[#BBB] mb-6">지원 형식: .xlsx, .xls, .csv · 최대 10MB</p>

            <div className="flex items-center gap-4 w-full">
              <button className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-[0.8rem] text-[#666] hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>
                <Download size={13} /> 샘플 파일 다운로드
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[0.8rem] text-white transition-colors"
                style={{ background: fileSelected ? T.primary : "#CCC", cursor: fileSelected ? "pointer" : "not-allowed" }}
                onClick={() => fileSelected && setStep(2)}
                disabled={!fileSelected}
              >
                다음 <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl p-8 w-full max-w-[720px]" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[1.2rem] text-[#1A1A1A]">컬럼 매핑</h2>
            <button
              onClick={autoMap}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-[0.8rem] transition-colors"
              style={{ background: "#F0F4FF", color: T.primary }}
            >
              <Sparkles size={13} /> AI 자동 매핑
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[0.75rem] text-[#999] mb-3 uppercase tracking-wider">Excel 컬럼</p>
              <div className="space-y-2">
                {excelColumns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between px-4 py-2.5 rounded-lg" style={{ background: "#F8F9FA", border: `1px solid ${T.border}` }}>
                    <span className="text-[0.8rem] text-[#1A1A1A]">{col.name}</span>
                    <span className="text-[0.7rem] text-[#BBB]">{col.preview}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[0.75rem] text-[#999] mb-3 uppercase tracking-wider">DealFlow 필드</p>
              <div className="space-y-2">
                {dealflowFields.map((field) => (
                  <div key={field.name} className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: "#F8F9FA", border: `1px solid ${T.primary}` }}>
                    <span className="text-[0.8rem] text-[#1A1A1A] flex-1">
                      {field.name}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    <select
                      className="text-[0.75rem] px-2 py-1 rounded border bg-white text-[#666]"
                      style={{ borderColor: T.border }}
                      value={mappings[field.name] || ""}
                      onChange={(e) => setMappings((p) => ({ ...p, [field.name]: e.target.value }))}
                    >
                      <option value="">선택</option>
                      {excelColumns.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-lg text-[0.8rem] text-white transition-colors"
              style={{ background: T.primary }}
            >
              데이터 가져오기 ({SAMPLE_DEALS.length}건)
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-2xl p-10 w-full max-w-[416px] text-center" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#ECFDF5" }}>
            <CheckCircle2 size={26} color={T.success} />
          </div>
          <h2 className="text-[22px] text-[#1A1A1A] mb-2">데이터 가져오기 완료!</h2>
          <p className="text-[0.9rem] text-[#666] mb-6">{SAMPLE_DEALS.length}건의 딜이 성공적으로 추가되었습니다</p>
          <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
            {[`기업 ${new Set(SAMPLE_DEALS.map((d) => d.company)).size}개`, `담당자 ${new Set(SAMPLE_DEALS.map((d) => d.manager)).size}명`, `총 견적 ${(SAMPLE_DEALS.reduce((s, d) => s + parseInt(d.amount.replace(/[₩,만억\s]/g, "") || "0"), 0) / 10000).toFixed(1)}억`].map((s) => (
              <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem]" style={{ background: "#ECFDF5", color: "#059669" }}>
                ✓ {s}
              </span>
            ))}
          </div>
          <button
            onClick={() => onComplete(SAMPLE_DEALS)}
            className="px-8 py-3 rounded-lg text-[0.85rem] text-white transition-colors"
            style={{ background: T.primary }}
          >
            대시보드로 이동하기
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── DETAIL DRAWER ─── */
function DetailDrawer({ deal, onClose, stageColorMap }: { deal: Deal; onClose: () => void; stageColorMap: Record<string, string> }) {
  const [tab, setTab] = useState<"basic" | "quantity" | "memo">("basic");
  const tabs = [
    { key: "basic" as const, label: "기본정보" },
    { key: "quantity" as const, label: "상세수량" },
    { key: "memo" as const, label: "관리메모" },
  ];

  return (
    <div className="w-[384px] h-full bg-white border-l flex flex-col shrink-0" style={{ borderColor: T.border }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-3">
          <span className="text-[1rem] text-[#1A1A1A]">{deal.company}</span>
          <span
            className="px-2.5 py-0.5 rounded-md text-[0.7rem]"
            style={{ background: (stageColorMap[deal.stage] || "#999") + "18", color: stageColorMap[deal.stage] || "#999" }}
          >
            {deal.stage}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-[#F7F8FA] transition-colors">
          <X size={14} color="#999" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 px-6 pt-4 border-b" style={{ borderColor: T.border }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="pb-3 text-[0.8rem] transition-colors"
            style={{
              color: tab === t.key ? T.primary : "#999",
              borderBottom: tab === t.key ? `2px solid ${T.primary}` : "2px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {tab === "basic" && (
          <>
            {[
              { label: "기업명", value: deal.company },
              { label: "담당자", value: deal.contact },
              { label: "직책", value: deal.position },
              { label: "전화번호", value: "010-1234-5678" },
              { label: "이메일", value: `${deal.contact.toLowerCase()}@company.com` },
              { label: "희망서비스", value: deal.service },
              { label: "총수량", value: `${deal.quantity}개` },
              { label: "견적금액", value: deal.amount },
              { label: "고객책임자", value: deal.manager },
              { label: "진행상태", value: deal.stage },
              { label: "성공여부", value: deal.status },
              { label: "등록일", value: deal.date },
            ].map((field) => (
              <div key={field.label} className="grid grid-cols-[120px_1fr] gap-2 items-center">
                <span className="text-[0.75rem] text-[#999]">{field.label}</span>
                <span className="text-[0.8rem] text-[#1A1A1A]">{field.value}</span>
              </div>
            ))}
            <div className="mt-4 p-4 rounded-xl" style={{ background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} color="#7C3AED" />
                <span className="text-[0.8rem] text-[#7C3AED]">AI 기업정보 조회</span>
              </div>
              <p className="text-[0.7rem] text-[#8B5CF6]">클릭하여 이 기업의 상세정보를 AI로 분석합니다.</p>
            </div>
          </>
        )}
        {tab === "quantity" && (
          <div className="space-y-3">
            <p className="text-[0.85rem] text-[#1A1A1A]">상세 수량 정보</p>
            {[
              { item: "기본 라이선스", qty: deal.quantity, unit: "₩250,000" },
              { item: "추가 모듈", qty: Math.floor(deal.quantity * 0.3), unit: "₩180,000" },
              { item: "교육 서비스", qty: 2, unit: "₩500,000" },
            ].map((row) => (
              <div key={row.item} className="flex items-center justify-between py-2.5 px-3 rounded-lg" style={{ background: "#F8F9FA" }}>
                <span className="text-[0.8rem] text-[#444]">{row.item}</span>
                <span className="text-[0.8rem] text-[#1A1A1A]">{row.qty}개 × {row.unit}</span>
              </div>
            ))}
          </div>
        )}
        {tab === "memo" && (
          <div>
            <p className="text-[0.75rem] text-[#999] mb-3">관리 메모</p>
            <textarea
              className="w-full h-40 p-3 rounded-lg text-[0.8rem] text-[#1A1A1A] resize-none focus:outline-none"
              style={{ background: "#F8F9FA", border: `1px solid ${T.border}` }}
              placeholder="메모를 입력하세요..."
              defaultValue="초기 미팅 후 긍정적 반응. 다음 주 데모 예정."
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t" style={{ borderColor: T.border }}>
        <button
          className="w-full py-2.5 rounded-lg text-[0.8rem] text-white transition-colors"
          style={{ background: T.success }}
        >
          수주확정으로 변경
        </button>
      </div>
    </div>
  );
}

/* ─── WIDGET PALETTE (카테고리 기반 갤러리) ─── */
function WidgetPalette({ onClose, activeWidgets, onToggleWidget }: { onClose: () => void; activeWidgets: Set<string>; onToggleWidget: (id: string) => void }) {
  const [selCat, setSelCat] = useState<string>("all");
  const filtered = selCat === "all" ? allWidgets : allWidgets.filter((w) => w.category === selCat);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-[576px] max-h-[85vh] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }}>
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: T.border }}>
          <div><h2 className="text-[1.1rem] text-[#1A1A1A]">위젯 갤러리</h2><p className="text-[0.75rem] text-[#999] mt-1">대시보드에 표시할 위젯을 선택하세요</p></div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F7F8FA]"><X size={16} color="#999" /></button>
        </div>
        <div className="flex items-center gap-2 px-7 py-3 border-b overflow-x-auto" style={{ borderColor: T.border }}>
          <button onClick={() => setSelCat("all")} className="px-3.5 py-1.5 rounded-full text-[0.7rem] shrink-0 transition-colors" style={{ background: selCat === "all" ? T.primary : "transparent", color: selCat === "all" ? "#fff" : "#666" }}>전체 ({allWidgets.length})</button>
          {WIDGET_CATEGORIES.map((c) => {
            const n = allWidgets.filter((w) => w.category === c.key).length;
            return <button key={c.key} onClick={() => setSelCat(c.key)} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[0.7rem] shrink-0 transition-colors" style={{ background: selCat === c.key ? T.primary : "transparent", color: selCat === c.key ? "#fff" : "#666" }}><c.icon size={11} />{c.label} ({n})</button>;
          })}
        </div>
        <div className="flex-1 overflow-y-auto p-7">
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((w) => {
              const on = activeWidgets.has(w.id);
              return (
                <div key={w.id} onClick={() => onToggleWidget(w.id)} className="p-4 rounded-xl border flex flex-col gap-2.5 transition-all cursor-pointer hover:shadow-sm" style={{ borderColor: on ? T.primary : T.border, background: on ? "#F0F7F2" : "#fff" }}>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: on ? "#D5E8DA" : "#F3F4F6" }}><w.icon size={16} color={on ? T.primary : "#666"} /></div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: on ? T.primary : "#D1D5DB", background: on ? T.primary : "transparent" }}>{on && <CheckCircle2 size={11} color="#fff" />}</div>
                  </div>
                  <div><p className="text-[0.75rem] text-[#1A1A1A] mb-0.5">{w.name}</p><p className="text-[0.65rem] text-[#999] leading-relaxed">{w.description}</p></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-full" style={{ background: "#F3F4F6", color: "#666" }}>{w.colSpan === 1 ? "1칸" : w.colSpan === 2 ? "2칸" : w.colSpan === 3 ? "3칸" : "4칸"}</span>
                    <span className="text-[0.6rem] px-2 py-0.5 rounded-full" style={{ background: "#F3F4F6", color: "#666" }}>{WIDGET_CATEGORIES.find((c) => c.key === w.category)?.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between px-7 py-4 border-t" style={{ borderColor: T.border }}>
          <span className="text-[0.75rem] text-[#999]">{activeWidgets.size}개 위젯 활성</span>
          <button onClick={onClose} className="px-6 py-2 rounded-lg text-[0.75rem] text-white" style={{ background: T.primary }}>완료</button>
        </div>
      </div>
    </div>
  );
}

/* ─── WIDGET CONTENT RENDERER ─── */
function WidgetContent({ widgetId, deals, stageColorMap }: { widgetId: string; deals: Deal[]; stageColorMap: Record<string, string> }) {
  /* ── KPI computations ── */
  const total = deals.length;
  const wonDeals = deals.filter((d) => d.status === "성공");
  const wonCount = wonDeals.length;
  const totalAmt = deals.reduce((s, d) => s + parseAmt(d.amount), 0);
  const wonAmt = wonDeals.reduce((s, d) => s + parseAmt(d.amount), 0);
  const activeCount = deals.filter((d) => d.status === "진행중").length;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const newThisMonth = deals.filter((d) => d.date.startsWith(thisMonth)).length;
  /* at-risk: 진행중이며 30일 이상 경과 */
  const atRisk = deals.filter((d) => {
    if (d.status !== "진행중") return false;
    const diff = (now.getTime() - new Date(d.date).getTime()) / 86400000;
    return diff >= 30;
  }).length;
  /* avg cycle: 성공/실패 딜만 */
  const closedDeals = deals.filter((d) => d.status !== "진행중");
  const avgCycle = closedDeals.length > 0
    ? Math.round(closedDeals.reduce((s, d) => s + (now.getTime() - new Date(d.date).getTime()) / 86400000, 0) / closedDeals.length)
    : 0;

  if (widgetId.startsWith("kpi-")) {
    type KpiEntry = { title: string; value: string; sub: string; trend: string; trendColor: string; icon: typeof BarChart3; iconBg: string };
    const kpiMap: Record<string, KpiEntry> = {
      "kpi-deals":         { title: "총 딜 수",       value: `${total}건`,        sub: "전체 등록 딜",        trend: `활성 ${activeCount}건`,    trendColor: T.primary,    icon: BarChart3,    iconBg: "#EFF5F1" },
      "kpi-winrate":       { title: "수주율 (건수)",   value: total > 0 ? `${Math.round((wonCount / total) * 100)}%` : "0%", sub: `수주 ${wonCount}건`,     trend: `전체 ${total}건`,          trendColor: T.success,    icon: Target,       iconBg: "#ECFDF5" },
      "kpi-amount":        { title: "총 견적 금액",    value: fmtAmt(totalAmt),   sub: "VAT 미포함",         trend: `수주 ${fmtAmt(wonAmt)}`,   trendColor: "#6366F1",    icon: DollarSign,   iconBg: "#EEF2FF" },
      "kpi-winrate-amount":{ title: "수주율 (금액)",   value: totalAmt > 0 ? `${Math.round((wonAmt / totalAmt) * 100)}%` : "0%", sub: `수주액 ${fmtAmt(wonAmt)}`, trend: `총 ${fmtAmt(totalAmt)}`, trendColor: T.success, icon: TrendingUp, iconBg: "#ECFDF5" },
      "kpi-active":        { title: "활성 딜",        value: `${activeCount}건`,  sub: "진행중 딜",          trend: `전체의 ${total > 0 ? Math.round((activeCount / total) * 100) : 0}%`, trendColor: "#06B6D4", icon: Activity, iconBg: "#ECFEFF" },
      "kpi-avg-cycle":     { title: "평균 영업 주기", value: `${avgCycle}일`,     sub: "종료 딜 기준",       trend: `종료 ${closedDeals.length}건`, trendColor: "#F59E0B", icon: Clock,      iconBg: "#FFFBEB" },
      "kpi-at-risk":       { title: "위험 딜",        value: `${atRisk}건`,       sub: "30일+ 미진행",       trend: activeCount > 0 ? `활성의 ${Math.round((atRisk / activeCount) * 100)}%` : "0%", trendColor: T.danger, icon: AlertTriangle, iconBg: "#FEF2F2" },
      "kpi-new-month":     { title: "이달 신규",      value: `${newThisMonth}건`, sub: thisMonth,            trend: `전체의 ${total > 0 ? Math.round((newThisMonth / total) * 100) : 0}%`, trendColor: "#8B5CF6", icon: Plus, iconBg: "#F5F3FF" },
    };
    const kpi = kpiMap[widgetId];
    if (!kpi) return null;
    const Ic = kpi.icon;
    return (
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: kpi.iconBg }}><Ic size={18} color={T.primary} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.7rem] text-[#999] mb-1">{kpi.title}</p>
          <p className="text-[24px] text-[#1A1A1A] leading-none mb-2">{kpi.value}</p>
          <div className="flex items-center justify-between">
            <span className="text-[0.65rem] text-[#BBB]">{kpi.sub}</span>
            <span className="text-[0.65rem] px-2 py-0.5 rounded-full" style={{ color: kpi.trendColor, background: kpi.trendColor + "14" }}>{kpi.trend}</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Funnel data ── */
  const funnelData = Object.keys(stageColorMap).map((stage) => ({
    stage,
    count: deals.filter((d) => d.stage === stage).length,
  }));

  if (widgetId === "funnel") return <><p className="text-[0.85rem] text-[#1A1A1A] mb-4">영업 파이프라인 현황</p><FunnelBar data={funnelData} stageColorMap={stageColorMap} /></>;

  /* ── Donut data ── */
  const statusCounts: Record<string, number> = { 진행중: 0, 성공: 0, 실패: 0 };
  deals.forEach((d) => { if (d.status in statusCounts) statusCounts[d.status]++; });
  const donutColors: Record<string, string> = { 진행중: "#3B82F6", 성공: "#10B981", 실패: "#EF4444" };
  const donutData = Object.entries(statusCounts).map(([name, count]) => ({
    name, count, color: donutColors[name],
    value: total > 0 ? Math.round((count / total) * 100) : 0,
  }));

  if (widgetId === "donut") return (
    <>
      <p className="text-[0.85rem] text-[#1A1A1A] mb-2">성공여부 분포</p>
      <div className="h-[144px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donutData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" paddingAngle={3}>{donutData.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip formatter={(v: number) => `${v}%`} /></PieChart></ResponsiveContainer></div>
      <div className="flex justify-center gap-4 mt-1">{donutData.map((d) => (<div key={d.name} className="flex items-center gap-1.5 text-[0.65rem]"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /><span className="text-[#666]">{d.name}</span><span className="text-[#999]">{d.count}건</span></div>))}</div>
    </>
  );

  /* ── Trend data (last 6 months) ── */
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}월`;
    const monthDeals = deals.filter((deal) => deal.date.startsWith(key));
    return { month: label, deals: monthDeals.length, amount: monthDeals.reduce((s, deal) => s + parseAmt(deal.amount), 0) };
  });

  if (widgetId === "trend") return (
    <>
      <p className="text-[0.85rem] text-[#1A1A1A] mb-4">월별 딜 추이</p>
      <div className="h-[160px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData}><defs><linearGradient id="cDeals" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.primary} stopOpacity={0.15} /><stop offset="95%" stopColor={T.primary} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} /><Tooltip /><Area type="monotone" dataKey="deals" stroke={T.primary} fill="url(#cDeals)" strokeWidth={2} name="딜 수" /></AreaChart></ResponsiveContainer></div>
    </>
  );

  /* ── Stage-amount data ── */
  const stageAmountData = Object.keys(stageColorMap).map((stage) => ({
    stage,
    amount: deals.filter((d) => d.stage === stage).reduce((s, d) => s + parseAmt(d.amount), 0),
  })).filter((s) => s.amount > 0);

  if (widgetId === "stage-bar") return (
    <>
      <p className="text-[0.85rem] text-[#1A1A1A] mb-4">스테이지별 금액</p>
      <div className="h-[160px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={stageAmountData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}만`} /><YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} width={68} /><Tooltip formatter={(v: number) => `${v}만원`} /><Bar dataKey="amount" radius={[0, 4, 4, 0]} fill={T.primary} barSize={14} /></BarChart></ResponsiveContainer></div>
    </>
  );

  /* ── Performance data ── */
  const perfMap: Record<string, { deals: number; won: number; amount: number }> = {};
  deals.forEach((d) => {
    if (!d.manager) return;
    if (!perfMap[d.manager]) perfMap[d.manager] = { deals: 0, won: 0, amount: 0 };
    perfMap[d.manager].deals++;
    if (d.status === "성공") perfMap[d.manager].won++;
    perfMap[d.manager].amount += parseAmt(d.amount);
  });
  const performanceData = Object.entries(perfMap).map(([name, v]) => ({
    name, deals: v.deals, won: v.won,
    rate: v.deals > 0 ? `${Math.round((v.won / v.deals) * 100)}%` : "0%",
    amount: fmtAmt(v.amount),
  }));

  if (widgetId === "performance") return (
    <>
      <p className="text-[0.85rem] text-[#1A1A1A] mb-4">담당자별 성과</p>
      <table className="w-full"><thead><tr className="border-b" style={{ borderColor: T.border }}>{["담당자", "딜 수", "수주", "수주율", "총 금액"].map((h) => <th key={h} className="text-left py-2.5 px-3 text-[0.65rem] text-[#999]">{h}</th>)}</tr></thead>
      <tbody>{performanceData.map((p) => <tr key={p.name} className="border-b last:border-0" style={{ borderColor: T.border }}><td className="py-2.5 px-3"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] text-white" style={{ background: T.primary }}>{p.name[0]}</div><span className="text-[0.7rem] text-[#1A1A1A]">{p.name}</span></div></td><td className="py-2.5 px-3 text-[0.7rem] text-[#555]">{p.deals}</td><td className="py-2.5 px-3 text-[0.7rem] text-[#555]">{p.won}</td><td className="py-2.5 px-3 text-[0.7rem]" style={{ color: T.primary }}>{p.rate}</td><td className="py-2.5 px-3 text-[0.7rem] text-[#555]">{p.amount}</td></tr>)}</tbody></table>
    </>
  );

  /* ── Recent deals ── */
  const recentDeals = [...deals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  if (widgetId === "recent-deals") return (
    <>
      <p className="text-[0.85rem] text-[#1A1A1A] mb-4">최근 딜 목록</p>
      <div className="space-y-2">{recentDeals.map((d) => <div key={d.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#FAFBFC] transition-colors"><div className="flex items-center gap-3"><span className="text-[0.7rem] text-[#1A1A1A]">{d.company}</span><span className="text-[0.6rem] px-2 py-0.5 rounded-md" style={{ background: (stageColorMap[d.stage] || "#999") + "18", color: stageColorMap[d.stage] || "#999" }}>{d.stage}</span></div><span className="text-[0.7rem] text-[#999]">{d.amount}</span></div>)}</div>
    </>
  );
  if (widgetId === "memo") return (
    <>
      <p className="text-[0.85rem] text-[#1A1A1A] mb-3">메모</p>
      <textarea className="w-full h-[112px] p-3 rounded-lg text-[0.75rem] text-[#1A1A1A] resize-none focus:outline-none" style={{ background: "#F8F9FA", border: `1px solid ${T.border}` }} placeholder="메모를 입력하세요..." />
    </>
  );
  if (widgetId === "shortcuts") {
    const sc = [{ label: "딜 추가", icon: Plus, color: T.primary }, { label: "Excel 가져오기", icon: Upload, color: "#6366F1" }, { label: "보고서 내보내기", icon: Download, color: "#F59E0B" }, { label: "팀 성과 분석", icon: Users, color: "#06B6D4" }];
    return (
      <>
        <p className="text-[0.85rem] text-[#1A1A1A] mb-3">빠른 실행</p>
        <div className="grid grid-cols-2 gap-2">{sc.map((s) => <button key={s.label} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[0.7rem] text-[#555] hover:bg-[#FAFBFC] transition-colors" style={{ borderColor: T.border }}><s.icon size={13} color={s.color} />{s.label}</button>)}</div>
      </>
    );
  }
  return null;
}

/* ─── CUSTOM FUNNEL BAR ─── */
function FunnelBar({ data, stageColorMap }: { data: Array<{ stage: string; count: number }>; stageColorMap: Record<string, string> }) {
  const maxCount = Math.max(...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-2 h-[144px]">
      {data.map((d) => (
        <div key={d.stage} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[0.75rem] text-[#1A1A1A]">{d.count}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.count / maxCount) * 140}px`,
              background: stageColorMap[d.stage] || "#999",
              opacity: 0.85,
            }}
          />
          <span className="text-[0.6rem] text-[#999] text-center leading-tight mt-1 whitespace-nowrap">{d.stage}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── COLUMN DEFINITIONS ─── */
interface ColumnDef {
  key: string;
  label: string;
  required: boolean;
  info?: boolean;
  filter?: boolean;
  sort?: boolean;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: "company", label: "기업명", required: true, filter: true, sort: true, defaultVisible: true },
  { key: "stage", label: "진행상태", required: false, info: true, filter: true, sort: true, defaultVisible: true },
  { key: "contact", label: "담당자", required: false, sort: true, defaultVisible: true },
  { key: "position", label: "직책", required: false, sort: true, defaultVisible: false },
  { key: "service", label: "희망서비스", required: false, filter: true, sort: true, defaultVisible: true },
  { key: "amount", label: "견적금액(VAT미포함)", required: false, info: true, filter: true, sort: true, defaultVisible: true },
  { key: "quantity", label: "총수량", required: false, info: true, sort: true, defaultVisible: true },
  { key: "manager", label: "고객책임자", required: false, filter: true, defaultVisible: true },
  { key: "status", label: "성공여부", required: false, filter: true, sort: true, defaultVisible: true },
  { key: "date", label: "등록일", required: false, sort: true, defaultVisible: true },
  { key: "phone", label: "전화번호", required: false, sort: false, defaultVisible: false },
  { key: "email", label: "이메일", required: false, sort: true, defaultVisible: false },
  { key: "memo", label: "비고", required: false, sort: false, defaultVisible: false },
];

/* ─── ADD DEAL MODAL ─── */
function AddDealModal({ onClose, onAdd, visibleColumns, stageNames }: { onClose: () => void; onAdd: (deal: Deal) => void; visibleColumns: Set<string>; stageNames: string[] }) {
  const [form, setForm] = useState<Record<string, string>>({
    company: "", stage: "신규", contact: "", position: "", service: "",
    quantity: "", amount: "", manager: "", status: "진행중", date: new Date().toISOString().slice(0, 10),
    phone: "", email: "", memo: "",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = () => {
    if (!form.company.trim()) return;
    onAdd({
      id: Date.now(),
      company: form.company,
      stage: form.stage || "신규",
      contact: form.contact,
      position: form.position,
      service: form.service,
      quantity: parseInt(form.quantity) || 0,
      amount: form.amount || "₩0",
      manager: form.manager,
      status: form.status || "진행중",
      date: form.date,
    });
    onClose();
  };

  const fieldDefs = ALL_COLUMNS.filter((c) => visibleColumns.has(c.key) || c.required);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[512px] max-h-[85vh] flex flex-col" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: T.border }}>
          <h2 className="text-[1.1rem] text-[#1A1A1A]">새 딜 추가</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F8FA]"><X size={14} color="#999" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          {fieldDefs.map((col) => (
            <div key={col.key}>
              <label className="text-[0.75rem] text-[#666] mb-1.5 block">
                {col.label}
                {col.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {col.key === "stage" ? (
                <select className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A472A]" style={{ borderColor: T.border }} value={form.stage} onChange={(e) => set("stage", e.target.value)}>
                  {stageNames.map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : col.key === "status" ? (
                <select className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] bg-white focus:outline-none focus:border-[#1A472A]" style={{ borderColor: T.border }} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option>진행중</option><option>성공</option><option>실패</option>
                </select>
              ) : col.key === "date" ? (
                <input type="date" className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] focus:outline-none focus:border-[#1A472A]" style={{ borderColor: T.border }} value={form.date} onChange={(e) => set("date", e.target.value)} />
              ) : col.key === "memo" ? (
                <textarea className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] focus:outline-none focus:border-[#1A472A] resize-none h-[64px]" style={{ borderColor: T.border }} value={form[col.key] || ""} onChange={(e) => set(col.key, e.target.value)} placeholder={`${col.label}을 입력하세요`} />
              ) : (
                <input className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] placeholder-[#CCC] focus:outline-none focus:border-[#1A472A]" style={{ borderColor: T.border }} value={form[col.key] || ""} onChange={(e) => set(col.key, e.target.value)} placeholder={`${col.label}을 입력하세요`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t" style={{ borderColor: T.border }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[0.75rem] text-[#666] border hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>취소</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 rounded-lg text-[0.75rem] text-white transition-colors" style={{ background: form.company.trim() ? T.primary : "#CCC", cursor: form.company.trim() ? "pointer" : "not-allowed" }}>추가</button>
        </div>
      </div>
    </div>
  );
}

/* ─── PIPELINE SETTINGS MODAL ─── */
function PipelineSettingsModal({
  stages,
  onSave,
  onClose,
}: {
  stages: PipelineStage[];
  onSave: (stages: PipelineStage[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<PipelineStage[]>(() => stages.map((s) => ({ ...s })));
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const updateStage = (id: string, patch: Partial<PipelineStage>) => {
    setDraft((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeStage = (id: string) => {
    setDraft((prev) => prev.filter((s) => s.id !== id));
  };

  const addStage = () => {
    const id = `s-${Date.now()}`;
    const usedColors = new Set(draft.map((s) => s.color));
    const nextColor = STAGE_PALETTE.find((c) => !usedColors.has(c)) || STAGE_PALETTE[0];
    setDraft((prev) => [...prev, { id, name: "새 단계", color: nextColor, type: "active" }]);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setDraft((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[480px] max-h-[85vh] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: T.border }}>
          <div>
            <h2 className="text-[1.1rem] text-[#1A1A1A]">파이프라인 설정</h2>
            <p className="text-[0.7rem] text-[#999] mt-1">영업 프로세스에 맞게 단계를 구성하세요</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F7F8FA]"><X size={16} color="#999" /></button>
        </div>

        {/* Stage List */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <div className="space-y-2">
            {draft.map((stage, idx) => (
              <div
                key={stage.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                style={{
                  borderColor: dragIdx === idx ? T.primary : T.border,
                  background: dragIdx === idx ? "#F0F7F2" : "#fff",
                  cursor: "grab",
                }}
              >
                {/* Drag Handle */}
                <GripVertical size={14} className="text-[#CCC] shrink-0 cursor-grab" />

                {/* Color Picker */}
                <div className="relative shrink-0">
                  <input
                    type="color"
                    value={stage.color}
                    onChange={(e) => updateStage(stage.id, { color: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-7 h-7 rounded-lg" style={{ background: stage.color }} />
                </div>

                {/* Name */}
                <input
                  className="flex-1 text-[0.8rem] text-[#1A1A1A] bg-transparent focus:outline-none focus:bg-[#F8F9FA] rounded px-2 py-1 transition-colors"
                  value={stage.name}
                  onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                />

                {/* Type Badge */}
                <select
                  className="text-[0.65rem] px-2 py-1 rounded-lg border bg-white text-[#666] cursor-pointer"
                  style={{ borderColor: T.border }}
                  value={stage.type}
                  onChange={(e) => updateStage(stage.id, { type: e.target.value as PipelineStage["type"] })}
                >
                  <option value="active">진행</option>
                  <option value="won">승인(Win)</option>
                  <option value="lost">실패(Lost)</option>
                </select>

                {/* Delete */}
                <button
                  onClick={() => removeStage(stage.id)}
                  className="p-1.5 rounded-lg hover:bg-[#FEF2F2] transition-colors shrink-0"
                  title="삭제"
                >
                  <Trash2 size={12} color={T.danger} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Stage */}
          <button
            onClick={addStage}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-[0.8rem] text-[#999] hover:text-[#1A472A] hover:border-[#1A472A] hover:bg-[#FAFDFB] transition-all"
            style={{ borderColor: T.border }}
          >
            <Plus size={14} /> 스테이지 추가
          </button>

          {/* Quick color palette */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: T.border }}>
            <p className="text-[0.65rem] text-[#999] mb-2">빠른 색상 팔레트</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGE_PALETTE.map((c) => (
                <div key={c} className="w-6 h-6 rounded-md cursor-pointer hover:scale-110 transition-transform" style={{ background: c }} title={c} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t" style={{ borderColor: T.border }}>
          <span className="text-[0.7rem] text-[#999]">{draft.length}개 스테이지</span>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[0.75rem] text-[#666] border hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>취소</button>
            <button onClick={() => { onSave(draft); onClose(); }} className="px-6 py-2.5 rounded-lg text-[0.75rem] text-white" style={{ background: T.primary }}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── FIELD MANAGEMENT MODAL ─── */
function FieldManagementModal({
  fields,
  onSave,
  onClose,
}: {
  fields: CustomField[];
  onSave: (fields: CustomField[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CustomField[]>(() => fields.map((f) => ({ ...f })));
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateField = (id: string, patch: Partial<CustomField>) => {
    setDraft((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    const field = draft.find((f) => f.id === id);
    if (field?.locked) return;
    setDraft((prev) => prev.filter((f) => f.id !== id));
  };

  const addField = () => {
    const id = `f-${Date.now()}`;
    setDraft((prev) => [...prev, {
      id, key: `custom_${Date.now()}`, label: "새 필드", type: "text" as FieldType,
      required: false, locked: false, visible: true,
    }]);
    setEditingId(id);
  };

  const toggleVisible = (id: string) => {
    const f = draft.find((x) => x.id === id);
    if (f?.locked) return;
    updateField(id, { visible: !f?.visible });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[540px] max-h-[85vh] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: T.border }}>
          <div>
            <h2 className="text-[1.1rem] text-[#1A1A1A]">필드 관리</h2>
            <p className="text-[0.7rem] text-[#999] mt-1">딜 데이터의 필드를 추가하거나 수정하세요</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F7F8FA]"><X size={16} color="#999" /></button>
        </div>

        {/* Field List */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <div className="space-y-1.5">
            {draft.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all hover:shadow-sm"
                style={{ borderColor: editingId === field.id ? T.primary : T.border }}
              >
                {/* Icon */}
                <span className="text-[1rem] shrink-0">{FIELD_TYPE_ICONS[field.type]}</span>

                {/* Label */}
                {editingId === field.id ? (
                  <input
                    autoFocus
                    className="flex-1 text-[0.8rem] text-[#1A1A1A] border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#1A472A]"
                    style={{ borderColor: T.border }}
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditingId(null); }}
                  />
                ) : (
                  <span
                    className="flex-1 text-[0.8rem] text-[#1A1A1A] cursor-pointer hover:text-[#1A472A] transition-colors"
                    onClick={() => !field.locked && setEditingId(field.id)}
                  >
                    {field.label}
                  </span>
                )}

                {/* Type */}
                {field.locked ? (
                  <span className="text-[0.65rem] text-[#BBB] px-2 py-1 rounded-lg bg-[#F8F9FA]">{FIELD_TYPE_LABELS[field.type]}</span>
                ) : (
                  <select
                    className="text-[0.65rem] px-2 py-1 rounded-lg border bg-white text-[#666] cursor-pointer"
                    style={{ borderColor: T.border }}
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                  >
                    {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                )}

                {/* Badges */}
                {field.required && (
                  <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">필수</span>
                )}

                {/* Lock */}
                {field.locked ? (
                  <Lock size={12} className="text-[#CCC] shrink-0" />
                ) : (
                  <>
                    {/* Visibility Toggle */}
                    <button onClick={() => toggleVisible(field.id)} className="p-1 rounded hover:bg-[#F7F8FA] transition-colors shrink-0" title={field.visible ? "숨기기" : "보이기"}>
                      {field.visible ? <Eye size={12} color="#999" /> : <EyeOff size={12} color="#CCC" />}
                    </button>
                    {/* Delete */}
                    <button onClick={() => removeField(field.id)} className="p-1 rounded hover:bg-[#FEF2F2] transition-colors shrink-0" title="삭제">
                      <Trash2 size={12} color={T.danger} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add Field */}
          <button
            onClick={addField}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-[0.8rem] text-[#999] hover:text-[#1A472A] hover:border-[#1A472A] hover:bg-[#FAFDFB] transition-all"
            style={{ borderColor: T.border }}
          >
            <Plus size={14} /> 새 필드 추가
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t" style={{ borderColor: T.border }}>
          <span className="text-[0.7rem] text-[#999]">
            {draft.filter((f) => f.visible).length} / {draft.length}개 필드 표시
          </span>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[0.75rem] text-[#666] border hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>취소</button>
            <button onClick={() => { onSave(draft); onClose(); }} className="px-6 py-2.5 rounded-lg text-[0.75rem] text-white" style={{ background: T.primary }}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ADD VIEW MODAL ─── */
function AddViewModal({
  onAdd,
  onClose,
}: {
  onAdd: (view: SavedView) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [viewType, setViewType] = useState<ViewType>("table");

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      id: `v-${Date.now()}`,
      name: name.trim(),
      viewType,
      stageFilter: "전체",
      statusFilter: "전체",
      searchQuery: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[400px] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: T.border }}>
          <h2 className="text-[1.1rem] text-[#1A1A1A]">새 뷰 추가</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F7F8FA]"><X size={16} color="#999" /></button>
        </div>
        <div className="px-7 py-5 space-y-4">
          <div>
            <label className="text-[0.75rem] text-[#666] mb-1.5 block">뷰 이름</label>
            <input
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] placeholder-[#CCC] focus:outline-none focus:border-[#1A472A]"
              style={{ borderColor: T.border }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 이번 달 신규 딜"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
          </div>
          <div>
            <label className="text-[0.75rem] text-[#666] mb-2 block">뷰 타입</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "table" as ViewType, label: "테이블", icon: Table2 },
                { key: "kanban" as ViewType, label: "칸반", icon: Columns3 },
                { key: "timeline" as ViewType, label: "타임라인", icon: CalendarRange },
              ]).map((v) => {
                const active = viewType === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => setViewType(v.key)}
                    className="flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: active ? T.primary : T.border,
                      background: active ? "#F0F7F2" : "#fff",
                    }}
                  >
                    <v.icon size={18} color={active ? T.primary : "#999"} />
                    <span className="text-[0.7rem]" style={{ color: active ? T.primary : "#666" }}>{v.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t" style={{ borderColor: T.border }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[0.75rem] text-[#666] border hover:bg-[#F7F8FA]" style={{ borderColor: T.border }}>취소</button>
          <button
            onClick={handleAdd}
            className="px-6 py-2.5 rounded-lg text-[0.75rem] text-white"
            style={{ background: name.trim() ? T.primary : "#CCC", cursor: name.trim() ? "pointer" : "not-allowed" }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── VIEW TYPE ─── */
type ViewType = "table" | "kanban" | "timeline";

/* ─── KANBAN: DRAG ITEM TYPE ─── */
const DEAL_DRAG_TYPE = "DEAL_CARD";

interface DealDragItem {
  id: number;
  stage: string;
}

/* ─── KANBAN: CARD FIELD OPTIONS ─── */
type KanbanCardField = "company" | "amount" | "manager" | "date" | "service" | "contact" | "status" | "quantity";

const KANBAN_FIELD_OPTIONS: { key: KanbanCardField; label: string }[] = [
  { key: "company", label: "기업명" },
  { key: "amount", label: "견적금액" },
  { key: "manager", label: "담당자" },
  { key: "date", label: "등록일" },
  { key: "service", label: "희망서비스" },
  { key: "contact", label: "연락처" },
  { key: "status", label: "성공여부" },
  { key: "quantity", label: "수량" },
];

const DEFAULT_CARD_FIELDS: KanbanCardField[] = ["company", "amount", "manager", "date"];

/* ─── KANBAN: DEAL CARD ─── */
function KanbanCard({
  deal,
  color,
  cardFields,
  onClick,
}: {
  deal: Deal;
  color: string;
  cardFields: KanbanCardField[];
  onClick: (deal: Deal) => void;
}) {
  const [{ isDragging }, dragRef] = useDrag({
    type: DEAL_DRAG_TYPE,
    item: { id: deal.id, stage: deal.stage } as DealDragItem,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const showField = (f: KanbanCardField) => cardFields.includes(f);

  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      onClick={() => onClick(deal)}
      className="bg-white rounded-xl border p-4 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group/card"
      style={{
        borderColor: T.border,
        borderLeft: `3px solid ${color}`,
        opacity: isDragging ? 0.35 : 1,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
        transform: isDragging ? "rotate(2deg)" : "none",
      }}
    >
      {/* Company name — always shown */}
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-[0.8rem] text-[#1A1A1A] leading-snug font-medium">{deal.company}</span>
        <button className="p-0.5 rounded opacity-0 group-hover/card:opacity-100 hover:bg-[#F7F8FA] transition-all shrink-0 ml-2">
          <MoreHorizontal size={12} className="text-[#BBB]" />
        </button>
      </div>

      {/* Amount */}
      {showField("amount") && (
        <p className="text-[0.9rem] text-[#1A1A1A] mb-2 tabular-nums font-semibold">{deal.amount}</p>
      )}

      {/* Service */}
      {showField("service") && deal.service && (
        <p className="text-[0.65rem] text-[#888] mb-2 leading-snug">{deal.service}</p>
      )}

      {/* Contact */}
      {showField("contact") && deal.contact && (
        <div className="flex items-center gap-1.5 mb-2">
          <User size={10} className="text-[#BBB]" />
          <span className="text-[0.65rem] text-[#666]">{deal.contact}{deal.position ? ` · ${deal.position}` : ""}</span>
        </div>
      )}

      {/* Status badge */}
      {showField("status") && (
        <div className="mb-2">
          <span
            className="inline-flex items-center text-[0.6rem] px-2 py-0.5 rounded-full"
            style={{
              background: statusColors[deal.status]?.bg || "#F1F5F9",
              color: statusColors[deal.status]?.text || "#64748B",
            }}
          >
            {deal.status}
          </span>
        </div>
      )}

      {/* Quantity */}
      {showField("quantity") && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[0.6rem] text-[#BBB]">수량</span>
          <span className="text-[0.65rem] text-[#555] tabular-nums">{deal.quantity.toLocaleString()}</span>
        </div>
      )}

      {/* Footer: manager + date */}
      {(showField("manager") || showField("date")) && (
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "#F0F1F3" }}>
          {showField("manager") ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[0.45rem] text-white" style={{ background: "#94A3B8" }}>
                {deal.manager.charAt(0)}
              </div>
              <span className="text-[0.65rem] text-[#999]">{deal.manager}</span>
            </div>
          ) : <div />}
          {showField("date") && (
            <span className="text-[0.6rem] text-[#BBB] tabular-nums">{deal.date.slice(5)}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── KANBAN: STAGE COLUMN ─── */
function KanbanColumn({
  stage,
  deals,
  color,
  cardFields,
  onDropDeal,
  onClickDeal,
  onAddDeal,
}: {
  stage: string;
  deals: Deal[];
  color: string;
  cardFields: KanbanCardField[];
  onDropDeal: (dealId: number, toStage: string) => void;
  onClickDeal: (deal: Deal) => void;
  onAddDeal: () => void;
}) {
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: DEAL_DRAG_TYPE,
    drop: (item: DealDragItem) => {
      if (item.stage !== stage) {
        onDropDeal(item.id, stage);
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  const totalAmount = deals.reduce((s, d) => s + parseAmt(d.amount), 0);

  return (
    <div
      ref={dropRef as unknown as React.Ref<HTMLDivElement>}
      className="flex flex-col min-w-[240px] max-w-[288px] flex-1 rounded-xl transition-all"
      style={{
        background: isOver ? color + "08" : "#F8F9FB",
        border: isOver ? `2px dashed ${color}` : canDrop ? `2px dashed ${color}30` : "2px solid transparent",
      }}
    >
      {/* Column Header */}
      <div className="px-3.5 pt-3 pb-2.5">
        <div className="w-full h-[3px] rounded-full mb-3" style={{ background: color }} />
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[0.8rem] text-[#1A1A1A] font-medium flex-1">{stage}</span>
          <span
            className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium"
            style={{ background: color + "14", color }}
          >
            {deals.length}
          </span>
        </div>
        <p className="text-[0.75rem] text-[#999] tabular-nums">{fmtAmt(totalAmount)}</p>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-2.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 420px)" }}>
        {deals.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: color + "10" }}>
              <Plus size={12} color={color} />
            </div>
            <span className="text-[0.65rem] text-[#CCC]">딜을 여기에 드래그하세요</span>
          </div>
        )}
        {deals.map((deal) => (
          <KanbanCard key={deal.id} deal={deal} color={color} cardFields={cardFields} onClick={onClickDeal} />
        ))}
      </div>

      {/* Add Button */}
      <div className="px-2.5 pb-3">
        <button
          onClick={onAddDeal}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[0.7rem] text-[#999] hover:text-[#1A472A] hover:bg-white border border-dashed hover:border-solid transition-all"
          style={{ borderColor: T.border }}
        >
          <Plus size={11} /> 딜 추가
        </button>
      </div>
    </div>
  );
}

/* ─── KANBAN: CARD FIELD SETTINGS POPOVER ─── */
function KanbanFieldPopover({
  cardFields,
  onToggle,
  onClose,
}: {
  cardFields: KanbanCardField[];
  onToggle: (field: KanbanCardField) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl border w-[220px]"
        style={{
          borderColor: T.border,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          top: "auto",
          right: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: T.border }}>
          <span className="text-[0.8rem] text-[#1A1A1A]">카드 필드 설정</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#F7F8FA]">
            <X size={12} color="#999" />
          </button>
        </div>
        <div className="p-2.5 max-h-[280px] overflow-y-auto">
          {KANBAN_FIELD_OPTIONS.map((opt) => {
            const isLocked = opt.key === "company";
            const isChecked = isLocked || cardFields.includes(opt.key);
            return (
              <label
                key={opt.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F8F9FA] cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isLocked}
                  onChange={() => !isLocked && onToggle(opt.key)}
                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#1A472A] focus:ring-[#1A472A]"
                />
                <span className="text-[0.75rem] text-[#333] flex-1">{opt.label}</span>
                {isLocked && <span className="text-[0.6rem] text-[#CCC]">필수</span>}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── KANBAN VIEW ─── */
function KanbanView({
  deals,
  pipelineStages,
  stageColorMap,
  onMoveDeal,
  onClickDeal,
  onAddDeal,
}: {
  deals: Deal[];
  pipelineStages: PipelineStage[];
  stageColorMap: Record<string, string>;
  onMoveDeal: (dealId: number, toStage: string) => void;
  onClickDeal: (deal: Deal) => void;
  onAddDeal: () => void;
}) {
  const [cardFields, setCardFields] = useState<KanbanCardField[]>(DEFAULT_CARD_FIELDS);
  const [showFieldPopover, setShowFieldPopover] = useState(false);

  const toggleCardField = (field: KanbanCardField) => {
    setCardFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const stages = pipelineStages.map((s) => s.name);
  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    stages.forEach((s) => { map[s] = []; });
    deals.forEach((d) => {
      if (map[d.stage]) map[d.stage].push(d);
    });
    return map;
  }, [deals, stages.join(",")]);

  const totalDeals = deals.length;
  const totalAmount = deals.reduce((s, d) => s + parseAmt(d.amount), 0);

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Kanban Toolbar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[0.75rem] text-[#999]">
            {pipelineStages.length}개 스테이지 · {totalDeals}건 · {fmtAmt(totalAmount)}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFieldPopover(!showFieldPopover)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[0.7rem] text-[#666] hover:bg-[#F7F8FA] transition-colors"
            style={{ borderColor: T.border }}
          >
            <Settings size={11} /> 카드 필드
          </button>
          {showFieldPopover && (
            <KanbanFieldPopover
              cardFields={cardFields}
              onToggle={toggleCardField}
              onClose={() => setShowFieldPopover(false)}
            />
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 360 }}>
        {stages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            deals={dealsByStage[stage] || []}
            color={stageColorMap[stage] || "#999"}
            cardFields={cardFields}
            onDropDeal={onMoveDeal}
            onClickDeal={onClickDeal}
            onAddDeal={onAddDeal}
          />
        ))}
      </div>
    </DndProvider>
  );
}

/* ─── TIMELINE VIEW ─── */
function TimelineView({
  deals,
  onClickDeal,
  stageColorMap,
}: {
  deals: Deal[];
  onClickDeal: (deal: Deal) => void;
  stageColorMap: Record<string, string>;
}) {
  const [offsetMonth, setOffsetMonth] = useState(0);

  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth() + offsetMonth, 1);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, month: d.getMonth() + 1, year: d.getFullYear() };
  });

  const dealsByMonth = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    months.forEach((m) => { map[m.key] = []; });
    deals.forEach((d) => {
      const key = d.date.slice(0, 7);
      if (map[key]) map[key].push(d);
    });
    return map;
  }, [deals, months.map((m) => m.key).join(",")]);

  const totalInRange = months.reduce((s, m) => s + (dealsByMonth[m.key]?.length || 0), 0);

  return (
    <div>
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setOffsetMonth((p) => p - 3)} className="p-1.5 rounded-lg border hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>
            <ChevronLeft size={13} color="#666" />
          </button>
          <span className="text-[0.8rem] text-[#1A1A1A] min-w-[200px] text-center">
            {months[0].label} — {months[months.length - 1].label}
          </span>
          <button onClick={() => setOffsetMonth((p) => p + 3)} className="p-1.5 rounded-lg border hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>
            <ChevronRightIcon size={13} color="#666" />
          </button>
          <button onClick={() => setOffsetMonth(0)} className="ml-2 px-3 py-1.5 rounded-lg text-[0.7rem] text-[#666] border hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>
            오늘
          </button>
        </div>
        <span className="text-[0.7rem] text-[#999]">{totalInRange}건 표시</span>
      </div>

      {/* Timeline Grid */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* Month Headers */}
        <div className="grid border-b" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)`, borderColor: T.border }}>
          {months.map((m, i) => {
            const isCurrentMonth = m.year === now.getFullYear() && m.month === now.getMonth() + 1 && offsetMonth <= 0;
            return (
              <div
                key={m.key}
                className="px-4 py-3 text-center border-r last:border-r-0"
                style={{
                  borderColor: T.border,
                  background: isCurrentMonth ? "#EFF5F1" : "#FAFBFC",
                }}
              >
                <p className="text-[0.7rem] text-[#999]">{m.year}</p>
                <p className={`text-[0.85rem] ${isCurrentMonth ? "text-[#1A472A]" : "text-[#1A1A1A]"}`}>
                  {m.month}월
                </p>
                <p className="text-[0.6rem] text-[#BBB] mt-0.5">{dealsByMonth[m.key]?.length || 0}건</p>
              </div>
            );
          })}
        </div>

        {/* Deal Rows */}
        <div className="grid" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
          {months.map((m) => {
            const monthDeals = dealsByMonth[m.key] || [];
            return (
              <div key={m.key} className="border-r last:border-r-0 min-h-[200px] p-2" style={{ borderColor: T.border }}>
                {monthDeals.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-[0.65rem] text-[#DDD]">—</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {monthDeals.map((deal) => (
                      <div
                        key={deal.id}
                        onClick={() => onClickDeal(deal)}
                        className="p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-sm hover:border-[#1A472A]"
                        style={{ borderColor: T.border, borderLeft: `3px solid ${stageColorMap[deal.stage] || "#999"}` }}
                      >
                        <p className="text-[0.7rem] text-[#1A1A1A] mb-1 leading-snug">{deal.company}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[0.7rem] text-[#1A1A1A] tabular-nums">{deal.amount}</span>
                          <span
                            className="text-[0.55rem] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: (stageColorMap[deal.stage] || "#999") + "14",
                              color: stageColorMap[deal.stage] || "#999",
                            }}
                          >
                            {deal.stage}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[0.4rem] text-white" style={{ background: "#94A3B8" }}>
                            {deal.manager.charAt(0)}
                          </div>
                          <span className="text-[0.55rem] text-[#999]">{deal.manager}</span>
                          <span className="text-[0.55rem] text-[#CCC] ml-auto tabular-nums">{deal.date.slice(8)}일</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
function DealflowPageInner() {
  /* ── Customization State ── */
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
  const [savedViews, setSavedViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [activeViewId, setActiveViewId] = useState<string>("v1");
  const [customFields, setCustomFields] = useState<CustomField[]>(DEFAULT_FIELDS);

  /* ── Modal Toggles ── */
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  const [showFieldManagement, setShowFieldManagement] = useState(false);
  const [showAddView, setShowAddView] = useState(false);

  /* ── Derived: stageColors map ── */
  const stageColors = useMemo(() => buildStageColors(pipelineStages), [pipelineStages]);

  /* ── Active View ── */
  const activeViewObj = savedViews.find((v) => v.id === activeViewId) || savedViews[0];
  const activeView = activeViewObj.viewType;

  const setActiveView = (vt: ViewType) => {
    // find or create matching view
    const existing = savedViews.find((v) => v.id === activeViewId);
    if (existing) {
      setSavedViews((prev) => prev.map((v) => v.id === activeViewId ? { ...v, viewType: vt } : v));
    }
  };

  /* ── Original State ── */
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [customizeMode, setCustomizeMode] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [activeWidgets, setActiveWidgets] = useState<Set<string>>(new Set(DEFAULT_ACTIVE_WIDGETS));
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);
  const [customerDeals, setCustomerDeals] = useState<Deal[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  );

  const toggleColumn = (key: string) => {
    const col = ALL_COLUMNS.find((c) => c.key === key);
    if (col?.required) return;
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const addDeal = (deal: Deal) => {
    setCustomerDeals((prev) => [deal, ...prev]);
  };

  const handleOnboardingComplete = (importedDeals: Deal[]) => {
    setCustomerDeals((prev) => {
      const existingIds = new Set(prev.map((d) => d.id));
      const newDeals = importedDeals.filter((d) => !existingIds.has(d.id));
      return [...newDeals, ...prev];
    });
    setShowOnboarding(false);
  };

  const moveDealStage = useCallback((dealId: number, toStage: string) => {
    setCustomerDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: toStage } : d))
    );
  }, []);

  /* ── View Management ── */
  const addView = (view: SavedView) => {
    setSavedViews((prev) => [...prev, view]);
    setActiveViewId(view.id);
  };

  const removeView = (id: string) => {
    if (savedViews.length <= 1) return;
    setSavedViews((prev) => prev.filter((v) => v.id !== id));
    if (activeViewId === id) setActiveViewId(savedViews[0].id);
  };

  const toggleWidget = (id: string) => {
    setActiveWidgets((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const removeWidget = (id: string) => {
    setActiveWidgets((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const filteredDeals = useMemo(() => {
    return customerDeals.filter((d) => {
      if (searchQuery && !d.company.includes(searchQuery) && !d.contact.includes(searchQuery)) return false;
      if (stageFilter !== "전체" && d.stage !== stageFilter) return false;
      if (statusFilter !== "전체" && d.status !== statusFilter) return false;
      return true;
    });
  }, [searchQuery, stageFilter, statusFilter, customerDeals]);

  const toggleAll = () => {
    if (selectedIds.size === filteredDeals.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredDeals.map((d) => d.id)));
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: T.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b shrink-0" style={{ borderColor: T.border }}>
        <div>
          <p className="text-[0.7rem] text-[#BBB] mb-0.5">영업관리 &gt; DealFlow</p>
          <h1 className="text-[24px] text-[#1A1A1A]">영업 관리</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPipelineSettings(true)} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] text-[#666] hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }} title="파이프라인 설정">
            <Settings size={12} /> 파이프라인
          </button>
          <button onClick={() => setShowFieldManagement(true)} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] text-[#666] hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }} title="필드 관리">
            <Grid3X3 size={12} /> 필드
          </button>
          <div className="w-px h-5" style={{ background: T.border }} />
          <div className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] text-[#666]" style={{ borderColor: T.border }}>
            <Calendar size={12} /> 2026년 4월
          </div>
          <button onClick={() => setShowOnboarding(true)} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] transition-colors hover:bg-[#F7F8FA]" style={{ borderColor: T.border, color: "#666" }}>
            <Upload size={12} /> Excel 가져오기
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] text-[#666] hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>
            <Download size={12} /> XLSX 내보내기
          </button>
          <button onClick={() => setShowAddDeal(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.75rem] text-white transition-colors" style={{ background: T.primary }}>
            <Plus size={12} /> 딜 추가
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* ZONE 1: 대시보드 위젯 그리드 */}
            <div>
              {customerDeals.length === 0 ? (
                /* 딜 데이터 없음 → 위젯 추가 플레이스홀더만 노출 */
                <div
                  onClick={() => setCustomizeMode(true)}
                  className="rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#1A472A] hover:bg-[#FAFBFC] min-h-[128px]"
                  style={{ border: `2px dashed ${T.border}` }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2.5" style={{ background: "#EFF5F1" }}>
                    <Plus size={16} color={T.primary} />
                  </div>
                  <span className="text-[0.75rem] text-[#999]">위젯 추가</span>
                  <span className="text-[0.65rem] text-[#CCC] mt-1">딜 데이터를 추가하면 대시보드를 구성할 수 있습니다</span>
                </div>
              ) : (
                /* 딜 데이터 있음 → 전체 대시보드 */
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <LayoutGrid size={16} color={T.primary} />
                      <span className="text-[1.1rem] text-[#1A1A1A]">대시보드</span>
                      <span className="text-[0.7rem] text-[#999]">{activeWidgets.size}개 위젯</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCustomizeMode(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.75rem] transition-colors hover:bg-[#EFF5F1]"
                        style={{ color: T.primary, border: `1px solid ${T.border}` }}
                      >
                        <Plus size={12} /> 위젯 추가
                      </button>
                      <button
                        onClick={() => setDashboardCollapsed(!dashboardCollapsed)}
                        className="p-2 rounded-lg hover:bg-[#F7F8FA] transition-colors"
                        style={{ border: `1px solid ${T.border}` }}
                      >
                        {dashboardCollapsed ? <ChevronDown size={13} color="#999" /> : <ChevronUp size={13} color="#999" />}
                      </button>
                    </div>
                  </div>

                  {!dashboardCollapsed && (
                    <>
                      {activeWidgets.size > 0 ? (
                        <div className="grid grid-cols-4 gap-4">
                          {allWidgets
                            .filter((w) => activeWidgets.has(w.id))
                            .map((w) => (
                              <div
                                key={w.id}
                                className="bg-white rounded-xl p-5 border relative group"
                                style={{
                                  borderColor: T.border,
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                  gridColumn: `span ${w.colSpan}`,
                                }}
                              >
                                <button
                                  onClick={() => removeWidget(w.id)}
                                  className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FEF2F2] z-10"
                                  title="위젯 제거"
                                >
                                  <X size={10} color={T.danger} />
                                </button>
                                <WidgetContent widgetId={w.id} deals={customerDeals} stageColorMap={stageColors} />
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div
                          onClick={() => setCustomizeMode(true)}
                          className="rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#1A472A] hover:bg-[#FAFBFC] min-h-[128px]"
                          style={{ border: `2px dashed ${T.border}` }}
                        >
                          <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2.5" style={{ background: "#EFF5F1" }}>
                            <Plus size={16} color={T.primary} />
                          </div>
                          <span className="text-[0.75rem] text-[#999]">위젯 추가</span>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* ZONE 2: 고객 데이터 */}
            <div>
              {/* Section Header with View Tabs */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  {/* Saved Views Tabs */}
                  <div className="flex items-center bg-white border rounded-lg overflow-hidden" style={{ borderColor: T.border }}>
                    {savedViews.map((v) => {
                      const isActive = activeViewId === v.id;
                      const ViewIcon = v.viewType === "table" ? Table2 : v.viewType === "kanban" ? Columns3 : CalendarRange;
                      return (
                        <div
                          key={v.id}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-[0.75rem] transition-colors border-r last:border-r-0 cursor-pointer group relative"
                          style={{
                            borderColor: T.border,
                            background: isActive ? T.primary : "transparent",
                            color: isActive ? "#fff" : "#666",
                          }}
                          onClick={() => setActiveViewId(v.id)}
                        >
                          <ViewIcon size={13} />
                          {v.name}
                          {savedViews.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeView(v.id); }}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10"
                              title="뷰 삭제"
                            >
                              <X size={9} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button
                      onClick={() => setShowAddView(true)}
                      className="flex items-center gap-1 px-2.5 py-2 text-[0.7rem] text-[#999] hover:text-[#666] hover:bg-[#F7F8FA] transition-colors"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <span className="text-[1.1rem] text-[#1A1A1A]">딜 데이터</span>
                  {customerDeals.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[0.7rem]" style={{ background: "#EFF5F1", color: T.primary }}>
                      {filteredDeals.length === customerDeals.length ? `${customerDeals.length}건` : `${filteredDeals.length} / ${customerDeals.length}건`}
                    </span>
                  )}
                </div>
                {customerDeals.length > 0 && (
                  <button
                    onClick={() => setShowAddDeal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.75rem] text-white transition-colors hover:opacity-90"
                    style={{ background: T.primary }}
                  >
                    <Plus size={12} /> 딜 추가
                  </button>
                )}
              </div>

              {customerDeals.length === 0 ? (
                /* ─── Empty State ─── */
                <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="py-20 px-8 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-3 mb-7">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#EFF5F1" }}>
                        <Users size={16} color={T.primary} />
                      </div>
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#EFF5F1" }}>
                        <FileSpreadsheet size={21} color={T.primary} />
                      </div>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#EFF5F1" }}>
                        <TrendingUp size={16} color={T.primary} />
                      </div>
                    </div>
                    <p className="text-[1.1rem] text-[#1A1A1A] mb-2">딜 데이터를 추가해보세요</p>
                    <p className="text-[0.8rem] text-[#999] mb-9 text-center leading-relaxed">
                      고객 정보와 영업 기회를 등록하면 파이프라인을 한 눈에 관리할 수 있습니다.
                    </p>
                    <div className="flex items-stretch gap-4 w-full max-w-[512px]">
                      <button
                        onClick={() => setShowAddDeal(true)}
                        className="flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:border-[#1A472A] hover:bg-[#FAFDFB]"
                        style={{ borderColor: T.primary, background: "#FAFDFB" }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: T.primary }}>
                          <Plus size={16} color="#fff" />
                        </div>
                        <div>
                          <p className="text-[0.8rem] text-[#1A1A1A] mb-0.5">직접 추가</p>
                          <p className="text-[0.65rem] text-[#999]">딜 정보를 하나씩 입력</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setShowOnboarding(true)}
                        className="flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border transition-all hover:border-[#1A472A] hover:bg-[#FAFBFC]"
                        style={{ borderColor: T.border }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#F3F4F6" }}>
                          <Upload size={16} color="#666" />
                        </div>
                        <div>
                          <p className="text-[0.8rem] text-[#1A1A1A] mb-0.5">Excel 가져오기</p>
                          <p className="text-[0.65rem] text-[#999]">파일에서 일괄 업로드</p>
                        </div>
                      </button>
                      <button
                        onClick={() => setShowColumnConfig(true)}
                        className="flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border transition-all hover:border-[#1A472A] hover:bg-[#FAFBFC]"
                        style={{ borderColor: T.border }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#F3F4F6" }}>
                          <Grid3X3 size={16} color="#666" />
                        </div>
                        <div>
                          <p className="text-[0.8rem] text-[#1A1A1A] mb-0.5">컬럼 설정</p>
                          <p className="text-[0.65rem] text-[#999]">데이터 구조 미리 구성</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── Views ─── */
                <>
                {/* Kanban View */}
                {activeView === "kanban" && (
                  <KanbanView
                    deals={filteredDeals}
                    pipelineStages={pipelineStages}
                    stageColorMap={stageColors}
                    onMoveDeal={moveDealStage}
                    onClickDeal={setSelectedDeal}
                    onAddDeal={() => setShowAddDeal(true)}
                  />
                )}

                {/* Timeline View */}
                {activeView === "timeline" && (
                  <TimelineView
                    deals={filteredDeals}
                    onClickDeal={setSelectedDeal}
                    stageColorMap={stageColors}
                  />
                )}

                {/* Table View */}
                {activeView === "table" && (
                <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  {/* Table Toolbar */}
                  <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: T.border }}>
                    {selectedIds.size > 0 ? (
                      <div className="flex items-center gap-3 w-full">
                        <span className="text-[0.75rem] text-[#1A1A1A]">{selectedIds.size}건 선택</span>
                        <div className="w-px h-5" style={{ background: T.border }} />
                        <button className="px-3 py-1.5 rounded-md text-[0.7rem] hover:bg-[#F7F8FA] transition-colors text-[#555]">상태 변경</button>
                        <button className="px-3 py-1.5 rounded-md text-[0.7rem] hover:bg-[#EFF5F1] transition-colors" style={{ color: T.primary }}>담당자 배정</button>
                        <button className="px-3 py-1.5 rounded-md text-[0.7rem] hover:bg-[#FEF2F2] transition-colors" style={{ color: T.danger }}>삭제</button>
                        <div className="flex-1" />
                        <button onClick={() => setSelectedIds(new Set())} className="text-[0.7rem] text-[#999] hover:text-[#666] transition-colors">선택 해제</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#BBB]" />
                            <input
                              className="pl-9 pr-3 py-[6px] rounded-lg border text-[0.75rem] text-[#1A1A1A] placeholder-[#BBB] focus:outline-none focus:border-[#1A472A] w-[176px] transition-colors"
                              style={{ borderColor: T.border, background: "#fff" }}
                              placeholder="기업명, 담당자 검색"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <div className="w-px h-5" style={{ background: T.border }} />
                          <select
                            className="px-3 py-[6px] rounded-lg border text-[0.7rem] text-[#555] bg-white focus:outline-none focus:border-[#1A472A] transition-colors cursor-pointer"
                            style={{ borderColor: T.border }}
                            value={stageFilter}
                            onChange={(e) => setStageFilter(e.target.value)}
                          >
                            <option value="전체">진행상태: 전체</option>
                            {pipelineStages.map((s) => <option key={s.id}>{s.name}</option>)}
                          </select>
                          <select
                            className="px-3 py-[6px] rounded-lg border text-[0.7rem] text-[#555] bg-white focus:outline-none focus:border-[#1A472A] transition-colors cursor-pointer"
                            style={{ borderColor: T.border }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                          >
                            <option value="전체">성공여부: 전체</option>
                            <option>진행중</option>
                            <option>성공</option>
                            <option>실패</option>
                          </select>
                          {(searchQuery || stageFilter !== "전체" || statusFilter !== "전체") && (
                            <button
                              onClick={() => { setSearchQuery(""); setStageFilter("전체"); setStatusFilter("전체"); }}
                              className="text-[0.65rem] text-[#999] hover:text-[#666] transition-colors px-2"
                            >
                              필터 초기화
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => setShowColumnConfig(!showColumnConfig)}
                          className="p-[6px] rounded-lg border hover:bg-[#F7F8FA] transition-colors"
                          style={{ borderColor: T.border }}
                          title="컬럼 설정"
                        >
                          <Grid3X3 size={12} color="#888" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead>
                        <tr style={{ background: "#FAFBFC" }}>
                          <th className="py-3 px-4 w-12 border-b" style={{ borderColor: T.border }}>
                            <input type="checkbox" checked={selectedIds.size === filteredDeals.length && filteredDeals.length > 0} onChange={toggleAll} className="w-4 h-4 rounded border-[#D1D5DB] text-[#1A472A] focus:ring-[#1A472A] cursor-pointer" />
                          </th>
                          {ALL_COLUMNS.filter((c) => visibleColumns.has(c.key)).map((h) => (
                            <th key={h.key} className="text-left py-3 px-4 whitespace-nowrap border-b" style={{ borderColor: T.border }}>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[0.65rem] text-[#888] tracking-wide">{h.label}</span>
                                {h.sort && (
                                  <button className="p-0.5 rounded hover:bg-[#EDEEF0] transition-colors">
                                    <ArrowUpDown size={9} className="text-[#CCC]" />
                                  </button>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDeals.length === 0 ? (
                          <tr>
                            <td colSpan={visibleColumns.size + 1} className="py-16 text-center">
                              <div className="flex flex-col items-center">
                                <Search size={19} color="#DDD" className="mb-3" />
                                <p className="text-[0.8rem] text-[#999] mb-1">검색 결과가 없습니다</p>
                                <p className="text-[0.7rem] text-[#CCC]">다른 키워드나 필터 조건을 시도해보세요.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredDeals.map((deal) => {
                            const isSelected = selectedIds.has(deal.id);
                            const cellMap: Record<string, React.ReactNode> = {
                              company: (
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.65rem] text-white shrink-0" style={{ background: stageColors[deal.stage] || T.primary }}>
                                    {deal.company.replace(/[\(\)주]/g, "").charAt(0)}
                                  </div>
                                  <span className="text-[0.75rem] text-[#1A1A1A]">{deal.company}</span>
                                </div>
                              ),
                              stage: (
                                <span className="inline-flex items-center gap-1.5 text-[0.65rem] px-2.5 py-1 rounded-full" style={{ background: (stageColors[deal.stage] || "#999") + "14", color: stageColors[deal.stage] || "#999" }}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: stageColors[deal.stage] || "#999" }} />
                                  {deal.stage}
                                </span>
                              ),
                              contact: (
                                <div className="flex flex-col">
                                  <span className="text-[0.75rem] text-[#1A1A1A]">{deal.contact}</span>
                                  {!visibleColumns.has("position") && <span className="text-[0.6rem] text-[#BBB]">{deal.position}</span>}
                                </div>
                              ),
                              position: <span className="text-[0.7rem] text-[#666]">{deal.position}</span>,
                              service: <span className="text-[0.7rem] text-[#555]">{deal.service}</span>,
                              amount: <span className="text-[0.75rem] text-[#1A1A1A] tabular-nums">{deal.amount}</span>,
                              quantity: <span className="text-[0.7rem] text-[#555] tabular-nums">{deal.quantity.toLocaleString()}</span>,
                              manager: (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] text-white" style={{ background: "#94A3B8" }}>
                                    {deal.manager.charAt(0)}
                                  </div>
                                  <span className="text-[0.7rem] text-[#555]">{deal.manager}</span>
                                </div>
                              ),
                              status: (
                                <span className="inline-flex items-center text-[0.65rem] px-2.5 py-1 rounded-full" style={{ background: statusColors[deal.status]?.bg || "#F1F5F9", color: statusColors[deal.status]?.text || "#64748B" }}>
                                  {deal.status}
                                </span>
                              ),
                              date: <span className="text-[0.7rem] text-[#999] whitespace-nowrap tabular-nums">{deal.date}</span>,
                              phone: <span className="text-[0.7rem] text-[#555]">—</span>,
                              email: <span className="text-[0.7rem] text-[#555]">—</span>,
                              memo: <span className="text-[0.7rem] text-[#BBB]">—</span>,
                            };
                            return (
                              <tr
                                key={deal.id}
                                className="border-b cursor-pointer transition-colors"
                                style={{ borderColor: T.border, background: isSelected ? "#F0F7F2" : "#fff" }}
                                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#FAFBFC"; }}
                                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "#fff"; }}
                                onClick={() => setSelectedDeal(deal)}
                              >
                                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                  <input type="checkbox" checked={isSelected} onChange={() => toggleOne(deal.id)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#1A472A] focus:ring-[#1A472A] cursor-pointer" />
                                </td>
                                {ALL_COLUMNS.filter((c) => visibleColumns.has(c.key)).map((col) => (
                                  <td key={col.key} className="py-3.5 px-4">{cellMap[col.key]}</td>
                                ))}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: T.border, background: "#FAFBFC" }}>
                    <span className="text-[0.7rem] text-[#999]">
                      {filteredDeals.length < customerDeals.length
                        ? `필터 결과 ${filteredDeals.length}건 (전체 ${customerDeals.length}건)`
                        : `전체 ${customerDeals.length}건`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button className="w-8 h-8 rounded-lg text-[0.7rem] transition-colors" style={{ background: T.primary, color: "#fff" }}>1</button>
                    </div>
                  </div>
                </div>
                )}

                </>
              )}

              {/* Column Config Dialog */}
              {showColumnConfig && (
                <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.2)" }} onClick={() => setShowColumnConfig(false)}>
                  <div className="bg-white rounded-xl border w-[224px]" style={{ borderColor: T.border, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: T.border }}>
                      <p className="text-[0.8rem] text-[#1A1A1A]">컬럼 설정</p>
                      <button onClick={() => setShowColumnConfig(false)} className="p-1 rounded hover:bg-[#F7F8FA]"><X size={13} color="#999" /></button>
                    </div>
                    <div className="p-3 max-h-[304px] overflow-y-auto">
                      {ALL_COLUMNS.map((col) => (
                        <label key={col.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F8F9FA] cursor-pointer transition-colors">
                          <input type="checkbox" checked={visibleColumns.has(col.key)} disabled={col.required} onChange={() => toggleColumn(col.key)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#1A472A] focus:ring-[#1A472A]" />
                          <span className="text-[0.75rem] text-[#333] flex-1">{col.label}</span>
                          {col.required && <span className="text-[0.6rem] text-[#BBB]">필수</span>}
                        </label>
                      ))}
                    </div>
                    <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: T.border }}>
                      <button onClick={() => setShowColumnConfig(false)} className="px-4 py-1.5 rounded-lg text-[0.7rem] text-white" style={{ background: T.primary }}>완료</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Detail Drawer */}
          {selectedDeal && <DetailDrawer deal={selectedDeal} onClose={() => setSelectedDeal(null)} stageColorMap={stageColors} />}
        </div>
      </div>

      {/* Widget Palette */}
      {customizeMode && (
        <WidgetPalette
          onClose={() => setCustomizeMode(false)}
          activeWidgets={activeWidgets}
          onToggleWidget={toggleWidget}
        />
      )}

      {/* Add Deal Modal */}
      {showAddDeal && (
        <AddDealModal
          onClose={() => setShowAddDeal(false)}
          onAdd={addDeal}
          visibleColumns={visibleColumns}
          stageNames={pipelineStages.map((s) => s.name)}
        />
      )}

      {/* Pipeline Settings Modal */}
      {showPipelineSettings && (
        <PipelineSettingsModal
          stages={pipelineStages}
          onSave={setPipelineStages}
          onClose={() => setShowPipelineSettings(false)}
        />
      )}

      {/* Field Management Modal */}
      {showFieldManagement && (
        <FieldManagementModal
          fields={customFields}
          onSave={setCustomFields}
          onClose={() => setShowFieldManagement(false)}
        />
      )}

      {/* Add View Modal */}
      {showAddView && (
        <AddViewModal
          onAdd={addView}
          onClose={() => setShowAddView(false)}
        />
      )}
    </div>
  );
}

export function DealflowPage() {
  const { pageId } = useParams<{ pageId: string }>();
  return <DealflowPageInner key={pageId} />;
}