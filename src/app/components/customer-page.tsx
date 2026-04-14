import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  parseFile,
  transformRows,
  detectUnknownValues,
  type ParsedSheet,
  type FieldMapping,
} from "../lib/excel-import";
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
  Network,
  User,
  Settings,
  Palette,
  Trash2,
  Lock,
  Unlock,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Code2,
  RefreshCw,
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

/* ─── DATE RANGE HELPERS ─── */
type DateRangePreset = "all" | "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "custom";
interface DateRange { preset: DateRangePreset; from: string; to: string; }
const DATE_RANGE_PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "all", label: "전체 기간" },
  { key: "this_month", label: "이번 달" },
  { key: "last_month", label: "지난 달" },
  { key: "this_quarter", label: "이번 분기" },
  { key: "last_quarter", label: "지난 분기" },
  { key: "this_year", label: "올해" },
  { key: "custom", label: "직접 설정" },
];
function computeDateRange(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  switch (preset) {
    case "this_month": return { from: `${y}-${pad(m + 1)}-01`, to: fmt(new Date(y, m + 1, 0)) };
    case "last_month": return { from: `${y}-${pad(m)}-01`, to: fmt(new Date(y, m, 0)) };
    case "this_quarter": { const qs = Math.floor(m / 3) * 3; return { from: `${y}-${pad(qs + 1)}-01`, to: fmt(new Date(y, qs + 3, 0)) }; }
    case "last_quarter": { const qs = Math.floor(m / 3) * 3 - 3; const ly = qs < 0 ? y - 1 : y; const lqs = ((qs % 12) + 12) % 12; return { from: `${ly}-${pad(lqs + 1)}-01`, to: fmt(new Date(ly, lqs + 3, 0)) }; }
    case "this_year": return { from: `${y}-01-01`, to: `${y}-12-31` };
    default: return { from: "", to: "" };
  }
}
function dateRangeLabel(dr: DateRange): string {
  if (dr.preset === "all") return "전체 기간";
  const p = DATE_RANGE_PRESETS.find((x) => x.key === dr.preset);
  if (dr.preset !== "custom" && p) return p.label;
  if (dr.from && dr.to) return `${dr.from.slice(5)} ~ ${dr.to.slice(5)}`;
  if (dr.from) return `${dr.from.slice(5)} ~`;
  if (dr.to) return `~ ${dr.to.slice(5)}`;
  return "기간 선택";
}
function filterByDateRange(deals: Customer[], dr: DateRange): Customer[] {
  if (dr.preset === "all") return deals;
  if (!dr.from && !dr.to) return deals;
  return deals.filter((d) => {
    if (dr.from && d.date < dr.from) return false;
    if (dr.to && d.date > dr.to) return false;
    return true;
  });
}

/* ─── PIPELINE STAGE TYPE ─── */
interface PipelineStage {
  id: string;
  name: string;
  color: string;
  type: "active" | "won" | "lost";
}

// Customer lifecycle stages: onboarding → active → dormant → churned.
const DEFAULT_STAGES: PipelineStage[] = [
  { id: "s1", name: "신규",     color: "#3B82F6", type: "active" },
  { id: "s2", name: "재구매",   color: "#10B981", type: "active" },
  { id: "s3", name: "충성고객", color: "#8B5CF6", type: "active" },
];

// Muted palette — brand greens + restrained neutrals/warm tones for
// extra stages. No saturated primaries.
const STAGE_PALETTE = [
  "#1A472A", "#2D5F3F", "#3F6D4F", "#4A7B5A", "#5B9170",
  "#7FA28E", "#9BB4A5", "#64748B", "#94A3B8", "#8B7355",
  "#B08968", "#6B7280", "#475569", "#A0928A", "#D4A574",
];

function buildStageColors(stages: PipelineStage[]): Record<string, string> {
  const map: Record<string, string> = {};
  stages.forEach((s) => { map[s.name] = s.color; });
  return map;
}

/* ─── FILTER / SORT / GROUP TYPES ─── */
type FilterOp =
  | "eq" | "neq" | "contains" | "not_contains"          // text
  | "gt" | "gte" | "lt" | "lte" | "between"              // number
  | "in" | "not_in"                                        // select / multi-select
  | "after" | "before" | "date_between"                   // date
  | "is_empty" | "is_not_empty";                           // universal

interface FilterRule {
  id: string;
  field: string;       // key from ALL_COLUMNS
  op: FilterOp;
  value: string;       // comma-separated for "in", pipe-separated for "between"
}

interface SortRule {
  field: string;
  dir: "asc" | "desc";
}

type GroupByField = "" | "stage" | "manager" | "service";

const FILTER_OPS_BY_TYPE: Record<string, { op: FilterOp; label: string }[]> = {
  text:   [{ op: "contains", label: "포함" }, { op: "eq", label: "같음" }, { op: "neq", label: "같지 않음" }, { op: "not_contains", label: "포함하지 않음" }, { op: "is_empty", label: "비어있음" }, { op: "is_not_empty", label: "비어있지 않음" }],
  number: [{ op: "gte", label: "이상" }, { op: "lte", label: "이하" }, { op: "gt", label: "초과" }, { op: "lt", label: "미만" }, { op: "between", label: "범위" }, { op: "is_empty", label: "비어있음" }],
  select: [{ op: "in", label: "는" }, { op: "not_in", label: "아닌" }, { op: "is_empty", label: "비어있음" }],
  date:   [{ op: "after", label: "이후" }, { op: "before", label: "이전" }, { op: "date_between", label: "범위" }, { op: "is_empty", label: "비어있음" }],
  person: [{ op: "in", label: "는" }, { op: "not_in", label: "아닌" }, { op: "is_empty", label: "비어있음" }],
};

const FIELD_FILTER_TYPE: Record<string, string> = {
  company: "text", stage: "select", contact: "text", position: "text",
  service: "text", amount: "number", quantity: "number", manager: "person",
  date: "date", phone: "text", email: "text", memo: "text",
};

const FILTERABLE_FIELDS = [
  { key: "stage", label: "고객상태" }, { key: "amount", label: "견적금액" },
  { key: "manager", label: "담당자" },
  { key: "date", label: "등록일" }, { key: "company", label: "기업명" },
  { key: "contact", label: "연락처" }, { key: "service", label: "희망서비스" },
  { key: "quantity", label: "수량" },
];

const SORTABLE_FIELDS = [
  { key: "company", label: "기업명" }, { key: "stage", label: "고객상태" },
  { key: "amount", label: "견적금액" }, { key: "quantity", label: "수량" },
  { key: "manager", label: "담당자" },
  { key: "date", label: "등록일" },
];

const GROUPABLE_FIELDS: { key: GroupByField; label: string }[] = [
  { key: "", label: "없음" }, { key: "stage", label: "고객상태" },
  { key: "manager", label: "담당자" },
  { key: "service", label: "희망서비스" },
];

/* helper: get unique values for a field from deals */
function uniqueValues(deals: Customer[], field: string): string[] {
  const set = new Set<string>();
  deals.forEach((d) => {
    const v = String(d[field] ?? "");
    if (v) set.add(v);
  });
  return Array.from(set).sort();
}

