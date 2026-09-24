// 카드뉴스 카테고리. Worker(AI 분류)와 프론트엔드(카드 색상)가 함께 사용한다.
export const CATEGORIES = {
  AI: { bg: "#6C4CF1", fg: "#FFFFFF", accent: "#C9BCFF", emoji: "🤖" },
  SaaS: { bg: "#1F6BFF", fg: "#FFFFFF", accent: "#B5CCFF", emoji: "☁️" },
  커머스: { bg: "#FF6B2C", fg: "#FFFFFF", accent: "#FFD1BA", emoji: "🛍️" },
  핀테크: { bg: "#00A676", fg: "#FFFFFF", accent: "#B3EBD9", emoji: "💳" },
  콘텐츠: { bg: "#FF4F8B", fg: "#FFFFFF", accent: "#FFC7DA", emoji: "🎬" },
  헬스: { bg: "#00A3B4", fg: "#FFFFFF", accent: "#B0ECF2", emoji: "🩺" },
  교육: { bg: "#FFC933", fg: "#2A2100", accent: "#6B5300", emoji: "📚" },
  생산성: { bg: "#23262F", fg: "#FFFFFF", accent: "#D4FF5A", emoji: "⚡" },
  마케팅: { bg: "#E63946", fg: "#FFFFFF", accent: "#FFC2C7", emoji: "📣" },
  하드웨어: { bg: "#56657A", fg: "#FFFFFF", accent: "#CFD8E3", emoji: "🔧" },
  로컬서비스: { bg: "#8A5A2B", fg: "#FFFFFF", accent: "#F2D3B3", emoji: "🧹" },
  푸드: { bg: "#F2994A", fg: "#2B1400", accent: "#7A3E00", emoji: "🍜" },
  기타: { bg: "#B8A6FF", fg: "#1D1340", accent: "#4B3A99", emoji: "✨" },
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

export function categoryStyle(name) {
  return CATEGORIES[name] || CATEGORIES.기타;
}

// 카드 유형. 사용자가 찾는 "새 비즈니스 기회"의 종류를 나눈다.
export const KINDS = {
  "아이디어 검증": { emoji: "💡", short: "호응 큰 검증·수요 글", desc: "아직 시작 전이거나 초기 단계에서 수요를 확인하는 글, 누가 만들어 줬으면 하는 요청" },
  "수익 사례": { emoji: "💰", short: "돈 버는 니치 사업", desc: "작더라도 실제로 돈을 벌고 있는 니치 사업" },
  "새로운 모델": { emoji: "🧩", short: "새 사업 형태·업종", desc: "새로운 사업 형태, 업종, 판매·수익 방식" },
  "트렌드 신호": { emoji: "📈", short: "시장 변화·새 수요", desc: "시장 변화와 새로 생기는 수요" },
};

export const KIND_NAMES = Object.keys(KINDS);
