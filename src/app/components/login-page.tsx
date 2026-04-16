import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = (loc.state as any)?.from?.pathname ?? "/home";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "이메일 또는 비밀번호가 올바르지 않습니다"
        : error.message);
      return;
    }
    nav(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC]">
      <form onSubmit={onSubmit} className="w-[360px] bg-white border border-[#E0E3E8] rounded-xl p-8">
        <h1 className="text-[1.2rem] text-[#1A1A1A] mb-1">Dangol CRM</h1>
        <p className="text-[0.8rem] text-[#999] mb-6">로그인해서 내 워크스페이스로 들어가세요.</p>

        <label className="block text-[0.75rem] text-[#666] mb-1">이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-[#E0E3E8] rounded-md px-3 py-2 text-[0.85rem] mb-3 focus:outline-none focus:border-[#1A472A]"
        />

        <label className="block text-[0.75rem] text-[#666] mb-1">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
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
          {busy ? "로그인 중…" : "로그인"}
        </button>

        <div className="mt-4 text-center text-[0.75rem] text-[#666]">
          계정이 없으신가요?{" "}
          <Link to="/signup" className="text-[#1A472A] hover:underline">회원가입</Link>
        </div>
      </form>
    </div>
  );
}
