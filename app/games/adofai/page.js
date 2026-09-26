"use client";

import Link from "next/link";
import "../games.css";
import "./adofai.css";
import AdofaiGame from "../../../components/games/adofai/AdofaiGame";

export default function AdofaiPage() {
  return (
    <>
      <div className="gameHead">
        <Link href="/games" className="gameBack">
          ← 게임 목록
        </Link>
        <h1 className="gameTitle">얼음과 불의 춤</h1>
      </div>
      <AdofaiGame />
    </>
  );
}
