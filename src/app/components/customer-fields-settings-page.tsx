import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Trash2, ChevronLeft, Lock, Eye, EyeOff, Settings } from "lucide-react";

const T = { primary: "#1A472A", danger: "#EF4444", border: "#E0E3E8" };

type FieldType =
  | "text" | "number" | "select" | "multi-select" | "date"
  | "person" | "phone" | "email" | "file";

interface CustomerField {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  locked: boolean;
  options: string;
  visible: boolean;
  sortOrder: number;
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "텍스트", number: "숫자", select: "선택(단일)", "multi-select": "선택(다중)",
  date: "날짜", person: "사람", phone: "전화번호", email: "이메일", file: "파일",
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("dangol_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function CustomerFieldsSettingsPage() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<CustomerField[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/customer-custom-fields", { headers: { ...authHeaders() } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFields(data))
      .finally(() => setLoading(false));
  }, []);

  const update = (id: string, patch: Partial<CustomerField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setDirty(true);
  };

  const remove = async (id: string) => {
    const f = fields.find((x) => x.id === id);
    if (f?.locked) return;
    if (!confirm("이 필드를 삭제하시겠습니까?")) return;
    const res = await fetch(`/api/customer-custom-fields/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) return alert("삭제 실패");
    setFields((prev) => prev.filter((x) => x.id !== id));
  };

  const add = async () => {
    const key = `custom_${Date.now()}`;
    const res = await fetch("/api/customer-custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        key, label: "새 필드", type: "text", required: false, visible: true,
      }),
    });
    if (res.ok) {
      const created = await res.json();
      setFields((prev) => [...prev, created]);
    }
  };

  const save = async () => {
    await Promise.all(
      fields.map((f) =>
        fetch(`/api/customer-custom-fields/${f.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            label: f.label, type: f.type, required: f.required, visible: f.visible,
          }),
        })
      )
    );
    setDirty(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA]">
      <div
        className="flex items-center justify-between px-8 py-4 bg-white border-b shrink-0"
        style={{ borderColor: T.border }}
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#F7F8FA]">
            <ChevronLeft size={18} color="#666" />
          </button>
          <div>
            <p className="text-[0.7rem] text-[#BBB] mb-0.5">설정 &gt; 고객 필드</p>
            <div className="flex items-center gap-2">
              <Settings size={18} color={T.primary} />
              <h1 className="text-[1.3rem] text-[#1A1A1A] font-medium">고객 필드</h1>
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
        <div className="max-w-[720px] mx-auto py-8 px-6">
          <p className="text-[0.85rem] text-[#666] leading-relaxed mb-6">
            고객 데이터에 표시할 필드를 정의하세요. 잠긴 필드는 시스템 기본 필드로 삭제할 수 없습니다.
          </p>

          <div className="bg-white rounded-xl border p-6" style={{ borderColor: T.border }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[0.85rem] text-[#1A1A1A] font-medium">필드 목록</span>
              <span className="text-[0.75rem] text-[#999]">{fields.length}개</span>
            </div>

            {loading ? (
              <p className="text-[#999] text-[0.85rem] py-8 text-center">로딩 중...</p>
            ) : (
              <div className="space-y-2">
                {fields.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3.5 rounded-xl border bg-white"
                    style={{ borderColor: T.border }}
                  >
                    {f.locked && <Lock size={11} className="text-[#999] shrink-0" />}
                    <input
                      className="flex-1 text-[0.85rem] text-[#1A1A1A] bg-transparent focus:outline-none focus:bg-[#F8F9FA] rounded px-2 py-1.5"
                      value={f.label}
                      disabled={f.locked}
                      onChange={(e) => update(f.id, { label: e.target.value })}
                    />
                    <span className="text-[0.7rem] text-[#999] px-2">{f.key}</span>
                    <select
                      className="text-[0.75rem] px-2.5 py-1.5 rounded-lg border bg-white text-[#666] cursor-pointer disabled:opacity-50"
                      style={{ borderColor: T.border }}
                      value={f.type}
                      disabled={f.locked}
                      onChange={(e) => update(f.id, { type: e.target.value as FieldType })}
                    >
                      {Object.entries(FIELD_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => update(f.id, { visible: !f.visible })}
                      className="p-2 rounded-lg hover:bg-[#F7F8FA]"
                      title={f.visible ? "숨기기" : "표시"}
                    >
                      {f.visible ? (
                        <Eye size={13} className="text-[#1A472A]" />
                      ) : (
                        <EyeOff size={13} className="text-[#999]" />
                      )}
                    </button>
                    <button
                      onClick={() => remove(f.id)}
                      disabled={f.locked}
                      className="p-2 rounded-lg hover:bg-[#FEF2F2] disabled:opacity-30"
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
              <Plus size={15} /> 필드 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
