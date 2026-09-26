import Link from "next/link";
import "./games.css";

const GAMES = [
  {
    href: "/games/adofai",
    title: "얼음과 불의 춤",
    desc: "불과 얼음 행성이 번갈아 돌며 길을 따라가는 한 버튼 리듬 게임. 기본 레벨 6개와 원작 커스텀 레벨(.adofai) 불러오기.",
    tags: ["리듬", "한 버튼", "키보드·터치"],
    art: "adofai",
  },
  {
    href: "/typing",
    title: "타자 레이스",
    desc: "친구와 실시간으로 겨루는 타자 경주와 격투 모드.",
    tags: ["타자", "멀티플레이"],
    art: "typing",
  },
];

export default function GamesPage() {
  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">🎮 게임</div>
          <h1 className="pageTitle">게임</h1>
          <p className="pageDesc">브라우저에서 바로 하는 작은 게임 모음</p>
        </div>
      </div>
      <div className="gameGrid">
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} className="gameCard">
            <div className={`gameArt ${g.art}`} aria-hidden="true">
              {g.art === "adofai" ? (
                <>
                  <span className="track" />
                  <span className="orbit" />
                  <span className="planet fire" />
                  <span className="planet ice" />
                </>
              ) : (
                <span className="typingArt">⌨️ 🏎️</span>
              )}
            </div>
            <div className="gameBody">
              <h2>{g.title}</h2>
              <p>{g.desc}</p>
              <div className="gameTags">
                {g.tags.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </div>
          </Link>
        ))}
        <div className="gameCard soon">
          <div className="gameArt soonArt" aria-hidden="true">
            ＋
          </div>
          <div className="gameBody">
            <h2>다음 게임 준비 중</h2>
            <p>여기에 새 게임이 추가돼요.</p>
          </div>
        </div>
      </div>
    </>
  );
}
