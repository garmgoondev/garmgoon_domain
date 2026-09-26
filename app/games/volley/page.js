"use client";

import Link from "next/link";
import "../games.css";
import "./volley.css";
import LangToggle from "../../../components/games/LangToggle";
import VolleyGame from "../../../components/games/volley/VolleyGame";
import { VOLLEY_TEXT } from "../../../lib/volley/i18n";
import { useGamesLang } from "../../../lib/gamesLang";

export default function VolleyPage() {
  const [lang] = useGamesLang();
  const t = VOLLEY_TEXT[lang];
  return (
    <>
      <div className="gameHead">
        <Link href="/games" className="gameBack">
          {t.backToGames}
        </Link>
        <h1 className="gameTitle">{t.pageTitle}</h1>
        <LangToggle />
      </div>
      <VolleyGame lang={lang} />
    </>
  );
}
