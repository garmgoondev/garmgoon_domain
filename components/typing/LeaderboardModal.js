"use client";

import { useEffect, useState } from "react";

export default function LeaderboardModal({ isOpen, onClose, t = null }) {
  const [period, setPeriod] = useState("all");
  const [scores, setScores] = useState([]);
  const [stats, setStats] = useState({ totalRuns: 0, maxWpm: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;
    setLoading(true);

    fetch(`/api/typing/leaderboard?period=${period}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        if (alive && data.scores) {
          setScores(data.scores);
          setStats(data.stats || { totalRuns: 0, maxWpm: 0 });
        }
      })
      .catch((err) => console.error("리더보드 로드 오류:", err))
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [isOpen, period]);

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard leaderboardModal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h2 className="modalTitle">{t?.modalTitle || "🏆 명예의 전당 (Leaderboard)"}</h2>
            <p className="modalDesc">{t?.modalSubtitle || "최고의 타자 레이서 순위를 확인하세요."}</p>
          </div>
          <button className="closeBtn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {/* Quick Stats Pill */}
        <div className="leaderboardStatsSummary">
          <div className="summaryPill">
            <span className="summaryLabel">{t?.totalRuns || "총 레이스 완주"}</span>
            <span className="summaryVal">{stats.totalRuns}{t?.runsUnit || "회"}</span>
          </div>
          <div className="summaryPill">
            <span className="summaryLabel">{t?.maxSpeed || "역대 최고 속도"}</span>
            <span className="summaryVal summaryHighlight">{stats.maxWpm} WPM</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="tabGroup">
          <button
            className={`tabItem ${period === "all" ? "active" : ""}`}
            onClick={() => setPeriod("all")}
          >
            {t?.allTimeTab || "전체 랭킹 (All-Time)"}
          </button>
          <button
            className={`tabItem ${period === "week" ? "active" : ""}`}
            onClick={() => setPeriod("week")}
          >
            {t?.weeklyTab || "이번 주 랭킹 (Weekly)"}
          </button>
        </div>

        {/* Leaderboard Table */}
        <div className="leaderboardTableWrapper">
          {loading ? (
            <div className="tableLoading">{t?.loadingRankings || "랭킹 데이터를 불러오는 중..."}</div>
          ) : scores.length === 0 ? (
            <div className="tableEmpty">{t?.emptyRankings || "아직 등록된 기록이 없습니다. 첫 레이서가 되어보세요!"}</div>
          ) : (
            <table className="leaderboardTable">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>{t?.rankCol || "순위"}</th>
                  <th>{t?.racerCol || "레이서"}</th>
                  <th style={{ textAlign: "right" }}>{t?.wpmCol || "WPM"}</th>
                  <th style={{ textAlign: "right" }}>{t?.accCol || "정확도"}</th>
                  <th style={{ textAlign: "right" }}>{t?.timeCol || "소요시간"}</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr key={s.id || idx} className={rank <= 3 ? `topRankRow rank${rank}` : ""}>
                      <td>
                        <span className="rankBadge">
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`}
                        </span>
                      </td>
                      <td className="nicknameCell">
                        <b>{s.nickname}</b>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className="wpmTag">{Math.round(s.wpm)} WPM</span>
                      </td>
                      <td style={{ textAlign: "right" }} className="dimCell">
                        {Math.round(s.accuracy)}%
                      </td>
                      <td style={{ textAlign: "right" }} className="dimCell">
                        {Math.round(s.time_seconds)}{t?.secondsSuffix || "s"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
