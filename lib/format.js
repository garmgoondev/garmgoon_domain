const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function weekdayOf(day) {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

// "2026-09-24" → "9월 24일 (목)"
export function formatDay(day) {
  const [, m, d] = day.split("-").map(Number);
  return `${m}월 ${d}일 (${weekdayOf(day)})`;
}

export function shortDay(day) {
  const [, m, d] = day.split("-").map(Number);
  return { label: `${m}.${d}`, weekday: weekdayOf(day) };
}

// 브라우저 기준 오늘 날짜 (YYYY-MM-DD)
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function timeAgo(ms) {
  if (!ms) return "";
  const diff = (Date.now() - ms) / 1000;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(ms + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
}

export function matchKeywords(text, keywords) {
  const t = text.toLowerCase();
  return keywords.filter((k) => t.includes(k.word.toLowerCase())).map((k) => k.word);
}
