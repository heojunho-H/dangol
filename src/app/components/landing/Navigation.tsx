import { useNavigate } from "react-router";

export function Navigation() {
  const nav = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/88 backdrop-blur-2xl border-b border-[var(--lp-border)] flex items-center justify-between px-[5vw] h-16">
      <div className="flex items-center gap-2 font-extrabold text-xl text-[var(--lp-accent)] tracking-tight">
        <div className="w-2 h-2 rounded-full bg-[var(--lp-teal)]"></div>
        Dangol CRM
      </div>
      <ul className="hidden md:flex gap-8 list-none">
        <li><a href="#features" className="no-underline text-[var(--lp-ink-soft)] text-sm font-medium hover:text-[var(--lp-accent)] transition-colors">기능</a></li>
        <li><a href="#industries" className="no-underline text-[var(--lp-ink-soft)] text-sm font-medium hover:text-[var(--lp-accent)] transition-colors">산업별</a></li>
        <li><a href="#demo" className="no-underline text-[var(--lp-ink-soft)] text-sm font-medium hover:text-[var(--lp-accent)] transition-colors">데모</a></li>
        <li><a href="#pricing" className="no-underline text-[var(--lp-ink-soft)] text-sm font-medium hover:text-[var(--lp-accent)] transition-colors">요금제</a></li>
        <li><a href="#cases" className="no-underline text-[var(--lp-ink-soft)] text-sm font-medium hover:text-[var(--lp-accent)] transition-colors">고객 사례</a></li>
      </ul>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => nav("/login")}
          className="text-[var(--lp-ink-soft)] text-sm font-medium px-3 py-2 rounded-lg transition-colors hover:text-[var(--lp-accent)] bg-transparent border-0 cursor-pointer"
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => nav("/signup")}
          className="bg-[var(--lp-accent)] text-white px-5 py-2 rounded-lg text-sm font-semibold border-0 cursor-pointer transition-all hover:bg-[#0f3820] hover:-translate-y-0.5"
        >
          무료로 시작하기
        </button>
      </div>
      <div className="md:hidden cursor-pointer text-xl">☰</div>
    </nav>
  );
}
