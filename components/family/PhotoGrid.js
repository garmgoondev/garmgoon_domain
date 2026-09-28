"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fileUrl } from "../../lib/family";
import Avatar from "./Avatar";
import Lightbox from "./Lightbox";

function monthOf(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

// 가족 공개 글에 올라온 사진을 달마다 모아 본다
export default function PhotoGrid() {
  const [photos, setPhotos] = useState(null);
  const [next, setNext] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  const load = (before) =>
    api(`/api/family/photos${before ? `?before=${before}` : ""}`)
      .then((d) => {
        setPhotos((p) => [...(before ? p : []), ...d.photos]);
        setNext(d.nextBefore);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!photos) return <div className="skeleton" style={{ height: 320 }} />;
  if (!photos.length) {
    return (
      <div className="empty">
        <span className="emoji">🖼️</span>
        <b>아직 모인 사진이 없어요</b>
        <span>가족 공개 글에 사진을 붙이면 여기에 모여요.</span>
      </div>
    );
  }

  const months = [];
  photos.forEach((p, i) => {
    const m = monthOf(p.createdAt);
    if (months[months.length - 1]?.label !== m) months.push({ label: m, items: [] });
    months[months.length - 1].items.push({ ...p, index: i });
  });

  return (
    <>
      {months.map((m) => (
        <section key={m.label} className="famPhotoMonth">
          <h3>{m.label}</h3>
          <div className="famPhotoGrid">
            {m.items.map((p) => (
              <button key={p.id} type="button" className="famPhoto" onClick={() => setOpen(p.index)}>
                <img src={fileUrl(p.id, p.hasPreview ? "thumb" : null)} alt={p.name} loading="lazy" />
                <span className="famPhotoBy">
                  <Avatar member={p.author} size={22} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
      {next ? (
        <button type="button" className="btn ghost" style={{ width: "100%", marginTop: 16 }} onClick={() => load(next)}>
          더 보기
        </button>
      ) : null}
      {open !== null ? <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
