import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = (loc.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setStep("password");
  };

  const onAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    // 통합 진입점: 우선 로그인 시도 → 계정 없으면 자동 가입
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    if (!signIn.error) {
      setBusy(false);
      nav(redirectTo, { replace: true });
      return;
    }

    const isInvalidCredentials = signIn.error.message === "Invalid login credentials";
    if (!isInvalidCredentials) {
      setBusy(false);
      setError(signIn.error.message);
      return;
    }

    // 계정이 없거나 비밀번호 틀림 — 가입 시도. 이메일이 이미 등록돼 있으면 Supabase가 별도 에러로 알려줌
    const localPart = email.split("@")[0] || "내";
    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: { data: { workspace_name: `${localPart}의 워크스페이스` } },
    });
    setBusy(false);
    if (signUp.error) {
      setError(
        signUp.error.message === "User already registered"
          ? "비밀번호가 올바르지 않습니다."
          : signUp.error.message
      );
      return;
    }
    nav(redirectTo, { replace: true });
  };

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${redirectTo}` },
    });
    if (error) {
      setBusy(false);
      setError(
        error.message.includes("provider is not enabled")
          ? "Google 로그인은 곧 지원될 예정입니다."
          : error.message
      );
    }
    // 성공 시 OAuth redirect 로 페이지 전환됨
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#f5f5f7] flex flex-col">
      <header className="flex items-center justify-center pt-10 pb-8">
        <div className="flex items-center gap-2 font-extrabold text-xl text-white tracking-tight">
          <div className="w-2 h-2 rounded-full bg-[#0d9488]"></div>
          Dangol CRM
        </div>
      </header>

      <main className="flex-1 px-6 md:px-[5vw] pb-16">
        <div className="mx-auto max-w-[1180px] rounded-[28px] border border-white/8 bg-white/[0.015] py-16 md:py-20 px-6 md:px-16">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20">
            <section className="flex flex-col">
              <button
                type="button"
                onClick={onGoogle}
                disabled={busy}
                className="w-full h-[52px] flex items-center justify-center gap-3 bg-[#1a1d22] hover:bg-[#212529] border border-white/10 rounded-xl text-[0.95rem] font-medium text-white transition-colors disabled:opacity-60 cursor-pointer"
              >
                <GoogleIcon />
                Google로 계속하기
              </button>

              <div className="my-7 flex items-center gap-3 text-[0.72rem] text-[#5b606a] uppercase tracking-wider">
                <div className="flex-1 h-px bg-white/8"></div>
                또는
                <div className="flex-1 h-px bg-white/8"></div>
              </div>

              {step === "email" ? (
                <form onSubmit={onContinue} className="flex flex-col gap-3">
                  <label className="relative block">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5b606a]">
                      <MailIcon />
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="회사 이메일을 입력하세요"
                      className="w-full h-[52px] bg-[#1a1d22] border border-white/10 rounded-xl pl-11 pr-4 text-[0.95rem] text-white placeholder:text-[#5b606a] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-[52px] bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 rounded-xl text-[0.95rem] font-semibold text-white transition-colors cursor-pointer"
                  >
                    계속
                  </button>
                </form>
              ) : (
                <form onSubmit={onAuthSubmit} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-[#15171b] border border-white/8 rounded-xl px-4 h-[52px]">
                    <span className="text-[0.9rem] text-[#a1a1aa] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setPassword("");
                        setError(null);
                      }}
                      className="text-[0.78rem] text-[#3b82f6] hover:text-[#60a5fa] cursor-pointer bg-transparent border-0"
                    >
                      변경
                    </button>
                  </div>
                  <label className="relative block">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5b606a]">
                      <LockIcon />
                    </span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="비밀번호 (6자 이상)"
                      className="w-full h-[52px] bg-[#1a1d22] border border-white/10 rounded-xl pl-11 pr-4 text-[0.95rem] text-white placeholder:text-[#5b606a] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-[52px] bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 rounded-xl text-[0.95rem] font-semibold text-white transition-colors cursor-pointer"
                  >
                    {busy ? "확인 중…" : "로그인 또는 가입"}
                  </button>
                </form>
              )}

              {error && (
                <div className="mt-4 text-[0.8rem] text-[#fca5a5] bg-[#3f1d1d] border border-[#7f1d1d] rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <p className="mt-10 text-[0.78rem] leading-relaxed text-[#71717a] max-w-[440px]">
                이메일을 입력하면 Dangol CRM 가입·로그인 안내를 받기로 동의하는 것으로 간주됩니다. 안내 메일은 언제든 수신 거부할 수 있고, 자세한 내용은{" "}
                <a href="#" className="underline text-[#a1a1aa] hover:text-white">개인정보처리방침</a>
                에서 확인할 수 있습니다.
              </p>
            </section>

            <section className="flex flex-col justify-start md:pt-2">
              <h1 className="text-[1.6rem] md:text-[1.85rem] font-bold text-white tracking-tight mb-5">
                Dangol CRM에 오신 것을 환영합니다.
              </h1>
              <div className="space-y-5 text-[0.95rem] text-[#a1a1aa] leading-[1.7] max-w-[460px]">
                <p>
                  Dangol CRM은 한국 SMB가 정말로 필요한 것만 담은 CRM입니다. 무거운 설정·복잡한 용어 없이, 우리 회사 업무 흐름에 맞게 항목과 단계를 직접 정의하세요.
                </p>
                <p>
                  영업 파이프라인부터 고객 라이프사이클까지, 한 곳에서 보고 관리할 수 있도록 <em className="not-italic text-white">정확히 우리 방식대로</em> 만들 수 있습니다.
                </p>
                <p>지금 시작해 보세요.</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="pb-8 px-6 md:px-[5vw]">
        <div className="mx-auto max-w-[1180px] flex items-center justify-center gap-8 text-[0.78rem] text-[#5b606a]">
          <span>© 2026 Dangol CRM</span>
          <a href="#" className="hover:text-[#a1a1aa] transition-colors">개인정보처리방침</a>
          <a href="#" className="hover:text-[#a1a1aa] transition-colors">고객지원</a>
        </div>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.96h5.5c-.24 1.27-1.74 3.72-5.5 3.72-3.31 0-6.01-2.74-6.01-6.12s2.7-6.12 6.01-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.78 3.16 14.62 2.2 12 2.2 6.94 2.2 2.84 6.3 2.84 11.36S6.94 20.52 12 20.52c5.83 0 9.69-4.1 9.69-9.86 0-.66-.07-1.16-.16-1.66H12z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}
