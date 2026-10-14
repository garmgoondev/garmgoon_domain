"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { DATE_KINDS, dDayLabel, mondayOf } from "../../lib/family";
import { todayLocal } from "../../lib/format";

const KIND_ICON = Object.fromEntries(DATE_KINDS.map(([id, icon]) => [id, icon]));

// 다가오는 생일·기념일·이벤트가 있을 때만 상단에 한 줄로 간결하게 표시한다
export default function FamilyPulse({ onOpenBoard }) {
  const today = todayLocal();
  const [board, setBoard] = useState(null);

  useEffect(() => {
    let alive = true;
    const start = mondayOf(today);
    api(`/api/family/board/week?start=${start}&today=${today}`)
      .then((d) => alive && setBoard(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [today]);

  const nearDates = (board?.upcoming || []).filter((d) => d.dDay <= 14).slice(0, 4);
  if (!nearDates.length) return null;

  return (
    <div
      className="famEventLine"
      onClick={onOpenBoard}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenBoard?.();
        }
      }}
      title="클릭하면 우리집 보드로 이동해요"
    >
      <span className="famEventLineLabel">🗓️ 예정된 기념일</span>
      <div className="famEventLineItems">
        {nearDates.map((d) => (
          <span key={d.id} className="famEventPill">
            {KIND_ICON[d.kind] || "🎂"} {d.title} <b>{dDayLabel(d.dDay)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
