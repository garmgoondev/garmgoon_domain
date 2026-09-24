const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// "2026-09-24" → "9월 24일 (목)"
export function formatDay(day) {
  const d = new Date(`${day}T00:00:00+09:00`);
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 (${WEEKDAYS[kst.getUTCDay()]})`;
}

export function shortDay(day) {
  const [, m, d] = day.split("-").map(Number);
  const kst = new Date(Date.parse(`${day}T00:00:00+09:00`) + 9 * 3600 * 1000);
  return { label: `${m}.${d}`, weekday: WEEKDAYS[kst.getUTCDay()] };
}

export function todayKst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
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
