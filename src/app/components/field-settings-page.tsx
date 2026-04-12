import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Trash2,
  X,
  ChevronLeft,
  Grid3X3,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

/* ─── Theme ─── */
const T = {
  primary: "#1A472A",
  danger: "#EF4444",
  border: "#E0E3E8",
};

/* ─── Types ─── */
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
  text: "\uD83D\uDCDD", number: "\uD83D\uDCB0", select: "\uD83D\uDCCB", "multi-select": "\uD83C\uDFF7\uFE0F",
  date: "\uD83D\uDCC5", person: "\uD83D\uDC64", phone: "\uD83D\uDCDE", email: "\u2709\uFE0F", file: "\uD83D\uDCCE",
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

/* ─── Page Component ─── */
export function FieldSettingsPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CustomField[]>(() =>
    DEFAULT_FIELDS.map((f) => ({ ...f }))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const updateField = (id: string, patch: Partial<CustomField>) => {
    setDraft((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setHasChanges(true);
  };

  const removeField = (id: string) => {
    const field = draft.find((f) => f.id === id);
    if (field?.locked) return;
    setDraft((prev) => prev.filter((f) => f.id !== id));
    setHasChanges(true);
  };

  const addField = () => {
    const id = `f-${Date.now()}`;
    setDraft((prev) => [...prev, {
      id, key: `custom_${Date.now()}`, label: "새 필드", type: "text" as FieldType,
      required: false, locked: false, visible: true,
    }]);
    setEditingId(id);
    setHasChanges(true);
  };

  const toggleVisible = (id: string) => {
    const f = draft.find((x) => x.id === id);
    if (f?.locked) return;
    updateField(id, { visible: !f?.visible });
  };

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
            <p className="text-[0.7rem] text-[#BBB] mb-0.5">설정 &gt; 필드 관리</p>
            <div className="flex items-center gap-2">
              <Grid3X3 size={18} color={T.primary} />
              <h1 className="text-[1.3rem] text-[#1A1A1A] font-medium">필드 관리</h1>
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
              딜 데이터의 필드를 추가하거나 수정하세요.
              잠긴 필드(<Lock size={11} className="inline text-[#CCC]" />)는 시스템에서 사용하므로 수정이 제한됩니다.
            </p>
          </div>

          {/* Field List */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: T.border, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[0.85rem] text-[#1A1A1A] font-medium">필드 목록</span>
              <span className="text-[0.75rem] text-[#999]">
                {draft.filter((f) => f.visible).length} / {draft.length}개 표시
              </span>
            </div>

            <div className="space-y-1.5">
              {draft.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all hover:shadow-sm"
                  style={{ borderColor: editingId === field.id ? T.primary : T.border }}
                >
                  {/* Icon */}
                  <span className="text-[1.1rem] shrink-0">{FIELD_TYPE_ICONS[field.type]}</span>

                  {/* Label */}
                  {editingId === field.id ? (
                    <input
                      autoFocus
                      className="flex-1 text-[0.85rem] text-[#1A1A1A] border rounded-lg px-3 py-2 focus:outline-none focus:border-[#1A472A]"
                      style={{ borderColor: T.border }}
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => { if (e.key === "Enter") setEditingId(null); }}
                    />
                  ) : (
                    <span
                      className={`flex-1 text-[0.85rem] transition-colors ${field.locked ? "text-[#999]" : "text-[#1A1A1A] cursor-pointer hover:text-[#1A472A]"}`}
                      onClick={() => !field.locked && setEditingId(field.id)}
                    >
                      {field.label}
                    </span>
                  )}

                  {/* Type */}
                  {field.locked ? (
                    <span className="text-[0.7rem] text-[#BBB] px-2.5 py-1 rounded-lg bg-[#F8F9FA]">{FIELD_TYPE_LABELS[field.type]}</span>
                  ) : (
                    <select
                      className="text-[0.75rem] px-2.5 py-1.5 rounded-lg border bg-white text-[#666] cursor-pointer"
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
                    <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">필수</span>
                  )}

                  {/* Lock or Actions */}
                  {field.locked ? (
                    <Lock size={13} className="text-[#CCC] shrink-0" />
                  ) : (
                    <>
                      <button
                        onClick={() => toggleVisible(field.id)}
                        className="p-1.5 rounded hover:bg-[#F7F8FA] transition-colors shrink-0"
                        title={field.visible ? "숨기기" : "보이기"}
                      >
                        {field.visible ? <Eye size={13} color="#999" /> : <EyeOff size={13} color="#CCC" />}
                      </button>
                      <button
                        onClick={() => removeField(field.id)}
                        className="p-1.5 rounded hover:bg-[#FEF2F2] transition-colors shrink-0"
                        title="삭제"
                      >
                        <Trash2 size={13} color={T.danger} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add Field */}
            <button
              onClick={addField}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed text-[0.85rem] text-[#999] hover:text-[#1A472A] hover:border-[#1A472A] hover:bg-[#FAFDFB] transition-all"
              style={{ borderColor: T.border }}
            >
              <Plus size={15} /> 새 필드 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
