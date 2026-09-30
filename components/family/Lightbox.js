"use client";

import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../../lib/family";
import { lockScroll } from "../../lib/scrollLock";

// 사진을 화면 크기에 맞춰 크게 본다. 좌우 화살표·스와이프로 넘기고 Esc 또는 아래로 스와이프하여 닫는다.
export default function Lightbox({ photos, index: start, onClose }) {
  const [index, setIndex] = useState(start);
  const touch = useRef(null);
  const containerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const photo = photos[index];
  const go = (d) => setIndex((i) => (i + d + photos.length) % photos.length);

  useEffect(() => {
    const unlock = lockScroll();
    const el = containerRef.current;

    const prevent = (e) => {
      if (e.cancelable) e.preventDefault();
    };

    if (el) {
      el.addEventListener("wheel", prevent, { passive: false });
      el.addEventListener("touchmove", prevent, { passive: false });
    }

    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
      if (el) {
        el.removeEventListener("wheel", prevent);
        el.removeEventListener("touchmove", prevent);
      }
    };
  }, []);

  if (!photo) return null;
  const many = photos.length > 1;

  return (
    <div
      ref={containerRef}
      className="famLightbox"
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => {
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x;
        const dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (many && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          go(dx < 0 ? 1 : -1);
        } else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
          onCloseRef.current();
        }
      }}
    >
      <div className="famLightboxBar">
        <span>
          {photo.author ? `${photo.author.emoji} ${photo.author.name} · ` : ""}
          {many ? `${index + 1} / ${photos.length}` : photo.name}
        </span>
        <span className="row">
          <a className="btn small ghost" href={`${fileUrl(photo.id)}?download`} download={photo.name}>
            원본 받기
          </a>
          <button type="button" className="btn small ghost" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </span>
      </div>
      <img key={photo.id} src={fileUrl(photo.id, photo.hasPreview ? "preview" : null)} alt={photo.name} onClick={(e) => e.stopPropagation()} />
      {many ? (
        <>
          <button type="button" className="famLightboxNav prev" onClick={() => go(-1)} aria-label="이전 사진">
            ‹
          </button>
          <button type="button" className="famLightboxNav next" onClick={() => go(1)} aria-label="다음 사진">
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}
