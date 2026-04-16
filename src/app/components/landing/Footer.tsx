export function Footer() {
  return (
    <footer className="bg-[var(--lp-ink)] text-[#94a3b8] py-14 px-[5vw]">
      <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
        <div>
          <h3 className="text-white text-xl font-extrabold mb-2.5">Dangol CRM</h3>
          <p className="text-[0.85rem] leading-relaxed max-w-[240px]">
            우리 회사에 꼭 맞는 CRM. 복잡함을 걷어내고, 영업에 집중할 수 있는 환경을 만들어 드립니다.
          </p>
        </div>
        {[
          { title: "제품", links: ["기능 소개", "요금제", "업데이트 로그", "로드맵"] },
          { title: "회사", links: ["회사 소개", "채용", "파트너십", "문의하기"] },
          { title: "지원", links: ["도움말 센터", "API 문서", "개인정보처리방침", "이용약관"] },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="text-[#e2e8f0] text-[0.85rem] font-bold mb-4">{col.title}</h4>
            <ul className="list-none flex flex-col gap-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="no-underline text-[#64748b] text-[0.85rem] transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 pt-7 flex items-center justify-between text-xs text-[#475569] flex-wrap gap-3">
        <span>© Dangol CRM. All rights reserved.</span>
      </div>
    </footer>
  );
}
