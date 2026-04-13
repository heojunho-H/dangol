import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { GripVertical, Plus, Trash2, ChevronLeft, Settings } from "lucide-react";

const T = { primary: "#1A472A", danger: "#EF4444", border: "#E0E3E8" };

const STAGE_PALETTE = [
  "#3B82F6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#9CA3AF", "#1A472A", "#F97316",
];

interface Stage {
  id: string;
  name: string;
  color: string;
  type: "ACTIVE" | "CHURNED";
  sortOrder: number;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("dangol_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CustomerLifecycleSettingsPage() {
  const navigate = useNavigate();
  const [stages, setStages] = useState<Stage[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customer-lifecycle-stages", { headers: { ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setStages(data))
      .finally(() => setLoading(false));
  }, []);

  const update = (id: string, patch: Partial<Stage>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const remove = async (id: string) => {
    if (!confirm("이 스테이지를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/customer-lifecycle-stages/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "삭제 실패");
      return;
    }
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  const add = async () => {
    const used = new Set(stages.map((s) => s.color));
    const color = STAGE_PALETTE.find((c) => !used.has(c)) || STAGE_PALETTE[0];
    const res = await fetch("/api/customer-lifecycle-stages", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ name: "새 단계", color, type: "ACTIVE" }),
    });
    if (res.ok) {
      const created = await res.json();
      setStages((prev) => [...prev, created]);
    }
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setStages((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(idx, 0, item);
      return next;
    });
    setDragIdx(idx);
    setDirty(true);
  };

  const save = async () => {
    // Persist name/color/type changes per stage
    await Promise.all(
      stages.map((s) =>
        fetch(`/api/customer-lifecycle-stages/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name: s.name, color: s.color, type: s.type }),
        })
      )
    );
    // Reorder
    await fetch("/api/customer-lifecycle-stages/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ order: stages.map((s) => s.id) }),
    });
    setDirty(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA]">
      <div
        className="flex items-center justify-between px-8 py-4 bg-white border-b shrink-0"
        style={{ borderColor: T.border }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[#F7F8FA] transition-colors"
          >
            <ChevronLeft size={18} color="#666" />
          </button>
          <div>
            <p className="text-[0.7rem] text-[#BBB] mb-0.5">설정 &gt; 고객 라이프사이클</p>
            <div className="flex items-center gap-2">
              <Settings size={18} color={T.primary} />
              <h1 className="text-[1.3rem] text-[#1A1A1A] font-medium">고객 라이프사이클</h1>
            </div>
          </div>
        </div>
        <button
          onClick={save}
          disabled={!dirty}
          className="px-6 py-2.5 rounded-lg text-[0.8rem] text-white transition-colors disabled:opacity-50"
          style={{ background: T.primary }}
        >
          저장
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto py-8 px-6">
          <p className="text-[0.85rem] text-[#666] leading-relaxed mb-6">
            고객의 라이프사이클 단계를 비즈니스에 맞게 정의하세요. 드래그로 순서를 변경하고
            각 단계의 이름·색상·유형을 설정할 수 있습니다.
          </p>

          <div
            className="bg-white rounded-xl border p-6"
            style={{ borderColor: T.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[0.85rem] text-[#1A1A1A] font-medium">
                스테이지 목록
              </span>
              <span className="text-[0.75rem] text-[#999]">{stages.length}개</span>
            </div>

            {loading ? (
              <p className="text-[#999] text-[0.85rem] py-8 text-center">로딩 중...</p>
            ) : (
              <div className="space-y-2">
                {stages.map((s, idx) => (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={() => setDragIdx(null)}
                    className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
                    style={{
                      borderColor: dragIdx === idx ? T.primary : T.border,
                      background: dragIdx === idx ? "#F0F7F2" : "#fff",
                      cursor: "grab",
                    }}
                  >
                    <GripVertical size={14} className="text-[#CCC] shrink-0" />
                    <div className="relative shrink-0">
                      <input
                        type="color"
                        value={s.color}
                        onChange={(e) => update(s.id, { color: e.target.value })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ background: s.color }}
                      />
                    </div>
                    <input
                      className="flex-1 text-[0.85rem] text-[#1A1A1A] bg-transparent focus:outline-none focus:bg-[#F8F9FA] rounded px-2 py-1.5"
                      value={s.name}
                      onChange={(e) => update(s.id, { name: e.target.value })}
                    />
                    <select
                      className="text-[0.75rem] px-2.5 py-1.5 rounded-lg border bg-white text-[#666] cursor-pointer"
                      style={{ borderColor: T.border }}
                      value={s.type}
                      onChange={(e) =>
                        update(s.id, { type: e.target.value as Stage["type"] })
                      }
                    >
                      <option value="ACTIVE">활성</option>
                      <option value="CHURNED">이탈</option>
                    </select>
                    <button
                      onClick={() => remove(s.id)}
                      className="p-2 rounded-lg hover:bg-[#FEF2F2] transition-colors shrink-0"
                    >
                      <Trash2 size={13} color={T.danger} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={add}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed text-[0.85rem] text-[#999] hover:text-[#1A472A] hover:border-[#1A472A] hover:bg-[#FAFDFB] transition-all"
              style={{ borderColor: T.border }}
            >
              <Plus size={15} /> 스테이지 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
