"use client";

import { categoryStyle, KINDS } from "../lib/categories";

export function cardVars(category) {
  const c = categoryStyle(category);
  return { "--c-bg": c.bg, "--c-fg": c.fg, "--c-accent": c.accent };
}

function compact(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

// 요약을 카드 안에 모두 보여주는 갤러리 카드. 카드 어디를 눌러도 원문이 새 탭으로 열린다.
export default function IdeaCard({ card, index, keywords = [], isNew, authed, scrapped, onToggleScrap }) {
  const c = categoryStyle(card.category);
  const kind = card.kind ? KINDS[card.kind] : null;
  const hasReactions = card.points != null || card.comments != null;
  return (
    <article className="ncard" style={cardVars(card.category)}>
      {keywords.length ? <span className="kwBadge">🔔 {keywords.join(", ")}</span> : null}
      <div className="ncardTop">
        <span className="ncardChips">
          {kind ? (
            <span className="kindChip">
              {kind.emoji} {card.kind}
            </span>
          ) : null}
          <span className="catChip">
            {c.emoji} {card.category}
          </span>
        </span>
        {isNew ? <span className="newBadge">NEW</span> : <span className="ncardNum">{String(index + 1).padStart(2, "0")}</span>}
      </div>

      <h3 className="ncardHeadline">
        {/* 카드 전체를 덮는 링크 (::after) */}
        <a className="ncardLink" href={card.url} target="_blank" rel="noreferrer">
          {card.headline}
        </a>
      </h3>

      {card.signal ? <p className="ncardSignal">📊 {card.signal}</p> : null}

      {card.summary.length ? (
        <ul className="ncardSummary">
          {card.summary.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      ) : null}

      {card.point ? (
        <div className="ncardPoint">
          <b>💡 응용 아이디어</b>
          <p>{card.point}</p>
        </div>
      ) : null}

      <div className="ncardMeta">
        <span className="ncardSource">
          {card.sourceLabel}
          {hasReactions ? (
            <span className="ncardReactions">
              {card.points != null ? ` · ▲ ${compact(card.points)}` : ""}
              {card.comments != null ? ` · 💬 ${compact(card.comments)}` : ""}
            </span>
          ) : card.tags.length ? (
            <span className="ncardTags"> · {card.tags.slice(0, 2).map((t) => `#${t}`).join(" ")}</span>
          ) : null}
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
