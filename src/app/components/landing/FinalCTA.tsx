import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

export function FinalCTA() {
  const nav = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.12 }
    );
    const reveals = sectionRef.current?.querySelectorAll(".lp-reveal");
    reveals?.forEach((r) => observer.observe(r));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-gradient-to-br from-[#0f2a1a] via-[#1a472a] to-[#0d4d3a] text-center text-white py-[120px] px-[5vw]"
    >
      <div className="lp-reveal">
        <div className="text-[0.78rem] font-bold tracking-[2px] uppercase text-[#b8e0ca] mb-3">지금 시작하세요</div>
        <div className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black tracking-[-1px] text-white leading-[1.2] mb-3">
          우리 팀만을 위한<br />CRM, 지금 바로
        </div>
        <p className="text-[1.05rem] text-[#b8e0ca] max-w-[520px] mx-auto mb-10">
          복잡한 설정 없이 3분이면 충분합니다. 신용카드 없이 무료로 시작하고, 필요할 때 업그레이드하세요.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => nav("/login")}
            className="bg-white text-[var(--lp-accent)] px-8 py-3.5 rounded-[10px] font-bold text-[0.95rem] border-0 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)]"
          >
            무료로 시작하기 →
          </button>
          <a
            href="#demo"
            className="bg-white/15 text-white px-8 py-3.5 rounded-[10px] font-semibold text-[0.95rem] no-underline border-[1.5px] border-white/30 transition-all hover:bg-white/25"
          >
            데모 체험하기
          </a>
        </div>
      </div>
    </section>
  );
}
