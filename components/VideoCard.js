"use client";

import { CATEGORIES } from "../lib/categories";
import { timeAgo } from "../lib/format";

const PALETTE = Object.values(CATEGORIES).map((c) => c.bg);
const BASIS = { transcript: "자막 기반 요약", video: "영상 분석 요약", description: "설명란 기반 요약", title: "제목만으로 요약", none: "원문 설명" };

// 채널마다 고정된 색을 준다
export function channelColor(id = "") {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function VideoCard({ video, authed, scrapped, onToggleScrap }) {
  const href = `https://www.youtube.com/watch?v=${video.id}`;
  const summary = video.summary.length ? video.summary : video.description ? [video.description] : [];
  return (
    <article className="vcard" style={{ "--v-color": channelColor(video.channelId) }}>
      <a className="vthumb" href={href} target="_blank" rel="noreferrer">
        <img src={video.thumbnail} alt="" loading="lazy" />
        {video.basis ? <span className="vbasis">{BASIS[video.basis] || video.basis}</span> : null}
        <span className="vplay" aria-hidden="true">
          ▶
        </span>
      </a>
      <div className="vbody">
        <div className="vchannel">
          {video.channelThumbnail ? <img src={video.channelThumbnail} alt="" loading="lazy" /> : null}
          <span>{video.channelTitle}</span>
          <span className="when">· {timeAgo(video.publishedAt)}</span>
          {authed ? (
            <button type="button" className="iconBtn" onClick={() => onToggleScrap(video)} aria-label={scrapped ? "스크랩 해제" : "스크랩"}>
              {scrapped ? "★" : "☆"}
            </button>
          ) : null}
        </div>
        <h3 className="vtitle">
          <a href={href} target="_blank" rel="noreferrer">
            {video.title}
          </a>
        </h3>
        {video.oneLiner ? <div className="voneliner">{video.oneLiner}</div> : null}
        {summary.length ? (
          <ul className="vsummary">
            {summary.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : null}
        {video.tags.length ? (
          <div className="vtags">
            {video.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        ) : null}
        {video.points.length ? (
          <details className="vpoints">
            <summary>핵심 포인트 {video.points.length}개</summary>
            <ol>
              {video.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </article>
  );
}
