import { useState, useEffect, useRef } from "react";

interface IndustryData {
  id: string;
  emoji: string;
  title: string;
  description: string;
  points: string[];
  templateName: string;
  templateColor: string;
  templateBg: string;
  items: Array<{ label: string; status: string; statusClass: string }>;
}

const industries: IndustryData[] = [
  {
    id: "manufacturing",
    emoji: "🏭",
    title: "제조업에 최적화된 CRM",
    description: "생산 일정, 납기 관리, 파트너사별 거래 이력까지 하나의 플랫폼으로 통합 관리하세요.",
    points: [
      "발주부터 납품까지 영업 파이프라인 추적",
      "제품 코드·규격별 맞춤 필드 설계",
      "협력사 및 바이어 관계 한눈에 관리",
      "납기 리마인더 자동화로 클레임 예방",
    ],
    templateName: "제조업 템플릿",
    templateColor: "#1a472a",
    templateBg: "#e8f0ec",
    items: [
      { label: "삼성전기 — 회로기판 200pcs", status: "납기 D-5", statusClass: "s-ongoing" },
      { label: "LG화학 — 소재 공급 계약", status: "검토 중", statusClass: "s-review" },
      { label: "현대모비스 — 부품 견적", status: "계약 완료", statusClass: "s-done" },
      { label: "SK하이닉스 — 연간 납품 협의", status: "진행 중", statusClass: "s-ongoing" },
    ],
  },
  {
    id: "it",
    emoji: "💻",
    title: "IT 기업의 SaaS 영업 관리",
    description: "구독 갱신, 라이선스 관리, 기술 데모 일정까지 IT 영업의 모든 흐름을 지원합니다.",
    points: [
      "구독 만료 자동 알림 및 갱신 파이프라인",
      "POC·데모 진행 상태 추적",
      "계약 유형별(연간/월간) 매출 분류",
      "기술 문의 및 영업 협업 연동",
    ],
    templateName: "IT 템플릿",
    templateColor: "#0d9488",
    templateBg: "#ccfbf1",
    items: [
      { label: "카카오 — Enterprise 갱신", status: "협의 중", statusClass: "s-review" },
      { label: "토스뱅크 — POC 진행", status: "데모 D-3", statusClass: "s-ongoing" },
      { label: "쿠팡 — 연간 라이선스", status: "계약 완료", statusClass: "s-done" },
      { label: "네이버 — Pro 플랜 업셀", status: "진행 중", statusClass: "s-ongoing" },
    ],
  },
  {
    id: "service",
    emoji: "🤝",
    title: "서비스업 고객 관리",
    description: "장기 고객 관계, 서비스 이력, 재계약 관리를 체계화하여 이탈률을 낮추세요.",
    points: [
      "고객별 서비스 히스토리 전체 열람",
      "재계약·추가 서비스 타이밍 자동 알림",
      "만족도 조사 결과 연동 관리",
      "담당자 교체 시 인수인계 자동화",
    ],
    templateName: "서비스업 템플릿",
    templateColor: "#7c3aed",
    templateBg: "#ede9fe",
    items: [
      { label: "GS리테일 — 운영 지원 계약", status: "3년 갱신", statusClass: "s-done" },
      { label: "롯데백화점 — VIP 케어", status: "상담 중", statusClass: "s-ongoing" },
      { label: "이마트 — 새 서비스 제안", status: "검토 중", statusClass: "s-review" },
      { label: "CJ ENM — 재계약 협의", status: "D-14", statusClass: "s-ongoing" },
    ],
  },
  {
    id: "distribution",
    emoji: "📦",
    title: "유통업 거래처 관리",
    description: "다수의 바이어와 채널을 효율적으로 관리하고, 재고 연동 없이도 발주 흐름을 파악합니다.",
    points: [
      "거래처별 구매 패턴·주기 분석",
      "채널별(온라인/오프라인) 매출 추적",
      "반품·클레임 이력 통합 관리",
      "프로모션 대상 고객 자동 분류",
    ],
    templateName: "유통업 템플릿",
    templateColor: "#d97706",
    templateBg: "#fef3c7",
    items: [
      { label: "홈플러스 — 하반기 발주", status: "협의 중", statusClass: "s-ongoing" },
      { label: "코스트코 — 신상품 입점", status: "검토 중", statusClass: "s-review" },
      { label: "올리브영 — 분기 정산", status: "완료", statusClass: "s-done" },
      { label: "무신사 — 브랜드 협업", status: "진행 중", statusClass: "s-ongoing" },
    ],
  },
  {
    id: "construction",
    emoji: "🏗️",
    title: "건설·시공업 프로젝트 영업",
    description: "대형 프로젝트의 긴 영업 사이클과 다수의 의사결정자를 체계적으로 추적합니다.",
    points: [
      "발주처·시행사·시공사 관계 매핑",
      "입찰 일정 및 서류 마감일 추적",
      "프로젝트별 수익성 예측",
      "현장 담당자 커뮤니케이션 이력 보관",
    ],
    templateName: "건설업 템플릿",
    templateColor: "#1a472a",
    templateBg: "#e8f0ec",
    items: [
      { label: "판교 데이터센터 — 설비 공사", status: "입찰 준비", statusClass: "s-review" },
      { label: "용산 오피스 리모델링", status: "견적 제출", statusClass: "s-ongoing" },
      { label: "인천 물류센터 신축", status: "수주 확정", statusClass: "s-done" },
      { label: "강남 복합건물 전기공사", status: "협의 중", statusClass: "s-ongoing" },
    ],
  },
  {
    id: "consulting",
    emoji: "📋",
    title: "컨설팅 제안·수주 관리",
    description: "제안서 발송부터 계약까지, 컨설팅 특유의 복잡한 의사결정 구조를 명확히 관리합니다.",
    points: [
      "제안서 버전·발송 이력 추적",
      "의사결정자별 관계 지도 관리",
      "컨설턴트별 어사인·가용율 파악",
      "프로젝트 수익성 분석",
    ],
    templateName: "컨설팅 템플릿",
    templateColor: "#0d9488",
    templateBg: "#ccfbf1",
    items: [
      { label: "삼성물산 — 디지털 전환 전략", status: "PT 준비", statusClass: "s-review" },
      { label: "한화그룹 — ESG 전략 수립", status: "제안서 검토", statusClass: "s-ongoing" },
      { label: "SK이노베이션 — M&A 자문", status: "계약 완료", statusClass: "s-done" },
      { label: "롯데케미칼 — 조직 개편", status: "협의 중", statusClass: "s-ongoing" },
    ],
  },
];

