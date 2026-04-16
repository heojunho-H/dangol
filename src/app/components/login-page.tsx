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
  };

  return (
    <div className="login-shell fixed inset-0 overflow-y-auto bg-[#f5f6fa] text-[#0f1117] flex flex-col font-[Noto_Sans_KR,Inter,sans-serif]">
      <div className="pointer-events-none absolute w-[520px] h-[520px] rounded-full blur-[110px] bg-[rgba(26,71,42,0.08)] -top-[180px] -right-[120px]"></div>
      <div className="pointer-events-none absolute w-[420px] h-[420px] rounded-full blur-[110px] bg-[rgba(45,103,65,0.08)] -bottom-[160px] left-[6%]"></div>

      <header className="relative z-10 flex items-center justify-center pt-10 pb-6">
        <a href="/" className="flex items-center gap-2.5 font-black text-[1.05rem] tracking-tight text-[#0f1117] no-underline">
          <div className="w-7 h-7 rounded-[8px] bg-[#1a472a] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white"></div>
          </div>
          Dangol CRM
        </a>
      </header>

      <main className="relative z-10 flex-1 px-6 md:px-[5vw] pb-12">
        <div className="mx-auto max-w-[1120px] rounded-[20px] border border-[#e2e5ef] bg-white shadow-[0_12px_48px_rgba(15,17,23,0.08)] overflow-hidden">
          <div className="grid md:grid-cols-[1fr_0.9fr]">
            <section className="px-7 md:px-12 py-12 md:py-16 border-b md:border-b-0 md:border-r border-[#e2e5ef]">
              <div className="mb-9">
                <h1 className="text-[1.5rem] md:text-[1.65rem] font-black text-[#0f1117] tracking-[-0.5px] mb-2 leading-tight">
                  지금 바로 시작하세요
                </h1>
                <p className="text-[0.9rem] text-[#7c8099]">
                  이메일 또는 Google 계정으로 3분이면 CRM 을 띄울 수 있어요.
                </p>
              </div>

              <button
                type="button"
                onClick={onGoogle}
                disabled={busy}
                className="w-full h-[50px] flex items-center justify-center gap-2.5 bg-white hover:bg-[#f8f9fc] border-[1.5px] border-[#e2e5ef] hover:border-[#cfd3df] rounded-[12px] text-[0.92rem] font-semibold text-[#0f1117] transition-all disabled:opacity-60 cursor-pointer"
              >
                <GoogleIcon />
                Google 계정으로 계속
              </button>

              <div className="my-6 flex items-center gap-3 text-[0.72rem] text-[#9ea3b8] uppercase tracking-[1.5px]">
                <div className="flex-1 h-px bg-[#e2e5ef]"></div>
                또는
                <div className="flex-1 h-px bg-[#e2e5ef]"></div>
              </div>

              {step === "email" ? (
                <form onSubmit={onContinue} className="flex flex-col gap-3">
                  <label className="relative block">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ea3b8]">
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
                      className="w-full h-[50px] bg-white border-[1.5px] border-[#e2e5ef] rounded-[12px] pl-11 pr-4 text-[0.92rem] text-[#0f1117] placeholder:text-[#9ea3b8] focus:outline-none focus:border-[#1a472a] focus:shadow-[0_0_0_4px_rgba(26,71,42,0.08)] transition-all"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-[50px] bg-[#1a472a] hover:bg-[#0f3820] disabled:opacity-60 rounded-[12px] text-[0.92rem] font-bold text-white shadow-[0_4px_16px_rgba(26,71,42,0.22)] hover:shadow-[0_6px_22px_rgba(26,71,42,0.3)] transition-all cursor-pointer"
                  >
                    이메일로 계속
                  </button>
                </form>
              ) : (
                <form onSubmit={onAuthSubmit} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-[#f8f9fc] border-[1.5px] border-[#e2e5ef] rounded-[12px] px-4 h-[50px]">
                    <span className="text-[0.9rem] text-[#3a3f52] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setPassword("");
                        setError(null);
                      }}
                      className="text-[0.78rem] font-semibold text-[#1a472a] hover:text-[#0f3820] cursor-pointer bg-transparent border-0"
                    >
                      변경
                    </button>
                  </div>
                  <label className="relative block">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ea3b8]">
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
                      className="w-full h-[50px] bg-white border-[1.5px] border-[#e2e5ef] rounded-[12px] pl-11 pr-4 text-[0.92rem] text-[#0f1117] placeholder:text-[#9ea3b8] focus:outline-none focus:border-[#1a472a] focus:shadow-[0_0_0_4px_rgba(26,71,42,0.08)] transition-all"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-[50px] bg-[#1a472a] hover:bg-[#0f3820] disabled:opacity-60 rounded-[12px] text-[0.92rem] font-bold text-white shadow-[0_4px_16px_rgba(26,71,42,0.22)] hover:shadow-[0_6px_22px_rgba(26,71,42,0.3)] transition-all cursor-pointer"
                  >
                    {busy ? "확인 중…" : "로그인 또는 가입"}
                  </button>
                </form>
              )}

              {error && (
                <div className="mt-4 text-[0.82rem] text-[#b42318] bg-[#fef3f2] border border-[#fecdca] rounded-[10px] px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <p className="mt-8 text-[0.76rem] leading-relaxed text-[#7c8099] max-w-[440px]">
                이메일을 입력하면 Dangol CRM 가입·로그인 안내를 받기로 동의하는 것으로 간주됩니다. 안내 메일은 언제든 수신 거부할 수 있고, 자세한 내용은{" "}
                <a href="#" className="underline text-[#3a3f52] hover:text-[#1a472a]">
                  개인정보처리방침
                </a>
                에서 확인할 수 있습니다.
              </p>
            </section>

            <section className="px-7 md:px-12 py-12 md:py-16 bg-[#f8faf9] flex flex-col">
              <div className="inline-flex self-start items-center gap-2 bg-[#e8f0ec] text-[#1a472a] px-3 py-1.5 rounded-full text-[0.72rem] font-bold tracking-wide mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1a472a]"></div>
                한국 SMB 를 위한 CRM
              </div>
              <h2 className="text-[1.45rem] md:text-[1.6rem] font-black text-[#0f1117] tracking-[-0.5px] leading-[1.3] mb-5">
                Dangol CRM 에<br />오신 것을 환영합니다.
              </h2>
              <div className="space-y-4 text-[0.92rem] text-[#3a3f52] leading-[1.72] max-w-[420px]">
                <p>무거운 설정·복잡한 용어 없이, 우리 회사 업무 흐름에 맞게 항목과 단계를 직접 정의하세요.</p>
                <p>
                  영업 파이프라인부터 고객 라이프사이클까지, 한 곳에서 보고 관리할 수 있도록{" "}
                  <em className="not-italic font-bold text-[#1a472a]">정확히 우리 방식대로</em> 만들 수 있습니다.
                </p>
              </div>

              <div className="mt-10 pt-8 border-t border-[#e2e5ef] grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[1.25rem] font-black text-[#0f1117] tracking-[-0.5px]">3분</div>
                  <div className="text-[0.7rem] text-[#7c8099] mt-1">평균 설정 시간</div>
                </div>
                <div>
                  <div className="text-[1.25rem] font-black text-[#0f1117] tracking-[-0.5px]">98%</div>
                  <div className="text-[0.7rem] text-[#7c8099] mt-1">고객 만족도</div>
                </div>
                <div>
                  <div className="text-[1.25rem] font-black text-[#0f1117] tracking-[-0.5px]">500+</div>
                  <div className="text-[0.7rem] text-[#7c8099] mt-1">도입 기업</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="relative z-10 pb-8 px-6 md:px-[5vw]">
        <div className="mx-auto max-w-[1120px] flex items-center justify-center gap-6 md:gap-8 text-[0.76rem] text-[#7c8099]">
          <span>© 2026 Dangol CRM</span>
          <a href="#" className="hover:text-[#1a472a] transition-colors">
            개인정보처리방침
          </a>
          <a href="#" className="hover:text-[#1a472a] transition-colors">
            고객지원
          </a>
        </div>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.96h5.5c-.24 1.27-1.74 3.72-5.5 3.72-3.31 0-6.01-2.74-6.01-6.12s2.7-6.12 6.01-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.78 3.16 14.62 2.2 12 2.2 6.94 2.2 2.84 6.3 2.84 11.36S6.94 20.52 12 20.52c5.83 0 9.69-4.1 9.69-9.86 0-.66-.07-1.16-.16-1.66H12z"
      />
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
