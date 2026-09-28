"use client";

import { useState } from "react";
import Dates from "./Dates";
import Notes from "./Notes";
import NotifySettings from "./NotifySettings";
import Shopping from "./Shopping";
import WeekTasks from "./WeekTasks";
import "./board.css";

const SECTIONS = [
  ["tasks", "✅ 할 일"],
  ["shopping", "🛒 장보기"],
  ["notes", "📒 정보"],
  ["dates", "🎂 기념일"],
];

// 우리집 보드: 이번 주 할 일, 장보기, 기억할 정보, 기념일
export default function Board({ me, members }) {
  const [section, setSection] = useState("tasks");
  const [notify, setNotify] = useState(false);

  return (
    <div className="board">
      <div className="boardTop">
        <div className="famSeg boardSections">
          {SECTIONS.map(([id, label]) => (
            <button key={id} type="button" className={section === id ? "on" : ""} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className={`btn small ${notify ? "" : "ghost"}`} onClick={() => setNotify((v) => !v)} aria-expanded={notify}>
          🔔 알림
        </button>
      </div>
      {notify ? <NotifySettings onClose={() => setNotify(false)} /> : null}
      {section === "tasks" ? <WeekTasks me={me} members={members} /> : null}
      {section === "shopping" ? <Shopping members={members} /> : null}
      {section === "notes" ? <Notes members={members} /> : null}
      {section === "dates" ? <Dates /> : null}
    </div>
  );
}