export function Industries() {
  const [activeIndustry, setActiveIndustry] = useState("manufacturing");
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

  const currentIndustry = industries.find((ind) => ind.id === activeIndustry);

  const getStatusClassName = (statusClass: string) => {
    const classes: Record<string, string> = {
      "s-ongoing": "bg-[var(--lp-teal-light)] text-[var(--lp-teal)]",
      "s-review": "bg-[var(--lp-amber-light)] text-[var(--lp-amber)]",
      "s-done": "bg-[#dcfce7] text-[#16a34a]",
    };
    return classes[statusClass] || "";
  };

  return (
    <section ref={sectionRef} className="bg-white py-24 px-[5vw]" id="industries">
      <div className="lp-reveal">
        <div className="text-[0.78rem] font-bold tracking-[2px] uppercase text-[var(--lp-accent)] mb-3">산업별 활용</div>
        <div className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black tracking-[-1px] text-[var(--lp-ink)] leading-[1.2] mb-4">
          어떤 업종이든<br />Dangol CRM이 맞춰집니다
        </div>
        <p className="text-base text-[var(--lp-ink-soft)] max-w-[560px]">
          B2B 영업의 구조는 업종마다 다릅니다. Dangol CRM은 각 산업의 특성에 맞게 유연하게 구성됩니다.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mt-12 mb-8 lp-reveal">
        {industries.map((industry) => (
          <button
            key={industry.id}
            onClick={() => setActiveIndustry(industry.id)}
            className={`px-4 py-2 rounded-full border-[1.5px] text-sm font-semibold cursor-pointer transition-all ${
              activeIndustry === industry.id
                ? "bg-[var(--lp-accent)] text-white border-[var(--lp-accent)]"
                : "bg-transparent text-[var(--lp-ink-soft)] border-[var(--lp-border)] hover:bg-[var(--lp-accent)] hover:text-white hover:border-[var(--lp-accent)]"
            }`}
          >
            {industry.emoji} {industry.title.split(" ")[0]}
          </button>
        ))}
      </div>

      {currentIndustry && (
        <div className="grid md:grid-cols-2 gap-10 items-center lp-reveal">
          <div>
            <h3 className="text-xl font-extrabold mb-3">
              {currentIndustry.emoji} {currentIndustry.title}
            </h3>
            <p className="text-sm text-[var(--lp-ink-soft)] mb-5">{currentIndustry.description}</p>
            <ul className="list-none flex flex-col gap-2.5">
              {currentIndustry.points.map((point, index) => (
                <li key={index} className="flex items-center gap-2.5 text-[0.88rem] text-[var(--lp-ink-soft)]">
                  <span className="font-bold text-[var(--lp-teal)]">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[var(--lp-bg)] rounded-2xl p-6 border border-[var(--lp-border)]">
            <div className="font-bold text-[0.85rem] text-[var(--lp-ink)] mb-4 flex items-center gap-2">
              📋 수주 현황판
              <span
                className="px-2.5 py-0.5 rounded-md text-[0.72rem]"
                style={{ background: currentIndustry.templateBg, color: currentIndustry.templateColor }}
              >
                {currentIndustry.templateName}
              </span>
            </div>
            {currentIndustry.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded-lg px-3.5 py-2.5 mb-2 text-xs border border-[var(--lp-border)]"
              >
                <span>{item.label}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[0.72rem] font-semibold ${getStatusClassName(item.statusClass)}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
