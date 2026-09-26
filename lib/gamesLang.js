// 게임 섹션 공용 언어 설정 (사이트의 나머지 부분은 한국어 그대로)
import { useEffect, useState } from "react";

const KEY = "games_lang";
const EVENT = "games-lang";
const valid = (v) => v === "ko" || v === "en";

export function readGamesLang() {
  if (typeof window === "undefined") return "ko";
  const param = new URLSearchParams(window.location.search).get("lang");
  if (valid(param)) return param;
  try {
    // 예전 타자 레이스 설정도 이어받는다
    const saved = localStorage.getItem(KEY) || localStorage.getItem("typing_lang");
    if (valid(saved)) return saved;
  } catch {}
  return (navigator.language || "").toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function setGamesLang(lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: lang }));
}

// 같은 화면의 다른 게임 컴포넌트와 언어를 맞춘다
export function useGamesLang() {
  const [lang, setLang] = useState("ko");
  useEffect(() => {
    setLang(readGamesLang());
    const on = (e) => setLang(e.detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [lang, setGamesLang];
}
