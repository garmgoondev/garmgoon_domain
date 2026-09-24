"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import IdeaCard from "../components/IdeaCard";
import VideoCard from "../components/VideoCard";
import { useApi, useMe, useScrapSet } from "../lib/api";
import { categoryStyle, KIND_NAMES, KINDS } from "../lib/categories";
import { formatDay, matchKeywords, shortDay, todayLocal } from "../lib/format";

export default function Home() {
  const me = useMe();
  const authed = Boolean(me?.authed);
  const [day, setDay] = useState(null);
  const [category, setCategory] = useState("전체");
  const [kind, setKind] = useState("전체");

  const ideas = useApi(`/api/ideas${day ? `?day=${day}` : ""}`);
  const videos = useApi("/api/videos");
  const kw = useApi(authed ? "/api/p/keywords" : null);
  const [scrapped, toggleScrap] = useScrapSet("item", ideas.data?.scrapped);
  const [videoScrapped, toggleVideoScrap] = useScrapSet("video", videos.data?.scrapped);

  const data = ideas.data;
  const cards = data?.cards || [];
  const keywords = kw.data?.keywords || [];
  const cardKeywords = useMemo(
    () => new Map(cards.map((c) => [c.id, matchKeywords([c.headline, c.title, ...c.summary, c.point, ...c.tags].join(" "), keywords)])),
    [cards, keywords],
  );
  const kindCounts = useMemo(() => {
    const counts = {};
    for (const c of cards) if (c.kind) counts[c.kind] = (counts[c.kind] || 0) + 1;
    return counts;
  }, [cards]);
  const byKind = kind === "전체" ? cards : cards.filter((c) => c.kind === kind);
  const categories = useMemo(() => {
    const counts = {};
    for (const c of byKind) counts[c.category] = (counts[c.category] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [byKind]);
  const visible = category === "전체" ? byKind : byKind.filter((c) => c.category === category);
  const alerts = visible.filter((c) => cardKeywords.get(c.id)?.length);
  const shownDay = data?.day || todayLocal();
  // 가장 최근 수집분(4시간 이내)에 새로 추가된 카드
  const latestBatch = Math.max(0, ...cards.map((c) => c.collectedAt || 0));
  const isNew = (c) => c.collectedAt === latestBatch && Date.now() - latestBatch < 4 * 3600 * 1000;

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">☀️ {formatDay(shownDay)}</div>
          <h1 className="pageTitle">오늘의 비즈니스 카드</h1>
          <p className="pageDesc">니치 수익 사례, 새로운 사업 형태, 호응 큰 아이디어 검증 글을 AI가 4시간마다 골라 요약해요. 카드를 누르면 원문이 열려요.</p>
        </div>
      </div>

      {data?.days?.length > 1 ? (
        <div className="chips" style={{ marginBottom: 10 }}>
          {data.days.map((d) => {
            const s = shortDay(d.day);
            return (
              <button key={d.day} type="button" className={`chip dayChip${d.day === shownDay ? " on" : ""}`} onClick={() => setDay(d.day)}>
                <b>{s.label}</b>
                <small>
                  {s.weekday} · {d.count}장
                </small>
              </button>
            );
          })}
        </div>
      ) : null}

      {cards.length ? (
        <div className="kindTabs" role="tablist" aria-label="카드 유형">
          <button type="button" role="tab" aria-selected={kind === "전체"} className={kind === "전체" ? "on" : ""} onClick={() => { setKind("전체"); setCategory("전체"); }}>
            <b>전체 {cards.length}</b>
            <small>오늘 고른 모든 카드</small>
          </button>
          {KIND_NAMES.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              className={kind === k ? "on" : ""}
              disabled={!kindCounts[k]}
              onClick={() => { setKind(k); setCategory("전체"); }}
            >
              <b>
                {KINDS[k].emoji} {k} {kindCounts[k] || 0}
              </b>
              <small>{KINDS[k].short}</small>
            </button>
          ))}
        </div>
      ) : null}

      {byKind.length ? (
        <div className="chips" style={{ marginBottom: 18 }}>
          <button type="button" className={`chip${category === "전체" ? " on" : ""}`} onClick={() => setCategory("전체")}>
            전체 <span className="count">{byKind.length}</span>
          </button>
          {categories.map(([name, count]) => (
            <button key={name} type="button" className={`chip${category === name ? " on" : ""}`} onClick={() => setCategory(name)}>
              <span className="dot" style={{ background: categoryStyle(name).bg }} />
              {name} <span className="count">{count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {data?.pending ? (
        <div className="banner">
          <span className="spinner" /> AI가 카드를 만드는 중이에요 · 남은 글 {data.pending}건
        </div>
      ) : null}

      {alerts.length ? (
        <div className="kwStrip">
          {alerts.map((c) => (
            <a key={c.id} className="kwItem" href={c.url} target="_blank" rel="noreferrer">
              <span className="kw">🔔 관심 키워드 · {cardKeywords.get(c.id).join(", ")}</span>
              <b>{c.headline}</b>
            </a>
          ))}
        </div>
      ) : null}

      {ideas.loading && !data ? (
        <div className="cardGrid">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 380 }} />
          ))}
        </div>
      ) : ideas.error ? (
        <div className="empty">
          <span className="emoji">⚠️</span>
          <b>카드를 불러오지 못했어요</b>
          <span>{ideas.error.message}</span>
        </div>
      ) : visible.length ? (
        <div className="cardGrid">
          {visible.map((c) => (
            <IdeaCard
              key={c.id}
              card={c}
              index={cards.indexOf(c)}
              keywords={cardKeywords.get(c.id) || []}
              isNew={isNew(c)}
              authed={authed}
              scrapped={scrapped.has(c.id)}
              onToggleScrap={() => toggleScrap(c.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <span className="emoji">🗞️</span>
          <b>아직 오늘의 카드가 없어요</b>
          <span>매일 아침 새 글을 모아 카드뉴스로 만들어요.</span>
        </div>
      )}

      <section className="section">
        <div className="sectionHead">
          <h2 className="sectionTitle">📺 새 유튜브 요약</h2>
          <Link href="/youtube" className="moreLink">
            전체 보기 →
          </Link>
        </div>
        {videos.data?.videos?.length ? (
          <div className="videoGrid">
            {videos.data.videos.slice(0, 3).map((v) => (
              <VideoCard key={v.id} video={v} authed={authed} scrapped={videoScrapped.has(v.id)} onToggleScrap={() => toggleVideoScrap(v.id)} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <span className="emoji">📺</span>
            <b>요약된 영상이 아직 없어요</b>
            <span>
              {authed ? (
                <>
                  <Link href="/settings" style={{ textDecoration: "underline" }}>
                    설정
                  </Link>
                  에서 유튜브 채널을 추가해 주세요.
                </>
              ) : (
                "채널이 추가되면 여기에 표시돼요."
              )}
            </span>
          </div>
        )}
      </section>
    </>
  );
}
