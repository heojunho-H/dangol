import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { supabase } from "../lib/supabase";

export function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { workspace_name: workspaceName } },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    // 이메일 확인 off 가정 → 바로 세션 생성됨
    nav("/home", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
      <form onSubmit={onSubmit} className="w-[360px] bg-white border border-[#E0E3E8] rounded-xl p-8">
        <h1 className="text-[1.2rem] text-[#1A1A1A] mb-1">Dangol CRM 시작하기</h1>
        <p className="text-[0.8rem] text-[#999] mb-6">30초면 워크스페이스가 준비돼요.</p>

        <label className="block text-[0.75rem] text-[#666] mb-1">워크스페이스 이름</label>
        <input
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          required
          placeholder="예: 단골컴퍼니"
          className="w-full border border-[#E0E3E8] rounded-md px-3 py-2 text-[0.85rem] mb-3 focus:outline-none focus:border-[#1A472A]"
        />

        <label className="block text-[0.75rem] text-[#666] mb-1">이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-[#E0E3E8] rounded-md px-3 py-2 text-[0.85rem] mb-3 focus:outline-none focus:border-[#1A472A]"
        />

        <label className="block text-[0.75rem] text-[#666] mb-1">비밀번호 (6자 이상)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-[#E0E3E8] rounded-md px-3 py-2 text-[0.85rem] mb-4 focus:outline-none focus:border-[#1A472A]"
        />

        {error && (
          <div className="mb-3 text-[0.75rem] text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-[#1A472A] text-white rounded-md py-2 text-[0.85rem] hover:bg-[#133620] disabled:opacity-60"
        >
          {busy ? "생성 중…" : "워크스페이스 만들기"}
        </button>

        <div className="mt-4 text-center text-[0.75rem] text-[#666]">
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="text-[#1A472A] hover:underline">로그인</Link>
        </div>
      </form>
    </div>
  );
}
