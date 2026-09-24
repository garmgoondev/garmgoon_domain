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
  기타: { bg: "#B8A6FF", fg: "#1D1340", accent: "#4B3A99", emoji: "✨" },
};

export const CATEGORY_NAMES = Object.keys(CATEGORIES);

export function categoryStyle(name) {
  return CATEGORIES[name] || CATEGORIES.기타;
}
