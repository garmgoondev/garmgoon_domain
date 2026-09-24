"use client";

import { categoryStyle } from "../lib/categories";

export function cardVars(category) {
  const c = categoryStyle(category);
  return { "--c-bg": c.bg, "--c-fg": c.fg, "--c-accent": c.accent };
}

// 요약을 카드 안에 모두 보여주는 갤러리 카드. 카드 어디를 눌러도 원문이 새 탭으로 열린다.
export default function IdeaCard({ card, index, keywords = [], authed, scrapped, onToggleScrap }) {
  const c = categoryStyle(card.category);
  return (
    <article className="ncard" style={cardVars(card.category)}>
      {keywords.length ? <span className="kwBadge">🔔 {keywords.join(", ")}</span> : null}
      <div className="ncardTop">
        <span className="catChip">
          {c.emoji} {card.category}
        </span>
        <span className="ncardNum">{String(index + 1).padStart(2, "0")}</span>
      </div>

      <h3 className="ncardHeadline">
        {/* 카드 전체를 덮는 링크 (::after) */}
        <a className="ncardLink" href={card.url} target="_blank" rel="noreferrer">
          {card.headline}
        </a>
      </h3>

      {card.summary.length ? (
        <ul className="ncardSummary">
          {card.summary.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : null}

      {card.point ? <p className="ncardPoint">💡 {card.point}</p> : null}

      <div className="ncardMeta">
        <span className="ncardSource">
          {card.sourceLabel}
          {card.tags.length ? <span className="ncardTags"> · {card.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}</span> : null}
        </span>
        <span className="ncardActions">
          {authed ? (
            <button
              type="button"
              className="ncardScrap"
              onClick={() => onToggleScrap(card)}
              aria-label={scrapped ? "스크랩 해제" : "스크랩"}
              aria-pressed={scrapped}
            >
              {scrapped ? "★" : "☆"}
            </button>
          ) : null}
          <span className="ncardOpen" aria-hidden="true">
            원문 ↗
          </span>
        </span>
      </div>
    </article>
  );
}
