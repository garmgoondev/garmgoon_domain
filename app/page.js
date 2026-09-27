"use client";

import Link from "next/link";
import IdeaBoard from "../components/IdeaBoard";
import VideoCard from "../components/VideoCard";
import { useApi, useMe, useScrapSet } from "../lib/api";

export default function Home() {
  const me = useMe();
  const authed = Boolean(me?.authed);
  const videos = useApi("/api/videos");
  const [videoScrapped, toggleVideoScrap] = useScrapSet("video", videos.data?.scrapped);

  return (
    <>
      <IdeaBoard view="feed" />

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
