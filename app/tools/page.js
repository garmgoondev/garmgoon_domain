"use client";

// 나만 쓰는 SaaS 도구 모음. 새 도구를 만들면 이 목록에 추가한다.
// 예: { emoji: "🧮", name: "마진 계산기", description: "원가와 수수료로 판매가를 계산", href: "/tools/margin" }
const TOOLS = [
  {
    emoji: "⚡",
    name: "자동화 통합 현황판",
    description: "내 도메인, 서버, PC에서 가동 중인 6대 자동화 상태 모니터링",
    href: "/automations",
  },
  {
    emoji: "🛠️",
    name: "BoriTools",
    description: "브라우저 기반 범용 파일 변환기 및 개발자·PDF·텍스트 도구 모음",
    href: "https://boritools.garmgoon.com",
  },
  {
    emoji: "📊",
    name: "YouTube Research",
    description: "한미 유튜브 급상승 트렌드 분석, 유망 채널 발굴 및 시계열 모니터링",
    href: "https://ytr.garmgoon.com",
  },
  {
    emoji: "🎬",
    name: "김편집 (KimEdit)",
    description: "영상 타임코드·화면 핀 피드백 및 프리미어 마커 연동 영상 협업 SaaS",
    href: "https://kimedit.com",
  },
];

const EMPTY_SLOTS = 6;

export default function ToolsPage() {
  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">🧰 MY SAAS &amp; UTILITIES</div>
          <h1 className="pageTitle">SaaS 도구함 &amp; 웹 유틸리티</h1>
          <p className="pageDesc">
            업무 자동화와 생산성 향상을 위해 직접 기획하고 개발하여 실무에 운용 중인 웹 도구 모음입니다. 자동화 통합 현황판, 파일 변환기, 유튜브 트렌드 리서치, 영상 피드백 도구를 자유롭게 탐색해 보세요.
          </p>
        </div>
      </div>
      <div className="toolGrid">
        {TOOLS.map((t) => (
          <a
            key={t.name}
            href={t.href}
            className="toolCard"
            target={t.href.startsWith("http") ? "_blank" : undefined}
            rel={t.href.startsWith("http") ? "noopener noreferrer" : undefined}
          >
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
