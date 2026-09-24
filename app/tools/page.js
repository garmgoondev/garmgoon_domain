"use client";

// 나만 쓰는 SaaS 도구 모음. 새 도구를 만들면 이 목록에 추가한다.
// 예: { emoji: "🧮", name: "마진 계산기", description: "원가와 수수료로 판매가를 계산", href: "/tools/margin" }
const TOOLS = [];

const EMPTY_SLOTS = 6;

export default function ToolsPage() {
  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">🧰 MY SAAS</div>
          <h1 className="pageTitle">SaaS 도구함</h1>
          <p className="pageDesc">직접 만들어 쓰는 작은 도구들을 모아두는 곳이에요.</p>
        </div>
      </div>
      <div className="toolGrid">
        {TOOLS.map((t) => (
          <a key={t.name} href={t.href} className="toolCard">
            <span className="emoji">{t.emoji}</span>
            <b>{t.name}</b>
            <p>{t.description}</p>
          </a>
        ))}
        {Array.from({ length: Math.max(0, EMPTY_SLOTS - TOOLS.length) }, (_, i) => (
          <div key={i} className="toolSlot">
            <span className="plus">＋</span>
            {i === 0 && !TOOLS.length ? "첫 번째 도구를 기다리는 자리" : "빈 자리"}
          </div>
        ))}
      </div>
    </>
  );
}
