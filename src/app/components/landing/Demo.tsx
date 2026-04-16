import { useState, useEffect, useRef } from "react";

export function Demo() {
  const [widgets, setWidgets] = useState({
    estimate: true,
    revenue: true,
    rate: true,
    new: false,
    pipe: false,
  });
  const [color, setColor] = useState("#1a472a");
  const [layout, setLayout] = useState(2);
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

  const toggleWidget = (key: keyof typeof widgets) => {
    setWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const colors = [
    { main: "#1a472a", light: "#e8f0ec", name: "브랜드 그린" },
    { main: "#0d9488", light: "#ccfbf1", name: "틸" },
    { main: "#7c3aed", light: "#ede9fe", name: "바이올렛" },
    { main: "#dc2626", light: "#fee2e2", name: "레드" },
    { main: "#d97706", light: "#fef3c7", name: "앰버" },
  ];

  const gridClass = layout === 1 ? "" : layout === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3";

  return (
    <section ref={sectionRef} className="bg-gradient-to-br from-[#0f172a] to-[#1e2a4a] text-white py-24 px-[5vw]" id="demo">
      <div className="lp-reveal">
        <div className="text-[0.78rem] font-bold tracking-[2px] uppercase text-[#7fc89d] mb-3">인터랙티브 데모</div>
        <div className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black tracking-[-1px] text-white leading-[1.2] mb-4">
          직접 커스터마이징해보세요
        </div>
        <p className="text-base text-[#94a3b8] max-w-[560px]">
          아래에서 원하는 위젯, 색상, 레이아웃을 선택해 나만의 대시보드를 만들어보세요.
        </p>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-8 mt-14 lp-reveal">
        <div className="bg-white/5 rounded-[var(--lp-radius)] p-6 border border-white/10">
          <h4 className="text-[0.85rem] font-bold text-[#94a3b8] tracking-wide uppercase mb-4">🎛️ 위젯 설정</h4>
          <div className="flex flex-col gap-3 mb-7">
            {[
              { key: "estimate", label: "견적 건수" },
              { key: "revenue", label: "계약 금액" },
              { key: "rate", label: "성공률" },
              { key: "new", label: "신규 고객" },
              { key: "pipe", label: "파이프라인 금액" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm text-[#cbd5e1]">{item.label}</span>
                <label className="relative w-10 h-5 cursor-pointer inline-block">
                  <input
                    type="checkbox"
                    checked={widgets[item.key as keyof typeof widgets]}
                    onChange={() => toggleWidget(item.key as keyof typeof widgets)}
                    className="opacity-0 w-0 h-0 peer"
                  />
                  <span className="absolute inset-0 bg-white/15 rounded-full transition-all peer-checked:bg-[var(--lp-accent)] before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:left-0.5 before:top-0.5 before:transition-all peer-checked:before:translate-x-[18px]"></span>
                </label>
              </div>
            ))}
          </div>

          <h4 className="text-[0.85rem] font-bold text-[#94a3b8] tracking-wide uppercase mb-4">🎨 테마 색상</h4>
          <div className="flex gap-2 mb-6">
            {colors.map((c) => (
              <div
                key={c.main}
                onClick={() => setColor(c.main)}
                className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-all ${
                  color === c.main ? "border-white scale-110" : "border-transparent"
                }`}
                style={{ background: c.main }}
                title={c.name}
              ></div>
            ))}
          </div>

          <h4 className="text-[0.85rem] font-bold text-[#94a3b8] tracking-wide uppercase mb-4">📐 레이아웃</h4>
          <div className="flex gap-2">
            {[
              { cols: 1, icon: "▬", label: "1열" },
              { cols: 2, icon: "⊞", label: "2열" },
              { cols: 3, icon: "⊟", label: "3열" },
            ].map((opt) => (
              <div
                key={opt.cols}
                onClick={() => setLayout(opt.cols)}
                className={`flex-1 p-2 rounded-lg cursor-pointer border-[1.5px] transition-all text-center text-xs ${
                  layout === opt.cols
                    ? "border-[var(--lp-accent)] bg-[rgba(26,71,42,0.15)] text-[#7fc89d]"
                    : "border-transparent bg-white/10 text-[#94a3b8]"
                }`}
              >
                <span className="block text-lg mb-1">{opt.icon}</span>
                {opt.label}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 rounded-[var(--lp-radius)] p-6 border border-white/10 transition-all">
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-bold text-[#f1f5f9]">📊 나의 대시보드 미리보기</span>
            <span
              className="text-[0.72rem] px-3 py-1 rounded-full font-semibold"
              style={{ background: "rgba(26,71,42,0.3)", color: color }}
            >
              실시간 반영 중
            </span>
          </div>
          <div className={`grid gap-3 ${gridClass}`}>
            {widgets.estimate && (
              <div className="bg-white/10 rounded-xl p-4 border border-white/10 transition-all">
                <div className="text-[0.72rem] text-[#64748b] mb-1.5">견적 건수</div>
                <div className="text-xl font-extrabold text-[#f1f5f9]">48건</div>
                <div className="text-[0.72rem] text-[#10b981] mt-0.5">↑ 12% 지난달 대비</div>
                <div className="h-1.5 rounded-full mt-2 opacity-70" style={{ background: color, width: "72%" }}></div>
              </div>
            )}
            {widgets.revenue && (
              <div className="bg-white/10 rounded-xl p-4 border border-white/10 transition-all">
                <div className="text-[0.72rem] text-[#64748b] mb-1.5">계약 금액</div>
                <div className="text-xl font-extrabold text-[#f1f5f9]">₩2.4억</div>
                <div className="text-[0.72rem] text-[#10b981] mt-0.5">↑ 8% 지난달 대비</div>
                <div className="h-1.5 rounded-full mt-2 opacity-70" style={{ background: color, width: "58%" }}></div>
              </div>
            )}
            {widgets.rate && (
              <div className="bg-white/10 rounded-xl p-4 border border-white/10 transition-all">
                <div className="text-[0.72rem] text-[#64748b] mb-1.5">계약 성공률</div>
                <div className="text-xl font-extrabold text-[#f1f5f9]">43.7%</div>
                <div className="text-[0.72rem] text-[#10b981] mt-0.5">↑ 3.2%p 전월 대비</div>
                <div className="h-1.5 rounded-full mt-2 opacity-70" style={{ background: color, width: "44%" }}></div>
              </div>
            )}
            {widgets.new && (
              <div className="bg-white/10 rounded-xl p-4 border border-white/10 transition-all">
                <div className="text-[0.72rem] text-[#64748b] mb-1.5">신규 고객</div>
                <div className="text-xl font-extrabold text-[#f1f5f9]">12명</div>
                <div className="text-[0.72rem] text-[#10b981] mt-0.5">↑ 5% 지난달 대비</div>
                <div className="h-1.5 rounded-full mt-2 opacity-70" style={{ background: color, width: "35%" }}></div>
              </div>
            )}
            {widgets.pipe && (
              <div className="bg-white/10 rounded-xl p-4 border border-white/10 transition-all">
                <div className="text-[0.72rem] text-[#64748b] mb-1.5">파이프라인 금액</div>
                <div className="text-xl font-extrabold text-[#f1f5f9]">₩8.1억</div>
                <div className="text-[0.72rem] text-[#10b981] mt-0.5">진행 중인 모든 딜</div>
                <div className="h-1.5 rounded-full mt-2 opacity-70" style={{ background: color, width: "81%" }}></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
