"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { categoryStyle } from "../lib/categories";
import { cardVars } from "./IdeaCard";

const SLIDES = 3;

// 인스타그램 카드뉴스처럼 표지 → 3줄 요약 → 사업 포인트 순서로 넘겨 보는 뷰어.
// 마지막 장에서 다음으로 넘기면 다음 카드의 표지로 이어진다.
export default function CardViewer({ cards, index, onIndex, onClose, authed, scrapped, onToggleScrap }) {
  const card = cards[index];
  const [slide, setSlide] = useState(0);
  const [noteState, setNoteState] = useState("");
  const pendingSlide = useRef(0);
  const touch = useRef(null);

  useEffect(() => {
    setSlide(pendingSlide.current);
    pendingSlide.current = 0;
    setNoteState("");
  }, [index]);

  const next = () => {
    if (slide < SLIDES - 1) setSlide(slide + 1);
    else if (index < cards.length - 1) onIndex(index + 1);
  };
  const prev = () => {
    if (slide > 0) setSlide(slide - 1);
    else if (index > 0) {
      pendingSlide.current = SLIDES - 1;
      onIndex(index - 1);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  });

  if (!card) return null;
  const c = categoryStyle(card.category);
  const isScrapped = scrapped.has(card.id);

  async function makeNote() {
    setNoteState("saving");
    try {
      await api("/api/p/notes", {
        method: "POST",
        body: {
          title: card.headline,
          body: [...card.summary.map((s) => `- ${s}`), "", card.point].join("\n").trim(),
          link: card.url,
          tags: card.tags,
        },
      });
      setNoteState("saved");
    } catch (e) {
      setNoteState(e.message);
    }
  }

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={card.headline} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="viewerInner">
        <div className="viewerTop">
          <span>
            {index + 1} / {cards.length}
          </span>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div
          className="stage"
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current == null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (dx < -50) next();
            if (dx > 50) prev();
            touch.current = null;
          }}
        >
          <div className="track" style={{ transform: `translateX(-${slide * 100}%)` }}>
            <section className="slide ncard slideCover" style={cardVars(card.category)}>
              <div className="ncardTop">
                <span className="catChip">
                  {c.emoji} {card.category}
                </span>
                <span className="ncardNum">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="ncardHeadline">{card.headline}</h2>
              {card.title !== card.headline ? <p className="slideOrigin">원문: {card.title}</p> : null}
              <div className="ncardMeta">
                <span>{card.sourceLabel}</span>
                <span>넘겨서 보기 →</span>
              </div>
            </section>

            <section className="slide ncard" style={cardVars(card.category)}>
              <div className="slideLabel">SUMMARY</div>
              <h3 className="slideTitle">3줄 요약</h3>
              <ol className="summaryList">
                {card.summary.map((s, i) => (
                  <li key={i}>
                    <span className="n">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="slide ncard" style={cardVars(card.category)}>
              <div className="slideLabel">BUSINESS POINT</div>
              <h3 className="slideTitle">💡 사업 포인트</h3>
              <div className="pointBox">{card.point || "AI 요약이 준비되지 않은 카드예요. 원문을 확인해 주세요."}</div>
              {card.tags.length ? (
                <div className="tagRow">
                  {card.tags.map((t) => (
                    <span key={t} className="tag">
                      #{t}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="slideActions">
                <a className="btn small" href={card.url} target="_blank" rel="noreferrer">
                  원문 보기 ↗
                </a>
                {authed ? (
                  <>
                    <button type="button" className="btn small ghost" onClick={() => onToggleScrap(card)}>
                      {isScrapped ? "★ 스크랩됨" : "☆ 스크랩"}
                    </button>
                    <button type="button" className="btn small ghost" onClick={makeNote} disabled={noteState === "saving" || noteState === "saved"}>
                      {noteState === "saved" ? "✓ 노트에 추가됨" : noteState === "saving" ? "추가 중…" : "✎ 아이디어 노트로"}
                    </button>
                  </>
                ) : null}
              </div>
              {noteState && !["saving", "saved"].includes(noteState) ? <p className="slideOrigin">{noteState}</p> : null}
            </section>
          </div>
        </div>

        <div className="viewerNav">
          <button type="button" className="iconBtn" onClick={prev} disabled={index === 0 && slide === 0} aria-label="이전">
            ←
          </button>
          <div className="dots">
            {Array.from({ length: SLIDES }, (_, i) => (
              <button key={i} type="button" className={i === slide ? "on" : ""} onClick={() => setSlide(i)} aria-label={`${i + 1}번째 장`} />
            ))}
          </div>
          <button type="button" className="iconBtn" onClick={next} disabled={index === cards.length - 1 && slide === SLIDES - 1} aria-label="다음">
            →
          </button>
        </div>
      </div>
    </div>
  );
}