/* helper: apply filters */
function applyFilters(deals: Customer[], filters: FilterRule[], searchQuery: string): Customer[] {
  let result = deals;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    // Scan all string/number values on the deal so search works across built-in + custom fields
    result = result.filter((d) => {
      for (const k in d) {
        if (k === "id") continue;
        const v = (d as Record<string, unknown>)[k];
        if (v == null) continue;
        if (typeof v === "string" || typeof v === "number") {
          if (String(v).toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  }
  for (const f of filters) {
    result = result.filter((d) => {
      const raw = d[f.field];
      const val = String(raw ?? "");
      switch (f.op) {
        case "eq": return val === f.value;
        case "neq": return val !== f.value;
        case "contains": return val.toLowerCase().includes(f.value.toLowerCase());
        case "not_contains": return !val.toLowerCase().includes(f.value.toLowerCase());
        case "in": { const arr = f.value.split(",").map((s) => s.trim()); return arr.includes(val); }
        case "not_in": { const arr = f.value.split(",").map((s) => s.trim()); return !arr.includes(val); }
        case "gt": case "gte": case "lt": case "lte": {
          const n = f.field === "amount" ? parseAmt(val) : parseFloat(val);
          const t = parseFloat(f.value);
          if (isNaN(n) || isNaN(t)) return true;
          if (f.op === "gt") return n > t;
          if (f.op === "gte") return n >= t;
          if (f.op === "lt") return n < t;
          return n <= t;
        }
        case "between": {
          const [lo, hi] = f.value.split("|").map((s) => parseFloat(s.trim()));
          const n = f.field === "amount" ? parseAmt(val) : parseFloat(val);
          if (isNaN(n)) return true;
          return n >= lo && n <= hi;
        }
        case "after": return val >= f.value;
        case "before": return val <= f.value;
        case "date_between": { const [a, b] = f.value.split("|"); return val >= a && val <= b; }
        case "is_empty": return !val || val === "0";
        case "is_not_empty": return !!val && val !== "0";
        default: return true;
      }
    });
  }
  return result;
}

/* helper: apply sorts */
function applySorts(deals: Customer[], sorts: SortRule[]): Customer[] {
  if (sorts.length === 0) return deals;
  return [...deals].sort((a, b) => {
    for (const s of sorts) {
      const av = String(a[s.field] ?? "");
      const bv = String(b[s.field] ?? "");
      // numeric compare for amount/quantity
      if (s.field === "amount") {
        const diff = parseAmt(av) - parseAmt(bv);
        if (diff !== 0) return s.dir === "asc" ? diff : -diff;
      } else if (s.field === "quantity") {
        const diff = (Number(av) || 0) - (Number(bv) || 0);
        if (diff !== 0) return s.dir === "asc" ? diff : -diff;
      } else {
        const cmp = av.localeCompare(bv, "ko");
        if (cmp !== 0) return s.dir === "asc" ? cmp : -cmp;
      }
    }
    return 0;
  });
}

/* helper: group deals */
interface DealGroup {
  key: string;
  label: string;
  deals: Customer[];
  totalAmount: number;
}

function groupDeals(deals: Customer[], groupBy: GroupByField): DealGroup[] {
  if (!groupBy) return [{ key: "__all__", label: "", deals, totalAmount: deals.reduce((s, d) => s + parseAmt(d.amount), 0) }];
  const map = new Map<string, Customer[]>();
  deals.forEach((d) => {
    const key = String(d[groupBy] ?? "미지정");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  });
  return Array.from(map.entries()).map(([key, gDeals]) => ({
    key,
    label: key,
    deals: gDeals,
    totalAmount: gDeals.reduce((s, d) => s + parseAmt(d.amount), 0),
  }));
}

/* ─── SAVED VIEW TYPE ─── */
interface SavedView {
  id: string;
  name: string;
  viewType: ViewType;
  filters: FilterRule[];
  sorts: SortRule[];
  groupBy: GroupByField;
  searchQuery: string;
  columnOrder?: string[];
  hiddenKeys?: string[];
  columnWidths?: Record<string, number>;
  pinDangolColumns?: boolean;
}

const DEFAULT_VIEWS: SavedView[] = [];

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
  select: "선택(단일)",
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
  { id: "f1",  key: "company",      label: "고객사",           type: "text",   required: true,  locked: true,  visible: true },
  { id: "f2",  key: "stage",        label: "고객상태",         type: "select", required: false, locked: false, visible: true, options: ["신규", "재구매", "충성고객"] },
  { id: "f17", key: "customerGrade",label: "고객등급",        type: "select", required: false, locked: false, visible: true, options: ["S등급", "A등급", "B등급", "그 외"] },
  { id: "f3",  key: "contact",      label: "담당자",           type: "text",   required: false, locked: false, visible: true },
  { id: "f4",  key: "position",     label: "직책",             type: "text",   required: false, locked: false, visible: false },
  { id: "f6",  key: "amount",       label: "계약 금액",        type: "number", required: false, locked: false, visible: true },
  { id: "f14", key: "healthScore",  label: "헬스 스코어",      type: "number", required: false, locked: false, visible: true },
  { id: "f15", key: "ltv",          label: "누적 LTV",         type: "number", required: false, locked: false, visible: true },
  { id: "f16", key: "renewalDate",  label: "갱신 예정일",      type: "date",   required: false, locked: false, visible: true },
  { id: "f8",  key: "manager",      label: "고객 책임자",      type: "person", required: false, locked: false, visible: true },
  { id: "f10", key: "date",         label: "등록일",           type: "date",   required: false, locked: false, visible: true },
  { id: "f11", key: "phone",        label: "전화번호",         type: "phone",  required: false, locked: false, visible: false },
  { id: "f12", key: "email",        label: "이메일",           type: "email",  required: false, locked: false, visible: false },
  { id: "f13", key: "memo",         label: "비고",             type: "text",   required: false, locked: false, visible: false },
];

/* ─── SAMPLE DATA ─── */
const statusColors: Record<string, { bg: string; text: string }> = {
  신규:     { bg: "#EFF6FF", text: "#3B82F6" },
  재구매:   { bg: "#ECFDF5", text: "#10B981" },
  충성고객: { bg: "#F5F3FF", text: "#8B5CF6" },
};

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  "S등급": { bg: "#FEF3C7", text: "#B45309" },
  "A등급": { bg: "#DBEAFE", text: "#1D4ED8" },
  "B등급": { bg: "#D1FAE5", text: "#047857" },
  "그 외": { bg: "#F1F5F9", text: "#64748B" },
};

/* palette for generic select chips (custom select fields) */
const CHIP_PALETTE: { bg: string; text: string }[] = [
  { bg: "#EFF6FF", text: "#3B82F6" },
  { bg: "#ECFDF5", text: "#10B981" },
  { bg: "#FEF3C7", text: "#B45309" },
  { bg: "#F5F3FF", text: "#8B5CF6" },
  { bg: "#FEE2E2", text: "#DC2626" },
  { bg: "#E0E7FF", text: "#4F46E5" },
  { bg: "#FFE4E6", text: "#E11D48" },
  { bg: "#ECFEFF", text: "#0891B2" },
];

function getSelectChipColor(fieldKey: string, value: string, options: string[]): { bg: string; text: string } {
  if (fieldKey === "stage" || fieldKey === "status") return statusColors[value] || { bg: "#F1F5F9", text: "#64748B" };
  if (fieldKey === "customerGrade") return GRADE_COLORS[value] || { bg: "#F1F5F9", text: "#64748B" };
  const idx = options.indexOf(value);
  if (idx < 0) return { bg: "#F1F5F9", text: "#64748B" };
  return CHIP_PALETTE[idx % CHIP_PALETTE.length];
}

interface Customer {
  id: number;
  company: string;
  stage: string; // 고객상태: 신규 | 재구매 | 충성고객
  contact: string;
  position: string;
  service: string;
  quantity: number;
  amount: string;       // contract value (formatted)
  healthScore?: number; // 0-100
  ltv?: string;         // lifetime value (formatted)
  renewalDate?: string; // YYYY-MM-DD
  manager: string;
  status: string;       // mirror of lifecycle stage
  date: string;
  [key: string]: unknown;
}


/* ─── SAMPLE CUSTOMERS (onboarding 완료 시 로드) ─── */
const SAMPLE_DEALS: Customer[] = [
  { id: 1,  company: "(주)테크솔루션",     stage: "충성고객", contact: "김영호", position: "이사",  service: "",          quantity: 0, amount: "₩3,200만", healthScore: 88, ltv: "₩1.2억", renewalDate: "2026-09-15", manager: "박지은", status: "충성고객", date: "2025-03-15" },
  { id: 2,  company: "스마트팩토리(주)",   stage: "재구매",   contact: "이수진", position: "부장",  service: "",          quantity: 0, amount: "₩2,800만", healthScore: 76, ltv: "₩8,400만", renewalDate: "2026-08-18", manager: "김태현", status: "재구매",   date: "2025-08-18" },
  { id: 3,  company: "(주)글로벌트레이드", stage: "신규",     contact: "박민수", position: "과장",  service: "",          quantity: 0, amount: "₩5,500만", healthScore: 65, ltv: "₩5,500만", renewalDate: "2027-03-20", manager: "이서연", status: "신규",     date: "2026-03-20" },
  { id: 4,  company: "디지털커머스(주)",   stage: "신규",     contact: "최지아", position: "대리",  service: "",          quantity: 0, amount: "₩1,200만", healthScore: 72, ltv: "₩1,200만", renewalDate: "2027-03-22", manager: "박지은", status: "신규",     date: "2026-03-22" },
  { id: 5,  company: "(주)바이오헬스",     stage: "신규",     contact: "정대현", position: "팀장",  service: "",          quantity: 0, amount: "₩980만",   healthScore: 42, ltv: "₩2,940만", renewalDate: "2026-05-25", manager: "김태현", status: "신규",     date: "2024-09-25" },
  { id: 6,  company: "에너지플러스(주)",   stage: "재구매",   contact: "한소희", position: "차장",  service: "",          quantity: 0, amount: "₩4,100만", healthScore: 91, ltv: "₩9,200만", renewalDate: "2026-09-28", manager: "이서연", status: "재구매",   date: "2025-09-28" },
  { id: 7,  company: "(주)푸드테크",       stage: "신규",     contact: "오재석", position: "과장",  service: "",          quantity: 0, amount: "₩1,500만", healthScore: 68, ltv: "₩1,500만", renewalDate: "2027-04-01", manager: "박지은", status: "신규",     date: "2026-04-01" },
  { id: 8,  company: "클라우드원(주)",     stage: "충성고객", contact: "윤미래", position: "부장",  service: "",          quantity: 0, amount: "₩6,200만", healthScore: 84, ltv: "₩1.4억", renewalDate: "2026-10-03", manager: "김태현", status: "충성고객", date: "2024-10-03" },
  { id: 9,  company: "(주)핀테크랩",       stage: "재구매",   contact: "서준혁", position: "이사",  service: "",          quantity: 0, amount: "₩2,300만", healthScore: 79, ltv: "₩4,600만", renewalDate: "2026-07-05", manager: "이서연", status: "재구매",   date: "2025-07-05" },
  { id: 10, company: "모빌리티솔루션(주)", stage: "신규",     contact: "강하은", position: "대리",  service: "",          quantity: 0, amount: "₩8,500만", healthScore: 71, ltv: "₩8,500만", renewalDate: "2027-04-07", manager: "박지은", status: "신규",     date: "2026-04-07" },
  { id: 11, company: "(주)헬스케어AI",     stage: "충성고객", contact: "윤성민", position: "팀장",  service: "",          quantity: 0, amount: "₩1.2억",  healthScore: 93, ltv: "₩2.8억", renewalDate: "2026-09-10", manager: "김태현", status: "충성고객", date: "2024-03-10" },
  { id: 12, company: "리테일허브(주)",     stage: "충성고객", contact: "조은지", position: "과장",  service: "",          quantity: 0, amount: "₩4,700만", healthScore: 82, ltv: "₩1.1억", renewalDate: "2026-08-28", manager: "이서연", status: "충성고객", date: "2024-08-28" },
  { id: 13, company: "(주)스마트물류",     stage: "신규",     contact: "임재현", position: "부장",  service: "",          quantity: 0, amount: "₩3,400만", healthScore: 28, ltv: "₩3,400만", renewalDate: "",           manager: "박지은", status: "신규",     date: "2024-02-14" },
  { id: 14, company: "에듀테크파트너(주)", stage: "충성고객", contact: "노지수", position: "이사",  service: "",          quantity: 0, amount: "₩9,800만", healthScore: 87, ltv: "₩1.9억", renewalDate: "2026-10-08", manager: "김태현", status: "충성고객", date: "2025-04-08" },
  { id: 15, company: "(주)그린에너지",     stage: "신규",     contact: "배소연", position: "차장",  service: "",          quantity: 0, amount: "₩2,100만", healthScore: 48, ltv: "₩2,100만", renewalDate: "2026-07-20", manager: "이서연", status: "신규",     date: "2025-01-20" },
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
  { id: "kpi-customers",    name: "전체 고객 수",         description: "현재 등록된 전체 고객 수",                           category: "kpi",   icon: Users,         colSpan: 1 },
  { id: "kpi-new-month",    name: "이번 달 새 고객",      description: "이번 달에 새로 등록된 고객 수",                      category: "kpi",   icon: Plus,          colSpan: 1 },
  { id: "kpi-churn",        name: "떠난 고객 비율",       description: "전체 대비 거래가 끊긴 고객의 비율",                  category: "kpi",   icon: AlertTriangle, colSpan: 1 },
  { id: "kpi-ltv",          name: "고객 누적 매출",       description: "모든 고객이 지금까지 만든 매출의 합계",             category: "kpi",   icon: DollarSign,    colSpan: 1 },
  { id: "kpi-avg-contract", name: "평균 계약 금액",       description: "계약 한 건당 평균 금액",                             category: "kpi",   icon: Target,        colSpan: 1 },
  { id: "kpi-renewals",     name: "곧 재계약 예정",       description: "앞으로 90일 안에 재계약이 예정된 고객 수",          category: "kpi",   icon: Calendar,      colSpan: 1 },
  { id: "chart-health",     name: "고객 상태 분포",       description: "고객을 활발/주의/위험으로 나눠 도넛으로 보여줍니다", category: "chart", icon: PieIcon,       colSpan: 1 },
  { id: "chart-retention",  name: "고객 유지율 추이",     description: "최근 6개월 동안 고객이 얼마나 남아 있는지 추이",    category: "chart", icon: TrendingUp,    colSpan: 2 },
  { id: "chart-lifecycle",  name: "고객 단계별 분포",     description: "신규/재구매/충성고객 단계별 고객 수를 막대로 표시", category: "chart", icon: BarChart3,     colSpan: 2 },
  { id: "table-renewals",   name: "곧 재계약 고객 목록",  description: "재계약이 가까운 순서로 최대 10명까지 표시",          category: "table", icon: Calendar,      colSpan: 2 },
  { id: "table-upsell",     name: "추가 제안 추천 Top 5", description: "만족도 높고 추가 계약 가능성이 높은 고객 5명",      category: "table", icon: Sparkles,      colSpan: 2 },
  { id: "table-recent-customers", name: "최근 등록된 고객", description: "가장 최근에 등록된 고객 5명",                   category: "table", icon: Clock,         colSpan: 2 },
  { id: "memo",             name: "메모",                 description: "자유롭게 텍스트 메모를 작성할 수 있습니다",          category: "utility", icon: StickyNote,  colSpan: 1 },
  { id: "shortcuts",        name: "빠른 실행",            description: "자주 쓰는 기능에 바로 접근합니다",                    category: "utility", icon: Zap,         colSpan: 1 },
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

const DEFAULT_ACTIVE_WIDGETS = ["kpi-customers", "kpi-churn", "kpi-ltv", "kpi-renewals", "chart-health", "chart-lifecycle"];

/* ─── SMART DASHBOARD RECOMMENDATION (Dashboard AI) ─── */

interface DealAnalysis {
  totalDeals: number;
  uniqueStages: number;
  uniqueManagers: number;
  totalAmount: number;
  winRate: number;
  dateRange: { earliest: string; latest: string; spanDays: number };
  serviceCount: number;
  hasAmountData: boolean;
  hasManagerData: boolean;
}

function analyzeDealData(deals: Customer[]): DealAnalysis {
  const stages = new Set(deals.map(d => d.stage));
  const managers = new Set(deals.map(d => d.manager).filter(Boolean));
  const services = new Set(deals.map(d => d.service).filter(Boolean));
  const amounts = deals.map(d => parseAmt(d.amount));
  const totalAmount = amounts.reduce((s, a) => s + a, 0);
  const hasAmountData = amounts.some(a => a > 0);
  const wonDeals = deals.filter(d => d.status === "성공" || d.stage === "수주확정");
  const winRate = deals.length > 0 ? wonDeals.length / deals.length : 0;
  const dates = deals.map(d => d.date).filter(Boolean).sort();
  const earliest = dates[0] || "";
  const latest = dates[dates.length - 1] || "";
  const spanDays = earliest && latest
    ? Math.max(1, Math.round((new Date(latest).getTime() - new Date(earliest).getTime()) / 86400000))
    : 0;

  return {
    totalDeals: deals.length,
    uniqueStages: stages.size,
    uniqueManagers: managers.size,
    totalAmount,
    winRate,
    dateRange: { earliest, latest, spanDays },
    serviceCount: services.size,
    hasAmountData,
    hasManagerData: managers.size > 0,
  };
}

type ScenarioType = "소규모 팀" | "중규모 팀" | "단순 고객 목록";

function detectScenario(a: DealAnalysis): { scenario: ScenarioType; reason: string } {
  if (!a.hasAmountData)
    return { scenario: "단순 고객 목록", reason: "금액 데이터가 없어 기본 고객 관리 중심으로 구성합니다" };
  if (a.uniqueManagers > 5 || a.totalDeals > 20)
    return { scenario: "중규모 팀", reason: `담당자 ${a.uniqueManagers}명, 고객 ${a.totalDeals}건 — 팀 성과 비교가 중요합니다` };
  return { scenario: "소규모 팀", reason: `담당자 ${a.uniqueManagers}명, 고객 ${a.totalDeals}건 — 개별 고객 추적이 중요합니다` };
}

interface WidgetRecommendation {
  widgetId: string;
  reason: string;
  priority: number;
}

function recommendWidgets(a: DealAnalysis, _scenario: ScenarioType): WidgetRecommendation[] {
  const recs: WidgetRecommendation[] = [
    { widgetId: "kpi-customers",   reason: "전체 고객 현황 파악", priority: 100 },
    { widgetId: "kpi-churn",       reason: "이탈률은 고객 성공의 핵심 지표", priority: 95 },
    { widgetId: "kpi-ltv",         reason: "누적 LTV로 고객 자산 가치 확인", priority: 90 },
    { widgetId: "kpi-renewals",    reason: "다가오는 갱신 기회를 놓치지 않도록", priority: 85 },
    { widgetId: "chart-health",    reason: "건강한 고객과 위험 고객 비율 파악", priority: 80 },
    { widgetId: "chart-lifecycle", reason: `${a.uniqueStages}개 라이프사이클 단계별 분포 시각화`, priority: 75 },
    { widgetId: "table-renewals",  reason: "임박한 갱신 고객을 가까운 순으로 확인", priority: 70 },
    { widgetId: "table-upsell",    reason: "업셀 후보를 자동 추천", priority: 65 },
  ];
  return recs;
}

/* ─── CUSTOM KPI / GOAL TYPES ─── */
interface CustomKpiDef {
  id: string;
  name: string;
  formula: "won_amount_ratio" | "avg_deal_amount" | "conversion_rate" | "custom_ratio";
  // for custom_ratio: numerator_field / denominator_field × 100
  numerator?: "wonAmt" | "totalAmt" | "wonCount" | "totalCount" | "activeCount";
  denominator?: "wonAmt" | "totalAmt" | "wonCount" | "totalCount" | "activeCount";
  suffix: string;
}

const FORMULA_PRESETS: { key: CustomKpiDef["formula"]; label: string; desc: string }[] = [
  { key: "won_amount_ratio", label: "수주금액 / 견적금액", desc: "수주 금액 대비 전체 견적 금액 비율" },
  { key: "avg_deal_amount", label: "평균 고객 계약 금액", desc: "전체 고객의 평균 견적 금액" },
  { key: "conversion_rate", label: "전환율", desc: "성공 고객 수 / 전체 고객 수 × 100" },
  { key: "custom_ratio", label: "직접 정의", desc: "분자/분모를 직접 선택하여 비율 계산" },
];

const KPI_VARS: { key: string; label: string }[] = [
  { key: "wonAmt", label: "수주 금액" },
  { key: "totalAmt", label: "총 견적금액" },
  { key: "wonCount", label: "수주 건수" },
  { key: "totalCount", label: "총 고객 수" },
  { key: "activeCount", label: "활성 고객 수" },
];

interface GoalDef {
  id: string;
  name: string;
  targetAmount: number; // 만원 단위
  period: "monthly" | "quarterly";
}

function computeCustomKpi(kpi: CustomKpiDef, vars: Record<string, number>): number {
  switch (kpi.formula) {
    case "won_amount_ratio": return vars.totalAmt > 0 ? Math.round((vars.wonAmt / vars.totalAmt) * 100) : 0;
    case "avg_deal_amount": return vars.totalCount > 0 ? Math.round(vars.totalAmt / vars.totalCount) : 0;
    case "conversion_rate": return vars.totalCount > 0 ? Math.round((vars.wonCount / vars.totalCount) * 100) : 0;
    case "custom_ratio": {
      const num = vars[kpi.numerator || "wonAmt"] || 0;
      const den = vars[kpi.denominator || "totalAmt"] || 1;
      return den > 0 ? Math.round((num / den) * 100) : 0;
    }
    default: return 0;
  }
}

/* ─── SMART COLUMN MAPPING (Import AI) ─── */

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

const SYNONYM_MAP: Record<string, string[]> = {
  "회사명": ["기업명", "업체명", "회사", "고객사"],
  "연락처": ["전화번호", "휴대폰", "핸드폰", "phone", "tel"],
  "email": ["이메일", "메일", "e-mail"],
  "금액": ["견적금액", "가격", "비용", "단가", "매출액"],
  "고객담당": ["담당자", "매니저", "고객책임자", "영업사원"],
  "상태": ["진행상태", "단계", "스테이지", "stage"],
  "등록일자": ["문의 등록일", "날짜", "date", "등록일", "생성일"],
  "서비스": ["희망서비스", "제품", "상품", "품목"],
  "수량": ["총수량", "개수", "qty", "건수"],
  "담당자": ["담당자명", "이름", "성명", "컨택"],
  "직책": ["직위", "포지션", "position", "역할"],
};

function computeNameSimilarity(excelName: string, fieldLabel: string): number {
  const a = excelName.toLowerCase().trim();
  const b = fieldLabel.toLowerCase().trim();
  if (a === b) return 1.0;
  // Check synonym map in both directions
  for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
    const group = [key.toLowerCase(), ...synonyms.map(s => s.toLowerCase())];
    if (group.includes(a) && group.includes(b)) return 1.0;
  }
  // Substring match
  if (a.includes(b) || b.includes(a)) return 0.8;
  // Levenshtein fallback
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return Math.max(0, 1 - levenshteinDistance(a, b) / maxLen);
}

type DataPattern = "phone" | "email" | "currency" | "date" | "number" | "text";

function analyzeDataPattern(preview: string): DataPattern {
  const v = preview.trim();
  if (/^0\d{1,2}-\d{3,4}-\d{4}$/.test(v) || /^0\d{9,11}$/.test(v)) return "phone";
  if (/@/.test(v) && /\.\w{2,}$/.test(v)) return "email";
  if (/[₩$]|만|억|원/.test(v) || /^\d{6,}$/.test(v)) return "currency";
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(v)) return "date";
  if (/^\d+$/.test(v)) return "number";
  return "text";
}

const FIELD_PATTERN_MAP: Record<string, DataPattern> = {
  "전화번호": "phone",
  "이메일": "email",
  "견적금액": "currency",
  "문의 등록일": "date",
  "총수량": "number",
};

function computePatternScore(detected: DataPattern, fieldName: string): number {
  const expected = FIELD_PATTERN_MAP[fieldName];
  if (!expected) return 0.3; // no pattern expectation → neutral
  return detected === expected ? 1.0 : 0.0;
}

interface MappingResult {
  excelColumn: string;
  targetField: string;
  confidence: number;
  nameScore: number;
  patternScore: number;
  reason: string;
}

function computeSmartMappings(
  excelCols: { name: string; preview: string }[],
  dfFields: { name: string; required: boolean }[]
): MappingResult[] {
  // Score all pairs
  const pairs: { excel: string; field: string; nameScore: number; patternScore: number; confidence: number }[] = [];
  for (const col of excelCols) {
    const detectedPattern = analyzeDataPattern(col.preview);
    for (const field of dfFields) {
      const nameScore = computeNameSimilarity(col.name, field.name);
      const patternScore = computePatternScore(detectedPattern, field.name);
      const confidence = 0.6 * nameScore + 0.4 * patternScore;
      pairs.push({ excel: col.name, field: field.name, nameScore, patternScore, confidence });
    }
  }
  // Greedy assignment: best confidence first, no duplicates
  pairs.sort((a, b) => b.confidence - a.confidence);
  const usedExcel = new Set<string>();
  const usedField = new Set<string>();
  const results: MappingResult[] = [];
  for (const p of pairs) {
    if (usedExcel.has(p.excel) || usedField.has(p.field)) continue;
    if (p.confidence < 0.2) continue; // skip very poor matches
    usedExcel.add(p.excel);
    usedField.add(p.field);
    const reason =
      p.nameScore >= 0.8
        ? `컬럼명 유사도: ${p.excel} ↔ ${p.field}`
        : p.patternScore >= 0.8
        ? `데이터 패턴 일치: ${analyzeDataPattern(excelCols.find(c => c.name === p.excel)?.preview || "")} 형식`
        : p.confidence >= 0.4
        ? `복합 분석: 이름(${Math.round(p.nameScore * 100)}%) + 패턴(${Math.round(p.patternScore * 100)}%)`
        : "낮은 신뢰도 — 수동 확인 필요";
    results.push({
      excelColumn: p.excel,
      targetField: p.field,
      confidence: p.confidence,
      nameScore: p.nameScore,
      patternScore: p.patternScore,
      reason,
    });
  }
  return results;
}

/* ─── ONBOARDING FLOW ─── */
function OnboardingFlow({ onComplete, customFields, setCustomFields, pipelineStages }: { onComplete: (deals: Customer[], recommendedWidgets?: string[]) => void; customFields: CustomField[]; setCustomFields: React.Dispatch<React.SetStateAction<CustomField[]>>; pipelineStages: PipelineStage[] }) {
  const [step, setStep] = useState(1);
  const [fileSelected, setFileSelected] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* ── Parsed file state (null = demo/sample-fallback path) ── */
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Mapping + analysis state (declared early so parsers can reset it) ── */
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<MappingResult[] | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const mappingAbortRef = React.useRef<AbortController | null>(null);

  /* ── User-editable stage aliases: unknown value → known pipeline stage ── */
  const [stageAliases, setStageAliases] = useState<Record<string, string>>({});

  /* ── Ref holding the deals we'll analyze in step 3 (real or fallback) ── */
  const dealsForAnalysisRef = useRef<Customer[]>(SAMPLE_DEALS);

  /* ── Static fallback (used only if user proceeds without a real file, for demo) ── */
  const FALLBACK_EXCEL_COLUMNS = useMemo(() => [
    { name: "회사명", preview: "(주)테크솔루션" },
    { name: "담당자", preview: "김영호" },
    { name: "직책", preview: "이사" },
    { name: "연락처", preview: "010-1234-5678" },
    { name: "email", preview: "kim@tech.co.kr" },
    { name: "서비스", preview: "ERP 구축" },
    { name: "수량", preview: "120" },
    { name: "금액", preview: "32000000" },
    { name: "고객담당", preview: "박지은" },
    { name: "상태", preview: "견적서 발송" },
    { name: "등록일자", preview: "2026-03-15" },
  ], []);

  /* ── excelColumns = parsed headers (dynamic) OR fallback (sample demo) ── */
  const excelColumns = useMemo(() =>
    parsedSheet
      ? parsedSheet.columns.map((c) => ({ name: c.name, preview: c.preview, samples: c.samples }))
      : FALLBACK_EXCEL_COLUMNS,
    [parsedSheet, FALLBACK_EXCEL_COLUMNS]
  );

  /* ── targetFields built from live customFields (not hardcoded) ── */
  const targetFields = useMemo(
    () => customFields
      .filter((f) => f.type !== "file")    // can't import files from spreadsheet
      .map((f) => ({ name: f.label, required: f.required })),
    [customFields]
  );

  /* ── Map from field label → CustomField (needed to find key + type at transform time) ── */
  const fieldByLabel = useMemo(() => {
    const m: Record<string, CustomField> = {};
    for (const f of customFields) m[f.label] = f;
    return m;
  }, [customFields]);

  /* ── File parsing handler ── */
  const handleFileSelect = async (file: File) => {
    setParseError(null);
    if (file.size > 10 * 1024 * 1024) {
      setParseError("파일이 10MB를 초과합니다");
      return;
    }
    try {
      const sheet = await parseFile(file);
      setParsedSheet(sheet);
      setFileSelected(true);
      // Reset mapping when new file loaded
      setMappings({});
      setAnalysisResults(null);
    } catch (err) {
      setParseError((err as Error).message || "파일을 읽을 수 없습니다");
      setParsedSheet(null);
    }
  };

  /* ── Convert UI mappings + customFields → typed FieldMapping[] for transform ── */
  const buildFieldMappings = useCallback((): FieldMapping[] => {
    const result: FieldMapping[] = [];
    for (const [label, excelColumn] of Object.entries(mappings)) {
      const cf = fieldByLabel[label];
      if (!cf) continue;
      // Amount detection: by key name OR by label hint
      const isAmount = cf.key === "amount" || /금액|amount|price|매출/i.test(cf.label);
      let tType: FieldMapping["type"];
      if (isAmount) tType = "amount";
      else if (cf.type === "date") tType = "date";
      else if (cf.type === "number") tType = "number";
      else if (cf.type === "phone") tType = "phone";
      else if (cf.type === "email") tType = "email";
      else if (cf.type === "select") tType = "select";
      else if (cf.type === "person") tType = "person";
      else tType = "text";

      result.push({
        targetKey: cf.key,
        targetLabel: cf.label,
        excelColumn,
        type: tType,
        required: cf.required,
      });
    }
    return result;
  }, [mappings, fieldByLabel]);

  /* ── Stage value audit: which source-stage values don't match our pipeline? ── */
  const stageMappingAudit = useMemo(() => {
    if (!parsedSheet) return { unknowns: [] as string[], stageColumn: "" };
    // Find the excel column mapped to the stage field
    const stageField = customFields.find((f) => f.key === "stage");
    if (!stageField) return { unknowns: [] as string[], stageColumn: "" };
    const stageColumn = mappings[stageField.label] || "";
    if (!stageColumn) return { unknowns: [] as string[], stageColumn: "" };
    const known = pipelineStages.map((s) => s.name);
    const unknowns = detectUnknownValues(parsedSheet.rows, stageColumn, known);
    return { unknowns, stageColumn };
  }, [parsedSheet, customFields, mappings, pipelineStages]);

  /* ── Build Customer[] from parsed sheet + current mappings (used by both AI analysis and commit) ── */
  const buildDealsFromSheet = useCallback((): Customer[] => {
    if (!parsedSheet) return SAMPLE_DEALS;
    const fieldMappings = buildFieldMappings();
    const firstActive = pipelineStages.find((s) => s.type === "active");
    const { records } = transformRows(parsedSheet.rows, fieldMappings, {
      stageAlias: stageAliases,
      defaultStage: firstActive?.name || pipelineStages[0]?.name,
      defaultStatus: "진행중",
    });
    const knownStages = new Set(pipelineStages.map((s) => s.name));
    const now = Date.now();
    return records.map((r, i) => {
      let stage = String(r.stage ?? "");
      if (stage && !knownStages.has(stage)) {
        stage = stageAliases[stage] || firstActive?.name || pipelineStages[0]?.name || "";
      }
      return {
        id: now + i,
        company: String(r.company ?? ""),
        stage,
        contact: String(r.contact ?? ""),
        position: String(r.position ?? ""),
        service: String(r.service ?? ""),
        quantity: typeof r.quantity === "number" ? r.quantity : 0,
        amount: String(r.amount ?? ""),
        manager: String(r.manager ?? ""),
        status: String(r.status ?? "진행중"),
        date: String(r.date ?? ""),
        ...r,
      };
    });
  }, [parsedSheet, buildFieldMappings, pipelineStages, stageAliases]);

  /* ── Final commit: build deals and hand off to parent ── */
  const commitImportedDeals = () => {
    const deals = dealsForAnalysisRef.current.length > 0
      ? dealsForAnalysisRef.current
      : buildDealsFromSheet();
    onComplete(deals, Array.from(selectedWidgets));
  };

  // Dashboard AI state
  const [isAnalyzingDashboard, setIsAnalyzingDashboard] = useState(false);
  const [dashboardProgress, setDashboardProgress] = useState(0);
  const dashboardAbortRef = React.useRef<AbortController | null>(null);
  const [dealAnalysis, setDealAnalysis] = useState<DealAnalysis | null>(null);
  const [scenario, setScenario] = useState<{ scenario: ScenarioType; reason: string } | null>(null);
  const [recommendations, setRecommendations] = useState<WidgetRecommendation[]>([]);
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());
  const [showOtherWidgets, setShowOtherWidgets] = useState(false);

  // Trigger dashboard analysis when entering step 3
  const goToStep3 = async () => {
    dashboardAbortRef.current?.abort();
    const controller = new AbortController();
    dashboardAbortRef.current = controller;

    // Snapshot the deals we'll analyze (real transform or SAMPLE_DEALS fallback)
    dealsForAnalysisRef.current = parsedSheet ? buildDealsFromSheet() : SAMPLE_DEALS;

    setStep(3);
    setIsAnalyzingDashboard(true);
    setDashboardProgress(0);

    setTimeout(() => { if (!controller.signal.aborted) setDashboardProgress(1); }, 350);
    setTimeout(() => { if (!controller.signal.aborted) setDashboardProgress(2); }, 750);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/ai/dashboard-recommendation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deals: dealsForAnalysisRef.current,
          availableWidgets: allWidgets.map(w => ({ id: w.id, name: w.name, category: w.category })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("API 요청 실패");

      const data = await response.json();
      setDashboardProgress(3);
      // Backend returns a flat `dateRangeSpanDays` — rebuild the full analysis
      // locally so the shape matches `DealAnalysis` (dateRange is an object).
      const analysis = analyzeDealData(dealsForAnalysisRef.current);
      setDealAnalysis(analysis);
      setScenario(data.scenario);
      setRecommendations(data.recommendations);
      // Pre-select only the essential widgets (priority >= 85) — start tight,
      // user can expand via "추천 전체" button.
      const essentials = (data.recommendations as WidgetRecommendation[])
        .filter((r) => (r.priority ?? 0) >= 85)
        .map((r) => r.widgetId);
      setSelectedWidgets(new Set(essentials));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      // Fallback: 로컬 규칙 기반 추천
      console.warn("AI 대시보드 추천 실패, 로컬 폴백 사용");
      const analysis = analyzeDealData(dealsForAnalysisRef.current);
      const detected = detectScenario(analysis);
      const recs = recommendWidgets(analysis, detected.scenario);
      setDashboardProgress(3);
      setDealAnalysis(analysis);
      setScenario(detected);
      setRecommendations(recs);
      setSelectedWidgets(new Set(recs.filter((r) => (r.priority ?? 0) >= 85).map((r) => r.widgetId)));
    } finally {
      if (!controller.signal.aborted) setIsAnalyzingDashboard(false);
    }
  };

  const cancelDashboardAnalysis = () => {
    dashboardAbortRef.current?.abort();
    setIsAnalyzingDashboard(false);
    setDashboardProgress(0);
    setStep(2);
  };

  const autoMap = async () => {
    mappingAbortRef.current?.abort();
    const controller = new AbortController();
    mappingAbortRef.current = controller;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisResults(null);

    // Progress animation
    setTimeout(() => { if (!controller.signal.aborted) setAnalysisProgress(1); }, 400);
    setTimeout(() => { if (!controller.signal.aborted) setAnalysisProgress(2); }, 900);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/ai/column-mapping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excelColumns, targetFields }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("API 요청 실패");

      const data = await response.json();
      setAnalysisProgress(3);

      // Build displayable analysis results: existing mappings + new-field entries
      const combinedResults: MappingResult[] = (data.mappings ?? []).map((m: {excelColumn:string;targetField:string;confidence:number;reason:string}) => ({
        excelColumn: m.excelColumn,
        targetField: m.targetField,
        confidence: m.confidence,
        nameScore: 0,
        patternScore: 0,
        reason: m.reason,
      }));
      const newFields: Array<{
        excelColumn: string;
        type: string;
        suggestedOptions?: string[];
        confidence: number;
        reason: string;
      }> = data.newFields ?? [];

      // Register auto-created custom fields for unmapped columns
      const existingKeys = new Set(customFields.map((f) => f.key));
      const existingLabels = new Set(customFields.map((f) => f.label));
      const createdFields: CustomField[] = [];
      const labelsByExcel: Record<string, string> = {};

      const slugify = (s: string) => {
        const base = s
          .toLowerCase()
          .replace(/[()\[\]{}%₩,]/g, "")
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9_\uac00-\ud7a3]/g, "")
          .slice(0, 40) || "field";
        let key = base;
        let i = 2;
        while (existingKeys.has(key)) key = `${base}_${i++}`;
        existingKeys.add(key);
        return key;
      };

      const toFieldType = (t: string): FieldType => {
        if (t === "amount") return "number";
        if (t === "text" || t === "number" || t === "date" || t === "person" || t === "phone" || t === "email" || t === "select") return t;
        return "text";
      };

      for (const nf of newFields) {
        // Skip if a field with same label already exists (avoid duplicates)
        let label = nf.excelColumn;
        if (existingLabels.has(label)) {
          // Still record the mapping to the existing label
          labelsByExcel[nf.excelColumn] = label;
          continue;
        }
        existingLabels.add(label);
        const field: CustomField = {
          id: `f_auto_${Date.now()}_${createdFields.length}`,
          key: slugify(nf.excelColumn),
          label,
          type: toFieldType(nf.type),
          required: false,
          locked: false,
          visible: true,
          options:
            nf.type === "select" && nf.suggestedOptions
              ? nf.suggestedOptions
              : undefined,
        };
        createdFields.push(field);
        labelsByExcel[nf.excelColumn] = label;

        // Surface in analysisResults so user sees what the AI did
        combinedResults.push({
          excelColumn: nf.excelColumn,
          targetField: label,
          confidence: nf.confidence,
          nameScore: 0,
          patternScore: 0,
          reason: `새 필드 생성 (${nf.type}): ${nf.reason}`,
        });
      }

      if (createdFields.length > 0) {
        setCustomFields((prev) => [...prev, ...createdFields]);
      }

      setAnalysisResults(combinedResults);

      const newMappings: Record<string, string> = {};
      for (const r of data.mappings ?? []) {
        if (r.confidence >= 0.4) {
          newMappings[r.targetField] = r.excelColumn;
        }
      }
      for (const [excelCol, label] of Object.entries(labelsByExcel)) {
        newMappings[label] = excelCol;
      }
      setMappings(newMappings);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      // Fallback: 로컬 규칙 기반 매핑
      console.warn("AI 매핑 실패, 로컬 폴백 사용");
      const results = computeSmartMappings(excelColumns, targetFields);
      setAnalysisProgress(3);
      setAnalysisResults(results);
      const newMappings: Record<string, string> = {};
      for (const r of results) {
        if (r.confidence >= 0.4) newMappings[r.targetField] = r.excelColumn;
      }
      setMappings(newMappings);
    } finally {
      if (!controller.signal.aborted) setIsAnalyzing(false);
    }
  };

  const cancelMapping = () => {
    mappingAbortRef.current?.abort();
    setIsAnalyzing(false);
    setAnalysisProgress(0);
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
              {s === 1 ? "파일 업로드" : s === 2 ? "AI 컬럼 매핑" : "AI 대시보드"}
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
            <h2 className="text-[22px] text-[#1A1A1A] mb-2">고객 데이터를 가져오세요</h2>
            <p className="text-[0.85rem] text-[#999] mb-8">기존 Excel 파일을 업로드하면 자동으로 고객 데이터가 생성됩니다.</p>

            <div
              className="w-full rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors mb-4"
              style={{
                border: `2px dashed ${dragOver ? T.primary : "#E0E3E8"}`,
                background: dragOver ? "#F0F7FF" : "#FAFBFC",
                minHeight: 180,
              }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) await handleFileSelect(f);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={26} color="#999" className="mb-3" />
              {parsedSheet ? (
                <>
                  <p className="text-[0.85rem]" style={{ color: T.primary }}>{parsedSheet.fileName} 선택됨</p>
                  <p className="text-[0.7rem] text-[#999] mt-1">
                    {parsedSheet.rowCount}행 · {parsedSheet.headers.length}개 컬럼
                  </p>
                </>
              ) : fileSelected ? (
                <p className="text-[0.85rem]" style={{ color: T.primary }}>샘플 데이터 사용 (데모 모드)</p>
              ) : (
                <>
                  <p className="text-[0.85rem] text-[#666] mb-1">여기에 파일을 끌어다 놓으세요</p>
                  <p className="text-[0.8rem]" style={{ color: T.primary }}>또는 파일 선택</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) await handleFileSelect(f);
                e.target.value = "";
              }}
            />
            {parseError && (
              <div className="w-full mb-3 px-3 py-2 rounded-lg text-[0.75rem]" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                {parseError}
              </div>
            )}
            <div className="flex items-center gap-3 mb-6">
              <p className="text-[0.75rem] text-[#BBB]">지원 형식: .xlsx, .xls, .csv · 최대 10MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); setFileSelected(true); setParsedSheet(null); setParseError(null); }}
                className="text-[0.7rem] text-[#999] hover:text-[#1A472A] transition-colors underline"
              >
                샘플 데이터로 체험하기
              </button>
            </div>

            <div className="flex items-center gap-4 w-full">
              <button
                onClick={() => {
                  const csv = "\uFEFF기업명,담당자,희망서비스,견적금액(원),총수량,등록일\n,,,,,\n";
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "dangol_sample.csv";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-[0.8rem] text-[#666] hover:bg-[#F7F8FA] transition-colors"
                style={{ borderColor: T.border }}
              >
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
        <div className="bg-white rounded-2xl p-8 w-full max-w-[800px]" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {isAnalyzing ? (
            /* ── AI 분석 중 로딩 ── */
            <div className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: "#F0F4FF" }}>
                <Sparkles size={24} color={T.primary} className="animate-pulse" />
              </div>
              <h2 className="text-[1.1rem] text-[#1A1A1A] mb-2">AI가 데이터를 분석하고 있습니다...</h2>
              <p className="text-[0.8rem] text-[#999] mb-8">엑셀 컬럼과 DealFlow 필드를 매칭합니다</p>
              <div className="w-full max-w-[360px] space-y-3">
                {["컬럼명 분석", "데이터 패턴 감지", "최적 매핑 계산"].map((label, i) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem]"
                      style={{
                        background: analysisProgress > i ? T.success : analysisProgress === i ? "#FEF3C7" : "#F3F4F6",
                        color: analysisProgress > i ? "#fff" : analysisProgress === i ? "#D97706" : "#999",
                        transition: "all 0.3s",
                      }}
                    >
                      {analysisProgress > i ? "✓" : i + 1}
                    </div>
                    <span className="text-[0.8rem]" style={{ color: analysisProgress >= i ? T.textPrimary : "#999" }}>{label}</span>
                    {analysisProgress === i && (
                      <div className="ml-auto w-16 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div className="h-full rounded-full animate-pulse" style={{ background: T.primary, width: "60%" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={cancelMapping}
                className="mt-8 px-5 py-2 rounded-lg text-[0.8rem] text-[#666] border hover:bg-[#FEF2F2] hover:text-[#E8453A] hover:border-[#FECACA] transition-colors"
                style={{ borderColor: T.border }}
              >
                <X size={12} className="inline mr-1.5" />분석 취소
              </button>
            </div>
          ) : !analysisResults ? (
            /* ── 분석 전 초기 상태 ── */
            <div className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "#F0F4FF" }}>
                <Sparkles size={22} color={T.primary} />
              </div>
              <h2 className="text-[1.1rem] text-[#1A1A1A] mb-2">AI 컬럼 매핑</h2>
              <p className="text-[0.8rem] text-[#999] mb-6">AI가 엑셀 컬럼을 자동으로 분석하여 최적의 매핑을 제안합니다</p>
              <button
                onClick={autoMap}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-[0.85rem] text-white transition-colors"
                style={{ background: T.primary }}
              >
                <Sparkles size={14} /> AI 자동 매핑 시작
              </button>
            </div>
          ) : (
            /* ── 매핑 결과 (그룹화 + 인라인 근거) ── */
            (() => {
              const getConfidence = (fieldName: string) =>
                analysisResults.find(r => r.targetField === fieldName)?.confidence ?? 0;

              const autoMapped = targetFields.filter(f => getConfidence(f.name) >= 0.8);
              const needsReview = targetFields.filter(f => {
                const c = getConfidence(f.name);
                return c >= 0.4 && c < 0.8;
              });
              const unmapped = targetFields.filter(f => getConfidence(f.name) < 0.4);

              const requiredUnmapped = unmapped.filter(f => f.required && !mappings[f.name]).length;
              const canProceed = targetFields.filter(f => f.required).every(f => !!mappings[f.name]);

              const renderFieldRow = (field: { name: string; required: boolean }) => {
                const result = analysisResults.find(r => r.targetField === field.name);
                const confidence = result?.confidence ?? 0;
                const currentMapping = mappings[field.name] || "";
                const preview = currentMapping ? excelColumns.find(c => c.name === currentMapping)?.preview : null;
                const tone = confidence >= 0.8 ? "success" : confidence >= 0.4 ? "warn" : "idle";
                const borderCol = tone === "success" ? "#86EFAC" : tone === "warn" ? "#FDE68A" : T.border;

                return (
                  <div
                    key={field.name}
                    className="rounded-xl border transition-all"
                    style={{ borderColor: borderCol, background: "#fff" }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* DealFlow field label */}
                      <div className="w-[140px] shrink-0 flex items-center gap-1.5">
                        <span className="text-[0.85rem] text-[#1A1A1A]">{field.name}</span>
                        {field.required && (
                          <span className="text-[0.6rem] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#FEF2F2", color: "#DC2626" }}>필수</span>
                        )}
                      </div>

                      <ArrowRight size={12} className="text-[#BBB] shrink-0" />

                      {/* Excel column selector */}
                      <select
                        className="flex-1 text-[0.85rem] px-3 py-2 rounded-lg border bg-white text-[#1A1A1A] focus:outline-none focus:border-[#1A472A] min-w-0"
                        style={{ borderColor: T.border }}
                        value={currentMapping}
                        onChange={(e) => setMappings((p) => ({ ...p, [field.name]: e.target.value }))}
                      >
                        <option value="">— 선택하지 않음 —</option>
                        {excelColumns.map((c) => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>

                      {/* Preview sample data */}
                      {preview && (
                        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: "#F8FAFC", border: `1px solid ${T.border}` }}>
                          <span className="text-[0.65rem] text-[#BBB]">예시</span>
                          <span className="text-[0.75rem] text-[#444] truncate max-w-[140px]">{preview}</span>
                        </div>
                      )}

                      {/* Confidence % badge */}
                      {confidence > 0 && (
                        <span
                          className="text-[0.7rem] font-medium px-2 py-1 rounded-full shrink-0 tabular-nums"
                          style={{
                            background: tone === "success" ? "#ECFDF5" : tone === "warn" ? "#FEF3C7" : "#F3F4F6",
                            color: tone === "success" ? "#059669" : tone === "warn" ? "#D97706" : "#9CA3AF",
                          }}
                        >
                          {Math.round(confidence * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Inline AI reason */}
                    {result && confidence > 0 && result.reason && (
                      <div className="px-4 pb-3 pt-0 flex items-start gap-1.5">
                        <Sparkles size={10} className="shrink-0 mt-0.5" color={tone === "success" ? "#059669" : tone === "warn" ? "#D97706" : "#9CA3AF"} />
                        <p className="text-[0.7rem] text-[#666] leading-relaxed">{result.reason}</p>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <>
                  {/* Header + summary */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-[1.1rem] text-[#1A1A1A] mb-1">AI 매핑 결과</h2>
                      <p className="text-[0.75rem] text-[#999]">{autoMapped.length + needsReview.length}개 매핑됨 · {autoMapped.length}개 자동 매핑 · {needsReview.length}개 확인 필요</p>
                    </div>
                    <button
                      onClick={autoMap}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-[0.8rem] transition-colors"
                      style={{ background: "#F0F4FF", color: T.primary }}
                    >
                      <RefreshCw size={12} /> 다시 분석
                    </button>
                  </div>

                  {/* Required unmapped warning — surfaces required fields that still need a column */}
                  {requiredUnmapped > 0 && (
                    <div className="mb-4 rounded-xl border" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
                      <div className="flex items-start gap-2.5 px-4 py-3 border-b" style={{ borderColor: "#FECACA" }}>
                        <AlertTriangle size={14} color="#DC2626" className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-[0.8rem] text-[#991B1B] font-medium">필수 필드 {requiredUnmapped}개가 매핑되지 않았습니다</p>
                          <p className="text-[0.7rem] text-[#B91C1C] mt-0.5">아래에서 엑셀 컬럼을 직접 선택해주세요.</p>
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {unmapped.filter((f) => f.required && !mappings[f.name]).map(renderFieldRow)}
                      </div>
                    </div>
                  )}

                  {/* Unknown stage value mapper — only when a stage column is mapped and there are unknowns */}
                  {parsedSheet && stageMappingAudit.unknowns.length > 0 && (
                    <div className="mb-4 rounded-xl border" style={{ borderColor: "#FDE68A", background: "#FFFBEB" }}>
                      <div className="flex items-start gap-2.5 px-4 py-3 border-b" style={{ borderColor: "#FDE68A" }}>
                        <AlertTriangle size={14} color="#D97706" className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-[0.8rem] text-[#92400E] font-medium">
                            알 수 없는 진행상태 값 {stageMappingAudit.unknowns.length}개
                          </p>
                          <p className="text-[0.7rem] text-[#B45309] mt-0.5">
                            각 값을 현재 파이프라인의 스테이지에 연결하세요. 선택하지 않으면 기본 스테이지로 들어갑니다.
                          </p>
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        {stageMappingAudit.unknowns.map((uv) => (
                          <div key={uv} className="flex items-center gap-3">
                            <span className="text-[0.75rem] text-[#1A1A1A] flex-1 truncate">"{uv}"</span>
                            <ArrowRight size={11} className="text-[#BBB]" />
                            <select
                              className="text-[0.75rem] px-2.5 py-1.5 rounded-lg border bg-white text-[#444] cursor-pointer min-w-[140px]"
                              style={{ borderColor: T.border }}
                              value={stageAliases[uv] || ""}
                              onChange={(e) => setStageAliases((p) => ({ ...p, [uv]: e.target.value }))}
                            >
                              <option value="">(기본 스테이지)</option>
                              {pipelineStages.map((s) => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section: 확인 필요 (priority — shown first) */}
                  {needsReview.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                          <AlertTriangle size={12} color="#D97706" />
                        </div>
                        <span className="text-[0.85rem] text-[#1A1A1A] font-medium">확인 필요</span>
                        <span className="text-[0.7rem] text-[#999]">{needsReview.length}개 · AI 확신도 중간, 매핑을 검토하세요</span>
                      </div>
                      <div className="space-y-2">
                        {needsReview.map(renderFieldRow)}
                      </div>
                    </div>
                  )}

                  {/* Section: 자동 매핑됨 */}
                  {autoMapped.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#ECFDF5" }}>
                          <CheckCircle2 size={12} color="#059669" />
                        </div>
                        <span className="text-[0.85rem] text-[#1A1A1A] font-medium">자동 매핑됨</span>
                        <span className="text-[0.7rem] text-[#999]">{autoMapped.length}개 · AI 확신도 높음</span>
                      </div>
                      <div className="space-y-2">
                        {autoMapped.map(renderFieldRow)}
                      </div>
                    </div>
                  )}

                  {/* Footer action */}
                  <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: T.border }}>
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.8rem] text-[#666] hover:bg-[#F7F8FA] transition-colors"
                    >
                      <ChevronLeft size={13} /> 이전
                    </button>
                    <button
                      onClick={goToStep3}
                      disabled={!canProceed}
                      className="px-6 py-2.5 rounded-lg text-[0.8rem] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: T.primary }}
                    >
                      데이터 가져오기 ({parsedSheet ? parsedSheet.rowCount : SAMPLE_DEALS.length}건) <ArrowRight size={12} className="inline ml-1" />
                    </button>
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-2xl p-8 w-full max-w-[960px]" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          {isAnalyzingDashboard ? (
            /* ── 대시보드 AI 분석 중 ── */
            <div className="flex flex-col items-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ background: "#F0F4FF" }}>
                <LayoutGrid size={24} color={T.primary} className="animate-pulse" />
              </div>
              <h2 className="text-[1.1rem] text-[#1A1A1A] mb-2">AI가 대시보드를 구성하고 있습니다...</h2>
              <p className="text-[0.8rem] text-[#999] mb-8">{dealsForAnalysisRef.current.length}건의 데이터를 분석하여 최적의 대시보드를 추천합니다</p>
              <div className="w-full max-w-[360px] space-y-3">
                {["데이터 분석", "시나리오 감지", "위젯 추천"].map((label, i) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[0.65rem]"
                      style={{
                        background: dashboardProgress > i ? T.success : dashboardProgress === i ? "#FEF3C7" : "#F3F4F6",
                        color: dashboardProgress > i ? "#fff" : dashboardProgress === i ? "#D97706" : "#999",
                        transition: "all 0.3s",
                      }}
                    >
                      {dashboardProgress > i ? "✓" : i + 1}
                    </div>
                    <span className="text-[0.8rem]" style={{ color: dashboardProgress >= i ? T.textPrimary : "#999" }}>{label}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={cancelDashboardAnalysis}
                className="mt-8 px-5 py-2 rounded-lg text-[0.8rem] text-[#666] border hover:bg-[#FEF2F2] hover:text-[#E8453A] hover:border-[#FECACA] transition-colors"
                style={{ borderColor: T.border }}
              >
                <X size={12} className="inline mr-1.5" />분석 취소
              </button>
            </div>
          ) : dealAnalysis && scenario ? (
            /* ── 대시보드 추천 결과 ── */
            (() => {
              const toggleWidget = (id: string) =>
                setSelectedWidgets((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });

              const categoryLabels: Record<string, string> = {
                kpi: "핵심 지표",
                chart: "차트",
                table: "테이블",
                utility: "유틸",
              };
              const categoryOrder = ["kpi", "chart", "table", "utility"];

              // Group recommendations by category, preserving priority order within each
              const sortedRecs = [...recommendations].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
              const recsByCategory = new Map<string, typeof sortedRecs>();
              for (const rec of sortedRecs) {
                const w = allWidgets.find((x) => x.id === rec.widgetId);
                if (!w) continue;
                const cat = w.category || "utility";
                if (!recsByCategory.has(cat)) recsByCategory.set(cat, []);
                recsByCategory.get(cat)!.push(rec);
              }

              const recIds = new Set(recommendations.map((r) => r.widgetId));
              const otherWidgets = allWidgets.filter((w) => !recIds.has(w.id));

              const selectEssentials = () =>
                setSelectedWidgets(new Set(recommendations.filter((r) => (r.priority ?? 0) >= 85).map((r) => r.widgetId)));
              const selectAllRecommended = () => setSelectedWidgets(new Set(recommendations.map((r) => r.widgetId)));
              const clearAll = () => setSelectedWidgets(new Set());

              const stats = [
                { label: "총 고객 수", value: `${dealAnalysis.totalDeals}건`, icon: BarChart3 },
                { label: "스테이지", value: `${dealAnalysis.uniqueStages}개`, icon: Filter },
                { label: "담당자", value: `${dealAnalysis.uniqueManagers}명`, icon: Users },
                { label: "총 금액", value: fmtAmt(dealAnalysis.totalAmount), icon: DollarSign },
                { label: "수주율", value: `${Math.round(dealAnalysis.winRate * 100)}%`, icon: Target },
                { label: "기간", value: dealAnalysis.dateRange.spanDays > 0 ? `${dealAnalysis.dateRange.spanDays}일` : "-", icon: Calendar },
              ];

              return (
                <>
                  {/* 헤더 */}
                  <div className="mb-5">
                    <h2 className="text-[1.1rem] text-[#1A1A1A] mb-1">AI 대시보드 추천</h2>
                    <p className="text-[0.8rem] text-[#999]">{dealsForAnalysisRef.current.length}건의 고객 데이터를 분석했습니다</p>
                  </div>

                  {/* 시나리오 히어로 카드 */}
                  <div
                    className="rounded-xl p-5 mb-5"
                    style={{
                      background: "linear-gradient(135deg, #F0F4FF 0%, #F8FAFC 100%)",
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "#fff", border: `1px solid ${T.border}` }}
                      >
                        <LayoutGrid size={18} color={T.primary} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[0.65rem] text-[#999] uppercase tracking-wider">감지된 시나리오</span>
                          <span className="px-2 py-0.5 rounded-full text-[0.7rem]" style={{ background: "#fff", color: T.primary, border: `1px solid ${T.border}` }}>
                            {scenario.scenario}
                          </span>
                        </div>
                        <p className="text-[0.85rem] text-[#1A1A1A] leading-relaxed">{scenario.reason}</p>
                      </div>
                    </div>
                  </div>

                  {/* 데이터 요약 스트립 */}
                  <div className="grid grid-cols-6 gap-2 mb-6">
                    {stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex flex-col items-start px-3 py-2.5 rounded-lg"
                        style={{ background: "#F8F9FA", border: `1px solid ${T.border}` }}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <stat.icon size={11} color="#999" />
                          <p className="text-[0.62rem] text-[#999]">{stat.label}</p>
                        </div>
                        <p className="text-[0.88rem] text-[#1A1A1A]">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* 추천 위젯 헤더 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="text-[0.8rem] text-[#1A1A1A]">추천 위젯</p>
                      <span className="text-[0.7rem] px-2 py-0.5 rounded-full" style={{ background: "#F3F4F6", color: "#666" }}>
                        {selectedWidgets.size} / {allWidgets.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[0.72rem]">
                      <button onClick={selectEssentials} className="px-2 py-1 rounded hover:bg-[#F3F4F6] transition-colors" style={{ color: T.primary }}>
                        필수만
                      </button>
                      <span className="text-[#E0E3E8]">·</span>
                      <button onClick={selectAllRecommended} className="px-2 py-1 rounded hover:bg-[#F3F4F6] transition-colors" style={{ color: "#666" }}>
                        추천 전체
                      </button>
                      <span className="text-[#E0E3E8]">·</span>
                      <button onClick={clearAll} className="px-2 py-1 rounded hover:bg-[#F3F4F6] transition-colors" style={{ color: "#666" }}>
                        해제
                      </button>
                    </div>
                  </div>

                  {/* 추천 위젯 — 카테고리 그룹 */}
                  <div className="space-y-4">
                    {categoryOrder.map((cat) => {
                      const items = recsByCategory.get(cat);
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={cat}>
                          <p className="text-[0.68rem] text-[#999] uppercase tracking-wider mb-2">
                            {categoryLabels[cat] || cat} <span className="text-[#CCC]">· {items.length}</span>
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {items.map((rec) => {
                              const widget = allWidgets.find((w) => w.id === rec.widgetId);
                              if (!widget) return null;
                              const isSelected = selectedWidgets.has(rec.widgetId);
                              const isTopPick = (rec.priority ?? 0) >= 90;
                              return (
                                <div
                                  key={rec.widgetId}
                                  className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                                  style={{
                                    background: isSelected ? "#F0FFF4" : "#fff",
                                    border: `1px solid ${isSelected ? "#86EFAC" : T.border}`,
                                  }}
                                  onClick={() => toggleWidget(rec.widgetId)}
                                >
                                  <input type="checkbox" checked={isSelected} readOnly className="mt-0.5 w-3.5 h-3.5 accent-[#1A472A] shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <widget.icon size={13} color={isSelected ? T.primary : "#999"} />
                                      <p className="text-[0.8rem] text-[#1A1A1A] truncate">{widget.name}</p>
                                      {isTopPick && (
                                        <span className="text-[0.58rem] px-1 py-0.5 rounded shrink-0" style={{ background: "#FEF3C7", color: "#D97706" }}>
                                          추천
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[0.68rem] text-[#999] leading-snug" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                      {rec.reason}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 기타 위젯 */}
                  {otherWidgets.length > 0 && (
                    <div className="mt-5 pt-4" style={{ borderTop: `1px dashed ${T.border}` }}>
                      <button
                        onClick={() => setShowOtherWidgets(!showOtherWidgets)}
                        className="flex items-center gap-1.5 text-[0.75rem] mb-2 transition-colors"
                        style={{ color: "#666" }}
                      >
                        <ChevronDown size={12} className={`transition-transform ${showOtherWidgets ? "rotate-180" : ""}`} />
                        기타 위젯 추가하기 ({otherWidgets.length}개)
                      </button>
                      {showOtherWidgets && (
                        <div className="grid grid-cols-3 gap-2">
                          {otherWidgets.map((widget) => {
                            const isSelected = selectedWidgets.has(widget.id);
                            return (
                              <div
                                key={widget.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
                                style={{
                                  background: isSelected ? "#F0FFF4" : "#FAFAFA",
                                  border: `1px solid ${isSelected ? "#86EFAC" : T.border}`,
                                }}
                                onClick={() => toggleWidget(widget.id)}
                              >
                                <input type="checkbox" checked={isSelected} readOnly className="w-3.5 h-3.5 accent-[#1A472A] shrink-0" />
                                <widget.icon size={12} color="#999" />
                                <p className="text-[0.75rem] text-[#666] truncate">{widget.name}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 하단 버튼 */}
                  <div className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: `1px solid ${T.border}` }}>
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[0.8rem] transition-colors"
                      style={{ border: `1px solid ${T.border}`, color: "#666" }}
                    >
                      <ChevronLeft size={13} /> 이전
                    </button>
                    <button
                      onClick={commitImportedDeals}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-[0.85rem] text-white transition-colors"
                      style={{ background: T.primary }}
                      disabled={selectedWidgets.size === 0}
                    >
                      {selectedWidgets.size}개 위젯으로 시작하기 <ArrowRight size={13} />
                    </button>
                  </div>
                </>
              );
            })()
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ─── WEB FORM SAMPLE DEALS ─── */
const WEB_FORM_SAMPLE_DEALS: Customer[] = [
  { id: 101, company: "(주)넥스트커머스", stage: "신규", contact: "김서현", position: "마케팅 팀장", service: "", quantity: 0, amount: "₩0", healthScore: 70, ltv: "₩0", renewalDate: "", manager: "박지은", status: "신규", date: "2026-04-12" },
  { id: 102, company: "스마트로직(주)",   stage: "신규", contact: "이동훈", position: "대표이사",   service: "", quantity: 0, amount: "₩0", healthScore: 70, ltv: "₩0", renewalDate: "", manager: "김태현", status: "신규", date: "2026-04-12" },
  { id: 103, company: "(주)블루오션테크", stage: "신규", contact: "정하나", position: "기획팀",     service: "", quantity: 0, amount: "₩0", healthScore: 70, ltv: "₩0", renewalDate: "", manager: "이서연", status: "신규", date: "2026-04-11" },
];

/* ─── WEB FORM ONBOARDING FLOW ─── */
interface WebFormField { key: string; label: string; required: boolean; locked: boolean; }

const DEFAULT_WEB_FORM_FIELDS: WebFormField[] = [
  { key: "company", label: "기업명", required: true, locked: true },
  { key: "contact", label: "담당자명", required: false, locked: false },
  { key: "phone", label: "전화번호", required: false, locked: false },
  { key: "email", label: "이메일", required: false, locked: false },
  { key: "service", label: "희망서비스", required: false, locked: false },
  { key: "message", label: "문의내용", required: false, locked: false },
];

function WebFormOnboarding({ onComplete }: { onComplete: (deals: Customer[]) => void }) {
  const [step, setStep] = useState(1);
  const [formName, setFormName] = useState("홈페이지 문의하기");
  const [fields, setFields] = useState<WebFormField[]>(DEFAULT_WEB_FORM_FIELDS);
  const [copied, setCopied] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);

  const activeFields = fields.filter((f) => f.required || f.locked);
  const toggleField = (key: string) => {
    setFields((prev) =>
      prev.map((f) =>
        f.key === key && !f.locked ? { ...f, required: !f.required } : f
      )
    );
  };

  const embedCode = `<!-- dangol CRM 웹 폼 -->
<script src="https://cdn.dangol.io/form.js"></script>
<div id="dangol-form"
  data-form-id="f-${Date.now().toString(36)}"
  data-fields="${fields.filter((f) => f.required || f.locked).map((f) => f.key).join(",")}"
></div>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestSubmit = () => {
    setTestSubmitted(true);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ background: T.bg }}>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[0.8rem]"
              style={{ background: step >= s ? T.primary : "#E0E3E8", color: step >= s ? "#fff" : "#999" }}
            >
              {step > s ? "✓" : s}
            </div>
            <span className="text-[0.8rem]" style={{ color: step >= s ? T.textPrimary : "#999" }}>
              {s === 1 ? "폼 설정" : s === 2 ? "미리보기 & 코드" : "완료"}
            </span>
            {s < 3 && <div className="w-12 h-px" style={{ background: step > s ? T.primary : "#E0E3E8" }} />}
          </div>
        ))}
      </div>

      {/* Step 1: 폼 설정 */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-10 w-full max-w-[480px]" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "#EBF5FF" }}>
              <Globe size={22} color={T.primary} />
            </div>
            <h2 className="text-[22px] text-[#1A1A1A] mb-2">웹 폼 연동 설정</h2>
            <p className="text-[0.85rem] text-[#999]">홈페이지 문의 폼을 통해 리드를 자동으로 수집합니다.</p>
          </div>

          <div className="mb-6">
            <label className="text-[0.75rem] text-[#666] mb-1.5 block">폼 이름</label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border text-[0.85rem] text-[#1A1A1A] placeholder-[#CCC] focus:outline-none focus:border-[#1A472A]"
              style={{ borderColor: T.border }}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="예: 홈페이지 문의하기"
            />
          </div>

          <div className="mb-6">
            <label className="text-[0.75rem] text-[#666] mb-2 block">수집할 필드</label>
            <div className="space-y-1.5">
              {fields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-[#FAFBFC]"
                  style={{ borderColor: field.required || field.locked ? T.primary : T.border, background: field.required || field.locked ? "#F0F7F2" : "#fff" }}
                >
                  <input
                    type="checkbox"
                    checked={field.required || field.locked}
                    disabled={field.locked}
                    onChange={() => toggleField(field.key)}
                    className="w-4 h-4 rounded accent-[#1A472A]"
                  />
                  <span className="text-[0.8rem] text-[#1A1A1A] flex-1">{field.label}</span>
                  {field.locked && <span className="text-[0.6rem] text-[#BBB]">필수</span>}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[0.85rem] text-white transition-colors"
            style={{ background: formName.trim() ? T.primary : "#CCC", cursor: formName.trim() ? "pointer" : "not-allowed" }}
            disabled={!formName.trim()}
          >
            다음 <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Step 2: 미리보기 & 임베드 코드 */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-8 w-full max-w-[780px]" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[1.2rem] text-[#1A1A1A]">미리보기 & 임베드 코드</h2>
            <button
              onClick={() => setStep(1)}
              className="text-[0.8rem] text-[#999] hover:text-[#666] transition-colors"
            >
              ← 이전
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {/* 폼 미리보기 */}
            <div>
              <p className="text-[0.75rem] text-[#999] mb-3 uppercase tracking-wider">폼 미리보기</p>
              <div className="rounded-xl p-6 border" style={{ borderColor: T.border, background: "#FAFBFC" }}>
                <p className="text-[1rem] text-[#1A1A1A] mb-4">{formName}</p>
                <div className="space-y-3">
                  {fields.filter((f) => f.required || f.locked).map((field) => (
                    <div key={field.key}>
                      <label className="text-[0.7rem] text-[#666] mb-1 block">
                        {field.label}
                        {field.locked && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {field.key === "message" ? (
                        <textarea
                          className="w-full px-3 py-2 rounded-lg border text-[0.8rem] bg-white text-[#CCC] resize-none h-[64px]"
                          style={{ borderColor: T.border }}
                          placeholder={`${field.label}을 입력하세요`}
                          readOnly
                        />
                      ) : (
                        <input
                          className="w-full px-3 py-2 rounded-lg border text-[0.8rem] bg-white text-[#CCC]"
                          style={{ borderColor: T.border }}
                          placeholder={`${field.label}을 입력하세요`}
                          readOnly
                        />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className="w-full mt-4 py-2.5 rounded-lg text-[0.8rem] text-white"
                  style={{ background: T.primary }}
                >
                  문의하기
                </button>
              </div>
              {/* 테스트 제출 */}
              <button
                onClick={handleTestSubmit}
                disabled={testSubmitted}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border text-[0.8rem] transition-colors"
                style={{
                  borderColor: testSubmitted ? T.success : T.border,
                  color: testSubmitted ? T.success : "#666",
                  background: testSubmitted ? "#ECFDF5" : "#fff",
                }}
              >
                {testSubmitted ? (
                  <><CheckCircle2 size={13} /> 테스트 문의 수신 완료</>
                ) : (
                  <><Sparkles size={13} /> 테스트 제출 시뮬레이션</>
                )}
              </button>
            </div>

            {/* 임베드 코드 */}
            <div>
              <p className="text-[0.75rem] text-[#999] mb-3 uppercase tracking-wider">임베드 코드</p>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: T.border }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: T.border, background: "#1E293B" }}>
                  <div className="flex items-center gap-2">
                    <Code2 size={12} color="#94A3B8" />
                    <span className="text-[0.7rem] text-[#94A3B8]">HTML</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[0.65rem] transition-colors"
                    style={{ color: copied ? T.success : "#94A3B8", background: copied ? "#0F291A" : "transparent" }}
                  >
                    {copied ? <><CheckCircle2 size={10} /> 복사됨</> : <><Copy size={10} /> 복사</>}
                  </button>
                </div>
                <pre className="p-4 text-[0.7rem] text-[#E2E8F0] leading-relaxed overflow-x-auto" style={{ background: "#0F172A" }}>
                  {embedCode}
                </pre>
              </div>

              <div className="mt-4 p-4 rounded-xl" style={{ background: "#FFFBEB", border: "1px solid #FEF3C7" }}>
                <p className="text-[0.75rem] text-[#92400E] leading-relaxed">
                  위 코드를 홈페이지의 문의하기 페이지에 붙여넣으세요.
                  폼을 통해 접수된 문의는 자동으로 <strong>"신규"</strong> 스테이지의 고객으로 생성됩니다.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-lg text-[0.85rem] text-white transition-colors"
              style={{ background: T.primary }}
            >
              연동 완료
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 완료 */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-10 w-full max-w-[416px] text-center" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#ECFDF5" }}>
            <CheckCircle2 size={26} color={T.success} />
          </div>
          <h2 className="text-[22px] text-[#1A1A1A] mb-2">웹 폼 연동 완료!</h2>
          <p className="text-[0.9rem] text-[#666] mb-6">
            홈페이지 문의 폼이 연동되었습니다.<br />
            접수된 문의는 자동으로 고객으로 생성됩니다.
          </p>
          <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
            {[`리드 ${WEB_FORM_SAMPLE_DEALS.length}건 수신`, `스테이지: 신규`, `자동 배정 활성`].map((s) => (
              <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem]" style={{ background: "#ECFDF5", color: "#059669" }}>
                ✓ {s}
              </span>
            ))}
          </div>
          <button
            onClick={() => onComplete(WEB_FORM_SAMPLE_DEALS)}
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

/* ─── STAGE DROPDOWN (reusable) ─── */
function StageDropdown({ currentStage, stageNames, stageColorMap, onChange, compact }: { currentStage: string; stageNames: string[]; stageColorMap: Record<string, string>; onChange: (stage: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const color = stageColorMap[currentStage] || "#999";
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 text-[0.65rem] px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: color + "14", color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        {currentStage}
        <ChevronDown
          size={9}
          className="transition-opacity"
          style={{ opacity: !compact || hovered || open ? 1 : 0 }}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 w-[160px] max-h-[240px] overflow-y-auto" style={{ borderColor: T.border }}>
            {stageNames.map((s) => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[0.75rem] flex items-center gap-2 transition-colors hover:bg-[#F7F8FA] ${s === currentStage ? "font-medium" : ""}`}
                style={{ color: s === currentStage ? stageColorMap[s] || T.primary : "#444" }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stageColorMap[s] || "#999" }} />
                {s}
                {s === currentStage && <CheckCircle2 size={11} className="ml-auto text-[#2CBF60]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const STATUS_OPTIONS = ["진행중", "성공", "실패"];

function StatusDropdown({ currentStatus, onChange, compact }: { currentStatus: string; onChange: (status: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const palette = statusColors[currentStatus] || { bg: "#F1F5F9", text: "#64748B" };
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 text-[0.65rem] px-2.5 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
        style={{ background: palette.bg, color: palette.text }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: palette.text }} />
        {currentStatus}
        <ChevronDown
          size={9}
          className="transition-opacity"
          style={{ opacity: !compact || hovered || open ? 1 : 0 }}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 w-[140px]" style={{ borderColor: T.border }}>
            {STATUS_OPTIONS.map((s) => {
              const p = statusColors[s] || { bg: "#F1F5F9", text: "#64748B" };
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-[0.75rem] flex items-center gap-2 transition-colors hover:bg-[#F7F8FA] ${s === currentStatus ? "font-medium" : ""}`}
                  style={{ color: s === currentStatus ? p.text : "#444" }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.text }} />
                  {s}
                  {s === currentStatus && <CheckCircle2 size={11} className="ml-auto text-[#2CBF60]" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── SELECT CELL EDITOR (Notion-style popover with colored chips + 자유 입력) ─── */
function SelectCellEditor({ value, options, fieldKey, onCommit, onCancel }: {
  value: string;
  options: string[];
  fieldKey: string;
  onCommit: (v: string) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const hasExactMatch = options.some((o) => o === search);
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onCommit(search || value); }
          else if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        onBlur={() => setTimeout(onCancel, 150)}
        placeholder="선택 또는 입력"
        className="w-full bg-transparent outline-none text-[0.75rem] border border-[#1A472A] rounded px-1.5 py-1"
      />
      <div className="absolute left-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 min-w-[160px] max-h-[240px] overflow-y-auto" style={{ borderColor: T.border }}>
        {filtered.map((o) => {
          const c = getSelectChipColor(fieldKey, o, options);
          return (
            <button
              key={o}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onCommit(o); }}
              className="w-full text-left px-2 py-1.5 text-[0.7rem] hover:bg-[#F7F8FA] flex items-center gap-2"
            >
              <span className="px-2 py-0.5 rounded-md text-[0.65rem]" style={{ background: c.bg, color: c.text }}>{o}</span>
              {o === value && <CheckCircle2 size={10} className="ml-auto text-[#2CBF60]" />}
            </button>
          );
        })}
        {search && !hasExactMatch && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onCommit(search); }}
            className="w-full text-left px-2 py-1.5 text-[0.7rem] text-[#1A472A] hover:bg-[#F7F8FA] border-t"
            style={{ borderColor: T.border }}
          >
            + "{search}" 추가
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── DETAIL DRAWER ─── */
type DrawerTab = "basic" | "activity" | "files";

interface ActivityLog {
  id: string;
  type:
    | "created"
    | "lifecycle_change"
    | "health_change"
    | "contract_renewed"
    | "contract_expired"
    | "upsell_proposed"
    | "memo"
    | "email"
    | "call"
    | "file";
  title: string;
  detail: string;
  date: string;
  user: string;
}

interface AttachedFile {
  id: string;
  name: string;
  type: "계약서" | "갱신서" | "연장계약서" | "미팅노트" | "기타";
  size: string;
  date: string;
}

function generateActivityLogs(deal: Customer): ActivityLog[] {
  return [
    { id: "a1", type: "created", title: "고객 등록됨", detail: `${deal.company} 고객이 생성되었습니다`, date: deal.date, user: deal.manager },
    { id: "a2", type: "lifecycle_change", title: `라이프사이클 변경: 온보딩 → ${deal.stage}`, detail: "고객 라이프사이클 단계가 변경되었습니다", date: deal.date, user: deal.manager },
    { id: "a3", type: "health_change", title: `헬스 스코어 업데이트: ${deal.healthScore ?? "-"}`, detail: "최근 활동/계약 기반 헬스 스코어가 갱신되었습니다", date: deal.date, user: deal.manager },
    { id: "a4", type: "call", title: `${deal.contact} 성공 미팅`, detail: "분기 리뷰 통화 완료. 만족도 양호.", date: deal.date, user: deal.manager },
    { id: "a5", type: "memo", title: "메모 추가", detail: "추가 모듈 관심 표명. 업셀 기회 검토.", date: deal.date, user: deal.manager },
  ];
}

function generateFiles(deal: Customer): AttachedFile[] {
  return [
    { id: "f1", name: `${deal.company}_계약서_v1.pdf`, type: "계약서", size: "2.4 MB", date: deal.date },
    { id: "f2", name: `${deal.company}_미팅노트.docx`, type: "미팅노트", size: "180 KB", date: deal.date },
  ];
}

const ACTIVITY_ICONS: Record<ActivityLog["type"], { icon: typeof Phone; color: string; bg: string }> = {
  created:           { icon: Plus,           color: "#1A472A", bg: "#EFF5F1" },
  lifecycle_change:  { icon: ArrowRight,     color: "#1A472A", bg: "#EFF5F1" },
  health_change:     { icon: Activity,       color: "#4A7B5A", bg: "#EDF3EE" },
  contract_renewed:  { icon: RefreshCw,      color: "#1A472A", bg: "#EFF5F1" },
  contract_expired:  { icon: AlertTriangle,  color: "#DC2626", bg: "#FEF2F2" },
  upsell_proposed:   { icon: Sparkles,       color: "#8B7355", bg: "#F7F4EF" },
  memo:              { icon: StickyNote,     color: "#6B7280", bg: "#F3F4F6" },
  email:             { icon: Mail,           color: "#4A7B5A", bg: "#EDF3EE" },
  call:              { icon: Phone,          color: "#4A7B5A", bg: "#EDF3EE" },
  file:              { icon: FileSpreadsheet, color: "#6B7280", bg: "#F3F4F6" },
};

const FILE_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  "계약서":     { bg: "#F1F5F9", color: "#475569" },
  "갱신서":     { bg: "#EFF5F1", color: "#1A472A" },
  "연장계약서": { bg: "#EDF3EE", color: "#4A7B5A" },
  "미팅노트":   { bg: "#F7F4EF", color: "#8B7355" },
  "기타":       { bg: "#F3F4F6", color: "#6B7280" },
};

function DetailDrawer({ deal, onClose, stageColorMap, stageNames, onChangeStage, onChangeStatus, customFields }: { deal: Customer; onClose: () => void; stageColorMap: Record<string, string>; stageNames: string[]; onChangeStage: (dealId: number, stage: string) => void; onChangeStatus: (dealId: number, status: string) => void; customFields: CustomField[] }) {
  const [tab, setTab] = useState<DrawerTab>("basic");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [newMemo, setNewMemo] = useState("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => generateActivityLogs(deal));
  const [files, setFiles] = useState<AttachedFile[]>(() => generateFiles(deal));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiCardOpen, setAiCardOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = drawerWidth;
    const onMouseMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      const next = Math.min(480, Math.max(360, startWidth + delta));
      setDrawerWidth(next);
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [drawerWidth]);

  const tabs: { key: DrawerTab; label: string; icon: typeof Info }[] = [
    { key: "basic", label: "기본정보", icon: Info },
    { key: "activity", label: "활동", icon: Activity },
    { key: "files", label: "파일", icon: FileSpreadsheet },
  ];

  // Dynamic: driven by customFields (single source of truth for the workspace schema)
  const basicFields = customFields
    .filter((f) => f.visible)
    .map((f) => {
      const raw = (deal as Record<string, unknown>)[f.key];
      const value = raw === undefined || raw === null ? "" : String(raw);
      const editable = f.key !== "status" && f.key !== "date";
      return { key: f.key, label: f.label, value, editable };
    });

  const startEdit = (key: string, value: string) => {
    setEditingField(key);
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const finishEdit = () => setEditingField(null);

  const addMemoLog = () => {
    if (!newMemo.trim()) return;
    const log: ActivityLog = {
      id: `a-${Date.now()}`,
      type: "memo",
      title: "메모 추가",
      detail: newMemo.trim(),
      date: new Date().toISOString().slice(0, 10),
      user: deal.manager,
    };
    setActivityLogs((prev) => [log, ...prev]);
    setNewMemo("");
  };

  // AI insight mock data
  const aiInsights = {
    winProb: 72,
    companyInfo: `${deal.company}은(는) ${deal.service} 분야의 잠재 고객으로, 최근 디지털 전환에 높은 관심을 보이고 있습니다.`,
    actions: [
      { text: "이번 주 내 후속 미팅 일정 확정 권장", priority: "high" as const },
      { text: "경쟁사 대비 가격 우위 포인트 정리 필요", priority: "medium" as const },
      { text: "기술 검증(PoC) 제안서 준비", priority: "medium" as const },
      { text: "의사결정권자 직접 미팅 추진", priority: "low" as const },
    ],
    strengths: ["서비스 적합도 높음", "예산 확보 완료 추정", "의사결정 빠른 조직"],
    risks: ["경쟁사 제안 진행 중", "내부 승인 절차 복잡"],
  };

  return (
    <div className="h-full bg-white border-l flex shrink-0 relative" style={{ borderColor: T.border, width: drawerWidth }}>
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-[#1A472A]/20 transition-colors"
        style={{ background: isResizing ? "rgba(26,71,42,0.15)" : "transparent" }}
      />
      <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[0.7rem] text-white" style={{ background: stageColorMap[deal.stage] || T.primary }}>
              {deal.company.replace(/[\(\)주]/g, "").charAt(0)}
            </div>
            <div>
              <span className="text-[1rem] text-[#1A1A1A] block">{deal.company}</span>
              <span className="text-[0.65rem] text-[#999]">{deal.contact} · {deal.position}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F8FA] transition-colors">
            <X size={14} color="#999" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <StageDropdown
            currentStage={deal.stage}
            stageNames={stageNames}
            stageColorMap={stageColorMap}
            onChange={(s) => onChangeStage(deal.id, s)}
          />
          <span className="text-[0.7rem] text-[#1A1A1A] tabular-nums ml-auto font-medium">{deal.amount}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-2 pt-1 border-b" style={{ borderColor: T.border }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[0.75rem] transition-colors rounded-t-lg"
            style={{
              color: tab === t.key ? T.primary : "#999",
              borderBottom: tab === t.key ? `2px solid ${T.primary}` : "2px solid transparent",
            }}
          >
            <t.icon size={11} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── 기본정보 ── */}
        {tab === "basic" && (
          <div className="px-6 py-5 space-y-1">
            {/* AI 인사이트 (접힌 카드) */}
            <div className="mb-4 rounded-xl border overflow-hidden" style={{ borderColor: "#D9E5DD", background: aiCardOpen ? "#FAFCFB" : "#EFF5F1" }}>
              <button
                onClick={() => setAiCardOpen(!aiCardOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-[#E3ECE6]/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={13} color={T.primary} />
                  <span className="text-[0.75rem] font-medium" style={{ color: T.primary }}>AI 인사이트</span>
                  <span className="text-[0.7rem] tabular-nums" style={{ color: T.primary, opacity: 0.7 }}>성사확률 {aiInsights.winProb}%</span>
                </div>
                {aiCardOpen ? <ChevronUp size={13} color={T.primary} /> : <ChevronDown size={13} color={T.primary} />}
              </button>
              {aiCardOpen && (
                <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t" style={{ borderColor: "#D9E5DD" }}>
                  {/* Win Probability */}
                  <div className="flex items-center gap-3 pt-3">
                    <div className="relative w-[52px] h-[52px] shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#D9E5DD" strokeWidth="3" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke={T.primary} strokeWidth="3" strokeDasharray={`${aiInsights.winProb * 0.88} 88`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[0.8rem] font-semibold tabular-nums" style={{ color: T.primary }}>{aiInsights.winProb}%</span>
                      </div>
                    </div>
                    <p className="text-[0.7rem] text-[#666] leading-relaxed flex-1">{aiInsights.companyInfo}</p>
                  </div>

                  {/* Strengths / Risks */}
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[0.6rem] text-[#10B981] font-medium">강점</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {aiInsights.strengths.map((s) => (
                          <span key={s} className="text-[0.6rem] px-2 py-0.5 rounded-full" style={{ background: "#ECFDF5", color: "#059669" }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[0.6rem] text-[#EF4444] font-medium">리스크</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {aiInsights.risks.map((r) => (
                          <span key={r} className="text-[0.6rem] px-2 py-0.5 rounded-full" style={{ background: "#FEF2F2", color: "#DC2626" }}>{r}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap size={11} color="#F59E0B" />
                      <span className="text-[0.7rem] text-[#1A1A1A]">추천 액션</span>
                    </div>
                    <div className="space-y-1.5">
                      {aiInsights.actions.map((action, idx) => {
                        const pColor = action.priority === "high" ? { bg: "#FEF2F2", color: "#DC2626", label: "긴급" } :
                          action.priority === "medium" ? { bg: "#FFFBEB", color: "#B45309", label: "보통" } :
                          { bg: "#F3F4F6", color: "#6B7280", label: "낮음" };
                        return (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded-lg border bg-white" style={{ borderColor: T.border }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 text-[0.55rem]" style={{ background: pColor.bg, color: pColor.color }}>
                              {idx + 1}
                            </div>
                            <p className="flex-1 text-[0.7rem] text-[#1A1A1A] leading-relaxed">{action.text}</p>
                            <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: pColor.bg, color: pColor.color }}>{pColor.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {basicFields.map((field) => (
              <div
                key={field.key}
                className="grid grid-cols-[100px_1fr] gap-2 items-center py-2 rounded-lg px-2 -mx-2 transition-colors hover:bg-[#FAFBFC] group/field"
              >
                <span className="text-[0.7rem] text-[#999]">{field.label}</span>
                {field.key === "stage" ? (
                  <StageDropdown
                    currentStage={deal.stage}
                    stageNames={stageNames}
                    stageColorMap={stageColorMap}
                    onChange={(s) => onChangeStage(deal.id, s)}
                  />
                ) : field.key === "status" ? (
                  <StatusDropdown
                    currentStatus={deal.status}
                    onChange={(s) => onChangeStatus(deal.id, s)}
                  />
                ) : editingField === field.key ? (
                  <input
                    autoFocus
                    className="text-[0.8rem] text-[#1A1A1A] bg-white border rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#1A472A]"
                    style={{ borderColor: T.border }}
                    value={editValues[field.key] || ""}
                    onChange={(e) => setEditValues((p) => ({ ...p, [field.key]: e.target.value }))}
                    onBlur={finishEdit}
                    onKeyDown={(e) => { if (e.key === "Enter") finishEdit(); if (e.key === "Escape") { setEditingField(null); } }}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {field.key === "status" ? (
                      <span className="text-[0.7rem] px-2 py-0.5 rounded-md" style={{ background: statusColors[field.value]?.bg, color: statusColors[field.value]?.text }}>{field.value}</span>
                    ) : (
                      <span className="text-[0.8rem] text-[#1A1A1A]">{editValues[field.key] || field.value}</span>
                    )}
                    {field.editable && (
                      <button
                        onClick={() => startEdit(field.key, editValues[field.key] || field.value)}
                        className="p-0.5 rounded opacity-0 group-hover/field:opacity-100 hover:bg-[#EFF5F1] transition-all"
                      >
                        <Pencil size={10} color={T.primary} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── 활동 로그 ── */}
        {tab === "activity" && (
          <div className="px-6 py-5">
            {/* Add memo input */}
            <div className="flex gap-2 mb-5">
              <input
                className="flex-1 px-3 py-2 rounded-lg border text-[0.75rem] text-[#1A1A1A] placeholder-[#CCC] focus:outline-none focus:border-[#1A472A]"
                style={{ borderColor: T.border }}
                placeholder="메모 또는 활동 내용 추가..."
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addMemoLog(); }}
              />
              <button
                onClick={addMemoLog}
                className="px-3 py-2 rounded-lg text-[0.7rem] text-white shrink-0"
                style={{ background: newMemo.trim() ? T.primary : "#CCC" }}
              >
                추가
              </button>
            </div>
            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-[15px] top-0 bottom-0 w-px" style={{ background: T.border }} />
              <div className="space-y-4">
                {activityLogs.map((log) => {
                  const iconDef = ACTIVITY_ICONS[log.type];
                  const Icon = iconDef.icon;
                  return (
                    <div key={log.id} className="flex gap-3 relative">
                      <div className="w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: iconDef.bg }}>
                        <Icon size={13} color={iconDef.color} />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[0.75rem] text-[#1A1A1A]">{log.title}</span>
                        </div>
                        <p className="text-[0.65rem] text-[#888] leading-relaxed">{log.detail}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[0.6rem] text-[#BBB] tabular-nums">{log.date}</span>
                          <span className="text-[0.6rem] text-[#CCC]">·</span>
                          <span className="text-[0.6rem] text-[#BBB]">{log.user}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 파일 ── */}
        {tab === "files" && (
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[0.8rem] text-[#1A1A1A]">첨부 파일</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[0.7rem] text-[#666] hover:bg-[#F7F8FA] transition-colors"
                style={{ borderColor: T.border }}
              >
                <Upload size={11} /> 파일 추가
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => {
                  const list = e.target.files;
                  if (!list) return;
                  const added: AttachedFile[] = Array.from(list).map((f, i) => {
                    const ext = f.name.split(".").pop()?.toLowerCase() || "";
                    const type: AttachedFile["type"] =
                      f.name.includes("연장") ? "연장계약서" :
                      f.name.includes("갱신") ? "갱신서" :
                      f.name.includes("계약") ? "계약서" :
                      f.name.includes("미팅") || f.name.includes("노트") ? "미팅노트" : "기타";
                    const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
                    return {
                      id: `f-${Date.now()}-${i}`,
                      name: f.name,
                      type,
                      size: `${sizeMb} MB`,
                      date: new Date().toISOString().slice(0, 10),
                    };
                  });
                  setFiles((prev) => [...added, ...prev]);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="space-y-2">
              {files.map((f) => {
                const typeColor = FILE_TYPE_COLORS[f.type] || FILE_TYPE_COLORS["기타"];
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border hover:shadow-sm transition-all" style={{ borderColor: T.border }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: typeColor.bg }}>
                      <FileSpreadsheet size={15} color={typeColor.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.75rem] text-[#1A1A1A] truncate">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[0.6rem] px-1.5 py-0.5 rounded" style={{ background: typeColor.bg, color: typeColor.color }}>{f.type}</span>
                        <span className="text-[0.6rem] text-[#BBB]">{f.size}</span>
                        <span className="text-[0.6rem] text-[#CCC]">·</span>
                        <span className="text-[0.6rem] text-[#BBB] tabular-nums">{f.date}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const blob = new Blob([`${f.name}\n(mock download placeholder)`], { type: "text/plain;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = f.name;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#F7F8FA] transition-colors shrink-0"
                      title="다운로드"
                    >
                      <Download size={12} color="#999" />
                    </button>
                    <button
                      onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                      className="p-1.5 rounded-lg hover:bg-[#FEF2F2] transition-colors shrink-0"
                      title="삭제"
                    >
                      <Trash2 size={12} color={T.danger} />
                    </button>
                  </div>
                );
              })}
            </div>
            {files.length === 0 && (
              <div className="flex flex-col items-center py-10 text-center">
                <FileSpreadsheet size={24} color="#DDD" className="mb-3" />
                <p className="text-[0.75rem] text-[#999]">첨부된 파일이 없습니다</p>
                <p className="text-[0.65rem] text-[#CCC] mt-1">계약서, 갱신서, 미팅노트 등을 추가하세요</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      {deal.status !== "성공" && deal.status !== "실패" && (
        <div className="px-6 py-3 border-t" style={{ borderColor: T.border }}>
          <button
            onClick={() => onChangeStage(deal.id, "수주확정")}
            className="w-full py-2.5 rounded-lg text-[0.75rem] text-white transition-colors"
            style={{ background: T.success }}
          >
            수주확정으로 변경
          </button>
        </div>
      )}
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
function WidgetContent({ widgetId, deals, stageColorMap, onAddDeal, onImportExcel, onExport, onAnalytics }: { widgetId: string; deals: Customer[]; stageColorMap: Record<string, string>; onAddDeal?: () => void; onImportExcel?: () => void; onExport?: () => void; onAnalytics?: () => void }) {
  /* ── Customer KPI computations ── */
  const total = deals.length;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const newThisMonth = deals.filter((d) => d.date.startsWith(thisMonth)).length;
  const churned = deals.filter((d) => d.stage === "이탈").length;
  const churnRate = total > 0 ? Math.round((churned / total) * 1000) / 10 : 0;
  const totalLtv = deals.reduce((s, d) => s + parseAmt(d.ltv || ""), 0);
  const contractAmts = deals.map((d) => parseAmt(d.amount)).filter((n) => n > 0);
  const avgContract = contractAmts.length > 0
    ? Math.round(contractAmts.reduce((s, a) => s + a, 0) / contractAmts.length)
    : 0;
  /* Renewals: renewalDate within next 90 days */
  const ninetyDays = new Date(now); ninetyDays.setDate(now.getDate() + 90);
  const renewalsList = deals
    .filter((d) => d.renewalDate && d.stage !== "이탈")
    .map((d) => {
      const rd = new Date(d.renewalDate!);
      const days = Math.ceil((rd.getTime() - now.getTime()) / 86400000);
      return { ...d, daysUntil: days };
    })
    .filter((d) => d.daysUntil >= 0 && d.daysUntil <= 90)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  const renewalsCount = renewalsList.length;
  /* Health buckets */
  const healthActive  = deals.filter((d) => (d.healthScore ?? 0) >= 80).length;
  const healthWarning = deals.filter((d) => { const h = d.healthScore ?? 0; return h >= 50 && h < 80; }).length;
  const healthRisk    = deals.filter((d) => (d.healthScore ?? 0) < 50).length;
  const avgHealth = total > 0 ? Math.round(deals.reduce((s, d) => s + (d.healthScore ?? 0), 0) / total) : 0;
  const activeCount = deals.filter((d) => d.stage === "활성").length;

  if (widgetId.startsWith("kpi-")) {
    type KpiEntry = { title: string; value: string; sub: string; trend: string; trendColor: string; icon: typeof BarChart3; iconBg: string };
    const kpiMap: Record<string, KpiEntry> = {
      "kpi-customers":    { title: "전체 고객 수",      value: `${total}명`,             sub: "현재 등록된 전체",            trend: `활발 ${activeCount}명`,                                             trendColor: T.primary,  icon: Users,         iconBg: "#EFF5F1" },
      "kpi-new-month":    { title: "이번 달 새 고객",   value: `${newThisMonth}명`,      sub: thisMonth,                     trend: total > 0 ? `전체의 ${Math.round((newThisMonth / total) * 100)}%` : "0%", trendColor: "#5B9170", icon: Plus,          iconBg: "#EDF3EE" },
      "kpi-churn":        { title: "떠난 고객 비율",    value: `${churnRate}%`,           sub: `떠난 고객 ${churned}명`,      trend: `전체 ${total}명`,                                                   trendColor: T.danger,   icon: AlertTriangle, iconBg: "#FEF2F2" },
      "kpi-ltv":          { title: "고객 누적 매출",    value: fmtAmt(totalLtv),          sub: "전체 고객 계약 합계",       trend: total > 0 ? `고객당 ${fmtAmt(Math.round(totalLtv / total))}` : "-",    trendColor: T.primary,  icon: DollarSign,    iconBg: "#EFF5F1" },
      "kpi-avg-contract": { title: "평균 계약 금액",    value: fmtAmt(avgContract),       sub: `계약 ${contractAmts.length}건 기준`, trend: totalLtv > 0 ? `누적 ${fmtAmt(totalLtv)}` : "-",                    trendColor: T.primary,  icon: Target,        iconBg: "#EFF5F1" },
      "kpi-renewals":     { title: "곧 재계약 예정",    value: `${renewalsCount}명`,      sub: "앞으로 90일 이내",            trend: renewalsList[0] ? `가장 임박 D-${renewalsList[0].daysUntil}` : "-",    trendColor: "#4A7B5A",  icon: Calendar,      iconBg: "#EDF3EE" },
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

  /* ── Health donut ── */
  if (widgetId === "chart-health") {
    const healthData = [
      { name: "활발",  count: healthActive,  value: total > 0 ? Math.round((healthActive / total) * 100) : 0,  color: "#1A472A" },
      { name: "주의", count: healthWarning, value: total > 0 ? Math.round((healthWarning / total) * 100) : 0, color: "#D4A53A" },
      { name: "위험", count: healthRisk,    value: total > 0 ? Math.round((healthRisk / total) * 100) : 0,    color: "#DC2626" },
    ];
    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[0.85rem] text-[#1A1A1A]">고객 상태 분포</p>
          <span className="text-[0.65rem] text-[#999]">평균 점수 {avgHealth}점</span>
        </div>
        <div className="h-[144px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={healthData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" paddingAngle={3}>{healthData.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip formatter={(v: number) => `${v}%`} /></PieChart></ResponsiveContainer></div>
        <div className="flex justify-center gap-4 mt-1">{healthData.map((d) => (<div key={d.name} className="flex items-center gap-1.5 text-[0.65rem]"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} /><span className="text-[#666]">{d.name}</span><span className="text-[#999]">{d.count}명</span></div>))}</div>
      </>
    );
  }

  /* ── Retention trend (last 6 months) ── */
  if (widgetId === "chart-retention") {
    const retentionData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
      const cohort = deals.filter((d) => new Date(d.date) <= monthStart);
      const churnedByMonth = cohort.filter((d) => d.stage === "이탈" && new Date(d.date) <= monthEnd);
      const survived = cohort.length - churnedByMonth.length;
      const rate = cohort.length > 0 ? Math.round((survived / cohort.length) * 1000) / 10 : 0;
      return { month: `${monthStart.getMonth() + 1}월`, rate };
    });
    return (
      <>
        <p className="text-[0.85rem] text-[#1A1A1A] mb-4">고객 유지율 추이</p>
        <div className="h-[160px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={retentionData}><defs><linearGradient id="cRet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.primary} stopOpacity={0.2} /><stop offset="95%" stopColor={T.primary} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} /><Tooltip formatter={(v: number) => `${v}%`} /><Area type="monotone" dataKey="rate" stroke={T.primary} fill="url(#cRet)" strokeWidth={2} name="유지율" /></AreaChart></ResponsiveContainer></div>
      </>
    );
  }

  /* ── Lifecycle bar ── */
  if (widgetId === "chart-lifecycle") {
    const lifecycleData = Object.keys(stageColorMap).map((stage) => ({
      stage,
      count: deals.filter((d) => d.stage === stage).length,
      color: stageColorMap[stage] || "#999",
    }));
    return (
      <>
        <p className="text-[0.85rem] text-[#1A1A1A] mb-4">고객 단계별 분포</p>
        <div className="h-[160px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={lifecycleData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10, fill: "#999" }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="stage" tick={{ fontSize: 10, fill: "#555" }} axisLine={false} tickLine={false} width={68} /><Tooltip formatter={(v: number) => `${v}명`} /><Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>{lifecycleData.map((d) => <Cell key={d.stage} fill={d.color} />)}</Bar></BarChart></ResponsiveContainer></div>
      </>
    );
  }

  /* ── Renewals table ── */
  if (widgetId === "table-renewals") {
    const rows = renewalsList.slice(0, 10);
    return (
      <>
        <p className="text-[0.85rem] text-[#1A1A1A] mb-4">곧 재계약 고객 목록</p>
        {rows.length === 0 ? (
          <p className="text-[0.7rem] text-[#999] py-6 text-center">앞으로 90일 안에 재계약 예정인 고객이 없습니다</p>
        ) : (
          <table className="w-full"><thead><tr className="border-b" style={{ borderColor: T.border }}>{["고객", "재계약일", "남은 일수", "금액"].map((h) => <th key={h} className="text-left py-2.5 px-3 text-[0.65rem] text-[#999]">{h}</th>)}</tr></thead>
          <tbody>{rows.map((d) => <tr key={d.id} className="border-b last:border-0" style={{ borderColor: T.border }}><td className="py-2.5 px-3 text-[0.7rem] text-[#1A1A1A]">{d.company}</td><td className="py-2.5 px-3 text-[0.7rem] text-[#555]">{d.renewalDate}</td><td className="py-2.5 px-3 text-[0.7rem]" style={{ color: d.daysUntil <= 14 ? T.danger : T.primary }}>D-{d.daysUntil}</td><td className="py-2.5 px-3 text-[0.7rem] text-[#555]">{d.ltv || d.amount}</td></tr>)}</tbody></table>
        )}
      </>
    );
  }

  /* ── Upsell Top 5 ── */
  if (widgetId === "table-upsell") {
    const upsellList = deals
      .filter((d) => (d.healthScore ?? 0) >= 70 && d.stage !== "이탈")
      .map((d) => ({
        ...d,
        score: Math.round((d.healthScore ?? 0) * 0.7 + (parseAmt(d.ltv || "") > 0 ? 20 : 10)),
        reason: parseAmt(d.ltv || "") < 5000 ? "만족도 양호 — 추가 계약 제안에 적합" : "매출 기여도 높음 — 상위 상품 제안 가능",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    return (
      <>
        <p className="text-[0.85rem] text-[#1A1A1A] mb-4">추가 제안 추천 Top 5</p>
        {upsellList.length === 0 ? (
          <p className="text-[0.7rem] text-[#999] py-6 text-center">추천할 만한 고객이 아직 없습니다</p>
        ) : (
          <div className="space-y-2">{upsellList.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#FAFBFC] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[0.7rem] text-[#1A1A1A]">{d.company}</span>
                  <span className="text-[0.6rem] px-1.5 py-0.5 rounded-md" style={{ background: T.primary + "18", color: T.primary }}>만족도 {d.healthScore}</span>
                </div>
                <p className="text-[0.6rem] text-[#999] truncate">{d.reason}</p>
              </div>
              <span className="text-[0.7rem]" style={{ color: T.primary }}>{d.score}</span>
            </div>
          ))}</div>
        )}
      </>
    );
  }

  /* ── Recent customers ── */
  if (widgetId === "table-recent-customers") {
    const recentList = [...deals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return (
      <>
        <p className="text-[0.85rem] text-[#1A1A1A] mb-4">최근 등록된 고객</p>
        <div className="space-y-2">{recentList.map((d) => (
          <div key={d.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#FAFBFC] transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[0.7rem] text-[#1A1A1A]">{d.company}</span>
              <span className="text-[0.6rem] px-2 py-0.5 rounded-md" style={{ background: (stageColorMap[d.stage] || "#999") + "18", color: stageColorMap[d.stage] || "#999" }}>{d.stage}</span>
            </div>
            <span className="text-[0.7rem] text-[#999]">{d.date}</span>
          </div>
        ))}</div>
      </>
    );
  }
  if (widgetId === "memo") return (
    <>
      <p className="text-[0.85rem] text-[#1A1A1A] mb-3">메모</p>
      <textarea className="w-full h-[112px] p-3 rounded-lg text-[0.75rem] text-[#1A1A1A] resize-none focus:outline-none" style={{ background: "#F8F9FA", border: `1px solid ${T.border}` }} placeholder="메모를 입력하세요..." />
    </>
  );
  if (widgetId === "shortcuts") {
    const sc = [
      { label: "고객 추가", icon: Plus, color: T.primary, onClick: onAddDeal },
      { label: "Excel 가져오기", icon: Upload, color: "#4A7B5A", onClick: onImportExcel },
      { label: "보고서 내보내기", icon: Download, color: "#6B7280", onClick: onExport },
      { label: "팀 성과 분석", icon: Users, color: "#5B9170", onClick: onAnalytics },
    ];
    return (
      <>
        <p className="text-[0.85rem] text-[#1A1A1A] mb-3">빠른 실행</p>
        <div className="grid grid-cols-2 gap-2">{sc.map((s) => <button key={s.label} onClick={s.onClick} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[0.7rem] text-[#555] hover:bg-[#FAFBFC] transition-colors" style={{ borderColor: T.border }}><s.icon size={13} color={s.color} />{s.label}</button>)}</div>
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
  { key: "stage", label: "고객상태", required: false, info: true, filter: true, sort: true, defaultVisible: true },
  { key: "customerGrade", label: "고객등급", required: false, filter: true, sort: true, defaultVisible: true },
  { key: "contact", label: "담당자", required: false, sort: true, defaultVisible: true },
  { key: "position", label: "직책", required: false, sort: true, defaultVisible: false },
  { key: "service", label: "희망서비스", required: false, filter: true, sort: true, defaultVisible: true },
  { key: "amount", label: "견적금액(VAT미포함)", required: false, info: true, filter: true, sort: true, defaultVisible: true },
  { key: "quantity", label: "총수량", required: false, info: true, sort: true, defaultVisible: true },
  { key: "manager", label: "고객책임자", required: false, filter: true, defaultVisible: true },
  { key: "date", label: "등록일", required: false, sort: true, defaultVisible: true },
  { key: "phone", label: "전화번호", required: false, sort: false, defaultVisible: false },
  { key: "email", label: "이메일", required: false, sort: true, defaultVisible: false },
  { key: "memo", label: "비고", required: false, sort: false, defaultVisible: false },
];

/* ─── ADD DEAL MODAL (customField-driven) ─── */
function AddDealModal({ onClose, onAdd, visibleColumns, stageNames, customFields }: { onClose: () => void; onAdd: (deal: Customer) => void; visibleColumns: Set<string>; stageNames: string[]; customFields: CustomField[] }) {
  // Render fields driven by customFields (single source of truth). Show required + visible fields.
  const fieldDefs = customFields.filter((f) => f.required || f.visible || visibleColumns.has(f.key));

  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fieldDefs) {
      if (f.key === "stage") init[f.key] = stageNames[0] || "신규";
      else if (f.key === "status") init[f.key] = "진행중";
      else if (f.key === "date" || f.type === "date") init[f.key] = new Date().toISOString().slice(0, 10);
      else init[f.key] = "";
    }
    return init;
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = () => {
    if (!form.company?.trim()) return;
    const deal: Customer = {
      id: Date.now(),
      company: form.company,
      stage: form.stage || stageNames[0] || "신규",
      contact: form.contact || "",
      position: form.position || "",
      service: form.service || "",
      quantity: parseInt(form.quantity) || 0,
      amount: form.amount || "₩0",
      manager: form.manager || "",
      status: form.status || "진행중",
      date: form.date || new Date().toISOString().slice(0, 10),
    };
    // Merge any custom-field values that aren't built-in
    const builtInKeys = new Set(["id","company","stage","contact","position","service","quantity","amount","manager","status","date"]);
    for (const f of fieldDefs) {
      if (builtInKeys.has(f.key)) continue;
      const v = form[f.key];
      if (v !== undefined && v !== "") (deal as Record<string, unknown>)[f.key] = f.type === "number" ? (parseFloat(v) || 0) : v;
    }
    onAdd(deal);
    onClose();
  };

  const renderField = (f: CustomField) => {
    const val = form[f.key] || "";
    const common = "w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] placeholder-[#CCC] focus:outline-none focus:border-[#1A472A]";
    if (f.key === "stage") {
      return (
        <select className={`${common} bg-white`} style={{ borderColor: T.border }} value={val || stageNames[0] || ""} onChange={(e) => set(f.key, e.target.value)}>
          {stageNames.map((s) => <option key={s}>{s}</option>)}
        </select>
      );
    }
    if (f.type === "select" && f.options && f.options.length > 0) {
      return (
        <select className={`${common} bg-white`} style={{ borderColor: T.border }} value={val || f.options[0]} onChange={(e) => set(f.key, e.target.value)}>
          {f.options.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    }
    if (f.type === "date") {
      return <input type="date" className={common} style={{ borderColor: T.border }} value={val} onChange={(e) => set(f.key, e.target.value)} />;
    }
    if (f.type === "number") {
      return <input type="number" inputMode="decimal" className={common} style={{ borderColor: T.border }} value={val} onChange={(e) => set(f.key, e.target.value)} placeholder={`${f.label}을(를) 입력하세요`} />;
    }
    if (f.type === "email") {
      return <input type="email" className={common} style={{ borderColor: T.border }} value={val} onChange={(e) => set(f.key, e.target.value)} placeholder="name@example.com" />;
    }
    if (f.type === "phone") {
      return <input type="tel" className={common} style={{ borderColor: T.border }} value={val} onChange={(e) => set(f.key, e.target.value)} placeholder="010-0000-0000" />;
    }
    if (f.key === "memo") {
      return <textarea className={`${common} resize-none h-[64px]`} style={{ borderColor: T.border }} value={val} onChange={(e) => set(f.key, e.target.value)} placeholder={`${f.label}을(를) 입력하세요`} />;
    }
    return <input className={common} style={{ borderColor: T.border }} value={val} onChange={(e) => set(f.key, e.target.value)} placeholder={`${f.label}을(를) 입력하세요`} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[512px] max-h-[85vh] flex flex-col" style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: T.border }}>
          <h2 className="text-[1.1rem] text-[#1A1A1A]">새 고객 추가</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F8FA]"><X size={14} color="#999" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          {fieldDefs.map((f) => (
            <div key={f.key}>
              <label className="text-[0.75rem] text-[#666] mb-1.5 block">
                {f.label}
                {f.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {renderField(f)}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t" style={{ borderColor: T.border }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[0.75rem] text-[#666] border hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>취소</button>
          <button onClick={handleSubmit} className="px-6 py-2.5 rounded-lg text-[0.75rem] text-white transition-colors" style={{ background: form.company?.trim() ? T.primary : "#CCC", cursor: form.company?.trim() ? "pointer" : "not-allowed" }}>추가</button>
        </div>
      </div>
    </div>
  );
}

/* ─── PIPELINE SETTINGS MODAL ─── */
/* PipelineSettingsModal and FieldManagementModal moved to dedicated pages:
   /settings/pipeline → pipeline-settings-page.tsx
   /settings/fields   → field-settings-page.tsx */

/* ─── ADD VIEW MODAL ─── */
function AddViewModal({
  onAdd,
  onClose,
  buildSnapshot,
}: {
  onAdd: (view: SavedView) => void;
  onClose: () => void;
  buildSnapshot?: () => Omit<SavedView, "id" | "name">;
}) {
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    const snap = buildSnapshot
      ? buildSnapshot()
      : {
          viewType: "table" as ViewType,
          filters: [],
          sorts: [],
          groupBy: "" as GroupByField,
          searchQuery: "",
        };
    onAdd({
      id: `v-${Date.now()}`,
      name: name.trim(),
      ...snap,
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
              placeholder="예: 이번 달 신규 고객"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
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
type ViewType = "table" | "card" | "relation";

/* ─── CUSTOM KPI MODAL ─── */
function CustomKpiModal({ onAdd, onClose }: { onAdd: (kpi: CustomKpiDef) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [formula, setFormula] = useState<CustomKpiDef["formula"]>("won_amount_ratio");
  const [numerator, setNumerator] = useState<string>("wonAmt");
  const [denominator, setDenominator] = useState<string>("totalAmt");

  const handleAdd = () => {
    if (!name.trim()) return;
    const preset = FORMULA_PRESETS.find((p) => p.key === formula);
    onAdd({
      id: `ckpi-${Date.now()}`,
      name: name.trim(),
      formula,
      numerator: numerator as CustomKpiDef["numerator"],
      denominator: denominator as CustomKpiDef["denominator"],
      suffix: preset?.desc || "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[440px] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: T.border }}>
          <div>
            <h2 className="text-[1.1rem] text-[#1A1A1A]">커스텀 KPI 추가</h2>
            <p className="text-[0.7rem] text-[#999] mt-1">나만의 KPI 수식을 정의하세요</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F7F8FA]"><X size={16} color="#999" /></button>
        </div>
        <div className="px-7 py-5 space-y-4">
          <div>
            <label className="text-[0.75rem] text-[#666] mb-1.5 block">KPI 이름</label>
            <input
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] placeholder-[#CCC] focus:outline-none focus:border-[#1A472A]"
              style={{ borderColor: T.border }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 수주 전환율"
            />
          </div>
          <div>
            <label className="text-[0.75rem] text-[#666] mb-2 block">수식 선택</label>
            <div className="space-y-2">
              {FORMULA_PRESETS.map((p) => {
                const active = formula === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setFormula(p.key)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: active ? "#1A472A" : T.border,
                      background: active ? "#F0F7F2" : "#fff",
                    }}
                  >
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: active ? "#1A472A" : "#DDD" }}>
                      {active && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#1A472A" }} />}
                    </div>
                    <div>
                      <p className="text-[0.8rem] text-[#1A1A1A]">{p.label}</p>
                      <p className="text-[0.65rem] text-[#999] mt-0.5">{p.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          {formula === "custom_ratio" && (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F8F9FA" }}>
              <select className="px-3 py-2 rounded-lg border text-[0.75rem] bg-white flex-1" style={{ borderColor: T.border }} value={numerator} onChange={(e) => setNumerator(e.target.value)}>
                {KPI_VARS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
              </select>
              <span className="text-[0.8rem] text-[#999]">÷</span>
              <select className="px-3 py-2 rounded-lg border text-[0.75rem] bg-white flex-1" style={{ borderColor: T.border }} value={denominator} onChange={(e) => setDenominator(e.target.value)}>
                {KPI_VARS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
              </select>
              <span className="text-[0.8rem] text-[#999]">× 100</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t" style={{ borderColor: T.border }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[0.75rem] text-[#666] border hover:bg-[#F7F8FA]" style={{ borderColor: T.border }}>취소</button>
          <button
            onClick={handleAdd}
            className="px-6 py-2.5 rounded-lg text-[0.75rem] text-white"
            style={{ background: name.trim() ? "#1A472A" : "#CCC", cursor: name.trim() ? "pointer" : "not-allowed" }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── GOAL MODAL ─── */
function GoalModal({ onAdd, onClose }: { onAdd: (goal: GoalDef) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [period, setPeriod] = useState<"monthly" | "quarterly">("monthly");

  const handleAdd = () => {
    if (!name.trim() || !target) return;
    onAdd({
      id: `goal-${Date.now()}`,
      name: name.trim(),
      targetAmount: parseFloat(target) || 0,
      period,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[400px] flex flex-col" style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: T.border }}>
          <div>
            <h2 className="text-[1.1rem] text-[#1A1A1A]">목표 설정</h2>
            <p className="text-[0.7rem] text-[#999] mt-1">월간/분기 수주 목표 금액을 설정하세요</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F7F8FA]"><X size={16} color="#999" /></button>
        </div>
        <div className="px-7 py-5 space-y-4">
          <div>
            <label className="text-[0.75rem] text-[#666] mb-1.5 block">목표 이름</label>
            <input
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] placeholder-[#CCC] focus:outline-none focus:border-[#B45309]"
              style={{ borderColor: T.border }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 4월 수주 목표"
            />
          </div>
          <div>
            <label className="text-[0.75rem] text-[#666] mb-1.5 block">기간</label>
            <div className="flex gap-2">
              {([{ key: "monthly" as const, label: "월간" }, { key: "quarterly" as const, label: "분기" }]).map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className="flex-1 py-2.5 rounded-lg border-2 text-[0.8rem] transition-all"
                  style={{
                    borderColor: period === p.key ? "#F59E0B" : T.border,
                    background: period === p.key ? "#FFFBEB" : "#fff",
                    color: period === p.key ? "#B45309" : "#666",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[0.75rem] text-[#666] mb-1.5 block">목표 금액 (만원)</label>
            <div className="relative">
              <input
                type="number"
                className="w-full px-4 py-2.5 rounded-lg border text-[0.8rem] text-[#1A1A1A] placeholder-[#CCC] focus:outline-none focus:border-[#B45309] pr-12"
                style={{ borderColor: T.border }}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="예: 50000"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.7rem] text-[#BBB]">만원</span>
            </div>
            {target && (
              <p className="text-[0.65rem] text-[#999] mt-1.5">= {fmtAmt(parseFloat(target) || 0)}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t" style={{ borderColor: T.border }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-[0.75rem] text-[#666] border hover:bg-[#F7F8FA]" style={{ borderColor: T.border }}>취소</button>
          <button
            onClick={handleAdd}
            className="px-6 py-2.5 rounded-lg text-[0.75rem] text-white"
            style={{ background: name.trim() && target ? "#F59E0B" : "#CCC", cursor: name.trim() && target ? "pointer" : "not-allowed" }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}


/* ─── CARD GRID VIEW ─── */
function CardGridView({
  deals,
  stageColorMap,
  onClickDeal,
  onAddDeal,
}: {
  deals: Customer[];
  stageColorMap: Record<string, string>;
  onClickDeal: (deal: Customer) => void;
  onAddDeal: () => void;
}) {
  if (deals.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: T.border }}>
        <p className="text-[0.85rem] text-[#999] mb-3">표시할 고객이 없습니다</p>
        <button
          onClick={onAddDeal}
          className="px-4 py-2 rounded-lg text-[0.75rem] text-white"
          style={{ background: T.primary }}
        >
          <Plus size={11} className="inline mr-1" /> 고객 추가
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {deals.map((deal) => {
        const stageColor = stageColorMap[deal.stage] || "#999";
        return (
          <div
            key={deal.id}
            onClick={() => onClickDeal(deal)}
            className="bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md"
            style={{
              borderColor: T.border,
              borderLeft: `3px solid ${stageColor}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-[0.85rem] text-[#1A1A1A] font-medium leading-snug">{deal.company}</span>
              <span
                className="text-[0.6rem] px-2 py-0.5 rounded-full whitespace-nowrap shrink-0"
                style={{ background: stageColor + "14", color: stageColor }}
              >
                {deal.stage}
              </span>
            </div>
            {deal.service && (
              <p className="text-[0.7rem] text-[#888] mb-2 leading-snug">{deal.service}</p>
            )}
            <p className="text-[0.95rem] text-[#1A1A1A] mb-3 tabular-nums font-semibold">{deal.amount}</p>
            {deal.contact && (
              <div className="flex items-center gap-1.5 mb-2">
                <User size={10} className="text-[#BBB]" />
                <span className="text-[0.7rem] text-[#666]">
                  {deal.contact}
                  {deal.position ? ` · ${deal.position}` : ""}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "#F0F1F3" }}>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[0.45rem] text-white"
                  style={{ background: "#94A3B8" }}
                >
                  {deal.manager.charAt(0)}
                </div>
                <span className="text-[0.65rem] text-[#999]">{deal.manager}</span>
              </div>
              <span className="text-[0.7rem] text-[#BBB] tabular-nums">{deal.date.slice(5)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── RELATION VIEW (lifecycle group + customer nodes) ─── */
function RelationView({
  deals,
  pipelineStages,
  stageColorMap,
  onClickDeal,
}: {
  deals: Customer[];
  pipelineStages: PipelineStage[];
  stageColorMap: Record<string, string>;
  onClickDeal: (deal: Customer) => void;
}) {
  const stages = pipelineStages.map((s) => s.name);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Customer[]> = {};
    stages.forEach((s) => { map[s] = []; });
    deals.forEach((d) => {
      if (map[d.stage]) map[d.stage].push(d);
    });
    return map;
  }, [deals, stages.join(",")]);

  if (deals.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-12 text-center" style={{ borderColor: T.border }}>
        <p className="text-[0.85rem] text-[#999]">관계도에 표시할 고객이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6 overflow-x-auto" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-start gap-8 min-w-fit">
        {pipelineStages.map((stage) => {
          const stageDeals = dealsByStage[stage.name] || [];
          const stageColor = stageColorMap[stage.name] || "#999";
          return (
            <div key={stage.id} className="flex flex-col items-center min-w-[200px]">
              <div
                className="px-4 py-2.5 rounded-full mb-3 flex items-center gap-2"
                style={{ background: stageColor, color: "#fff" }}
              >
                <Network size={12} />
                <span className="text-[0.8rem] font-medium">{stage.name}</span>
                <span className="text-[0.7rem] opacity-80">·</span>
                <span className="text-[0.7rem]">{stageDeals.length}</span>
              </div>
              <div className="w-px h-6" style={{ background: stageColor + "60" }} />
              <div className="flex flex-col gap-2 w-full">
                {stageDeals.length === 0 ? (
                  <div className="text-center text-[0.7rem] text-[#CCC] py-3 border border-dashed rounded-lg" style={{ borderColor: "#E5E7EB" }}>
                    —
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => onClickDeal(deal)}
                      className="w-full text-left px-3 py-2 rounded-lg border bg-white hover:shadow-sm transition-all"
                      style={{ borderColor: T.border, borderLeft: `2px solid ${stageColor}` }}
                    >
                      <p className="text-[0.75rem] text-[#1A1A1A] truncate">{deal.company}</p>
                      <p className="text-[0.65rem] text-[#999] tabular-nums mt-0.5">{deal.amount}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─── */
function DealflowPageInner({ urlViewType }: { urlViewType: ViewType }) {
  /* ── Customization State ── */
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(DEFAULT_STAGES);
  const [savedViews, setSavedViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [customFields, setCustomFields] = useState<CustomField[]>(DEFAULT_FIELDS);

  /* ── Navigation ── */
  const navigate = useNavigate();
  const { pageId } = useParams<{ pageId: string }>();

  /* ── Modal Toggles ── */
  const [showAddView, setShowAddView] = useState(false);

  /* ── Derived: stageColors map ── */
  const stageColors = useMemo(() => buildStageColors(pipelineStages), [pipelineStages]);

  /* ��─ Active View (URL-driven) ── */
  const activeView = urlViewType;
  const activeViewId = savedViews.find((v) => v.viewType === urlViewType)?.id || savedViews[0]?.id || "v1";

  const setActiveView = (vt: ViewType) => {
    navigate(`/customers/${pageId || "default"}/${vt}`, { replace: true });
  };

  /* ── Original State ── */
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWebFormOnboarding, setShowWebFormOnboarding] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [customizeMode, setCustomizeMode] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Customer | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [sorts, setSorts] = useState<SortRule[]>([]);
  const [groupBy, setGroupBy] = useState<GroupByField>("");
  const [filterPopover, setFilterPopover] = useState<{ key: string; top: number; left: number } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkActionMenu, setBulkActionMenu] = useState<"" | "status" | "manager" | "delete">("");
  const PAGE_SIZE = 20;
  const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_ACTIVE_WIDGETS);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, number>>({});
  const [customKpis, setCustomKpis] = useState<CustomKpiDef[]>([]);
  const [goals, setGoals] = useState<GoalDef[]>([]);
  const [showCustomKpiModal, setShowCustomKpiModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [widgetDragIdx, setWidgetDragIdx] = useState<number | null>(null);
  const [dashboardCollapsed, setDashboardCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ preset: "all", from: "", to: "" });
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showHeaderMore, setShowHeaderMore] = useState(false);
  const [hoveredDeal, setHoveredDeal] = useState<Customer | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [customerDeals, setCustomerDeals] = useState<Customer[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: number; key: string } | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [headerMenu, setHeaderMenu] = useState<{ key: string; x: number; y: number } | null>(null);
  const [renamingColumn, setRenamingColumn] = useState<string | null>(null);

  const renameColumn = useCallback((key: string) => {
    setRenamingColumn(key);
  }, []);

  const commitColumnRename = useCallback((key: string, nextLabel: string) => {
    const trimmed = nextLabel.trim();
    setRenamingColumn(null);
    if (!trimmed) return;
    setCustomFields((prev) => {
      const existing = prev.find((f) => f.key === key);
      if (existing) {
        return prev.map((f) => (f.key === key ? { ...f, label: trimmed } : f));
      }
      return [...prev, { id: `cf_${Date.now()}`, key, label: trimmed, type: "text", required: false, locked: false, visible: true }];
    });
  }, []);

  const deleteColumn = useCallback((key: string) => {
    const field = customFields.find((f) => f.key === key);
    if (!field || field.locked || field.required) {
      window.alert("이 컬럼은 삭제할 수 없습니다");
      return;
    }
    if (!window.confirm(`"${field.label}" 컬럼을 삭제하시겠습니까? 모든 행의 해당 값이 사라집니다.`)) return;
    setCustomFields((prev) => prev.filter((f) => f.key !== key));
    setVisibleColumns((prev) => { const n = new Set(prev); n.delete(key); return n; });
    setCustomerDeals((prev) => prev.map((d) => { const { [key]: _, ...rest } = d as Record<string, unknown>; return rest as Customer; }));
  }, [customFields]);

  const hideColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => { const n = new Set(prev); n.delete(key); return n; });
  }, []);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<FieldType>("text");

  const addInlineColumn = useCallback(() => {
    const label = newColName.trim();
    if (!label) return;
    const baseKey = label.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "_").replace(/^_|_$/g, "") || `col_${Date.now()}`;
    let key = baseKey;
    let i = 1;
    setCustomFields((prev) => {
      const existing = new Set(prev.map((f) => f.key));
      while (existing.has(key)) { key = `${baseKey}_${i++}`; }
      return [...prev, {
        id: `cf_${Date.now()}`,
        key,
        label,
        type: newColType,
        required: false,
        locked: false,
        visible: true,
      }];
    });
    setVisibleColumns((prev) => { const n = new Set(prev); n.add(key); return n; });
    setNewColName("");
    setNewColType("text");
    setShowAddColumn(false);
  }, [newColName, newColType]);

  const updateDealField = useCallback((id: number, key: string, value: unknown) => {
    setCustomerDeals((prev) => prev.map((d) => (d.id === id ? { ...d, [key]: value } : d)));
    const field = customFields.find((f) => f.key === key);
    if (field && (field.type === "select" || field.type === "multi-select")) {
      const str = typeof value === "string" ? value.trim() : "";
      if (str && !(field.options || []).includes(str)) {
        if (window.confirm(`"${str}"를 "${field.label}" 컬럼의 옵션으로 추가할까요?`)) {
          setCustomFields((prev) => prev.map((f) => (f.key === key ? { ...f, options: [...(f.options || []), str] } : f)));
        }
      }
    }
  }, [customFields]);

  const startBlankTable = useCallback(() => {
    const t = Date.now();
    const blankCols: CustomField[] = Array.from({ length: 4 }, (_, i) => ({
      id: `cf_blank_${t}_${i}`,
      key: `col_${t}_${i + 1}`,
      label: "",
      type: "text",
      required: false,
      locked: false,
      visible: true,
    }));
    setCustomFields((prev) => [...prev, ...blankCols]);
    setVisibleColumns(new Set(["company", ...blankCols.map((c) => c.key)]));
    setActiveView("table");
    const id = t + Math.floor(Math.random() * 1000);
    const blank: Customer = {
      id,
      company: "",
      stage: pipelineStages[0]?.name || "신규",
      contact: "",
      position: "",
      service: "",
      quantity: 0,
      amount: "",
      manager: "",
      status: "신규",
      date: new Date().toISOString().slice(0, 10),
    };
    setCustomerDeals([blank]);
    setEditingCell(null);
  }, [pipelineStages]);

  const addBlankDeal = useCallback(() => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const blank: Customer = {
      id,
      company: "",
      stage: pipelineStages[0]?.name || "신규",
      contact: "",
      position: "",
      service: "",
      quantity: 0,
      amount: "",
      manager: "",
      status: "신규",
      date: new Date().toISOString().slice(0, 10),
    };
    setCustomerDeals((prev) => [...prev, blank]);
    setEditingCell({ id, key: "company" });
  }, [pipelineStages]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key))
  );

  /* ── Column order (user-defined via column config) ── */
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  // Dangol 기본 필드(기업명·고객상태·고객등급)를 항상 맨 앞으로 고정.
  // 사용자가 싫으면 필드 관리 다이얼로그에서 끌 수 있음.
  const [pinDangolColumns, setPinDangolColumns] = useState(true);
  const [colDragKey, setColDragKey] = useState<string | null>(null);

  /* ── Merge ALL_COLUMNS with dynamic customFields (auto-created on import) ── */
  const mergedColumns = useMemo<ColumnDef[]>(() => {
    const builtInKeys = new Set(ALL_COLUMNS.map((c) => c.key));
    const extras: ColumnDef[] = customFields
      .filter((f) => !builtInKeys.has(f.key))
      .map((f) => ({
        key: f.key,
        label: f.label,
        required: f.required,
        filter: f.type === "select" || f.type === "person",
        sort: f.type !== "file",
        defaultVisible: f.visible,
      }));
    return [...ALL_COLUMNS, ...extras];
  }, [customFields]);

  /* ── Ordered columns: columnOrder first (if set), then natural order;
        active columns surface on top, inactive at the bottom. ── */
  const orderedColumns = useMemo<ColumnDef[]>(() => {
    const byKey = new Map(mergedColumns.map((c) => [c.key, c]));
    const seen = new Set<string>();
    const out: ColumnDef[] = [];
    for (const k of columnOrder) {
      const c = byKey.get(k);
      if (c && !seen.has(k)) { out.push(c); seen.add(k); }
    }
    for (const c of mergedColumns) {
      if (!seen.has(c.key)) { out.push(c); seen.add(c.key); }
    }
    let active = out.filter((c) => visibleColumns.has(c.key));
    const inactive = out.filter((c) => !visibleColumns.has(c.key));
    if (pinDangolColumns) {
      const frontKeys = ["company", "stage", "customerGrade"];
      const front = frontKeys
        .map((k) => active.find((c) => c.key === k))
        .filter((c): c is ColumnDef => Boolean(c));
      const rest = active.filter((c) => !frontKeys.includes(c.key));
      active = [...front, ...rest];
    }
    return [...active, ...inactive];
  }, [mergedColumns, columnOrder, visibleColumns, pinDangolColumns]);

  const activeColumns = useMemo(
    () => orderedColumns.filter((c) => visibleColumns.has(c.key)),
    [orderedColumns, visibleColumns]
  );
  const inactiveColumns = useMemo(
    () => orderedColumns.filter((c) => !visibleColumns.has(c.key)),
    [orderedColumns, visibleColumns]
  );

  /* ── Drag to reorder active columns in config dialog ── */
  const handleColDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!colDragKey || colDragKey === targetKey) return;
    // only reorder within the active section
    if (!visibleColumns.has(targetKey) || !visibleColumns.has(colDragKey)) return;
    setColumnOrder((prev) => {
      // materialize current ordered key list as the baseline
      const base = prev.length > 0
        ? [...prev.filter((k) => mergedColumns.some((c) => c.key === k)),
           ...mergedColumns.map((c) => c.key).filter((k) => !prev.includes(k))]
        : mergedColumns.map((c) => c.key);
      const from = base.indexOf(colDragKey);
      const to = base.indexOf(targetKey);
      if (from === -1 || to === -1) return prev;
      const next = [...base];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  // Auto-reveal newly-added custom field columns (post-import) in the table
  useEffect(() => {
    const builtInKeys = new Set(ALL_COLUMNS.map((c) => c.key));
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const f of customFields) {
        if (builtInKeys.has(f.key)) continue;
        if (f.visible && !next.has(f.key)) { next.add(f.key); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [customFields]);

  /* ── CSV Export (dynamic: built-ins + custom fields) ── */
  const exportDealsCsv = useCallback((list: Customer[]) => {
    const headers = mergedColumns.map((c) => c.label);
    const keys = mergedColumns.map((c) => c.key);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = list.map((d) => keys.map((k) => (d as Record<string, unknown>)[k]));
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dangol_deals_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mergedColumns]);

  const toggleColumn = (key: string) => {
    const col = mergedColumns.find((c) => c.key === key);
    if (col?.required) return;
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const addDeal = (deal: Customer) => {
    setCustomerDeals((prev) => [deal, ...prev]);
  };

  const handleOnboardingComplete = (importedDeals: Customer[], recommendedWidgets?: string[]) => {
    setCustomerDeals((prev) => {
      const existingIds = new Set(prev.map((d) => d.id));
      const newDeals = importedDeals.filter((d) => !existingIds.has(d.id));
      return [...newDeals, ...prev];
    });

    // Hide columns that have no data across imported rows
    if (importedDeals.length > 0) {
      const isEmpty = (v: unknown) =>
        v === undefined || v === null || v === "" || v === 0 || v === "0";
      const hasData = new Set<string>();
      for (const d of importedDeals) {
        for (const k in d) {
          if (k === "id") continue;
          if (!isEmpty((d as Record<string, unknown>)[k])) hasData.add(k);
        }
      }
      setVisibleColumns((prev) => {
        const next = new Set<string>();
        for (const k of prev) if (hasData.has(k)) next.add(k);
        next.add("company"); // required — always visible
        return next;
      });
      // Flip empty custom fields to visible:false so the auto-reveal
      // effect doesn't re-add them and the field-settings UI reflects it.
      setCustomFields((prev) =>
        prev.map((f) => {
          if (f.locked || f.required) return f;
          if (hasData.has(f.key)) return f;
          return { ...f, visible: false };
        })
      );
    }

    if (recommendedWidgets?.length) {
      setWidgetOrder(recommendedWidgets);
    }
    setShowOnboarding(false);
  };

  const moveDealStage = useCallback((dealId: number, toStage: string) => {
    const targetStage = pipelineStages.find((s) => s.name === toStage);
    setCustomerDeals((prev) =>
      prev.map((d) => {
        if (d.id !== dealId) return d;
        let nextStatus = d.status;
        if (targetStage?.type === "won") nextStatus = "성공";
        else if (targetStage?.type === "lost") nextStatus = "실패";
        else if (d.status !== "진행중") nextStatus = "진행중";
        return { ...d, stage: toStage, status: nextStatus };
      })
    );
  }, [pipelineStages]);

  const updateDealStatus = useCallback((dealId: number, status: string) => {
    setCustomerDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, status } : d))
    );
  }, []);

  /* ── View Management ── */
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);

  const buildViewSnapshot = useCallback((): Omit<SavedView, "id" | "name"> => ({
    viewType: "table",
    filters,
    sorts,
    groupBy,
    searchQuery,
    columnOrder,
    hiddenKeys: mergedColumns.map((c) => c.key).filter((k) => !visibleColumns.has(k)),
    columnWidths,
    pinDangolColumns,
  }), [filters, sorts, groupBy, searchQuery, columnOrder, mergedColumns, visibleColumns, columnWidths, pinDangolColumns]);

  const addView = (view: SavedView) => {
    setSavedViews((prev) => [...prev, view]);
    setActiveSavedViewId(view.id);
  };

  const applySavedView = (id: string) => {
    const v = savedViews.find((sv) => sv.id === id);
    if (!v) return;
    setFilters(v.filters || []);
    setSorts(v.sorts || []);
    setGroupBy(v.groupBy || "");
    setSearchQuery(v.searchQuery || "");
    if (v.columnOrder) setColumnOrder(v.columnOrder);
    if (v.columnWidths) setColumnWidths(v.columnWidths);
    if (typeof v.pinDangolColumns === "boolean") setPinDangolColumns(v.pinDangolColumns);
    if (v.hiddenKeys) {
      const hidden = new Set(v.hiddenKeys);
      setVisibleColumns(new Set(mergedColumns.map((c) => c.key).filter((k) => !hidden.has(k))));
    }
    setActiveSavedViewId(id);
    setCollapsedGroups(new Set());
  };

  const clearActiveView = () => {
    setActiveSavedViewId(null);
    setFilters([]); setSorts([]); setGroupBy(""); setSearchQuery("");
    setCollapsedGroups(new Set());
  };

  const updateActiveView = () => {
    if (!activeSavedViewId) return;
    const snap = buildViewSnapshot();
    setSavedViews((prev) => prev.map((v) => v.id === activeSavedViewId ? { ...v, ...snap } : v));
  };

  const [confirmDeleteViewId, setConfirmDeleteViewId] = useState<string | null>(null);
  const removeView = (id: string) => {
    setConfirmDeleteViewId(id);
  };
  const confirmRemoveView = () => {
    if (!confirmDeleteViewId) return;
    setSavedViews((prev) => prev.filter((v) => v.id !== confirmDeleteViewId));
    if (activeSavedViewId === confirmDeleteViewId) setActiveSavedViewId(null);
    setConfirmDeleteViewId(null);
  };

  const renameView = (id: string, name: string) => {
    setSavedViews((prev) => prev.map((v) => v.id === id ? { ...v, name } : v));
  };

  const activeWidgets = useMemo(() => new Set(widgetOrder), [widgetOrder]);

  const toggleWidget = (id: string) => {
    setWidgetOrder((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  const removeWidget = (id: string) => {
    setWidgetOrder((prev) => prev.filter((w) => w !== id));
  };

  const resizeWidget = (id: string, newSpan: number) => {
    setWidgetSizes((prev) => ({ ...prev, [id]: Math.min(newSpan, 4) }));
  };

  const handleWidgetDragStart = (idx: number) => setWidgetDragIdx(idx);
  const handleWidgetDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (widgetDragIdx === null || widgetDragIdx === idx) return;
    setWidgetOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(widgetDragIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setWidgetDragIdx(idx);
  };
  const handleWidgetDragEnd = () => setWidgetDragIdx(null);

  const getWidgetSpan = (w: WidgetDef) => {
    const raw = widgetSizes[w.id] ?? w.colSpan;
    return raw === 3 ? 2 : raw; // normalize: 3 is invalid in 4-col grid
  };

  const dateFilteredDeals = useMemo(() => filterByDateRange(customerDeals, dateRange), [customerDeals, dateRange]);

  const filteredDeals = useMemo(() => {
    const filtered = applyFilters(dateFilteredDeals, filters, searchQuery);
    return applySorts(filtered, sorts);
  }, [searchQuery, filters, sorts, dateFilteredDeals]);

  const groupedDeals = useMemo(() => groupDeals(filteredDeals, groupBy), [filteredDeals, groupBy]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const updateSort = (idx: number, patch: Partial<SortRule>) => {
    setSorts((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const removeSort = (idx: number) => {
    setSorts((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── Column-based filter helpers (categorical) ── */
  const getColFilter = (key: string) => filters.find((f) => f.field === key && f.op === "in");

  const toggleColFilterValue = (key: string, val: string) => {
    const existing = getColFilter(key);
    const arr = existing?.value
      ? existing.value.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
    if (!existing) {
      setFilters((prev) => [...prev, { id: `fl-${Date.now()}`, field: key, op: "in", value: next.join(",") }]);
    } else if (next.length === 0) {
      setFilters((prev) => prev.filter((f) => f.id !== existing.id));
    } else {
      setFilters((prev) => prev.map((f) => (f.id === existing.id ? { ...f, value: next.join(",") } : f)));
    }
  };

  const clearColFilter = (key: string) => {
    setFilters((prev) => prev.filter((f) => f.field !== key));
  };

  /* ── Column behavior classification ── */
  const COLUMN_BEHAVIOR: Record<string, "filter" | "sort" | "none"> = {
    company: "sort",
    stage: "filter",
    contact: "sort",
    position: "sort",
    service: "filter",
    amount: "sort",
    quantity: "sort",
    manager: "filter",
    status: "filter",
    date: "sort",
    phone: "none",
    email: "sort",
    memo: "none",
  };

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filteredDeals.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedDeals = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredDeals.slice(start, start + PAGE_SIZE);
  }, [filteredDeals, safeCurrentPage]);

  // Reset page when filters change
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, filters, sorts, dateRange]);

  const toggleAll = () => {
    if (selectedIds.size === paginatedDeals.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedDeals.map((d) => d.id)));
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ── Bulk Actions ── */
  const bulkChangeStatus = (newStatus: string) => {
    setCustomerDeals((prev) => prev.map((d) => selectedIds.has(d.id) ? { ...d, status: newStatus } : d));
    setSelectedIds(new Set());
    setBulkActionMenu("");
  };

  const bulkChangeManager = (newManager: string) => {
    setCustomerDeals((prev) => prev.map((d) => selectedIds.has(d.id) ? { ...d, manager: newManager } : d));
    setSelectedIds(new Set());
    setBulkActionMenu("");
  };

  const bulkDelete = () => {
    setCustomerDeals((prev) => prev.filter((d) => !selectedIds.has(d.id)));
    setSelectedIds(new Set());
    setBulkActionMenu("");
  };

  const managers = useMemo(() => [...new Set(customerDeals.map((d) => d.manager))].sort(), [customerDeals]);

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} customFields={customFields} setCustomFields={setCustomFields} pipelineStages={pipelineStages} />;
  }
  if (showWebFormOnboarding) {
    return <WebFormOnboarding onComplete={(deals) => { handleOnboardingComplete(deals); setShowWebFormOnboarding(false); }} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: T.bg }}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b shrink-0" style={{ borderColor: T.border }}>
        <div>
          <p className="text-[0.7rem] text-[#BBB] mb-0.5">고객관리 &gt; CustomerFlow</p>
          <h1 className="text-[24px] text-[#1A1A1A]">고객 관리</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/settings/pipeline")} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] text-[#666] hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }} title="파이프라인 설정">
            <Settings size={12} /> 파이프라인
          </button>
          <button onClick={() => setShowColumnConfig(true)} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] text-[#666] hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }} title="필드 관리">
            <Grid3X3 size={12} /> 필드
          </button>
          <div className="w-px h-5" style={{ background: T.border }} />
          {/* Date Range Picker */}
          <div className="relative">
            <button onClick={() => setShowDateRangePicker((p) => !p)} className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] transition-colors hover:bg-[#F7F8FA] ${dateRange.preset !== "all" ? "text-[#1A472A] border-[#1A472A] bg-[#F0FDF4]" : "text-[#666]"}`} style={{ borderColor: dateRange.preset !== "all" ? T.primary : T.border }}>
              <Calendar size={12} /> {dateRangeLabel(dateRange)}
              <ChevronDown size={10} />
            </button>
            {showDateRangePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDateRangePicker(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg z-50 w-[280px] py-2" style={{ borderColor: T.border }}>
                  {DATE_RANGE_PRESETS.filter((p) => p.key !== "custom").map((p) => (
                    <button key={p.key} onClick={() => { const range = p.key === "all" ? { from: "", to: "" } : computeDateRange(p.key); setDateRange({ preset: p.key, ...range }); setShowDateRangePicker(false); }} className={`w-full text-left px-4 py-2 text-[0.8rem] transition-colors hover:bg-[#F7F8FA] ${dateRange.preset === p.key ? "text-[#1A472A] font-medium bg-[#F0FDF4]" : "text-[#444]"}`}>
                      {p.label}
                      {dateRange.preset === p.key && <CheckCircle2 size={12} className="inline ml-2 text-[#2CBF60]" />}
                    </button>
                  ))}
                  <div className="border-t mx-3 my-1" style={{ borderColor: T.border }} />
                  <div className="px-4 py-2">
                    <p className="text-[0.7rem] text-[#999] mb-2">직접 설정</p>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.65rem] text-[#999] w-7 shrink-0">시작</span>
                        <input type="date" value={dateRange.preset === "custom" ? dateRange.from : ""} onChange={(e) => { const from = e.target.value; setDateRange((prev) => ({ preset: "custom", from, to: prev.preset === "custom" ? prev.to : "" })); }} className="flex-1 min-w-0 border rounded-md px-2 py-1.5 text-[0.75rem] text-[#444] focus:outline-none focus:border-[#1A472A]" style={{ borderColor: T.border }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[0.65rem] text-[#999] w-7 shrink-0">종료</span>
                        <input type="date" value={dateRange.preset === "custom" ? dateRange.to : ""} onChange={(e) => { const to = e.target.value; setDateRange((prev) => ({ preset: "custom", from: prev.preset === "custom" ? prev.from : "", to })); }} className="flex-1 min-w-0 border rounded-md px-2 py-1.5 text-[0.75rem] text-[#444] focus:outline-none focus:border-[#1A472A]" style={{ borderColor: T.border }} />
                      </div>
                    </div>
                    {dateRange.preset === "custom" && (dateRange.from || dateRange.to) && (
                      <button onClick={() => setShowDateRangePicker(false)} className="w-full mt-2 py-1.5 rounded-md text-[0.75rem] text-white transition-colors" style={{ background: T.primary }}>적용</button>
                    )}
                  </div>
                  {dateRange.preset !== "all" && (
                    <>
                      <div className="border-t mx-3 my-1" style={{ borderColor: T.border }} />
                      <button onClick={() => { setDateRange({ preset: "all", from: "", to: "" }); setShowDateRangePicker(false); }} className="w-full text-left px-4 py-2 text-[0.8rem] text-[#E8453A] hover:bg-[#FEF2F2] transition-colors">
                        <X size={11} className="inline mr-1.5" />기간 필터 초기화
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          {/* 더보기 메뉴 */}
          <div className="relative">
            <button
              onClick={() => setShowHeaderMore((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-[0.75rem] text-[#666] transition-colors hover:bg-[#F7F8FA]"
              style={{ borderColor: T.border }}
              title="더보기"
            >
              <MoreHorizontal size={14} />
            </button>
            {showHeaderMore && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMore(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg z-50 w-[180px] py-1.5" style={{ borderColor: T.border }}>
                  <button
                    onClick={() => { setShowOnboarding(true); setShowHeaderMore(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[0.8rem] text-[#444] hover:bg-[#F7F8FA] transition-colors"
                  >
                    <Upload size={13} color="#888" /> Excel 가져오기
                  </button>
                  <button
                    onClick={() => { setShowWebFormOnboarding(true); setShowHeaderMore(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[0.8rem] text-[#444] hover:bg-[#F7F8FA] transition-colors"
                  >
                    <Globe size={13} color="#888" /> 웹 폼 연동
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={() => { setActiveView("table"); addBlankDeal(); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] text-white transition-colors" style={{ background: T.primary }}>
            <Plus size={12} /> 고객 추가
          </button>
          <button onClick={() => setShowAddDeal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] border transition-colors hover:bg-[#FAFBFC]" style={{ borderColor: T.border, color: "#555" }}>
            상세 입력
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* ZONE 1: 대시보드 위젯 그리드 */}
            <div>
              {customerDeals.length === 0 ? (
                /* 고객 데이터 없음 → 위젯 추가 플레이스홀더만 노출 */
                <div
                  onClick={() => setCustomizeMode(true)}
                  className="rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-[#1A472A] hover:bg-[#FAFBFC] min-h-[128px]"
                  style={{ border: `2px dashed ${T.border}` }}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center mb-2.5" style={{ background: "#EFF5F1" }}>
                    <Plus size={16} color={T.primary} />
                  </div>
                  <span className="text-[0.75rem] text-[#999]">위젯 추가</span>
                  <span className="text-[0.65rem] text-[#CCC] mt-1">고객 데이터를 추가하면 대시보드를 구성할 수 있습니다</span>
                </div>
              ) : (
                /* 고객 데이터 있음 → 전체 대시보드 */
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <LayoutGrid size={16} color={T.primary} />
                      <span className="text-[1.1rem] text-[#1A1A1A]">대시보드</span>
                      <span className="text-[0.7rem] text-[#999]">{widgetOrder.length}개 위젯</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCustomKpiModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.75rem] text-[#666] transition-colors hover:bg-[#F7F8FA]"
                        style={{ border: `1px solid ${T.border}` }}
                      >
                        <Zap size={12} /> 커스텀 KPI
                      </button>
                      <button
                        onClick={() => setShowGoalModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.75rem] text-[#666] transition-colors hover:bg-[#F7F8FA]"
                        style={{ border: `1px solid ${T.border}` }}
                      >
                        <Gauge size={12} /> 목표 설정
                      </button>
                      <button
                        onClick={() => setCustomizeMode(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.75rem] text-[#666] transition-colors hover:bg-[#F7F8FA]"
                        style={{ border: `1px solid ${T.border}` }}
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
                      {(widgetOrder.length > 0 || customKpis.length > 0 || goals.length > 0) ? (
                        <div className="grid grid-cols-4 gap-4">
                          {/* Custom KPI widgets */}
                          {customKpis.map((kpi) => {
                            const vars = {
                              wonAmt: dateFilteredDeals.filter((d) => d.status === "성공").reduce((s, d) => s + parseAmt(d.amount), 0),
                              totalAmt: dateFilteredDeals.reduce((s, d) => s + parseAmt(d.amount), 0),
                              wonCount: dateFilteredDeals.filter((d) => d.status === "성공").length,
                              totalCount: dateFilteredDeals.length,
                              activeCount: dateFilteredDeals.filter((d) => d.status === "진행중").length,
                            };
                            const result = computeCustomKpi(kpi, vars);
                            const isPercent = kpi.formula !== "avg_deal_amount";
                            return (
                              <div key={kpi.id} className="bg-white rounded-xl p-5 border relative group" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                <button onClick={() => setCustomKpis((prev) => prev.filter((k) => k.id !== kpi.id))} className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FEF2F2] z-10"><X size={10} color={T.danger} /></button>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF5F1" }}><Zap size={14} color={T.primary} /></div>
                                  <span className="text-[0.7rem] text-[#888]">{kpi.name}</span>
                                </div>
                                <p className="text-[1.5rem] text-[#1A1A1A] tabular-nums font-semibold">{isPercent ? `${result}%` : fmtAmt(result)}</p>
                                <p className="text-[0.6rem] text-[#BBB] mt-1">{kpi.suffix}</p>
                              </div>
                            );
                          })}

                          {/* Goal gauge widgets */}
                          {goals.map((goal) => {
                            const wonAmt = dateFilteredDeals.filter((d) => d.status === "성공").reduce((s, d) => s + parseAmt(d.amount), 0);
                            const pct = goal.targetAmount > 0 ? Math.min(Math.round((wonAmt / goal.targetAmount) * 100), 100) : 0;
                            const gaugeColor = pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
                            return (
                              <div key={goal.id} className="bg-white rounded-xl p-5 border relative group" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                                <button onClick={() => setGoals((prev) => prev.filter((g) => g.id !== goal.id))} className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#FEF2F2] z-10"><X size={10} color={T.danger} /></button>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF5F1" }}><Gauge size={14} color={T.primary} /></div>
                                  <span className="text-[0.7rem] text-[#888]">{goal.name}</span>
                                  <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full" style={{ background: "#EFF5F1", color: T.primary }}>{goal.period === "monthly" ? "월간" : "분기"}</span>
                                </div>
                                {/* Gauge */}
                                <div className="flex items-center gap-4">
                                  <div className="relative w-[72px] h-[72px]">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                      <circle cx="18" cy="18" r="14" fill="none" stroke="#F0F0F0" strokeWidth="3.5" />
                                      <circle cx="18" cy="18" r="14" fill="none" stroke={gaugeColor} strokeWidth="3.5" strokeDasharray={`${pct * 0.88} 88`} strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-[0.9rem] font-semibold tabular-nums" style={{ color: gaugeColor }}>{pct}%</span>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-baseline gap-1.5 mb-1">
                                      <span className="text-[1rem] text-[#1A1A1A] font-semibold tabular-nums">{fmtAmt(wonAmt)}</span>
                                      <span className="text-[0.65rem] text-[#BBB]">/ {fmtAmt(goal.targetAmount)}</span>
                                    </div>
                                    <div className="w-full h-[6px] rounded-full bg-[#F0F0F0]">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: gaugeColor }} />
                                    </div>
                                    <p className="text-[0.6rem] text-[#999] mt-1.5">잔여 {fmtAmt(Math.max(goal.targetAmount - wonAmt, 0))}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Standard widgets — draggable & resizable */}
                          {widgetOrder.map((wId, idx) => {
                            const w = allWidgets.find((x) => x.id === wId);
                            if (!w) return null;
                            const span = getWidgetSpan(w);
                            return (
                              <div
                                key={w.id}
                                draggable
                                onDragStart={() => handleWidgetDragStart(idx)}
                                onDragOver={(e) => handleWidgetDragOver(e, idx)}
                                onDragEnd={handleWidgetDragEnd}
                                className="bg-white rounded-xl p-5 border relative group transition-all"
                                style={{
                                  borderColor: widgetDragIdx === idx ? T.primary : T.border,
                                  boxShadow: widgetDragIdx === idx ? "0 4px 16px rgba(0,0,0,0.1)" : "0 1px 3px rgba(0,0,0,0.04)",
                                  gridColumn: `span ${span}`,
                                  cursor: "grab",
                                  opacity: widgetDragIdx === idx ? 0.7 : 1,
                                }}
                              >
                                {/* Drag handle indicator */}
                                <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <GripVertical size={12} className="text-[#CCC]" />
                                </div>
                                {/* Controls */}
                                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  {/* Resize buttons */}
                                  {[1, 2, 4].map((s) => (
                                    <button
                                      key={s}
                                      onClick={(e) => { e.stopPropagation(); resizeWidget(w.id, s); }}
                                      className="w-5 h-5 rounded flex items-center justify-center text-[0.5rem] transition-colors"
                                      style={{
                                        background: span === s ? T.primary : "#F3F4F6",
                                        color: span === s ? "#fff" : "#999",
                                      }}
                                      title={s === 4 ? "전체" : `${s}칸`}
                                    >
                                      {s === 4 ? "F" : s}
                                    </button>
                                  ))}
                                  <div className="w-px h-4 mx-0.5" style={{ background: T.border }} />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }}
                                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#FEF2F2] transition-colors"
                                    title="위젯 제거"
                                  >
                                    <X size={9} color={T.danger} />
                                  </button>
                                </div>
                                <WidgetContent
                                  widgetId={w.id}
                                  deals={dateFilteredDeals}
                                  stageColorMap={stageColors}
                                  onAddDeal={() => { setActiveView("table"); addBlankDeal(); }}
                                  onImportExcel={() => setShowOnboarding(true)}
                                  onExport={() => exportDealsCsv(dateFilteredDeals)}
                                  onAnalytics={() => navigate("/sales")}
                                />
                              </div>
                            );
                          })}
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
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[1.1rem] text-[#1A1A1A]">고객 데이터</span>
                  {customerDeals.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[0.7rem]" style={{ background: "#EFF5F1", color: T.primary }}>
                      {filteredDeals.length === customerDeals.length ? `${customerDeals.length}건` : `${filteredDeals.length} / ${customerDeals.length}건`}
                    </span>
                  )}
                </div>
              </div>

              {/* Saved Views chip strip */}
              {customerDeals.length > 0 && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <button
                    onClick={clearActiveView}
                    className="px-3 py-[5px] rounded-full text-[0.7rem] transition-colors border"
                    style={{
                      borderColor: activeSavedViewId === null ? T.primary : T.border,
                      background: activeSavedViewId === null ? "#F0F7F2" : "white",
                      color: activeSavedViewId === null ? T.primary : "#666",
                    }}
                    title="저장된 조건 없이 전체 보기"
                  >
                    모든 고객
                  </button>
                  {savedViews.map((v) => {
                    const active = v.id === activeSavedViewId;
                    return (
                      <div
                        key={v.id}
                        className="group/view flex items-center rounded-full border transition-colors"
                        style={{
                          borderColor: active ? T.primary : T.border,
                          background: active ? "#F0F7F2" : "white",
                        }}
                      >
                        <button
                          onClick={() => applySavedView(v.id)}
                          onDoubleClick={() => {
                            const next = window.prompt("뷰 이름 변경", v.name);
                            if (next && next.trim()) renameView(v.id, next.trim());
                          }}
                          className="pl-3 pr-1 py-[5px] text-[0.7rem]"
                          style={{ color: active ? T.primary : "#666" }}
                          title="클릭: 적용 / 더블클릭: 이름 변경"
                        >
                          {v.name}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeView(v.id); }}
                          className="px-1.5 py-[5px] text-[#BBB] hover:text-[#DC2626] opacity-0 group-hover/view:opacity-100 transition-opacity"
                          title="뷰 삭제"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => setShowAddView(true)}
                    className="px-2.5 py-[5px] rounded-full text-[0.7rem] text-[#666] border border-dashed hover:bg-[#F7F8FA] transition-colors flex items-center gap-1"
                    style={{ borderColor: T.border }}
                    title="현재 필터·정렬·컬럼 상태를 뷰로 저장"
                  >
                    <Plus size={10} /> 뷰 저장
                  </button>
                  {activeSavedViewId && (
                    <button
                      onClick={updateActiveView}
                      className="px-2.5 py-[5px] rounded-full text-[0.7rem] text-[#666] hover:bg-[#F7F8FA] transition-colors"
                      title="현재 화면을 이 뷰에 덮어쓰기"
                    >
                      현재 상태로 업데이트
                    </button>
                  )}
                </div>
              )}

              {/* Shared Filter/Sort/Search Toolbar — visible across all views */}
              {customerDeals.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
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
                    className="px-3 py-[6px] rounded-lg border text-[0.7rem] focus:outline-none focus:border-[#1A472A] transition-colors cursor-pointer"
                    style={{
                      borderColor: groupBy ? T.primary : T.border,
                      color: groupBy ? T.primary : "#666",
                      background: groupBy ? "#F0F7F2" : "white",
                    }}
                    value={groupBy}
                    onChange={(e) => { setGroupBy(e.target.value as GroupByField); setCollapsedGroups(new Set()); }}
                  >
                    <option value="">그룹핑</option>
                    {GROUPABLE_FIELDS.filter((g) => g.key).map((g) => (
                      <option key={g.key} value={g.key}>{g.label}별</option>
                    ))}
                  </select>
                  {(searchQuery || filters.length > 0 || sorts.length > 0 || groupBy) && (
                    <button
                      onClick={() => { setSearchQuery(""); setFilters([]); setSorts([]); setGroupBy(""); setCollapsedGroups(new Set()); }}
                      className="text-[0.65rem] text-[#999] hover:text-[#666] transition-colors px-2"
                    >
                      초기화
                    </button>
                  )}
                </div>
              )}

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
                    <p className="text-[1.1rem] text-[#1A1A1A] mb-2">고객 데이터를 추가해보세요</p>
                    <p className="text-[0.8rem] text-[#999] mb-9 text-center leading-relaxed">
                      고객 정보와 고객 정보를 등록하면 파이프라인을 한 눈에 관리할 수 있습니다.
                    </p>
                    <div className="flex items-stretch gap-4 w-full max-w-[512px]">
                      <button
                        onClick={startBlankTable}
                        className="flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:border-[#1A472A] hover:bg-[#FAFDFB]"
                        style={{ borderColor: T.primary, background: "#FAFDFB" }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: T.primary }}>
                          <Plus size={16} color="#fff" />
                        </div>
                        <div>
                          <p className="text-[0.8rem] text-[#1A1A1A] mb-0.5">빈 테이블에서 시작</p>
                          <p className="text-[0.65rem] text-[#999]">컬럼부터 직접 정의</p>
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
                        onClick={() => setShowWebFormOnboarding(true)}
                        className="flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border transition-all hover:border-[#1A472A] hover:bg-[#FAFBFC]"
                        style={{ borderColor: T.border }}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#F3F4F6" }}>
                          <Globe size={16} color="#666" />
                        </div>
                        <div>
                          <p className="text-[0.8rem] text-[#1A1A1A] mb-0.5">웹 폼 연동</p>
                          <p className="text-[0.65rem] text-[#999]">홈페이지 문의폼과 연결</p>
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
                {/* Table View (유일한 뷰) */}
                {activeView === "table" && (
                <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  {/* Bulk Action Bar — only when items selected */}
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 px-5 py-2.5 border-b" style={{ borderColor: T.border, background: "#F0F7F2" }}>
                      <span className="text-[0.75rem] text-[#1A1A1A] font-medium">{selectedIds.size}건 선택</span>
                      <div className="w-px h-5" style={{ background: T.border }} />
                      {/* Manager assign */}
                      <div className="relative">
                        <button onClick={() => setBulkActionMenu(bulkActionMenu === "manager" ? "" : "manager")} className="px-3 py-1.5 rounded-md text-[0.7rem] hover:bg-white transition-colors flex items-center gap-1" style={{ color: T.primary }}>
                          담당자 배정 <ChevronDown size={10} />
                        </button>
                        {bulkActionMenu === "manager" && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setBulkActionMenu("")} />
                            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 py-1 w-[120px]" style={{ borderColor: T.border }}>
                              {managers.map((m) => (
                                <button key={m} onClick={() => bulkChangeManager(m)} className="w-full text-left px-3 py-2 text-[0.75rem] text-[#444] hover:bg-[#F7F8FA] transition-colors">{m}</button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      {/* Delete */}
                      <div className="relative">
                        <button onClick={() => setBulkActionMenu(bulkActionMenu === "delete" ? "" : "delete")} className="px-3 py-1.5 rounded-md text-[0.7rem] hover:bg-[#FEF2F2] transition-colors" style={{ color: T.danger }}>
                          삭제
                        </button>
                        {bulkActionMenu === "delete" && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setBulkActionMenu("")} />
                            <div className="absolute top-full left-0 mt-1 bg-white border rounded-xl shadow-lg z-50 p-4 w-[220px]" style={{ borderColor: T.border }}>
                              <p className="text-[0.8rem] text-[#1A1A1A] mb-1">선택한 {selectedIds.size}건을 삭제할까요?</p>
                              <p className="text-[0.7rem] text-[#999] mb-3">이 작업은 되돌릴 수 없습니다.</p>
                              <div className="flex items-center gap-2 justify-end">
                                <button onClick={() => setBulkActionMenu("")} className="px-3 py-1.5 rounded-md text-[0.7rem] text-[#666] hover:bg-[#F7F8FA] transition-colors border" style={{ borderColor: T.border }}>취소</button>
                                <button onClick={bulkDelete} className="px-3 py-1.5 rounded-md text-[0.7rem] text-white transition-colors" style={{ background: T.danger }}>삭제</button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex-1" />
                      <button onClick={() => { setSelectedIds(new Set()); setBulkActionMenu(""); }} className="text-[0.7rem] text-[#999] hover:text-[#666] transition-colors">선택 해제</button>
                    </div>
                  )}

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead>
                        <tr style={{ background: "#FAFBFC" }}>
                          <th className="py-3 px-4 w-12 border-b" style={{ borderColor: T.border }}>
                            <input type="checkbox" checked={selectedIds.size === paginatedDeals.length && paginatedDeals.length > 0} onChange={toggleAll} className="w-4 h-4 rounded border-[#D1D5DB] text-[#1A472A] focus:ring-[#1A472A] cursor-pointer" />
                          </th>
                          {activeColumns.map((h) => {
                            const sortIdx = sorts.findIndex((s) => s.field === h.key);
                            const sortDir = sortIdx >= 0 ? sorts[sortIdx].dir : null;
                            const isNumeric = h.key === "amount" || h.key === "quantity";
                            const behavior = COLUMN_BEHAVIOR[h.key] || (h.filter ? "filter" : h.sort ? "sort" : "none");
                            const colFilter = getColFilter(h.key);
                            const filterCount = colFilter?.value ? colFilter.value.split(",").filter(Boolean).length : 0;
                            const isActive = behavior === "filter" ? filterCount > 0 : sortDir !== null;
                            return (
                              <th
                                key={h.key}
                                className={`${isNumeric ? "text-right" : "text-left"} py-3 px-4 whitespace-nowrap border-b ${behavior !== "none" ? "cursor-pointer" : ""} select-none relative group/th`}
                                style={{ borderColor: T.border, background: isActive ? "#F0F7F2" : undefined, ...(columnWidths[h.key] ? { width: columnWidths[h.key], minWidth: columnWidths[h.key] } : {}) }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setHeaderMenu({ key: h.key, x: e.clientX, y: e.clientY });
                                }}
                                onClick={(e) => {
                                  if (!h.label) { renameColumn(h.key); return; }
                                  if (behavior === "none") return;
                                  if (behavior === "sort") {
                                    if (sortIdx >= 0) {
                                      if (sortDir === "asc") updateSort(sortIdx, { dir: "desc" });
                                      else removeSort(sortIdx);
                                    } else {
                                      setSorts((prev) => [...prev, { field: h.key, dir: "asc" }]);
                                    }
                                  } else if (behavior === "filter") {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setFilterPopover(
                                      filterPopover?.key === h.key
                                        ? null
                                        : { key: h.key, top: rect.bottom + 4, left: rect.left }
                                    );
                                  }
                                }}
                              >
                                <div className={`flex items-center gap-1.5 ${isNumeric ? "justify-end" : ""}`}>
                                  {renamingColumn === h.key ? (
                                    <input
                                      autoFocus
                                      defaultValue={h.label}
                                      placeholder="컬럼 이름"
                                      onClick={(e) => e.stopPropagation()}
                                      onBlur={(e) => commitColumnRename(h.key, e.currentTarget.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); commitColumnRename(h.key, e.currentTarget.value); }
                                        else if (e.key === "Escape") { e.preventDefault(); setRenamingColumn(null); }
                                      }}
                                      className="text-[0.7rem] bg-white border border-[#1A472A] rounded px-1.5 py-0.5 outline-none w-full min-w-[100px]"
                                    />
                                  ) : h.label ? (
                                    <span className={`text-[0.65rem] tracking-wide ${isActive ? "text-[#1A472A] font-medium" : "text-[#888]"}`}>{h.label}</span>
                                  ) : (
                                    <span className="text-[0.65rem] tracking-wide italic text-[#BBB] hover:text-[#1A472A] transition-colors">클릭해서 컬럼 이름 입력</span>
                                  )}
                                  {behavior === "sort" && (
                                    <span className={`text-[0.55rem] ${sortDir ? "text-[#1A472A]" : "text-[#CCC] opacity-0 group-hover/th:opacity-100"} transition-opacity`}>
                                      {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "⇅"}
                                      {sortIdx >= 0 && sorts.length > 1 && <sup className="text-[0.45rem] ml-0.5">{sortIdx + 1}</sup>}
                                    </span>
                                  )}
                                  {behavior === "filter" && (
                                    <span className={`flex items-center gap-0.5 ${filterCount > 0 ? "text-[#1A472A]" : "text-[#CCC] opacity-0 group-hover/th:opacity-100"} transition-opacity`}>
                                      <ListFilter size={9} />
                                      {filterCount > 0 && <span className="text-[0.55rem] tabular-nums">{filterCount}</span>}
                                    </span>
                                  )}
                                </div>
                                {/* Column resize handle */}
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#1A472A]/20 transition-colors z-10"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startWidth = (e.currentTarget.parentElement?.getBoundingClientRect().width) || 120;
                                    const onMove = (ev: MouseEvent) => {
                                      const delta = ev.clientX - startX;
                                      const next = Math.max(60, startWidth + delta);
                                      setColumnWidths((prev) => ({ ...prev, [h.key]: next }));
                                    };
                                    const onUp = () => {
                                      document.removeEventListener("mousemove", onMove);
                                      document.removeEventListener("mouseup", onUp);
                                    };
                                    document.addEventListener("mousemove", onMove);
                                    document.addEventListener("mouseup", onUp);
                                  }}
                                />
                              </th>
                            );
                          })}
                          <th className="py-3 px-2 w-10 border-b relative" style={{ borderColor: T.border }}>
                            <button
                              onClick={() => setShowAddColumn((v) => !v)}
                              className="w-6 h-6 rounded flex items-center justify-center text-[#999] hover:text-[#1A472A] hover:bg-[#F0F7F2] transition-colors"
                              title="컬럼 추가"
                            >
                              <Plus size={13} />
                            </button>
                            {showAddColumn && (
                              <div className="absolute right-0 top-full mt-1 z-20 w-60 bg-white border rounded-lg shadow-lg p-3" style={{ borderColor: T.border }}>
                                <input
                                  autoFocus
                                  value={newColName}
                                  onChange={(e) => setNewColName(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") addInlineColumn(); if (e.key === "Escape") setShowAddColumn(false); }}
                                  placeholder="컬럼 이름"
                                  className="w-full text-[0.75rem] border rounded px-2 py-1.5 mb-2 outline-none focus:border-[#1A472A]"
                                  style={{ borderColor: T.border }}
                                />
                                <div className="grid grid-cols-2 gap-1 mb-2">
                                  {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).filter((t) => t !== "file" && t !== "multi-select").map((t) => (
                                    <button
                                      key={t}
                                      onClick={() => setNewColType(t)}
                                      className={`text-left px-2 py-1 rounded text-[0.7rem] transition-colors ${newColType === t ? "bg-[#F0F7F2] text-[#1A472A]" : "text-[#666] hover:bg-[#FAFBFC]"}`}
                                    >
                                      <span className="mr-1">{FIELD_TYPE_ICONS[t]}</span>{FIELD_TYPE_LABELS[t]}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-1.5">
                                  <button onClick={() => setShowAddColumn(false)} className="flex-1 text-[0.7rem] py-1.5 rounded border hover:bg-[#FAFBFC]" style={{ borderColor: T.border, color: "#666" }}>취소</button>
                                  <button onClick={addInlineColumn} disabled={!newColName.trim()} className="flex-1 text-[0.7rem] py-1.5 rounded text-white disabled:opacity-40" style={{ background: T.primary }}>추가</button>
                                </div>
                              </div>
                            )}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDeals.length === 0 ? (
                          <tr>
                            <td colSpan={visibleColumns.size + 2} className="py-16 text-center">
                              <div className="flex flex-col items-center">
                                <Search size={19} color="#DDD" className="mb-3" />
                                <p className="text-[0.8rem] text-[#999] mb-1">검색 결과가 없습니다</p>
                                <p className="text-[0.7rem] text-[#CCC]">다른 키워드나 필터 조건을 시도해보세요.</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          (groupBy ? groupedDeals : [{ key: "__all__", label: "", deals: paginatedDeals, totalAmount: 0 }]).map((group) => {
                            const isCollapsed = collapsedGroups.has(group.key);
                            const showGroupHeader = groupBy && group.key !== "__all__";
                            return (
                              <React.Fragment key={group.key}>
                                {/* Group Header Row */}
                                {showGroupHeader && (
                                  <tr
                                    className="cursor-pointer select-none"
                                    style={{ background: "#F8F9FB" }}
                                    onClick={() => toggleGroup(group.key)}
                                  >
                                    <td colSpan={visibleColumns.size + 2} className="py-2.5 px-4 border-b" style={{ borderColor: T.border }}>
                                      <div className="flex items-center gap-3">
                                        {isCollapsed ? <ChevronRightIcon size={13} color="#999" /> : <ChevronDown size={13} color="#999" />}
                                        <span className="text-[0.8rem] text-[#1A1A1A] font-medium">{group.label}</span>
                                        <span className="text-[0.65rem] px-2 py-0.5 rounded-full" style={{ background: "#EFF5F1", color: T.primary }}>
                                          {group.deals.length}건
                                        </span>
                                        <span className="text-[0.65rem] text-[#999] tabular-nums">
                                          {fmtAmt(group.totalAmount)}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                {/* Group Deal Rows */}
                                {!isCollapsed && group.deals.map((deal) => {
                                  const isSelected = selectedIds.has(deal.id);
                                  const cellMap: Record<string, React.ReactNode> = {
                                    company: (
                                      <div className="flex items-center gap-2.5 cursor-pointer group/company" onClick={() => setSelectedDeal(deal)}>
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.65rem] text-white shrink-0" style={{ background: stageColors[deal.stage] || T.primary }}>
                                          {deal.company.replace(/[\(\)주]/g, "").charAt(0)}
                                        </div>
                                        <span className="text-[0.75rem] text-[#1A1A1A] group-hover/company:text-[#1A472A] group-hover/company:underline transition-colors">{deal.company}</span>
                                      </div>
                                    ),
                                    stage: (
                                      <StageDropdown
                                        currentStage={deal.stage}
                                        stageNames={pipelineStages.map((s) => s.name)}
                                        stageColorMap={stageColors}
                                        onChange={(s) => moveDealStage(deal.id, s)}
                                        compact
                                      />
                                    ),
                                    contact: (
                                      <div className="flex flex-col">
                                        <span className="text-[0.75rem] text-[#1A1A1A]">{deal.contact}</span>
                                        {!visibleColumns.has("position") && <span className="text-[0.6rem] text-[#BBB]">{deal.position}</span>}
                                      </div>
                                    ),
                                    position: <span className="text-[0.7rem] text-[#666]">{deal.position}</span>,
                                    service: <span className="text-[0.7rem] text-[#555]">{deal.service}</span>,
                                    amount: <span className="block text-right text-[0.75rem] text-[#1A1A1A] tabular-nums">{deal.amount}</span>,
                                    quantity: <span className="block text-right text-[0.7rem] text-[#555] tabular-nums">{deal.quantity.toLocaleString()}</span>,
                                    manager: (
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] text-white" style={{ background: "#94A3B8" }}>
                                          {deal.manager.charAt(0)}
                                        </div>
                                        <span className="text-[0.7rem] text-[#555]">{deal.manager}</span>
                                      </div>
                                    ),
                                    status: (
                                      <StatusDropdown
                                        currentStatus={deal.status}
                                        onChange={(s) => updateDealStatus(deal.id, s)}
                                        compact
                                      />
                                    ),
                                    date: <span className="text-[0.7rem] text-[#999] whitespace-nowrap tabular-nums">{deal.date}</span>,
                                    phone: <span className="text-[0.7rem] text-[#555]">—</span>,
                                    email: <span className="text-[0.7rem] text-[#555]">—</span>,
                                    memo: <span className="text-[0.7rem] text-[#BBB]">—</span>,
                                  };
                                  return (
                                    <tr
                                      key={deal.id}
                                      className="border-b transition-colors"
                                      style={{ borderColor: T.border, background: isSelected ? "#F0F7F2" : "#fff" }}
                                      onMouseEnter={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = "#FAFBFC";
                                        if (hoverTimer.current) clearTimeout(hoverTimer.current);
                                        hoverTimer.current = setTimeout(() => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setHoverPos({ x: rect.right + 8, y: rect.top });
                                          setHoveredDeal(deal);
                                        }, 400);
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelected) e.currentTarget.style.background = "#fff";
                                        if (hoverTimer.current) clearTimeout(hoverTimer.current);
                                        setHoveredDeal(null);
                                      }}
                                    >
                                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(deal.id)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#1A472A] focus:ring-[#1A472A] cursor-pointer" />
                                      </td>
                                      {activeColumns.map((col) => {
                                        const isEditing = editingCell?.id === deal.id && editingCell?.key === col.key;
                                        const hasCustomCell = cellMap[col.key] !== undefined;
                                        const raw = (deal as Record<string, unknown>)[col.key];
                                        const canInlineEdit = !hasCustomCell || col.key === "company";
                                        const isEmpty = raw === undefined || raw === null || raw === "";
                                        const fieldDef = customFields.find((f) => f.key === col.key);
                                        const fieldType = fieldDef?.type ?? "text";
                                        const fieldOptions = fieldType === "select" ? (fieldDef?.options || []) : [];
                                        const commitValue = (v: string, moveNext?: boolean) => {
                                          updateDealField(deal.id, col.key, typeof raw === "number" ? (Number(v) || 0) : v);
                                          if (moveNext) {
                                            const idx = activeColumns.findIndex((c) => c.key === col.key);
                                            const next = activeColumns[idx + 1];
                                            setEditingCell(next ? { id: deal.id, key: next.key } : null);
                                          } else {
                                            setEditingCell(null);
                                          }
                                        };
                                        const inputTypeAttr = fieldType === "date" ? "date" : fieldType === "number" ? "number" : fieldType === "email" ? "email" : fieldType === "phone" ? "tel" : "text";
                                        let editor: React.ReactNode = null;
                                        if (isEditing && canInlineEdit) {
                                          if (fieldType === "select" && fieldOptions.length > 0) {
                                            editor = (
                                              <SelectCellEditor
                                                value={String(raw ?? "")}
                                                options={fieldOptions}
                                                fieldKey={col.key}
                                                onCommit={(v) => commitValue(v)}
                                                onCancel={() => setEditingCell(null)}
                                              />
                                            );
                                          } else {
                                            editor = (
                                              <input
                                                type={inputTypeAttr}
                                                inputMode={fieldType === "number" ? "decimal" : undefined}
                                                autoFocus
                                                defaultValue={raw === undefined || raw === null ? "" : String(raw)}
                                                onBlur={(e) => commitValue(e.currentTarget.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") { e.preventDefault(); commitValue(e.currentTarget.value); }
                                                  else if (e.key === "Tab") { e.preventDefault(); commitValue(e.currentTarget.value, true); }
                                                  else if (e.key === "Escape") { setEditingCell(null); }
                                                }}
                                                className="w-full bg-transparent outline-none text-[0.75rem] text-[#1A1A1A] border border-[#1A472A] rounded px-1.5 py-1"
                                              />
                                            );
                                          }
                                        }
                                        const rendered = editor ?? (
                                          canInlineEdit && isEmpty ? (
                                            <span className="text-[0.7rem] text-[#BBB] italic hover:text-[#1A472A] transition-colors">클릭해서 입력</span>
                                          ) : hasCustomCell ? (
                                            cellMap[col.key]
                                          ) : isEmpty ? (
                                            <span className="text-[0.7rem] text-[#BBB]">—</span>
                                          ) : fieldType === "select" && fieldOptions.length > 0 ? (
                                            (() => {
                                              const c = getSelectChipColor(col.key, String(raw), fieldOptions);
                                              return (
                                                <span className="text-[0.7rem] px-2 py-0.5 rounded-md inline-block" style={{ background: c.bg, color: c.text }}>{String(raw)}</span>
                                              );
                                            })()
                                          ) : (
                                            <span className="text-[0.7rem] text-[#555] truncate block">{typeof raw === "number" ? raw.toLocaleString() : String(raw)}</span>
                                          )
                                        );
                                        return (
                                          <td
                                            key={col.key}
                                            className={`py-3.5 px-4 ${canInlineEdit ? "cursor-text" : ""}`}
                                            style={columnWidths[col.key] ? { width: columnWidths[col.key], minWidth: columnWidths[col.key] } : undefined}
                                            onClick={(e) => {
                                              if (canInlineEdit && isEmpty && !isEditing) {
                                                e.stopPropagation();
                                                setEditingCell({ id: deal.id, key: col.key });
                                              }
                                            }}
                                            onDoubleClick={() => { if (canInlineEdit) setEditingCell({ id: deal.id, key: col.key }); }}
                                          >{rendered}</td>
                                        );
                                      })}
                                      <td className="py-3.5 px-2 w-10" />
                                    </tr>
                                  );
                                })}
                                {/* Group Subtotal Row */}
                                {showGroupHeader && !isCollapsed && (
                                  <tr style={{ background: "#FAFBFC" }}>
                                    <td colSpan={visibleColumns.size + 2} className="py-2 px-4 border-b" style={{ borderColor: T.border }}>
                                      <div className="flex items-center gap-4 pl-[30px]">
                                        <span className="text-[0.65rem] text-[#999]">소계: {group.deals.length}건</span>
                                        <span className="text-[0.65rem] text-[#999] tabular-nums">{fmtAmt(group.totalAmount)}</span>
                                        <span className="text-[0.65rem] text-[#BBB]">평균 {fmtAmt(group.deals.length > 0 ? Math.round(group.totalAmount / group.deals.length) : 0)}</span>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                        {filteredDeals.length > 0 && (
                          <tr>
                            <td colSpan={visibleColumns.size + 2} className="p-0">
                              <button
                                onClick={addBlankDeal}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-[0.7rem] text-[#999] hover:bg-[#FAFBFC] hover:text-[#1A472A] transition-colors border-b"
                                style={{ borderColor: T.border }}
                              >
                                <Plus size={13} />
                                <span>행 추가</span>
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {customerDeals.length <= 1 && (
                    <div className="px-4 py-2.5 text-[0.65rem] text-[#999] border-t flex items-center gap-3 flex-wrap" style={{ borderColor: T.border, background: "#FAFDFB" }}>
                      <span>💡</span>
                      <span><b className="text-[#1A472A]">셀 더블클릭</b>으로 값 입력</span>
                      <span className="text-[#DDD]">·</span>
                      <span>우측 <b className="text-[#1A472A]">+</b>로 컬럼 추가</span>
                      <span className="text-[#DDD]">·</span>
                      <span>헤더 <b className="text-[#1A472A]">우클릭</b>으로 이름 변경/삭제</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: T.border, background: "#FAFBFC" }}>
                    <span className="text-[0.7rem] text-[#999]">
                      {filteredDeals.length < customerDeals.length
                        ? `필터 결과 ${filteredDeals.length}건 (전체 ${customerDeals.length}건)`
                        : `전체 ${customerDeals.length}건`}
                      {groupBy && ` · ${groupedDeals.length}개 그룹`}
                      {!groupBy && filteredDeals.length > PAGE_SIZE && ` · ${(safeCurrentPage - 1) * PAGE_SIZE + 1}-${Math.min(safeCurrentPage * PAGE_SIZE, filteredDeals.length)}건 표시`}
                    </span>
                    {!groupBy && totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safeCurrentPage <= 1}
                          className="w-8 h-8 rounded-lg text-[0.7rem] flex items-center justify-center transition-colors border disabled:opacity-30"
                          style={{ borderColor: T.border, color: "#666" }}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                          .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                            if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push("...");
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, idx) =>
                            p === "..." ? (
                              <span key={`e${idx}`} className="w-6 text-center text-[0.65rem] text-[#BBB]">...</span>
                            ) : (
                              <button
                                key={p}
                                onClick={() => setCurrentPage(p)}
                                className="w-8 h-8 rounded-lg text-[0.7rem] transition-colors"
                                style={{
                                  background: safeCurrentPage === p ? T.primary : "transparent",
                                  color: safeCurrentPage === p ? "#fff" : "#666",
                                  border: safeCurrentPage === p ? "none" : `1px solid ${T.border}`,
                                }}
                              >
                                {p}
                              </button>
                            )
                          )}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safeCurrentPage >= totalPages}
                          className="w-8 h-8 rounded-lg text-[0.7rem] flex items-center justify-center transition-colors border disabled:opacity-30"
                          style={{ borderColor: T.border, color: "#666" }}
                        >
                          <ChevronRightIcon size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* Row Hover Preview Tooltip */}
                {activeView === "table" && hoveredDeal && !selectedDeal && (
                  <div
                    className="fixed z-50 bg-white border rounded-xl shadow-lg px-4 py-3 pointer-events-none"
                    style={{
                      borderColor: T.border,
                      left: Math.min(hoverPos.x, window.innerWidth - 220),
                      top: Math.max(8, Math.min(hoverPos.y, window.innerHeight - 120)),
                      boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                      width: 200,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[0.6rem] text-white shrink-0" style={{ background: stageColors[hoveredDeal.stage] || T.primary }}>
                        {hoveredDeal.company.replace(/[\(\)주]/g, "").charAt(0)}
                      </div>
                      <span className="text-[0.8rem] text-[#1A1A1A] font-medium truncate">{hoveredDeal.company}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[0.65rem] text-[#999]">금액</span>
                        <span className="text-[0.7rem] text-[#1A1A1A] tabular-nums font-medium">{hoveredDeal.amount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[0.65rem] text-[#999]">스테이지</span>
                        <span className="text-[0.65rem] px-2 py-0.5 rounded-full" style={{ background: (stageColors[hoveredDeal.stage] || "#999") + "14", color: stageColors[hoveredDeal.stage] || "#999" }}>
                          {hoveredDeal.stage}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[0.65rem] text-[#999]">담당자</span>
                        <span className="text-[0.7rem] text-[#555]">{hoveredDeal.contact}</span>
                      </div>
                    </div>
                  </div>
                )}

                </>
              )}

              {/* Column Config Dialog */}
              {/* Field Manager Dialog (unified: column visibility + field types + rename + delete) */}
              {showColumnConfig && (() => {
                const renderRow = (col: ColumnDef, active: boolean) => {
                  const field = customFields.find((f) => f.key === col.key);
                  const isLocked = field?.locked || col.required;
                  const isCustom = !ALL_COLUMNS.some((c) => c.key === col.key);
                  const isDangolFeature = col.key === "stage" || col.key === "customerGrade";
                  const currentType = field?.type ?? "text";
                  const dragging = colDragKey === col.key;
                  return (
                    <div
                      key={col.key}
                      draggable={active && !isLocked}
                      onDragStart={() => active && !isLocked && setColDragKey(col.key)}
                      onDragOver={(e) => active && handleColDragOver(e, col.key)}
                      onDragEnd={() => setColDragKey(null)}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#F8F9FA] transition-colors"
                      style={{ opacity: dragging ? 0.5 : 1, cursor: active && !isLocked ? "grab" : "default" }}
                    >
                      {active ? <GripVertical size={12} className={`shrink-0 ${isLocked ? "text-transparent" : "text-[#CCC]"}`} /> : <span className="w-3 shrink-0" />}
                      <button
                        onClick={() => !isLocked && toggleColumn(col.key)}
                        className="p-1 rounded hover:bg-white shrink-0"
                        title={active ? "숨기기" : "보이기"}
                        disabled={isLocked}
                      >
                        {active ? <Eye size={12} color="#666" /> : <EyeOff size={12} color="#CCC" />}
                      </button>
                      {renamingColumn === col.key ? (
                        <input
                          autoFocus
                          defaultValue={col.label}
                          onBlur={(e) => commitColumnRename(col.key, e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitColumnRename(col.key, e.currentTarget.value); }
                            else if (e.key === "Escape") { e.preventDefault(); setRenamingColumn(null); }
                          }}
                          className="text-[0.75rem] flex-1 border rounded px-1.5 py-0.5 outline-none focus:border-[#1A472A]"
                          style={{ borderColor: T.border }}
                        />
                      ) : (
                        <span className={`flex-1 flex items-center gap-1.5 min-w-0 ${isLocked ? "" : "cursor-text"}`}>
                          <span
                            onClick={() => !isLocked && setRenamingColumn(col.key)}
                            className={`text-[0.75rem] truncate ${active ? "text-[#333]" : "text-[#999]"} ${isLocked ? "" : "hover:text-[#1A472A]"}`}
                          >
                            {col.label || <span className="italic text-[#BBB]">이름 없음</span>}
                          </span>
                          {isDangolFeature && (
                            <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-[#EFF5F1] text-[#1A472A] shrink-0">Dangol 기능</span>
                          )}
                        </span>
                      )}
                      {isCustom && !isLocked ? (
                        <select
                          value={currentType}
                          onChange={(e) => {
                            const t = e.target.value as FieldType;
                            setCustomFields((prev) => prev.map((f) => (f.key === col.key ? { ...f, type: t } : f)));
                          }}
                          className="text-[0.65rem] px-1.5 py-1 rounded border bg-white text-[#666] cursor-pointer"
                          style={{ borderColor: T.border }}
                        >
                          {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).filter((t) => t !== "file").map((t) => (
                            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[0.6rem] text-[#BBB] px-1.5 py-1 rounded bg-[#F8F9FA]">{FIELD_TYPE_LABELS[currentType]}</span>
                      )}
                      {col.required ? (
                        <span className="text-[0.55rem] px-1.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">필수</span>
                      ) : isCustom ? (
                        <button onClick={() => deleteColumn(col.key)} className="p-1 rounded hover:bg-[#FEF2F2] shrink-0" title="삭제">
                          <Trash2 size={12} color="#EF4444" />
                        </button>
                      ) : (
                        <Lock size={11} className="text-[#DDD] shrink-0" />
                      )}
                    </div>
                  );
                };
                return (
                  <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.2)" }} onClick={() => setShowColumnConfig(false)}>
                    <div className="bg-white rounded-xl border w-[420px]" style={{ borderColor: T.border, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: T.border }}>
                        <div>
                          <p className="text-[0.85rem] text-[#1A1A1A] font-medium">필드</p>
                          <p className="text-[0.65rem] text-[#999] mt-0.5">표시 여부·이름·타입·순서를 관리합니다</p>
                        </div>
                        <button onClick={() => setShowColumnConfig(false)} className="p-1 rounded hover:bg-[#F7F8FA]"><X size={13} color="#999" /></button>
                      </div>
                      <label className="flex items-center justify-between px-5 py-2.5 border-b cursor-pointer hover:bg-[#FAFBFC]" style={{ borderColor: T.border }}>
                        <div className="flex flex-col">
                          <span className="text-[0.7rem] text-[#333]">Dangol 기본 필드 고정</span>
                          <span className="text-[0.6rem] text-[#999] mt-0.5">기업명·고객상태·고객등급을 맨 앞으로 유지</span>
                        </div>
                        <div
                          onClick={(e) => { e.preventDefault(); setPinDangolColumns((p) => !p); }}
                          className="relative w-8 h-[18px] rounded-full transition-colors shrink-0"
                          style={{ background: pinDangolColumns ? T.primary : "#D1D5DB" }}
                        >
                          <div
                            className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all"
                            style={{ left: pinDangolColumns ? "16px" : "2px", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                          />
                        </div>
                      </label>
                      <div className="p-3 max-h-[420px] overflow-y-auto">
                        {activeColumns.length > 0 && (
                          <>
                            <p className="text-[0.6rem] text-[#999] px-3 pb-1.5 uppercase tracking-wide">표시 중 · 드래그로 순서 변경</p>
                            {activeColumns.map((c) => renderRow(c, true))}
                          </>
                        )}
                        {inactiveColumns.length > 0 && (
                          <>
                            <p className="text-[0.6rem] text-[#999] px-3 pt-3 pb-1.5 uppercase tracking-wide">숨김</p>
                            {inactiveColumns.map((c) => renderRow(c, false))}
                          </>
                        )}
                        <button
                          onClick={() => { setShowAddColumn(true); setShowColumnConfig(false); }}
                          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-[0.75rem] text-[#999] hover:text-[#1A472A] hover:border-[#1A472A] hover:bg-[#FAFDFB] transition-all"
                          style={{ borderColor: T.border }}
                        >
                          <Plus size={13} /> 새 필드 추가
                        </button>
                      </div>
                      <div className="px-5 py-3 border-t flex justify-end" style={{ borderColor: T.border }}>
                        <button onClick={() => setShowColumnConfig(false)} className="px-4 py-1.5 rounded-lg text-[0.7rem] text-white" style={{ background: T.primary }}>완료</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Detail Drawer — pull fresh deal from customerDeals so status/stage updates reflect immediately */}
          {selectedDeal && (() => {
            const liveDeal = customerDeals.find((d) => d.id === selectedDeal.id);
            if (!liveDeal) return null;
            return <DetailDrawer deal={liveDeal} onClose={() => setSelectedDeal(null)} stageColorMap={stageColors} stageNames={pipelineStages.map((s) => s.name)} onChangeStage={moveDealStage} onChangeStatus={updateDealStatus} customFields={customFields} />;
          })()}
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

      {/* Header Context Menu */}
      {headerMenu && (() => {
        const field = customFields.find((f) => f.key === headerMenu.key);
        const isLocked = field?.locked || field?.required;
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setHeaderMenu(null)} onContextMenu={(e) => { e.preventDefault(); setHeaderMenu(null); }} />
            <div className="fixed z-50 bg-white rounded-lg border shadow-lg py-1 min-w-[160px]" style={{ top: headerMenu.y, left: headerMenu.x, borderColor: T.border }}>
              <button onClick={() => { renameColumn(headerMenu.key); setHeaderMenu(null); }} className="w-full text-left px-3 py-1.5 text-[0.75rem] text-[#1A1A1A] hover:bg-[#FAFBFC]">이름 변경</button>
              <button onClick={() => { hideColumn(headerMenu.key); setHeaderMenu(null); }} className="w-full text-left px-3 py-1.5 text-[0.75rem] text-[#1A1A1A] hover:bg-[#FAFBFC]">숨기기</button>
              {!isLocked && (
                <>
                  <div className="h-px bg-[#EEE] my-1" />
                  <button onClick={() => { deleteColumn(headerMenu.key); setHeaderMenu(null); }} className="w-full text-left px-3 py-1.5 text-[0.75rem] text-[#C92A2A] hover:bg-[#FEF2F2]">삭제</button>
                </>
              )}
            </div>
          </>
        );
      })()}

      {/* Column Filter Popover */}
      {filterPopover && (() => {
        const opts = uniqueValues(customerDeals, filterPopover.key);
        const colFilter = getColFilter(filterPopover.key);
        const selected = new Set(colFilter?.value ? colFilter.value.split(",").map((s) => s.trim()).filter(Boolean) : []);
        const colDef = mergedColumns.find((c) => c.key === filterPopover.key);
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setFilterPopover(null)} />
            <div
              className="fixed z-50 bg-white rounded-xl border shadow-lg py-2 min-w-[200px] max-w-[280px]"
              style={{ top: filterPopover.top, left: filterPopover.left, borderColor: T.border, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
            >
              <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: T.border }}>
                <span className="text-[0.7rem] text-[#666] font-medium">{colDef?.label} 필터</span>
                {selected.size > 0 && (
                  <button
                    onClick={() => { clearColFilter(filterPopover.key); }}
                    className="text-[0.65rem] text-[#999] hover:text-[#666] transition-colors"
                  >
                    초기화
                  </button>
                )}
              </div>
              <div className="max-h-[260px] overflow-y-auto py-1">
                {opts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[0.7rem] text-[#BBB]">값 없음</div>
                ) : (
                  opts.map((opt) => {
                    const isSel = selected.has(opt);
                    return (
                      <label
                        key={opt}
                        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#F7F8FA] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleColFilterValue(filterPopover.key, opt)}
                          className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#1A472A] focus:ring-[#1A472A] cursor-pointer"
                        />
                        <span className={`text-[0.75rem] truncate ${isSel ? "text-[#1A472A]" : "text-[#1A1A1A]"}`}>{opt}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* Add Deal Modal */}
      {showAddDeal && (
        <AddDealModal
          onClose={() => setShowAddDeal(false)}
          onAdd={addDeal}
          visibleColumns={visibleColumns}
          stageNames={pipelineStages.map((s) => s.name)}
          customFields={customFields}
        />
      )}

      {/* Custom KPI Modal */}
      {showCustomKpiModal && (
        <CustomKpiModal
          onAdd={(kpi) => setCustomKpis((prev) => [...prev, kpi])}
          onClose={() => setShowCustomKpiModal(false)}
        />
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <GoalModal
          onAdd={(goal) => setGoals((prev) => [...prev, goal])}
          onClose={() => setShowGoalModal(false)}
        />
      )}

      {/* Add View Modal */}
      {showAddView && (
        <AddViewModal
          onAdd={addView}
          onClose={() => setShowAddView(false)}
          buildSnapshot={buildViewSnapshot}
        />
      )}

      {/* View Delete Confirmation */}
      {confirmDeleteViewId && (() => {
        const viewToDelete = savedViews.find((v) => v.id === confirmDeleteViewId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.2)" }} onClick={() => setConfirmDeleteViewId(null)}>
            <div className="bg-white rounded-xl border p-6 w-[300px]" style={{ borderColor: T.border, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
              <p className="text-[0.95rem] text-[#1A1A1A] mb-1">뷰 삭제</p>
              <p className="text-[0.8rem] text-[#999] mb-5">"{viewToDelete?.name}" 뷰를 삭제할까요?</p>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setConfirmDeleteViewId(null)} className="px-4 py-2 rounded-lg text-[0.75rem] text-[#666] border hover:bg-[#F7F8FA] transition-colors" style={{ borderColor: T.border }}>취소</button>
                <button onClick={confirmRemoveView} className="px-4 py-2 rounded-lg text-[0.75rem] text-white transition-colors" style={{ background: T.danger }}>삭제</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const VALID_VIEW_TYPES: ViewType[] = ["table", "card", "relation"];

export function CustomerPage() {
  const { pageId, viewType } = useParams<{ pageId: string; viewType?: string }>();
  const resolvedViewType: ViewType = VALID_VIEW_TYPES.includes(viewType as ViewType)
    ? (viewType as ViewType)
    : "table";
  return <DealflowPageInner key={pageId} urlViewType={resolvedViewType} />;
}