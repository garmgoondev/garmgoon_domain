"use client";

import { useGamesLang } from "../../lib/gamesLang";

export default function LangToggle() {
  const [lang, setLang] = useGamesLang();
  return (
    <button
      type="button"
      className="langToggle"
      onClick={() => setLang(lang === "ko" ? "en" : "ko")}
      aria-label={lang === "ko" ? "Switch to English" : "한국어로 보기"}
    >
      🌐 {lang === "ko" ? "English" : "한국어"}
    </button>
  );
}
