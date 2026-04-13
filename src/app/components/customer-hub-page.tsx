import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Settings2,
  X,
  Mail,
  Phone,
  MapPin,
  Clock,
  Download,
  Send,
  Trash2,
  LayoutGrid,
  Rows3,
  RefreshCw,
  Repeat,
  ChevronDown,
} from "lucide-react";

interface LifecycleStage {
  id: string;
  name: string;
  color: string;
  type: string;
}

interface Customer {
  id: string;
  name: string;
  avatar: string;
  title: string;
  company: string;
  status: string;
  email: string;
  phone: string;
  location: string;
  lifecycleStageId: string | null;
  lifecycleStage: LifecycleStage | null;
  healthScore: number | null;
  purchaseCount: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  totalRevenue: number;
  customFieldValues: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceSettings {
  autoConvertWonToCustomer: boolean;
}

interface SavedView {
  id: string;
  scope: string;
  name: string;
  viewType: string;
  filters: string;
  searchQuery: string;
}

interface CustomerFilters {
  stageIds: string[];
  purchaseMin: string;
  purchaseMax: string;
  revenueMin: string;
  revenueMax: string;
  healthMin: string;
  healthMax: string;
}

interface CustomerField {
  id: string;
  key: string;
  label: string;
  type: string;
  visible: boolean;
  locked: boolean;
  sortOrder: number;
}

const BUILTIN_FIELD_KEYS = new Set([
  "name", "company", "title", "email", "phone", "location",
  "lifecycleStage", "healthScore", "purchaseCount", "lastPurchaseAt", "totalRevenue",
]);

const PAGE_TITLES: Record<string, string> = {
  all: "전체 고객",
  returning: "재구매 고객",
  churnrisk: "이탈 위험",
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatWon(amountMan: number): string {
  if (amountMan >= 10000) return `₩${(amountMan / 10000).toFixed(1)}억`;
  if (amountMan >= 100) return `₩${(amountMan / 100).toFixed(1)}천만`;
  return `₩${amountMan.toLocaleString()}만`;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("dangol_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CustomerHubPage() {
  const { pageId = "all", viewType = "table" } = useParams();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [stages, setStages] = useState<LifecycleStage[]>([]);
  const [stageFilter, setStageFilter] = useState<string>("");
  const [customFields, setCustomFields] = useState<CustomerField[]>([]);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState<CustomerFilters>({
    stageIds: [],
    purchaseMin: "",
    purchaseMax: "",
    revenueMin: "",
    revenueMax: "",
    healthMin: "",
    healthMax: "",
  });

  const deleteCustomer = async (c: Customer) => {
    if (!confirm(`'${c.name}' 고객을 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/customers/${c.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      alert("삭제 실패");
      return;
    }
    setSelectedId((prev) => (prev === c.id ? null : prev));
    setSelectedIds((prev) => {
      if (!prev.has(c.id)) return prev;
      const next = new Set(prev);
      next.delete(c.id);
      return next;
    });
    loadCustomers();
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택된 ${selectedIds.size}명의 고객을 삭제하시겠습니까?`)) return;
    const ids = Array.from(selectedIds);
    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/customers/${id}`, { method: "DELETE", headers: { ...authHeaders() } }),
      ),
    );
    const failed = results.filter((r) => !r.ok).length;
    if (failed > 0) alert(`${failed}건 삭제 실패`);
    setSelectedIds(new Set());
    setSelectedId(null);
    loadCustomers();
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers?limit=100", {
        headers: { ...authHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/workspace-settings", {
        headers: { ...authHeaders() },
      });
      if (res.ok) setSettings(await res.json());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadCustomers();
    loadSettings();
    fetch("/api/customer-lifecycle-stages", { headers: { ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setStages)
      .catch(() => {});
    fetch("/api/customer-custom-fields", { headers: { ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomFields)
      .catch(() => {});
    loadViews();
  }, []);

  const loadViews = () => {
    fetch("/api/views?scope=customer", { headers: { ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setViews)
      .catch(() => {});
  };

  const applyView = (v: SavedView) => {
    setActiveViewId(v.id);
    setViewMenuOpen(false);
    try {
      const parsed = JSON.parse(v.filters || "{}");
      if (parsed && typeof parsed === "object") {
        setFilters({
          stageIds: Array.isArray(parsed.stageIds) ? parsed.stageIds : [],
          purchaseMin: parsed.purchaseMin ?? "",
          purchaseMax: parsed.purchaseMax ?? "",
          revenueMin: parsed.revenueMin ?? "",
          revenueMax: parsed.revenueMax ?? "",
          healthMin: parsed.healthMin ?? "",
          healthMax: parsed.healthMax ?? "",
        });
      }
    } catch {}
    setSearch(v.searchQuery || "");
    if (v.viewType && v.viewType !== viewType) {
      navigate(`/customers/${pageId}/${v.viewType}`);
    }
  };

  const saveCurrentAsView = async () => {
    const name = prompt("뷰 이름");
    if (!name) return;
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        scope: "customer",
        name,
        viewType,
        filters,
        searchQuery: search,
      }),
    });
    if (!res.ok) {
      alert("뷰 저장 실패");
      return;
    }
    const created: SavedView = await res.json();
    setViews((prev) => [...prev, created]);
    setActiveViewId(created.id);
    setViewMenuOpen(false);
  };

  const deleteView = async (id: string) => {
    if (!confirm("이 뷰를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/views/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) return;
    setViews((prev) => prev.filter((v) => v.id !== id));
    if (activeViewId === id) setActiveViewId(null);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setSettingsMenuOpen(false);
      }
    };
    if (settingsMenuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [settingsMenuOpen]);

  const toggleAutoConvert = async () => {
    if (!settings) return;
    const next = !settings.autoConvertWonToCustomer;
    setSettings({ ...settings, autoConvertWonToCustomer: next });
    try {
      await fetch("/api/workspace-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ autoConvertWonToCustomer: next }),
      });
    } catch {
      setSettings({ ...settings, autoConvertWonToCustomer: !next });
    }
  };

  const filtered = useMemo(() => {
    let list = customers;
    if (pageId === "returning") list = list.filter((c) => c.purchaseCount > 1);
    if (pageId === "churnrisk")
      list = list.filter((c) => (c.healthScore ?? 100) < 40);
    if (stageFilter) list = list.filter((c) => c.lifecycleStageId === stageFilter);
    if (filters.stageIds.length > 0)
      list = list.filter((c) => c.lifecycleStageId && filters.stageIds.includes(c.lifecycleStageId));
    const pMin = filters.purchaseMin === "" ? null : Number(filters.purchaseMin);
    const pMax = filters.purchaseMax === "" ? null : Number(filters.purchaseMax);
    if (pMin !== null) list = list.filter((c) => c.purchaseCount >= pMin);
    if (pMax !== null) list = list.filter((c) => c.purchaseCount <= pMax);
    const rMin = filters.revenueMin === "" ? null : Number(filters.revenueMin);
    const rMax = filters.revenueMax === "" ? null : Number(filters.revenueMax);
    if (rMin !== null) list = list.filter((c) => c.totalRevenue >= rMin);
    if (rMax !== null) list = list.filter((c) => c.totalRevenue <= rMax);
    const hMin = filters.healthMin === "" ? null : Number(filters.healthMin);
    const hMax = filters.healthMax === "" ? null : Number(filters.healthMax);
    if (hMin !== null) list = list.filter((c) => (c.healthScore ?? 0) >= hMin);
    if (hMax !== null) list = list.filter((c) => (c.healthScore ?? 100) <= hMax);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, pageId, search, stageFilter, filters]);

  const activeFilterCount =
    filters.stageIds.length +
    (filters.purchaseMin !== "" || filters.purchaseMax !== "" ? 1 : 0) +
    (filters.revenueMin !== "" || filters.revenueMax !== "" ? 1 : 0) +
    (filters.healthMin !== "" || filters.healthMax !== "" ? 1 : 0);

  const resetFilters = () =>
    setFilters({
      stageIds: [],
      purchaseMin: "",
      purchaseMax: "",
      revenueMin: "",
      revenueMax: "",
      healthMin: "",
      healthMax: "",
    });

  const extraFields = customFields.filter(
    (f) => f.visible && !BUILTIN_FIELD_KEYS.has(f.key)
  );

  const renderCustomValue = (c: Customer, key: string): string => {
    try {
      const obj = JSON.parse(c.customFieldValues || "{}") as Record<string, unknown>;
      const v = obj[key];
      if (v === null || v === undefined || v === "") return "-";
      if (Array.isArray(v)) return v.join(", ");
      return String(v);
    } catch {
      return "-";
    }
  };

  const selectedCustomer = filtered.find((c) => c.id === selectedId) || null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full">
      {filterOpen && (
        <CustomerFilterSidebar
          stages={stages}
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          onClose={() => setFilterOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-white border-b border-[#E0E3E8]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[#1A1A1A] text-[27px]">
                {PAGE_TITLES[pageId] || "고객"}
              </h1>
              <p className="text-[#999] text-[0.9rem]">
                {filtered.length}명 · 영업 성사 시 자동 등록 {settings?.autoConvertWonToCustomer ? "ON" : "OFF"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-convert toggle */}
              <button
                onClick={toggleAutoConvert}
                disabled={!settings}
                className="flex items-center gap-2 px-3 py-2 border border-[#E0E3E8] rounded-md hover:bg-[#F7F8FA] transition-colors text-[0.9rem] text-[#444]"
              >
                <RefreshCw size={11} className={settings?.autoConvertWonToCustomer ? "text-[#2CBF60]" : "text-[#999]"} />
                <span>영업 성사 자동 등록</span>
                <span
                  className={`inline-block w-7 h-4 rounded-full relative transition-colors ${
                    settings?.autoConvertWonToCustomer ? "bg-[#2CBF60]" : "bg-[#D1D5DB]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                      settings?.autoConvertWonToCustomer ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
              <div className="relative" ref={settingsMenuRef}>
                <button
                  onClick={() => setSettingsMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 border border-[#E0E3E8] text-[#666] rounded-md hover:bg-[#F7F8FA] transition-colors text-[0.9rem]"
                >
                  <Settings2 size={11} />
                  설정
                  <ChevronDown size={11} />
                </button>
                {settingsMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl border border-[#E0E3E8] py-1.5 min-w-[200px] shadow-lg">
                    <button
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        navigate("/settings/customer-fields");
                      }}
                      className="w-full text-left px-4 py-2 text-[0.85rem] text-[#333] hover:bg-[#F7F8FA]"
                    >
                      고객 필드 설정
                    </button>
                    <button
                      onClick={() => {
                        setSettingsMenuOpen(false);
                        navigate("/settings/customer-lifecycle");
                      }}
                      className="w-full text-left px-4 py-2 text-[0.85rem] text-[#333] hover:bg-[#F7F8FA]"
                    >
                      라이프사이클 설정
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1A472A] text-white rounded-md hover:bg-[#133D22] transition-colors text-[0.9rem]"
              >
                <Plus size={11} />
                고객 추가
              </button>
            </div>
          </div>

          {/* Page tabs */}
          <div className="flex items-center gap-5 mb-4">
            {["all", "returning", "churnrisk"].map((tab) => (
              <button
                key={tab}
                onClick={() => navigate(`/customers/${tab}/${viewType}`)}
                className={`pb-2 text-[0.9rem] border-b-2 transition-colors ${
                  pageId === tab
                    ? "text-[#1A472A] border-[#1A472A]"
                    : "text-[#999] border-transparent hover:text-[#444]"
                }`}
              >
                {PAGE_TITLES[tab]}
              </button>
            ))}
          </div>

          {/* Search / filter / view */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="고객 검색..."
                className="w-full bg-[#F7F8FA] border border-[#E0E3E8] rounded-md pl-9 pr-4 py-2 text-[0.9rem] text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:border-[#1A472A] transition-colors"
              />
            </div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-3 py-2 border border-[#E0E3E8] text-[#666] rounded-md hover:bg-[#F7F8FA] text-[0.9rem] bg-white"
            >
              <option value="">전체 라이프사이클</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="relative" ref={viewMenuRef}>
              <button
                onClick={() => setViewMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 border border-[#E0E3E8] text-[#666] rounded-md hover:bg-[#F7F8FA] transition-colors text-[0.9rem]"
              >
                {activeViewId
                  ? views.find((v) => v.id === activeViewId)?.name || "뷰"
                  : "뷰"}
                <ChevronDown size={11} />
              </button>
              {viewMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E0E3E8] rounded-md shadow-lg z-20 py-1">
                  {views.length === 0 ? (
                    <p className="px-3 py-2 text-[0.8rem] text-[#999]">저장된 뷰 없음</p>
                  ) : (
                    views.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-[#F7F8FA] group"
                      >
                        <button
                          onClick={() => applyView(v)}
                          className={`flex-1 text-left text-[0.85rem] ${
                            activeViewId === v.id ? "text-[#1A472A]" : "text-[#333]"
                          }`}
                        >
                          {v.name}
                        </button>
                        <button
                          onClick={() => deleteView(v.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#FEF2F2]"
                        >
                          <Trash2 size={11} className="text-[#E8453A]" />
                        </button>
                      </div>
                    ))
                  )}
                  <div className="border-t border-[#F0F1F3] mt-1 pt-1">
                    <button
                      onClick={saveCurrentAsView}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-[0.85rem] text-[#1A472A] hover:bg-[#EFF5F1]"
                    >
                      <Plus size={11} /> 현재 필터 저장
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-md transition-colors text-[0.9rem] ${
                activeFilterCount > 0 || filterOpen
                  ? "bg-[#EFF5F1] border-[#1A472A] text-[#1A472A]"
                  : "border-[#E0E3E8] text-[#666] hover:bg-[#F7F8FA]"
              }`}
            >
              <SlidersHorizontal size={11} />
              필터
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-[#1A472A] text-white rounded-full text-[0.65rem]">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="flex items-center border border-[#E0E3E8] rounded-md overflow-hidden">
              {([
                { key: "table", icon: Rows3 },
                { key: "card", icon: LayoutGrid },
              ] as const).map((v) => (
                <button
                  key={v.key}
                  onClick={() => navigate(`/customers/${pageId}/${v.key}`)}
                  className={`px-2.5 py-2 transition-colors ${
                    viewType === v.key ? "bg-[#EFF5F1] text-[#1A472A]" : "text-[#666] hover:bg-[#F7F8FA]"
                  }`}
                  title={v.key}
                >
                  <v.icon size={12} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="py-20 text-center text-[#999]">로딩 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-[#999]">표시할 고객이 없습니다</div>
          ) : viewType === "card" ? (
            <div className="grid grid-cols-3 gap-4 p-6">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`text-left bg-white border rounded-lg p-4 transition-colors ${
                    selectedId === c.id ? "border-[#1A472A] bg-[#EFF5F1]" : "border-[#E0E3E8] hover:border-[#1A472A]"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#EFF5F1] text-[#1A472A] flex items-center justify-center text-[0.9rem]">
                        {c.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[#1A1A1A] truncate">{c.name}</p>
                      <p className="text-[#999] text-[0.8rem] truncate">{c.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[0.8rem] text-[#666] mb-1">
                    <Repeat size={10} />
                    구매 {c.purchaseCount}회
                    <span className="text-[#999]">· {formatWon(c.totalRevenue)}</span>
                  </div>
                  {c.lifecycleStage && (
                    <span
                      className="inline-block text-[0.7rem] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${c.lifecycleStage.color}20`, color: c.lifecycleStage.color }}
                    >
                      {c.lifecycleStage.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E0E3E8] bg-[#F7F8FA]">
                  <th className="w-10 py-2.5 px-4">
                    <input type="checkbox" className="accent-[#1A472A]" />
                  </th>
                  {["이름", "회사", "라이프사이클", "구매", "누적매출", "최근구매"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-2.5 px-4 text-[#999] text-[0.8rem] tracking-wider uppercase"
                    >
                      {h}
                    </th>
                  ))}
                  {extraFields.map((f) => (
                    <th
                      key={f.id}
                      className="text-left py-2.5 px-4 text-[#999] text-[0.8rem] tracking-wider uppercase"
                    >
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`border-b border-[#F0F1F3] cursor-pointer transition-colors ${
                      selectedId === c.id ? "bg-[#EFF5F1]" : "hover:bg-[#FAFBFC]"
                    }`}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="accent-[#1A472A]"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#EFF5F1] text-[#1A472A] flex items-center justify-center text-[0.75rem]">
                            {c.name.slice(0, 1)}
                          </div>
                        )}
                        <span className="text-[#1A1A1A] text-[0.9rem]">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#666] text-[0.9rem]">{c.company}</td>
                    <td className="py-3 px-4">
                      {c.lifecycleStage ? (
                        <span
                          className="text-[0.75rem] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${c.lifecycleStage.color}20`, color: c.lifecycleStage.color }}
                        >
                          {c.lifecycleStage.name}
                        </span>
                      ) : (
                        <span className="text-[#BBB] text-[0.8rem]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#666] text-[0.9rem]">{c.purchaseCount}회</td>
                    <td className="py-3 px-4 text-[#1A1A1A] text-[0.9rem]">{formatWon(c.totalRevenue)}</td>
                    <td className="py-3 px-4 text-[#999] text-[0.9rem]">{formatDate(c.lastPurchaseAt)}</td>
                    {extraFields.map((f) => (
                      <td key={f.id} className="py-3 px-4 text-[#666] text-[0.9rem]">
                        {renderCustomValue(c, f.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="px-6 py-3 bg-white border-t border-[#E0E3E8] flex items-center gap-3">
            <span className="text-[#666] text-[0.85rem] mr-2">{selectedIds.size}건 선택됨</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md text-[0.85rem] text-[#666] hover:bg-[#F7F8FA] transition-colors">
              <Download size={10} /> CSV 내보내기
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md text-[0.85rem] text-[#1A472A] hover:bg-[#EFF5F1] transition-colors">
              <Send size={10} /> 일괄 이메일
            </button>
            <button
              onClick={bulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E0E3E8] rounded-md text-[0.85rem] text-[#E8453A] hover:bg-[#FEF2F2] transition-colors"
            >
              <Trash2 size={10} /> 삭제
            </button>
          </div>
        )}
      </div>

      {/* Right detail panel */}
      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          onClose={() => setSelectedId(null)}
          onEdit={(c) => setEditCustomer(c)}
          onDelete={deleteCustomer}
        />
      )}

      {addOpen && (
        <CustomerFormModal
          stages={stages}
          customFields={customFields.filter((f) => f.visible && !BUILTIN_FIELD_KEYS.has(f.key))}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            loadCustomers();
          }}
        />
      )}

      {editCustomer && (
        <CustomerFormModal
          stages={stages}
          customFields={customFields.filter((f) => f.visible && !BUILTIN_FIELD_KEYS.has(f.key))}
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={() => {
            setEditCustomer(null);
            loadCustomers();
          }}
        />
      )}
    </div>
  );
}

function CustomerFormModal({
  stages,
  customFields,
  customer,
  onClose,
  onSaved,
}: {
  stages: LifecycleStage[];
  customFields: CustomerField[];
  customer?: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    name: customer?.name || "",
    company: customer?.company || "",
    title: customer?.title || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    location: customer?.location || "",
    lifecycleStageId: customer?.lifecycleStageId || "",
  });
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    if (!customer?.customFieldValues) return {};
    try {
      const parsed = JSON.parse(customer.customFieldValues);
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        out[k] = v == null ? "" : String(v);
      }
      return out;
    } catch {
      return {};
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) {
      setError("이름은 필수입니다");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/customers/${customer!.id}` : "/api/customers";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          ...form,
          lifecycleStageId: form.lifecycleStageId || null,
          customFieldValues: customValues,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || (isEdit ? "수정 실패" : "고객 생성 실패"));
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("네트워크 오류");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E3E8]">
          <h2 className="text-[1.1rem] text-[#1A1A1A]">{isEdit ? "고객 수정" : "고객 추가"}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F7F8FA]">
            <X size={14} className="text-[#666]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <Field label="이름 *">
            <input
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E3E8] rounded-md text-[0.9rem] focus:outline-none focus:border-[#1A472A]"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="회사">
              <input
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E3E8] rounded-md text-[0.9rem] focus:outline-none focus:border-[#1A472A]"
              />
            </Field>
            <Field label="직책">
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E3E8] rounded-md text-[0.9rem] focus:outline-none focus:border-[#1A472A]"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="이메일">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E3E8] rounded-md text-[0.9rem] focus:outline-none focus:border-[#1A472A]"
              />
            </Field>
            <Field label="전화번호">
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full px-3 py-2 border border-[#E0E3E8] rounded-md text-[0.9rem] focus:outline-none focus:border-[#1A472A]"
              />
            </Field>
          </div>
          <Field label="지역">
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E3E8] rounded-md text-[0.9rem] focus:outline-none focus:border-[#1A472A]"
            />
          </Field>
          <Field label="라이프사이클 단계">
            <select
              value={form.lifecycleStageId}
              onChange={(e) => set("lifecycleStageId", e.target.value)}
              className="w-full px-3 py-2 border border-[#E0E3E8] rounded-md text-[0.9rem] bg-white focus:outline-none focus:border-[#1A472A]"
            >
              <option value="">선택 안 함</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          {customFields.length > 0 && (
            <div className="pt-3 border-t border-[#F0F1F3] space-y-3">
              <p className="text-[0.75rem] tracking-wider text-[#999] uppercase">커스텀 필드</p>
              {customFields.map((f) => (
                <Field key={f.id} label={f.label}>
                  <input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={customValues[f.key] || ""}
                    onChange={(e) =>
                      setCustomValues((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[#E0E3E8] rounded-md text-[0.9rem] focus:outline-none focus:border-[#1A472A]"
                  />
                </Field>
              ))}
            </div>
          )}

          {error && <p className="text-[#E8453A] text-[0.85rem]">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E0E3E8] bg-[#FAFBFC] rounded-b-xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-[#E0E3E8] rounded-md text-[0.85rem] text-[#666] hover:bg-white"
          >
            취소
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2 bg-[#1A472A] text-white rounded-md text-[0.85rem] hover:bg-[#133D22] disabled:opacity-50"
          >
            {saving ? "저장 중..." : isEdit ? "저장" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[0.75rem] text-[#666] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

interface Contract {
  id: string;
  service: string;
  quantity: number;
  amount: number;
  startDate: string;
  endDate: string | null;
  renewalStatus: string;
}

interface SourceDeal {
  id: string;
  company: string;
  amount: number;
  date: string;
  stage: { name: string; color: string } | null;
}

interface CustomerDetail extends Customer {
  contracts: Contract[];
  sourceDeals: SourceDeal[];
  activityLogs: { id: string; title: string; type: string; createdAt: string; user?: { name: string } }[];
}

function CustomerDetailPanel({
  customer,
  onClose,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  onClose: () => void;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    setDetail(null);
    fetch(`/api/customers/${customer.id}`, { headers: { ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setDetail(data))
      .catch(() => setDetail(null));
  }, [customer.id]);

  return (
    <div className="w-[320px] min-w-[320px] border-l border-[#E0E3E8] bg-white overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#1A1A1A] text-[1.1rem]">고객 상세</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(customer)}
              className="px-2 py-1 rounded hover:bg-[#F7F8FA] text-[0.75rem] text-[#1A472A]"
              title="수정"
            >
              수정
            </button>
            <button
              onClick={() => onDelete(customer)}
              className="p-1.5 rounded hover:bg-[#FEF2F2]"
              title="삭제"
            >
              <Trash2 size={11} className="text-[#E8453A]" />
            </button>
            <button onClick={onClose} className="p-1.5 text-[#999] hover:text-[#444]">
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#F0F1F3]">
          {customer.avatar ? (
            <img src={customer.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#EFF5F1] text-[#1A472A] flex items-center justify-center">
              {customer.name.slice(0, 1)}
            </div>
          )}
          <div>
            <p className="text-[#1A1A1A] text-[1.1rem]">{customer.name}</p>
            <p className="text-[#999] text-[0.85rem]">{customer.company}</p>
          </div>
        </div>

        {/* Purchase summary */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <div className="p-3 bg-[#F7F8FA] rounded-md">
            <p className="text-[#999] text-[0.7rem] mb-1">구매 횟수</p>
            <p className="text-[#1A1A1A] text-[1rem]">{customer.purchaseCount}회</p>
          </div>
          <div className="p-3 bg-[#F7F8FA] rounded-md">
            <p className="text-[#999] text-[0.7rem] mb-1">누적 매출</p>
            <p className="text-[#1A1A1A] text-[1rem]">{formatWon(customer.totalRevenue)}</p>
          </div>
          <div className="p-3 bg-[#F7F8FA] rounded-md">
            <p className="text-[#999] text-[0.7rem] mb-1">첫 구매</p>
            <p className="text-[#1A1A1A] text-[0.85rem]">{formatDate(customer.firstPurchaseAt)}</p>
          </div>
          <div className="p-3 bg-[#F7F8FA] rounded-md">
            <p className="text-[#999] text-[0.7rem] mb-1">최근 구매</p>
            <p className="text-[#1A1A1A] text-[0.85rem]">{formatDate(customer.lastPurchaseAt)}</p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {customer.email && (
            <div className="flex items-center gap-2.5 p-2.5 bg-[#F7F8FA] rounded-md">
              <Mail size={11} className="text-[#1A472A] shrink-0" />
              <span className="text-[#444] text-[0.85rem] truncate">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2.5 p-2.5 bg-[#F7F8FA] rounded-md">
              <Phone size={11} className="text-[#2CBF60] shrink-0" />
              <span className="text-[#444] text-[0.85rem] truncate">{customer.phone}</span>
            </div>
          )}
          {customer.location && (
            <div className="flex items-center gap-2.5 p-2.5 bg-[#F7F8FA] rounded-md">
              <MapPin size={11} className="text-[#FFA726] shrink-0" />
              <span className="text-[#444] text-[0.85rem] truncate">{customer.location}</span>
            </div>
          )}
        </div>

        {/* Purchase history */}
        <div className="mb-5">
          <h4 className="text-[#999] text-[0.75rem] tracking-wider uppercase mb-3">구매 이력</h4>
          {!detail ? (
            <p className="text-[#999] text-[0.8rem]">로딩 중...</p>
          ) : detail.contracts.length === 0 ? (
            <p className="text-[#999] text-[0.8rem]">구매 기록 없음</p>
          ) : (
            <div className="space-y-2">
              {detail.contracts.map((c) => (
                <div key={c.id} className="p-3 border border-[#E0E3E8] rounded-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#1A1A1A] text-[0.85rem]">{c.service || "서비스"}</span>
                    <span className="text-[#1A472A] text-[0.85rem]">{formatWon(c.amount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[0.75rem] text-[#999]">
                    <Clock size={9} /> {formatDate(c.startDate)}
                    {c.quantity > 0 && <span>· {c.quantity}개</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source deals */}
        {detail && detail.sourceDeals.length > 0 && (
          <div className="mb-5">
            <h4 className="text-[#999] text-[0.75rem] tracking-wider uppercase mb-3">원천 영업 건</h4>
            <div className="space-y-0">
              {detail.sourceDeals.map((d, i) => (
                <div key={d.id} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5"
                      style={{ backgroundColor: d.stage?.color || "#1A472A" }}
                    />
                    {i < detail.sourceDeals.length - 1 && (
                      <div className="w-px flex-1 bg-[#E0E3E8] my-1" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-[#1A1A1A] text-[0.85rem]">
                      {d.stage?.name || "영업"} · {formatWon(d.amount)}
                    </p>
                    <p className="text-[#999] text-[0.75rem]">{formatDate(d.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerFilterSidebar({
  stages,
  filters,
  onChange,
  onReset,
  onClose,
}: {
  stages: LifecycleStage[];
  filters: CustomerFilters;
  onChange: (f: CustomerFilters) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const toggleStage = (id: string) => {
    const next = filters.stageIds.includes(id)
      ? filters.stageIds.filter((x) => x !== id)
      : [...filters.stageIds, id];
    onChange({ ...filters, stageIds: next });
  };
  const setField = (key: keyof CustomerFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="w-[280px] min-w-[280px] border-r border-[#E0E3E8] bg-white overflow-y-auto">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#1A1A1A] text-[1rem]">고급 필터</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={onReset}
              className="px-2 py-1 rounded text-[0.75rem] text-[#999] hover:bg-[#F7F8FA]"
            >
              초기화
            </button>
            <button onClick={onClose} className="p-1.5 text-[#999] hover:text-[#444]">
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-[0.75rem] text-[#666] mb-2">라이프사이클 단계</p>
            {stages.length === 0 ? (
              <p className="text-[0.8rem] text-[#BBB]">단계 없음</p>
            ) : (
              <div className="space-y-1.5">
                {stages.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F7F8FA] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.stageIds.includes(s.id)}
                      onChange={() => toggleStage(s.id)}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[0.85rem] text-[#1A1A1A]">{s.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <RangeField
            label="구매 횟수"
            min={filters.purchaseMin}
            max={filters.purchaseMax}
            onMin={(v) => setField("purchaseMin", v)}
            onMax={(v) => setField("purchaseMax", v)}
          />
          <RangeField
            label="누적 매출 (만원)"
            min={filters.revenueMin}
            max={filters.revenueMax}
            onMin={(v) => setField("revenueMin", v)}
            onMax={(v) => setField("revenueMax", v)}
          />
          <RangeField
            label="헬스 스코어 (0-100)"
            min={filters.healthMin}
            max={filters.healthMax}
            onMin={(v) => setField("healthMin", v)}
            onMax={(v) => setField("healthMax", v)}
          />
        </div>
      </div>
    </div>
  );
}

function RangeField({
  label,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[0.75rem] text-[#666] mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={min}
          onChange={(e) => onMin(e.target.value)}
          placeholder="최소"
          className="flex-1 px-2.5 py-1.5 border border-[#E0E3E8] rounded-md text-[0.8rem] focus:outline-none focus:border-[#1A472A]"
        />
        <span className="text-[#BBB] text-[0.8rem]">-</span>
        <input
          type="number"
          value={max}
          onChange={(e) => onMax(e.target.value)}
          placeholder="최대"
          className="flex-1 px-2.5 py-1.5 border border-[#E0E3E8] rounded-md text-[0.8rem] focus:outline-none focus:border-[#1A472A]"
        />
      </div>
    </div>
  );
}
