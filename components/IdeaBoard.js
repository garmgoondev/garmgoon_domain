"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import IdeaCard from "./IdeaCard";
import { useApi, useMe, useScrapSet, useVotes } from "../lib/api";
import { categoryStyle, KIND_NAMES, KINDS } from "../lib/categories";
import { formatDay, matchKeywords, shortDay, todayLocal } from "../lib/format";

const SORTS = { recommend: "추천순", latest: "최신순" };

// 비즈니스 카드 보드. view="feed"는 추천 상위 카드만, view="all"은 그날 만든 모든 카드를 보여준다.
export default function IdeaBoard({ view = "feed", initialDay = null }) {
  const all = view === "all";
  const me = useMe();
  const authed = Boolean(me?.authed);
  const [day, setDay] = useState(initialDay);
  const [category, setCategory] = useState("전체");
  const [kind, setKind] = useState("전체");
  const [sort, setSort] = useState("recommend");
  const [hideDisliked, setHideDisliked] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");

  useEffect(() => setDay(initialDay), [initialDay]);

  const params = new URLSearchParams();
  if (globalQuery) {
    params.set("q", globalQuery);
  } else {
    if (day) params.set("day", day);
    if (all) params.set("view", "all");
  }
  const qs = params.toString();
  const ideas = useApi(`/api/ideas${qs ? `?${qs}` : ""}`);
  const kw = useApi(authed ? "/api/p/keywords" : null);
  const [scrapped, toggleScrap] = useScrapSet("item", ideas.data?.scrapped);
  const [votes, setVote] = useVotes(ideas.data?.votes);

  const pickDay = (d) => {
    setGlobalQuery("");
    setDay(d);
    if (all) window.history.replaceState(null, "", `?day=${d}`);
  };

  const data = ideas.data;
  const cards = useMemo(() => {
    const list = data?.cards || [];
    const sorted = (all || globalQuery) && sort === "recommend" ? [...list].sort((a, b) => b.feedScore - a.feedScore) : list;
    const term = searchInput.trim().toLowerCase();
    if (!term || term === globalQuery.toLowerCase()) return sorted;
    return sorted.filter((c) =>
      [c.headline, c.title, ...(c.summary || []), c.point, ...(c.tags || []), c.sourceLabel, c.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [data, all, globalQuery, sort, searchInput]);
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
  const visible = (category === "전체" ? byKind : byKind.filter((c) => c.category === category)).filter(
    (c) => !(hideDisliked && votes.get(c.id) === -1),
  );
  const alerts = visible.filter((c) => cardKeywords.get(c.id)?.length);
  const shownDay = data?.day || todayLocal();
  const hiddenCount = globalQuery ? 0 : (data?.total || 0) - (data?.cards?.length || 0);
  // 가장 최근 수집분(4시간 이내)에 새로 추가된 카드
  const latestBatch = Math.max(0, ...(data?.cards || []).map((c) => c.collectedAt || 0));
  const isNew = (c) => c.collectedAt === latestBatch && Date.now() - latestBatch < 4 * 3600 * 1000;
  const prefs = data?.prefs;

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">{globalQuery ? "🔍 전체 날짜 검색" : `${all ? "🗂️" : "☀️"} ${formatDay(shownDay)}`}</div>
          <h1 className="pageTitle">
            {globalQuery ? `“${globalQuery}” 검색 결과` : all ? "비즈니스 아이디어 전체 아카이브" : "오늘의 비즈니스 카드뉴스"}
          </h1>
          <p className="pageDesc">
            {globalQuery
              ? `최근 보관된 모든 비즈니스 카드 중 “${globalQuery}” 관련 카드 ${data?.total ?? 0}장을 찾았어요.`
              : all
                ? "수집 및 큐레이션된 전체 비즈니스 아이디어 카드 아카이브입니다. 날짜별 카드 전체 내역을 열람하거나 상단 검색창을 통해 원하는 키워드를 실시간으로 탐색할 수 있습니다."
                : "글로벌 니치 수익 사례, 최신 SaaS 사업 모델, 검증된 창업 아이디어를 AI가 4시간마다 수집하고 요약합니다. 카드를 클릭하면 상세 내용과 원문을 확인할 수 있습니다."}
          </p>
        </div>
        {globalQuery ? (
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              setGlobalQuery("");
              setSearchInput("");
            }}
          >
            ← 오늘 피드로 돌아가기
          </button>
        ) : all ? (
          <Link href="/" className="moreLink">
            ← 피드로
          </Link>
        ) : hiddenCount > 0 ? (
          <Link href={`/cards?day=${shownDay}`} className="moreLink">
            전체 {data.total}장 보기 →
          </Link>
        ) : null}
      </div>

      {authed && prefs ? (
        <p className="prefLine">
          👍 {prefs.likes} · 👎 {prefs.dislikes}
          {prefs.active
            ? prefs.favorites.length
              ? ` · 선호: ${prefs.favorites.join(", ")} — 다음 채점·선정부터 비슷한 카드를 더 골라요`
              : " · 다음 채점·선정부터 취향을 반영해요"
            : ` · 카드를 ${prefs.minVotes}장 이상 평가하면 취향을 반영하기 시작해요`}
        </p>
      ) : null}

      <form
        className="row"
        style={{ marginBottom: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          setGlobalQuery(searchInput.trim());
        }}
      >
        <input
          type="search"
          className="input"
          placeholder="🔍 카드 제목·요약·태그 검색 (Enter를 누르면 전체 날짜에서 통합 검색해요)"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            if (!e.target.value.trim() && globalQuery) setGlobalQuery("");
          }}
          aria-label="비즈니스 카드 검색"
        />
        {searchInput.trim() && searchInput.trim() !== globalQuery ? (
          <button type="submit" className="btn small">
            전체 날짜 검색
          </button>
        ) : null}
        {(searchInput || globalQuery) ? (
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              setSearchInput("");
              setGlobalQuery("");
            }}
          >
            초기화
          </button>
        ) : null}
      </form>

      {data?.days?.length > 1 && !globalQuery ? (
        <div className="chips" style={{ marginBottom: 10 }}>
          {data.days.map((d) => {
            const s = shortDay(d.day);
            return (
              <button key={d.day} type="button" className={`chip dayChip${d.day === shownDay ? " on" : ""}`} onClick={() => pickDay(d.day)}>
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
            <small>{globalQuery ? "통합 검색 결과" : all ? "그날 만든 모든 카드" : "추천 상위 카드"}</small>
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

      {(all || globalQuery) && cards.length ? (
        <div className="chips" style={{ marginBottom: 18 }}>
          {Object.entries(SORTS).map(([key, label]) => (
            <button key={key} type="button" className={`chip${sort === key ? " on" : ""}`} onClick={() => setSort(key)}>
              {label}
            </button>
          ))}
          {authed ? (
            <button type="button" className={`chip${hideDisliked ? " on" : ""}`} aria-pressed={hideDisliked} onClick={() => setHideDisliked((v) => !v)}>
              👎 숨기기
            </button>
          ) : null}
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
              vote={votes.get(c.id) || 0}
              onVote={(v) => setVote(c.id, v)}
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

      {!all && hiddenCount > 0 ? (
        <Link href={`/cards?day=${shownDay}`} className="moreCards">
          <b>피드에 없는 카드 {hiddenCount}장 더 보기 →</b>
          <small>점수가 조금 낮거나 👎 한 카드까지 그날 만든 전체 {data.total}장</small>
        </Link>
      ) : null}
    </>
  );
}
