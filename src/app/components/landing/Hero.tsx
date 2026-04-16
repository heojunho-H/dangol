import { useNavigate } from "react-router";

export function Hero() {
  const nav = useNavigate();
  return (
    <section className="min-h-screen flex flex-col md:flex-row items-center px-[5vw] pt-[100px] pb-20 relative overflow-hidden bg-gradient-to-br from-[#eef5f0] via-[#f5f6fa] to-[#e8f0ec]">
      <div className="absolute w-[600px] h-[600px] rounded-full blur-[80px] bg-[rgba(26,71,42,0.12)] -top-[200px] -right-[100px] pointer-events-none"></div>
      <div className="absolute w-[400px] h-[400px] rounded-full blur-[80px] bg-[rgba(45,103,65,0.1)] -bottom-[100px] left-[10%] pointer-events-none"></div>

      <div className="max-w-[640px] relative z-[2]" style={{ animation: "lp-fadeUp 0.8s ease both" }}>
        <div className="inline-flex items-center gap-2 bg-[var(--lp-accent-light)] text-[var(--lp-accent)] px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide mb-7">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--lp-accent)]" style={{ animation: "lp-pulse 1.5s infinite" }}></div>
          B2B CRM — 새로운 기준
        </div>
        <h1 className="text-[clamp(2.4rem,5vw,3.6rem)] font-black leading-[1.18] tracking-[-1.5px] text-[var(--lp-ink)] mb-5">
          복잡함은 끝.<br />
          <em className="not-italic text-[var(--lp-accent)]">나만의 CRM</em>을<br />
          지금 바로 시작하세요.
        </h1>
        <p className="text-lg text-[var(--lp-ink-soft)] mb-9 max-w-[520px]">
          세XX포스나 허브XX처럼 무겁고 복잡한 도구는 이제 그만. Dangol CRM은 우리 회사에 꼭 맞는 구조로, 아무 기술 지식 없이도 자유롭게 커스터마이징할 수 있습니다.
        </p>
        <div className="flex gap-3.5 flex-wrap mb-12">
          <button
            type="button"
            onClick={() => nav("/signup")}
            className="bg-[var(--lp-accent)] text-white px-7 py-3.5 rounded-[10px] text-[0.95rem] font-bold border-0 cursor-pointer transition-all hover:bg-[#0f3820] hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(26,71,42,0.35)] hover:shadow-[0_6px_28px_rgba(26,71,42,0.4)]"
          >
            🚀 무료로 시작하기
          </button>
          <a href="#demo" className="bg-white text-[var(--lp-ink)] px-7 py-3.5 rounded-[10px] text-[0.95rem] font-semibold no-underline border-[1.5px] border-[var(--lp-border)] transition-all hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)] hover:-translate-y-0.5">
            데모 체험하기
          </a>
        </div>
        <div className="flex gap-8 flex-wrap">
          <div className="flex flex-col">
            <span className="text-[1.8rem] font-black text-[var(--lp-ink)] tracking-[-1px]">3분</span>
            <span className="text-xs text-[var(--lp-ink-muted)] mt-0.5">평균 설정 소요 시간</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[1.8rem] font-black text-[var(--lp-ink)] tracking-[-1px]">98%</span>
            <span className="text-xs text-[var(--lp-ink-muted)] mt-0.5">고객 만족도</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[1.8rem] font-black text-[var(--lp-ink)] tracking-[-1px]">500+</span>
            <span className="text-xs text-[var(--lp-ink-muted)] mt-0.5">국내 B2B 기업 도입</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-center md:justify-end items-center relative z-[2] min-w-[340px] mt-12 md:mt-0" style={{ animation: "lp-fadeLeft 0.9s 0.2s ease both" }}>
        <div className="bg-white rounded-[20px] shadow-[var(--lp-shadow-lg)] p-6 w-full max-w-[460px] border border-[var(--lp-border)]">
          <div className="flex items-center justify-between mb-5">
            <span className="font-bold text-sm text-[var(--lp-ink)]">📊 영업 대시보드</span>
            <span className="bg-[var(--lp-accent-light)] text-[var(--lp-accent)] px-3 py-1 rounded-md text-xs font-semibold">2026년 4월</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[var(--lp-bg)] rounded-xl p-3.5 border border-[var(--lp-border)]">
              <div className="text-[0.7rem] text-[var(--lp-ink-muted)] mb-1">견적 건수</div>
              <div className="text-lg font-extrabold text-[var(--lp-ink)]">48</div>
              <div className="text-[0.68rem] font-semibold text-[var(--lp-teal)]">↑ 12%</div>
            </div>
            <div className="bg-[var(--lp-bg)] rounded-xl p-3.5 border border-[var(--lp-border)]">
              <div className="text-[0.7rem] text-[var(--lp-ink-muted)] mb-1">계약 성공</div>
              <div className="text-lg font-extrabold text-[var(--lp-ink)]">21</div>
              <div className="text-[0.68rem] font-semibold text-[var(--lp-teal)]">↑ 8%</div>
            </div>
            <div className="bg-[var(--lp-bg)] rounded-xl p-3.5 border border-[var(--lp-border)]">
              <div className="text-[0.7rem] text-[var(--lp-ink-muted)] mb-1">성공률</div>
              <div className="text-lg font-extrabold text-[var(--lp-ink)]">43.7%</div>
              <div className="text-[0.68rem] font-semibold text-[var(--lp-teal)]">↑ 3.2%p</div>
            </div>
          </div>
          <div className="flex gap-1.5 mb-4">
            <div className="flex-1 bg-[var(--lp-bg)] rounded-lg p-2 text-center border-[1.5px] border-transparent text-[0.68rem] font-semibold text-[var(--lp-ink-muted)]">
              <span className="block text-base font-extrabold text-[var(--lp-ink)]">48</span>신규
            </div>
            <div className="flex-1 bg-[var(--lp-accent-light)] rounded-lg p-2 text-center border-[1.5px] border-[var(--lp-accent)] text-[0.68rem] font-semibold text-[var(--lp-accent)]">
              <span className="block text-base font-extrabold text-[var(--lp-ink)]">36</span>상담
            </div>
            <div className="flex-1 bg-[var(--lp-bg)] rounded-lg p-2 text-center border-[1.5px] border-transparent text-[0.68rem] font-semibold text-[var(--lp-ink-muted)]">
              <span className="block text-base font-extrabold text-[var(--lp-ink)]">28</span>견적
            </div>
            <div className="flex-1 bg-[var(--lp-bg)] rounded-lg p-2 text-center border-[1.5px] border-transparent text-[0.68rem] font-semibold text-[var(--lp-ink-muted)]">
              <span className="block text-base font-extrabold text-[var(--lp-ink)]">21</span>계약
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[0.72rem] text-[var(--lp-ink-muted)] mb-2">
              <span>채널별 성과</span>
              <span>이번 달</span>
            </div>
            <div className="bg-[var(--lp-bg)] rounded-full h-2 mb-2 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--lp-accent)] w-[72%]"></div>
            </div>
            <div className="bg-[var(--lp-bg)] rounded-full h-2 mb-2 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--lp-teal)] w-[45%]"></div>
            </div>
            <div className="bg-[var(--lp-bg)] rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full bg-[var(--lp-amber)] w-[58%]"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
