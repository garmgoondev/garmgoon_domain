"use client";

import Link from "next/link";
import "../games.css";
import "./adofai.css";
import AdofaiGame from "../../../components/games/adofai/AdofaiGame";
import LangToggle from "../../../components/games/LangToggle";
import { ADOFAI_TEXT } from "../../../lib/adofai/i18n";
import { useGamesLang } from "../../../lib/gamesLang";

export default function AdofaiPage() {
  const [lang] = useGamesLang();
  const t = ADOFAI_TEXT[lang];
  return (
    <>
      <div className="gameHead">
        <Link href="/games" className="gameBack">
          {t.backToGames}
        </Link>
        <h1 className="gameTitle">{t.pageTitle}</h1>
        <LangToggle />
      </div>
      <AdofaiGame lang={lang} />
    </>
  );
}
