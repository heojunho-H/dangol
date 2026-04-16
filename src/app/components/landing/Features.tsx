import { useEffect, useRef } from "react";

const features = [
  { icon: "🎛️", title: "자유로운 커스터마이징", description: "드래그 앤 드롭으로 대시보드를 구성하세요. 개발자 없이도 원하는 레이아웃을 만들 수 있습니다.", colorClass: "bg-[var(--lp-accent-light)]" },
  { icon: "📊", title: "유연한 대시보드", description: "매출, 고객 여정, 팀별 성과 등 원하는 지표를 한 눈에 볼 수 있도록 대시보드를 자유롭게 편집합니다.", colorClass: "bg-[var(--lp-teal-light)]" },
  { icon: "⚡", title: "가볍고 빠른 속도", description: "불필요한 기능 없이 필요한 것만 로드합니다. 어떤 환경에서도 빠른 응답 속도를 경험하세요.", colorClass: "bg-[var(--lp-amber-light)]" },
  { icon: "🗂️", title: "맞춤형 데이터 구조", description: "제품 코드, 납기일, 담당 파트너 등 우리 회사만의 데이터 항목을 직접 정의하고 관리합니다.", colorClass: "bg-[var(--lp-violet-light)]" },
  { icon: "🔗", title: "팀 협업 & 권한 관리", description: "부서별, 역할별 접근 권한을 세밀하게 설정하고 실시간으로 영업 현황을 공유합니다.", colorClass: "bg-[var(--lp-accent-light)]" },
  { icon: "📬", title: "자동화 알림 & 리마인더", description: "후속 연락 일정, 계약 갱신, 미팅 일정을 자동으로 알려드려 중요한 순간을 놓치지 않습니다.", colorClass: "bg-[var(--lp-teal-light)]" },
  { icon: "📈", title: "실시간 성과 분석", description: "견적 전환율, 영업 사이클 길이, 채널별 성과를 실시간 차트로 확인하고 전략을 최적화합니다.", colorClass: "bg-[var(--lp-amber-light)]" },
  { icon: "🔒", title: "안전한 데이터 보안", description: "국내 데이터 센터 운영, 전송 구간 암호화, 정기 보안 감사로 비즈니스 데이터를 안전하게 보호합니다.", colorClass: "bg-[var(--lp-violet-light)]" },
];

export function Features() {
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
    <section ref={sectionRef} className="bg-[var(--lp-section-alt)] py-24 px-[5vw]" id="features">
      <div className="lp-reveal">
        <div className="text-[0.78rem] font-bold tracking-[2px] uppercase text-[var(--lp-accent)] mb-3">핵심 기능</div>
        <div className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black tracking-[-1px] text-[var(--lp-ink)] leading-[1.2] mb-4">
          우리 회사에 맞게,<br />원하는 대로 구성하세요
        </div>
        <p className="text-base text-[var(--lp-ink-soft)] max-w-[560px]">
          Dangol CRM의 모든 기능은 실제 현장에서 필요한 것을 기반으로 설계되었습니다.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6 mt-14 lp-reveal">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white rounded-[var(--lp-radius)] p-7 border border-[var(--lp-border)] transition-all duration-300 cursor-default hover:-translate-y-1 hover:shadow-[var(--lp-shadow-lg)] hover:border-transparent"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 ${feature.colorClass}`}>{feature.icon}</div>
            <h3 className="text-base font-bold mb-2">{feature.title}</h3>
            <p className="text-[0.87rem] text-[var(--lp-ink-soft)] leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
