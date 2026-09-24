"use client";

import { categoryStyle } from "../lib/categories";

export function cardVars(category) {
  const c = categoryStyle(category);
  return { "--c-bg": c.bg, "--c-fg": c.fg, "--c-accent": c.accent };
}

export default function IdeaCard({ card, index, keywords = [], scrapped, onOpen }) {
  const c = categoryStyle(card.category);
  return (
    <button type="button" className="ncard" style={cardVars(card.category)} onClick={onOpen}>
      {keywords.length ? <span className="kwBadge">🔔 {keywords[0]}</span> : null}
      <div className="ncardTop">
        <span className="catChip">
          {c.emoji} {card.category}
        </span>
        <span className="ncardNum">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <h3 className="ncardHeadline">{card.headline}</h3>
      {scrapped ? <span className="scrapMark" aria-label="스크랩함">★</span> : null}
      <div className="ncardMeta">
        <span>{card.sourceLabel}</span>
        <span className="ncardTags">{card.tags.slice(0, 2).map((t) => `#${t}`).join(" ")}</span>
      </div>
    </button>
  );
}
