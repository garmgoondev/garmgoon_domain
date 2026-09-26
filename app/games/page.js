"use client";

import Link from "next/link";
import "./games.css";
import LangToggle from "../../components/games/LangToggle";
import { useGamesLang } from "../../lib/gamesLang";

const TEXT = {
  ko: {
    eyebrow: "🎮 게임",
    title: "게임",
    desc: "브라우저에서 바로 하는 작은 게임 모음",
    soonTitle: "다음 게임 준비 중",
    soonDesc: "여기에 새 게임이 추가돼요.",
  },
  en: {
    eyebrow: "🎮 Games",
    title: "Games",
    desc: "Small games you can play right in your browser",
    soonTitle: "More games coming",
    soonDesc: "New games will show up here.",
  },
};

const GAMES = [
  {
    href: "/games/adofai",
    art: "adofai",
    ko: {
      title: "얼음과 불의 춤",
      desc: "불과 얼음 행성이 번갈아 돌며 길을 따라가는 한 버튼 리듬 게임. 기본 레벨 6개와 원작 커스텀 레벨(.adofai) 불러오기.",
      tags: ["리듬", "한 버튼", "키보드·터치"],
    },
    en: {
      title: "A Dance of Fire and Ice",
      desc: "A one-button rhythm game where fire and ice planets take turns orbiting along a path. Six built-in levels, plus original custom levels (.adofai).",
      tags: ["Rhythm", "One button", "Keyboard & touch"],
    },
  },
  {
    href: "/games/typing",
    art: "typing",
    ko: {
      title: "타자 레이스",
      desc: "AI나 친구와 실시간으로 겨루는 타자 경주, 타이핑으로 싸우는 격투 모드.",
      tags: ["타자", "멀티플레이"],
    },
    en: {
      title: "Typing Race",
      desc: "Race an AI or friends in real time, or fight with your typing in Fighter mode.",
      tags: ["Typing", "Multiplayer"],
    },
  },
  {
    href: "/games/volley",
    art: "volley",
    ko: {
      title: "말랑 배구",
      desc: "피카츄 배구의 물리와 조작감을 그대로 옮긴 배구 게임. 귀여운 캐릭터에 내 사진을 얼굴로 붙일 수 있어요.",
      tags: ["스포츠", "컴퓨터·2인·온라인", "키보드·터치"],
    },
    en: {
      title: "Mallang Volley",
      desc: "Pikachu Volleyball's physics and controls, rebuilt with cute characters. Put your own photo on a character's face.",
      tags: ["Sports", "CPU · 2P · Online", "Keyboard & touch"],
    },
  },
];

export default function GamesPage() {
  const [lang] = useGamesLang();
  const t = TEXT[lang];
  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">{t.eyebrow}</div>
          <h1 className="pageTitle">{t.title}</h1>
          <p className="pageDesc">{t.desc}</p>
        </div>
        <LangToggle />
      </div>
      <div className="gameGrid">
        {GAMES.map((g) => {
          const c = g[lang];
          return (
            <Link key={g.href} href={g.href} className="gameCard">
              <div className={`gameArt ${g.art}`} aria-hidden="true">
                {g.art === "adofai" ? (
                  <>
                    <span className="track" />
                    <span className="orbit" />
                    <span className="planet fire" />
                    <span className="planet ice" />
                  </>
                ) : g.art === "volley" ? (
                  <>
                    <span className="volleySea" />
                    <span className="volleyNet" />
                    <span className="volleyBall" />
                  </>
                ) : (
                  <span className="typingArt">⌨️ 🏎️</span>
                )}
              </div>
              <div className="gameBody">
                <h2>{c.title}</h2>
                <p>{c.desc}</p>
                <div className="gameTags">
                  {c.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
        <div className="gameCard soon">
          <div className="gameArt soonArt" aria-hidden="true">
            ＋
          </div>
          <div className="gameBody">
            <h2>{t.soonTitle}</h2>
            <p>{t.soonDesc}</p>
          </div>
        </div>
      </div>
    </>
  );
}
