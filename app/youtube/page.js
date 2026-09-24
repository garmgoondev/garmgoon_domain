"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import VideoCard from "../../components/VideoCard";
import { api, useApi, useMe, useScrapSet } from "../../lib/api";

export default function YoutubePage() {
  const me = useMe();
  const authed = Boolean(me?.authed);
  const [channel, setChannel] = useState("");
  const { data, loading, error } = useApi(`/api/videos${channel ? `?channel=${channel}` : ""}`);
  const [extra, setExtra] = useState({ videos: [], nextBefore: null, scrapped: [] });
  const [loadingMore, setLoadingMore] = useState(false);
  const scrappedIds = useMemo(() => (data ? [...data.scrapped, ...extra.scrapped] : null), [data, extra.scrapped]);
  const [scrapped, toggleScrap] = useScrapSet("video", scrappedIds);

  useEffect(() => setExtra({ videos: [], nextBefore: null, scrapped: [] }), [data]);

  const videos = [...(data?.videos || []), ...extra.videos];
  const nextBefore = extra.videos.length ? extra.nextBefore : data?.nextBefore;

  async function loadMore() {
    setLoadingMore(true);
    try {
      const more = await api(`/api/videos?before=${nextBefore}${channel ? `&channel=${channel}` : ""}`);
      setExtra((e) => ({ videos: [...e.videos, ...more.videos], nextBefore: more.nextBefore, scrapped: [...e.scrapped, ...more.scrapped] }));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">📺 YOUTUBE DIGEST</div>
          <h1 className="pageTitle">유튜브 요약</h1>
          <p className="pageDesc">구독하는 채널의 새 영상을 AI가 대신 보고 핵심만 정리했어요.</p>
        </div>
        {authed ? (
          <Link href="/settings" className="btn ghost small">
            채널 관리
          </Link>
        ) : null}
      </div>

      {data?.channels?.length ? (
        <div className="chips" style={{ marginBottom: 18 }}>
          <button type="button" className={`chip${!channel ? " on" : ""}`} onClick={() => setChannel("")}>
            전체
          </button>
          {data.channels.map((c) => (
            <button key={c.id} type="button" className={`chip${channel === c.id ? " on" : ""}`} onClick={() => setChannel(c.id)}>
              {c.thumbnail ? <img className="chipAvatar" src={c.thumbnail} alt="" /> : null}
              {c.title} <span className="count">{c.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {data?.pending ? (
        <div className="banner">
          <span className="spinner" /> 새 영상 {data.pending}개를 요약하는 중이에요
        </div>
      ) : null}

      {loading && !data ? (
        <div className="videoGrid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton" style={{ height: 420 }} />
          ))}
        </div>
      ) : error ? (
        <div className="empty">
          <span className="emoji">⚠️</span>
          <b>영상을 불러오지 못했어요</b>
          <span>{error.message}</span>
        </div>
      ) : videos.length ? (
        <>
          <div className="videoGrid">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} authed={authed} scrapped={scrapped.has(v.id)} onToggleScrap={() => toggleScrap(v.id)} />
            ))}
          </div>
          {nextBefore ? (
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button type="button" className="btn ghost" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "불러오는 중…" : "더 보기"}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="empty">
          <span className="emoji">🎬</span>
          <b>아직 요약된 영상이 없어요</b>
          <span>{authed ? "설정에서 채널을 추가하면 최근 영상부터 요약해요." : "채널이 추가되면 여기에 표시돼요."}</span>
        </div>
      )}
    </>
  );
}
