"use client";

import { useApi } from "../../lib/api";
import { CATEGORY_NAMES, categoryStyle } from "../../lib/categories";
import { formatDay } from "../../lib/format";

const HOT_COLORS = ["AI", "커머스", "핀테크"];

function Report({ r }) {
  const cats = Object.entries(r.categories || {}).sort((a, b) => b[1] - a[1]);
  const total = cats.reduce((n, [, v]) => n + v, 0);
  const maxKw = Math.max(1, ...(r.keywords || []).map((k) => k.count));

  return (
    <article className="report">
      <div className="reportHero">
        <div className="reportWeek">
          {formatDay(r.start)} ~ {formatDay(r.end)}
        </div>
        <h2 className="reportTitle">{r.title}</h2>
        {r.summary ? <p className="reportSummary">{r.summary}</p> : null}
        <div className="reportStats">
          <span>🗞️ 카드 {r.itemCount}장</span>
          <span>📺 영상 {r.videoCount}개</span>
        </div>
      </div>
      <div className="reportBody">
        {r.hot?.length ? (
          <div>
            <h3>🔥 이번 주 유망 분야</h3>
            <div className="hotGrid">
              {r.hot.map((h, i) => {
                const c = categoryStyle(HOT_COLORS[i % HOT_COLORS.length]);
                return (
                  <div key={i} className="hotCard" style={{ "--c-bg": c.bg, "--c-fg": c.fg }}>
                    <div className="area">{h.area}</div>
                    <p>{h.why}</p>
                    {h.idea ? <p className="idea">💡 {h.idea}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {r.keywords?.length ? (
          <div>
            <h3>🏷️ 많이 나온 키워드</h3>
            <div className="kwCloud">
              {r.keywords.map((k) => (
                <span key={k.word} style={{ fontSize: 13 + (k.count / maxKw) * 9 }}>
                  {k.word} <small className="muted">{k.count}</small>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {total ? (
          <div>
            <h3>📊 분야별 비중</h3>
            <div className="catBar" role="img" aria-label={cats.map(([n, v]) => `${n} ${v}장`).join(", ")}>
              {cats.map(([name, v]) => (
                <span key={name} style={{ flex: v, background: categoryStyle(name).bg }} />
              ))}
            </div>
            <div className="catLegend">
              {cats
                .filter(([name]) => CATEGORY_NAMES.includes(name))
                .map(([name, v]) => (
                  <span key={name}>
                    <span className="dot" style={{ background: categoryStyle(name).bg }} />
                    {name} {Math.round((v / total) * 100)}%
                  </span>
                ))}
            </div>
          </div>
        ) : null}

        {r.watch?.length ? (
          <div>
            <h3>👀 다음 주에 지켜볼 것</h3>
            <ul className="watchList">
              {r.watch.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function TrendsPage() {
  const { data, loading, error } = useApi("/api/reports");
  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">📈 WEEKLY TREND</div>
          <h1 className="pageTitle">주간 트렌드 리포트</h1>
          <p className="pageDesc">매주 일요일 저녁, 한 주 동안 모인 카드와 영상을 한 장으로 정리해요.</p>
        </div>
      </div>
      {loading && !data ? (
        <div className="skeleton" style={{ height: 480 }} />
      ) : error ? (
        <div className="empty">
          <span className="emoji">⚠️</span>
          <b>리포트를 불러오지 못했어요</b>
          <span>{error.message}</span>
        </div>
      ) : data.reports.length ? (
        data.reports.map((r) => <Report key={r.week} r={r} />)
      ) : (
        <div className="empty">
          <span className="emoji">📈</span>
          <b>첫 리포트를 기다리는 중이에요</b>
          <span>카드가 일주일 동안 쌓이면 일요일 저녁에 첫 리포트가 나와요.</span>
        </div>
      )}
    </>
  );
}
