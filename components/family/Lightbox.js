"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fileUrl } from "../../lib/family";
import { lockScroll } from "../../lib/scrollLock";

const MIN_SCALE = 1;
const MAX_SCALE = 5;

function clampOffset(ox, oy, s) {
  if (s <= 1 || typeof window === "undefined") return { x: 0, y: 0 };
  const maxX = (window.innerWidth * (s - 1)) / 2;
  const maxY = (window.innerHeight * (s - 1)) / 2;
  return {
    x: Math.max(-maxX, Math.min(maxX, ox)),
    y: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

// 사진을 화면 크기에 맞춰 크게 본다. 확대·축소(핀치/휠/더블탭/버튼), 드래그 이동, 좌우 넘기기, Esc/아래 스와이프로 닫기 지원.
export default function Lightbox({ photos, index: start, onClose }) {
  const [index, setIndex] = useState(start);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const onCloseRef = useRef(onClose);
  const touchesRef = useRef(null);
  const mouseDragRef = useRef(null);
  const lastTapRef = useRef(0);

  scaleRef.current = scale;
  offsetRef.current = offset;
  onCloseRef.current = onClose;

  const photo = photos[index];
  const many = photos.length > 1;

  const resetZoom = useCallback((e) => {
    e?.stopPropagation?.();
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const go = useCallback(
    (d) => {
      resetZoom();
      setIndex((i) => (i + d + photos.length) % photos.length);
    },
    [photos.length, resetZoom],
  );

  const zoomTo = useCallback((targetScale, cx = window.innerWidth / 2, cy = window.innerHeight / 2) => {
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
    if (nextScale <= 1) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;
    const dx = cx - midX;
    const dy = cy - midY;
    const curScale = scaleRef.current;
    const curOffset = offsetRef.current;
    const ratio = nextScale / curScale;
    const newX = dx - (dx - curOffset.x) * ratio;
    const newY = dy - (dy - curOffset.y) * ratio;
    const clamped = clampOffset(newX, newY, nextScale);
    setScale(nextScale);
    setOffset(clamped);
  }, []);

  const zoomIn = (e) => {
    e?.stopPropagation?.();
    zoomTo(Math.min(MAX_SCALE, Math.round((scale + 0.5) * 10) / 10));
  };

  const zoomOut = (e) => {
    e?.stopPropagation?.();
    zoomTo(Math.max(MIN_SCALE, Math.round((scale - 0.5) * 10) / 10));
  };

  const handleDoubleTapOrClick = (clientX, clientY) => {
    if (scaleRef.current > 1) {
      resetZoom();
    } else {
      zoomTo(2.5, clientX, clientY);
    }
  };

  // Reset zoom on photo change
  useEffect(() => {
    resetZoom();
  }, [photo?.id, resetZoom]);

  // Touch and wheel events on container
  useEffect(() => {
    const unlock = lockScroll();
    const el = containerRef.current;
    if (!el) return unlock;

    const onWheel = (e) => {
      if (e.cancelable) e.preventDefault();
      const factor = e.deltaY < 0 ? 1.18 : 0.85;
      zoomTo(scaleRef.current * factor, e.clientX, e.clientY);
    };

    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const state = touchesRef.current;
      if (!state) return;

      if (e.touches.length === 2 && state.type === "pinch") {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
        if (!state.dist) return;
        const factor = dist / state.dist;
        const nextScale = Math.min(MAX_SCALE, Math.max(0.8, state.baseScale * factor));

        const curCenter = {
          x: (t0.clientX + t1.clientX) / 2,
          y: (t0.clientY + t1.clientY) / 2,
        };
        const centerDx = curCenter.x - state.center.x;
        const centerDy = curCenter.y - state.center.y;

        const midX = window.innerWidth / 2;
        const midY = window.innerHeight / 2;
        const dx = state.center.x - midX;
        const dy = state.center.y - midY;
        const ratio = nextScale / state.baseScale;
        const newX = dx - (dx - state.baseOffset.x) * ratio + centerDx;
        const newY = dy - (dy - state.baseOffset.y) * ratio + centerDy;

        const clamped = clampOffset(newX, newY, nextScale);
        setScale(nextScale);
        setOffset(clamped);
      } else if (e.touches.length === 1 && state.type === "single") {
        const t0 = e.touches[0];
        state.lastX = t0.clientX;
        state.lastY = t0.clientY;

        if (state.baseScale > 1) {
          const dx = t0.clientX - state.startX;
          const dy = t0.clientY - state.startY;
          const clamped = clampOffset(
            state.baseOffset.x + dx,
            state.baseOffset.y + dy,
            scaleRef.current,
          );
          setOffset(clamped);
        }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    const onKey = (e) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-" || e.key === "_") zoomOut();
      if (e.key === "0") resetZoom();
      if (e.key === "ArrowLeft" && scaleRef.current <= 1) go(-1);
      if (e.key === "ArrowRight" && scaleRef.current <= 1) go(1);
    };
    window.addEventListener("keydown", onKey);

    const onWindowMouseMove = (e) => {
      if (!mouseDragRef.current) return;
      e.preventDefault();
      const dx = e.clientX - mouseDragRef.current.startX;
      const dy = e.clientY - mouseDragRef.current.startY;
      const clamped = clampOffset(
        mouseDragRef.current.baseOffset.x + dx,
        mouseDragRef.current.baseOffset.y + dy,
        scaleRef.current,
      );
      setOffset(clamped);
    };

    const onWindowMouseUp = () => {
      if (mouseDragRef.current) {
        mouseDragRef.current = null;
        setIsInteracting(false);
      }
    };

    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);

    return () => {
      unlock();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    };
  }, [go, resetZoom, zoomTo]);

  if (!photo) return null;

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const center = {
        x: (t0.clientX + t1.clientX) / 2,
        y: (t0.clientY + t1.clientY) / 2,
      };
      touchesRef.current = {
        type: "pinch",
        dist,
        center,
        baseScale: scaleRef.current,
        baseOffset: { ...offsetRef.current },
      };
      setIsInteracting(true);
    } else if (e.touches.length === 1) {
      const t0 = e.touches[0];
      touchesRef.current = {
        type: "single",
        startX: t0.clientX,
        startY: t0.clientY,
        lastX: t0.clientX,
        lastY: t0.clientY,
        baseOffset: { ...offsetRef.current },
        baseScale: scaleRef.current,
        startTime: Date.now(),
      };
      if (scaleRef.current > 1) {
        setIsInteracting(true);
      }
    }
  };

  const handleTouchEnd = (e) => {
    const state = touchesRef.current;
    touchesRef.current = null;
    setIsInteracting(false);

    if (!state) return;

    if (state.type === "pinch") {
      if (scaleRef.current < 1.05) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      } else {
        setOffset(clampOffset(offsetRef.current.x, offsetRef.current.y, scaleRef.current));
      }
      return;
    }

    if (state.type === "single") {
      const dx = state.lastX - state.startX;
      const dy = state.lastY - state.startY;
      const dist = Math.hypot(dx, dy);
      const elapsed = Date.now() - state.startTime;

      // Tap (minimal displacement)
      if (dist < 12 && elapsed < 350) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          // Double tap!
          lastTapRef.current = 0;
          handleDoubleTapOrClick(state.lastX, state.lastY);
          return;
        }
        lastTapRef.current = now;
        return;
      }

      // Single swipe when scale <= 1
      if (scaleRef.current <= 1) {
        if (many && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          go(dx < 0 ? 1 : -1);
        } else if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
          onCloseRef.current();
        }
      }
    }
  };

  const handleMouseDown = (e) => {
    if (scaleRef.current <= 1 || e.button !== 0) return;
    e.preventDefault();
    mouseDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseOffset: { ...offsetRef.current },
    };
    setIsInteracting(true);
  };

  return (
    <div
      ref={containerRef}
      className="famLightbox"
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      onClick={(e) => {
        if (e.target === containerRef.current) {
          if (scale > 1) {
            resetZoom();
          } else {
            onClose();
          }
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="famLightboxBar">
        <span className="famLightboxInfo">
          {photo.author ? `${photo.author.emoji} ${photo.author.name} · ` : ""}
          {many ? `${index + 1} / ${photos.length}` : photo.name}
        </span>

        {/* 확대·축소 컨트롤 바 */}
        <div className="famLightboxZoom" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="famZoomBtn"
            onClick={zoomOut}
            disabled={scale <= 1}
            aria-label="축소"
            title="축소 (-)"
          >
            −
          </button>
          <button
            type="button"
            className="famZoomVal"
            onClick={resetZoom}
            aria-label="원래 크기로 리셋"
            title="원래 크기로 리셋"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="famZoomBtn"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label="확대"
            title="확대 (+)"
          >
            +
          </button>
        </div>

        <span className="row">
          <a className="btn small ghost" href={`${fileUrl(photo.id)}?download`} download={photo.name}>
            원본 받기
          </a>
          <button type="button" className="btn small ghost" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </span>
      </div>

      <img
        ref={imgRef}
        key={photo.id}
        src={fileUrl(photo.id, photo.hasPreview ? "preview" : null)}
        alt={photo.name}
        draggable={false}
        className={`famLightboxImg${scale > 1 ? " isZoomed" : ""}${isInteracting ? " isDragging" : ""}`}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
          transition: isInteracting ? "none" : "transform 0.2s cubic-bezier(0.2, 0, 0, 1)",
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          handleDoubleTapOrClick(e.clientX, e.clientY);
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {many && scale === 1 ? (
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
