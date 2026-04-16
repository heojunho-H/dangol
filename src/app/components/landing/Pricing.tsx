import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

const plans = [
  {
    tier: "Free",
    price: "₩0",
    period: "월",
    description: "소규모 팀이 무료로 CRM을 경험할 수 있는 플랜. 핵심 기능은 모두 사용 가능하며, 데이터 저장 용량만 제한됩니다.",
    features: [
      { text: "모든 핵심 기능 사용 가능", included: true },
      { text: "고객 500건, 딜 200건까지", included: true },
      { text: "대시보드 커스터마이징", included: true },
      { text: "3인 팀원 계정", included: true },
      { text: "데이터 무제한", included: false },
      { text: "API 연동", included: false },
      { text: "전담 지원", included: false },
    ],
    cta: "무료로 시작하기",
    ctaStyle: "outline" as const,
    ctaTarget: "signup" as const,
    popular: false,
  },
  {
    tier: "Pro",
    price: "₩49,000",
    period: "월",
    description: "성장하는 팀을 위한 플랜. 데이터 제한 없이 모든 기능을 무제한으로 활용합니다.",
    features: [
      { text: "Free 플랜의 모든 기능", included: true },
      { text: "데이터 무제한", included: true, highlight: true },
      { text: "팀원 무제한", included: true },
      { text: "API 연동 및 Webhook", included: true },
      { text: "고급 자동화 규칙", included: true },
      { text: "이메일 우선 지원", included: true },
      { text: "커스텀 기능 개발", included: false },
    ],
    cta: "Pro 시작하기",
    ctaStyle: "fill" as const,
    ctaTarget: "signup" as const,
    popular: true,
  },
  {
    tier: "Enterprise",
    price: "문의",
    period: "맞춤",
    description: "복잡한 요구사항을 가진 대형 조직을 위한 맞춤형 플랜. 전용 기능 개발과 전담 CSM을 제공합니다.",
    features: [
      { text: "Pro 플랜의 모든 기능", included: true },
      { text: "커스텀 기능 개발", included: true, highlight: true },
      { text: "전용 서버 / 온프레미스 옵션", included: true },
      { text: "전담 CSM 배정", included: true },
      { text: "SLA 보장 (99.9% 업타임)", included: true },
      { text: "보안 감사 지원", included: true },
      { text: "도입 교육 및 온보딩", included: true },
    ],
    cta: "문의하기",
    ctaStyle: "outline" as const,
    ctaTarget: "contact" as const,
    popular: false,
  },
];

export function Pricing() {
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
    <section ref={sectionRef} className="bg-[var(--lp-section-alt)] py-24 px-[5vw]" id="pricing">
      <div className="lp-reveal">
        <div className="text-[0.78rem] font-bold tracking-[2px] uppercase text-[var(--lp-accent)] mb-3">요금제</div>
        <div className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black tracking-[-1px] text-[var(--lp-ink)] leading-[1.2] mb-4">
          팀 규모에 맞는<br />합리적인 플랜
        </div>
        <p className="text-base text-[var(--lp-ink-soft)] max-w-[560px]">
          모든 플랜에서 핵심 기능을 동일하게 사용합니다. 데이터 용량과 지원 범위만 다릅니다.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-14 lp-reveal">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`bg-white rounded-[var(--lp-radius)] p-8 border-[1.5px] relative transition-all hover:-translate-y-1 hover:shadow-[var(--lp-shadow-lg)] ${
              plan.popular
                ? "border-[var(--lp-accent)] shadow-[0_0_0_4px_var(--lp-accent-light)]"
                : "border-[var(--lp-border)]"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--lp-accent)] text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                🔥 가장 인기
              </div>
            )}
            <div className="text-[0.82rem] font-bold text-[var(--lp-ink-muted)] tracking-[1.5px] uppercase mb-2">
              {plan.tier}
            </div>
            <div className="text-[2.4rem] font-black text-[var(--lp-ink)] tracking-[-1.5px] leading-none mb-1">
              {plan.price} <span className="text-base font-medium text-[var(--lp-ink-muted)]">/ {plan.period}</span>
            </div>
            <div className="text-[0.85rem] text-[var(--lp-ink-muted)] mb-6 pb-6 border-b border-[var(--lp-border)]">
              {plan.description}
            </div>
            <ul className="list-none flex flex-col gap-2.5 mb-7">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[0.875rem] text-[var(--lp-ink-soft)]">
                  <span className={`flex-shrink-0 ${feature.included ? "text-[var(--lp-teal)]" : "text-[#d1d5db]"} font-bold`}>
                    {feature.included ? "✓" : "✗"}
                  </span>
                  <span>
                    {(feature as { highlight?: boolean }).highlight ? <strong>{feature.text}</strong> : feature.text}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                if (plan.ctaTarget === "signup") nav("/login");
              }}
              className={`block w-full py-3 rounded-[10px] text-sm font-bold text-center transition-all cursor-pointer border-0 ${
                plan.ctaStyle === "fill"
                  ? "bg-[var(--lp-accent)] text-white shadow-[0_4px_16px_rgba(26,71,42,0.3)] hover:bg-[#0f3820]"
                  : "bg-transparent border-[1.5px] border-solid border-[var(--lp-border)] text-[var(--lp-ink)] hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)]"
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
