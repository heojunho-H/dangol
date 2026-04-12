import { useState } from "react";
import { useNavigate } from "react-router";
import {
  GripVertical,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  Settings,
} from "lucide-react";

/* ─── Theme (shared with dealflow) ─── */
const T = {
  primary: "#1A472A",
  danger: "#EF4444",
  border: "#E0E3E8",
};

/* ─── Types ─── */
interface PipelineStage {
  id: string;
  name: string;
  color: string;
  type: "active" | "won" | "lost";
}

const STAGE_PALETTE = [
  "#3B82F6", "#06B6D4", "#8B5CF6", "#6366F1", "#F59E0B",
  "#F97316", "#10B981", "#EF4444", "#EC4899", "#14B8A6",
  "#84CC16", "#A855F7", "#F43F5E", "#0EA5E9", "#D946EF",
];

const DEFAULT_STAGES: PipelineStage[] = [
  { id: "s1", name: "신규",        color: "#3B82F6", type: "active" },
  { id: "s2", name: "유선상담",     color: "#06B6D4", type: "active" },
  { id: "s3", name: "견적서 발송",  color: "#8B5CF6", type: "active" },
  { id: "s4", name: "유선견적상담", color: "#6366F1", type: "active" },
  { id: "s5", name: "가격조율",     color: "#F59E0B", type: "active" },
  { id: "s6", name: "일정조율",     color: "#F97316", type: "active" },
  { id: "s7", name: "수주확정",     color: "#10B981", type: "won" },
];

/* ─── Page Component ─── */
export function PipelineSettingsPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<PipelineStage[]>(() =>
    DEFAULT_STAGES.map((s) => ({ ...s }))
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const updateStage = (id: string, patch: Partial<PipelineStage>) => {
    setDraft((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setHasChanges(true);
  };

  const removeStage = (id: string) => {
    setDraft((prev) => prev.filter((s) => s.id !== id));
    setHasChanges(true);
  };

  const addStage = () => {
    const id = `s-${Date.now()}`;
    const usedColors = new Set(draft.map((s) => s.color));
    const nextColor = STAGE_PALETTE.find((c) => !usedColors.has(c)) || STAGE_PALETTE[0];
    setDraft((prev) => [...prev, { id, name: "새 단계", color: nextColor, type: "active" }]);
    setHasChanges(true);
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
    setHasChanges(true);
  };
  const handleDragEnd = () => setDragIdx(null);

  const handleSave = () => {
    // TODO: API 연동 시 서버로 저장
    setHasChanges(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b shrink-0" style={{ borderColor: T.border }}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[#F7F8FA] transition-colors"
            title="뒤로 가기"
          >
            <ChevronLeft size={18} color="#666" />
          </button>
          <div>
            <p className="text-[0.7rem] text-[#BBB] mb-0.5">설정 &gt; 파이프라인</p>
            <div className="flex items-center gap-2">
              <Settings size={18} color={T.primary} />
              <h1 className="text-[1.3rem] text-[#1A1A1A] font-medium">파이프라인 설정</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-lg text-[0.8rem] text-[#666] border hover:bg-[#F7F8FA] transition-colors"
            style={{ borderColor: T.border }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="px-6 py-2.5 rounded-lg text-[0.8rem] text-white transition-colors disabled:opacity-50"
            style={{ background: T.primary }}
          >
            저장
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto py-8 px-6">
          {/* Description */}
          <div className="mb-6">
            <p className="text-[0.85rem] text-[#666] leading-relaxed">
              영업 프로세스에 맞게 파이프라인 단계를 구성하세요.
              드래그하여 순서를 변경하고, 각 단계의 이름과 색상, 유형을 설정할 수 있습니다.
            </p>
          </div>

          {/* Stage List */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[0.85rem] text-[#1A1A1A] font-medium">스테이지 목록</span>
              <span className="text-[0.75rem] text-[#999]">{draft.length}개</span>
            </div>

            <div className="space-y-2">
              {draft.map((stage, idx) => (
                <div
                  key={stage.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-3 p-3.5 rounded-xl border transition-all"
                  style={{
                    borderColor: dragIdx === idx ? T.primary : T.border,
                    background: dragIdx === idx ? "#F0F7F2" : "#fff",
                    cursor: "grab",
                  }}
                >
                  <GripVertical size={14} className="text-[#CCC] shrink-0 cursor-grab" />

                  {/* Color Picker */}
                  <div className="relative shrink-0">
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) => updateStage(stage.id, { color: e.target.value })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded-lg" style={{ background: stage.color }} />
                  </div>

                  {/* Name */}
                  <input
                    className="flex-1 text-[0.85rem] text-[#1A1A1A] bg-transparent focus:outline-none focus:bg-[#F8F9FA] rounded px-2 py-1.5 transition-colors"
                    value={stage.name}
                    onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                  />

                  {/* Type Badge */}
                  <select
                    className="text-[0.75rem] px-2.5 py-1.5 rounded-lg border bg-white text-[#666] cursor-pointer"
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
                    className="p-2 rounded-lg hover:bg-[#FEF2F2] transition-colors shrink-0"
                    title="삭제"
                  >
                    <Trash2 size={13} color={T.danger} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Stage */}
            <button
              onClick={addStage}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed text-[0.85rem] text-[#999] hover:text-[#1A472A] hover:border-[#1A472A] hover:bg-[#FAFDFB] transition-all"
              style={{ borderColor: T.border }}
            >
              <Plus size={15} /> 스테이지 추가
            </button>
          </div>

          {/* Quick Color Palette */}
          <div className="bg-white rounded-xl border p-6 mt-4" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <p className="text-[0.75rem] text-[#999] mb-3">빠른 색상 팔레트</p>
            <div className="flex flex-wrap gap-2">
              {STAGE_PALETTE.map((c) => (
                <div
                  key={c}
                  className="w-7 h-7 rounded-lg cursor-pointer hover:scale-110 transition-transform"
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
