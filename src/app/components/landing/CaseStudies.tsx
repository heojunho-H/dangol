import { useEffect, useRef } from "react";

const cases = [
  {
    industry: "📈 영업 관리",
    company: "\"기존 영업을 완전히 디지털로 전환했습니다\"",
    summary:
      "영업 관리 기능이 특히 유용했습니다. 파이프라인 단계별로 고객을 다음 단계로 전환하기 위해 취해야 할 행동이 명확하게 제시되어, 놓치는 고객 없이 영업을 진행할 수 있었습니다. 영업 성공률을 대시보드에서 즉시 확인할 수 있어 KPI 설정에도 유용하게 활용했습니다.",
    metrics: [
      { value: "+28%", label: "도입 1년 내 계약 성사율 증가", color: "var(--lp-accent)" },
      { value: "+32%", label: "영업 리드 전환율 향상", color: "var(--lp-accent)" },
    ],
  },
  {
    industry: "🔔 고객 관리",
    company: "\"VIP 고객을 놓치지 않게 됐습니다\"",
    summary:
      "당사는 고객 사용 주기가 연 1회로, 고객이 브랜드를 잊어버리는 게 늘 고민이었습니다. Dangol CRM은 고객별 리마인드 메일 발송 일정을 자동으로 제시해주어, 고객 피로도를 최소화하면서도 목적을 달성할 수 있었습니다. 고객 등급 분류 기능으로 S급 고객에 집중하는 것도 가능해졌습니다.",
    metrics: [
      { value: "3.3배", label: "VIP 고객 재구매율 상승", color: "var(--lp-teal)" },
      { value: "최소화", label: "불필요한 고객 이탈 감소", color: "var(--lp-teal)" },
    ],
  },
  {
    industry: "🏆 종합 성과",
    company: "\"도입 직후부터 수치가 바뀌었습니다\"",
    summary:
      "복잡하게 흩어져 있던 영업 정보를 하나로 통합하고, 팀 전체가 동일한 파이프라인을 보며 움직이게 되었습니다. 특히 대시보드에서 KPI를 실시간으로 확인하고 조정할 수 있다는 점이 매니저에게 큰 도움이 되었습니다. 도입 후 첫 분기부터 가시적인 성과가 나타났습니다.",
    metrics: [
      { value: "+28%", label: "계약 성사율 (도입 1년 평균)", color: "var(--lp-violet)" },
      { value: "+32%", label: "리드 → 계약 전환율", color: "var(--lp-violet)" },
    ],
  },
];

export function CaseStudies() {
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
    <section ref={sectionRef} className="bg-white py-24 px-[5vw]" id="cases">
      <div className="lp-reveal">
        <div className="text-[0.78rem] font-bold tracking-[2px] uppercase text-[var(--lp-accent)] mb-3">고객 사례</div>
        <div className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black tracking-[-1px] text-[var(--lp-ink)] leading-[1.2] mb-4">
          다양한 기업들이<br />Dangol CRM으로 성장했습니다
        </div>
        <p className="text-base text-[var(--lp-ink-soft)] max-w-[560px]">
          실제 도입 기업의 사례가 곧 공개될 예정입니다. 아래는 사례 레이아웃 미리보기입니다.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-14 lp-reveal">
        {cases.map((caseItem, index) => (
          <div
            key={index}
            className="rounded-[var(--lp-radius)] p-7 border-[1.5px] border-[var(--lp-border)] bg-white relative overflow-hidden"
          >
            <div className="text-xs font-bold tracking-[1.5px] uppercase text-[var(--lp-accent-glow)] mb-2.5">
              {caseItem.industry}
            </div>
            <div className="text-base font-extrabold text-[var(--lp-ink)] mb-2">{caseItem.company}</div>
            <div className="text-[0.85rem] text-[var(--lp-ink-soft)] leading-relaxed mb-5">{caseItem.summary}</div>
            <div className="flex gap-5">
              {caseItem.metrics.map((metric, i) => (
                <div key={i}>
                  <div className="text-[1.4rem] font-black tracking-[-1px]" style={{ color: metric.color }}>
                    {metric.value}
                  </div>
                  <div className="text-[0.72rem] text-[var(--lp-ink-muted)]">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
