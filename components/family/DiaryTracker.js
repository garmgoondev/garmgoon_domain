"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatDay } from "../../lib/format";
import Avatar from "./Avatar";
import PostCard from "./PostCard";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function shortDayLabel(dayStr) {
  const [y, m, d] = dayStr.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { md: `${m}/${d}`, wd };
}

export default function DiaryTracker({ me, refreshKey = 0, onWriteToday }) {
  const [daysCount, setDaysCount] = useState(7);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    api(`/api/family/diaries?days=${daysCount}&offset=${offset}`)
      .then((res) => {
        if (!alive) return;
        setData(res);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [daysCount, offset, refreshKey]);

  if (!data || !data.members?.length) return null;

  const todayDone = data.members.filter((m) => m.wroteToday).length;
  const canInteract = !me?.isVirtualAdmin;

  function updateSelectedPost(nextPost) {
    setSelected((prev) => (prev ? { ...prev, post: nextPost } : null));
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map((m) => {
          const cell = m.days?.[nextPost.diaryDay];
          if (!cell || cell.postId !== nextPost.id) return m;
          return {
            ...m,
            days: {
              ...m.days,
              [nextPost.diaryDay]: {
                ...cell,
                mood: nextPost.mood,
                visibility: nextPost.visibility,
                post: nextPost,
              },
            },
          };
        }),
      };
    });
  }

  return (
    <section className="panel famDiaryTracker" aria-label="우리 가족 매일 일기 출석부">
      <div className="famDiaryTrackerHead">
        <div className="famDiaryTrackerTitleWrap">
          <div className="row" style={{ gap: 8 }}>
            <h2 className="famDiaryTrackerTitle">📔 매일 일기 출석부</h2>
            <span className="famDiaryTodaySummary">
              오늘 <b>{todayDone}</b>/{data.members.length}명 완료
            </span>
            {data.isAdmin ? <span className="famAdminBadge">👑 관리자 열람</span> : null}
          </div>
          <p className="famDiaryTrackerDesc">
            나만 보기로 일기를 써도 가족 모두가 매일 일기 작성 여부를 함께 확인하고 응원할 수 있어요.
          </p>
        </div>

        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <div className="chips famDiaryNav">
            <button type="button" className="chip" onClick={() => setOffset((o) => o - daysCount)} title="이전 기간">
              ◀ 이전
            </button>
            {offset < 0 ? (
              <>
                <button type="button" className="chip" onClick={() => setOffset((o) => Math.min(0, o + daysCount))} title="다음 기간">
                  다음 ▶
                </button>
                <button type="button" className="chip on" onClick={() => setOffset(0)}>
                  오늘로
                </button>
              </>
            ) : null}
          </div>
          <div className="chips famDiaryRange">
            {[
              [7, "7일"],
              [14, "14일"],
            ].map(([n, label]) => (
              <button key={n} type="button" className={`chip${daysCount === n ? " on" : ""}`} onClick={() => setDaysCount(n)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="famDiaryGridWrap">
        <table className="famDiaryTable">
          <thead>
            <tr>
              <th className="famDiaryMemberCol">구성원</th>
              {data.days.map((d) => {
                const { md, wd } = shortDayLabel(d);
                const isToday = d === data.today;
                return (
                  <th key={d} className={`famDiaryDayCol${isToday ? " today" : ""}`}>
                    <span className="famDiaryMd">{md}</span>
                    <span className="famDiaryWd">{isToday ? "오늘" : wd}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id} style={{ "--m": m.color }}>
                <td className="famDiaryMemberCell">
                  <div className="famDiaryMemberInfo">
                    <Avatar member={m} size={30} />
                    <div className="famDiaryMemberText">
                      <div className="row" style={{ gap: 6 }}>
                        <b>{m.name}</b>
                        {m.streak > 0 ? <span className="famDiaryStreak">🔥 {m.streak}일</span> : null}
                      </div>
                      <span className={`famDiaryStatusText${m.wroteToday ? " done" : ""}`}>
                        {m.wroteToday ? "✓ 오늘 일기 완료" : `${daysCount}일 중 ${m.writtenCount}일 작성`}
                      </span>
                    </div>
                  </div>
                </td>
                {data.days.map((d) => {
                  const cell = m.days[d];
                  const isToday = d === data.today;
                  const isSelected = selected?.memberId === m.id && selected?.day === d;
                  if (cell?.wrote) {
                    return (
                      <td key={d} className={`famDiaryCell${isToday ? " today" : ""}`}>
                        <button
                          type="button"
                          className={`famDiaryStamp done${isSelected ? " active" : ""}${cell.visibility === "private" ? " private" : ""}`}
                          onClick={() =>
                            setSelected(
                              isSelected
                                ? null
                                : {
                                    memberId: m.id,
                                    memberName: m.name,
                                    day: d,
                                    cell,
                                    post: cell.post,
                                  },
                            )
                          }
                          title={`${m.name} · ${formatDay(d)} 일기 작성 완료 (${cell.visibility === "private" ? "비공개" : "가족 공개"})`}
                          aria-label={`${m.name} ${formatDay(d)} 일기 완료`}
                        >
                          <span className="famDiaryStampEmoji">{cell.mood || "📔"}</span>
                          <span className="famDiaryStampSub">{cell.visibility === "private" ? (cell.canRead ? "🔒열람" : "🔒완료") : "✓완료"}</span>
                        </button>
                      </td>
                    );
                  }
                  const canWrite = isToday && me && m.id === me.id && onWriteToday;
                  return (
                    <td key={d} className={`famDiaryCell${isToday ? " today" : ""}`}>
                      {canWrite ? (
                        <button
                          type="button"
                          className="famDiaryStamp write"
                          onClick={onWriteToday}
                          title="오늘 일기 쓰러 가기"
                        >
                          <span>✍️</span>
                          <span className="famDiaryStampSub">쓰기</span>
                        </button>
                      ) : (
                        <span className="famDiaryStamp empty" title={`${m.name} · ${formatDay(d)} 미작성`}>
                          ·
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected?.post ? (
        <div className="famDiaryDetail">
          <div className="famDiaryDetailBar">
            <span>
              <b>{selected.memberName}</b>님의 <b>{formatDay(selected.day)}</b> 일기 기록
              {selected.post.adminView ? <span className="famAdminBadge" style={{ marginLeft: 8 }}>👑 관리자 열람 중</span> : null}
            </span>
            <button type="button" className="btn small ghost" onClick={() => setSelected(null)}>
              닫기 ✕
            </button>
          </div>
          <PostCard
            post={selected.post}
            canInteract={canInteract}
            onChange={updateSelectedPost}
          />
        </div>
      ) : null}
    </section>
  );
}
