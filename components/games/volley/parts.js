"use client";

// 말랑 배구 화면 부품: 캐릭터 미리보기, 사진 맞추기, 터치 조작

import { useEffect, useRef, useState } from "react";
import { CHARACTERS, drawPreview } from "../../../lib/volley/draw";

const imageCache = new Map();

// dataURL → 불러온 Image (다 불러오기 전에는 null)
export function loadPhoto(url) {
  if (!url) return null;
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imageCache.set(url, img);
  }
  return img;
}

export function usePhoto(url) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    if (!url) {
      setImg(null);
      return;
    }
    const im = loadPhoto(url);
    if (im.complete && im.naturalWidth) {
      setImg(im);
      return;
    }
    const on = () => setImg(im);
    im.addEventListener("load", on);
    return () => im.removeEventListener("load", on);
  }, [url]);
  return img;
}

export function CharPreview({ ch, photo = null, face = null, size = 72, animate = false }) {
  const ref = useRef(null);
  const img = usePhoto(photo);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (!animate) {
      drawPreview(c, ch, img, { face });
      return;
    }
    let raf = 0;
    const loop = (now) => {
      drawPreview(c, ch, img, { face, t: now / 1000 });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ch, img, face, animate]);
  return <canvas ref={ref} className="vbPreview" style={{ width: size, height: size }} aria-hidden="true" />;
}

export function CharPicker({ value, onChange, lang }) {
  return (
    <div className="vbChars" role="radiogroup">
      {CHARACTERS.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={c.id === value}
          aria-label={c[lang]}
          title={c[lang]}
          className={c.id === value ? "on" : ""}
          style={{ "--c": c.color }}
          onClick={() => onChange(c.id)}
        >
          <CharPreview ch={c} size={34} />
        </button>
      ))}
    </div>
  );
}

export function Chips({ value, options, onChange, disabled = false }) {
  return (
    <div className="vbChips">
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" className={v === value ? "on" : ""} disabled={disabled && v !== value} onClick={() => onChange?.(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------- 사진 맞추기 ----------

const VIEW = 240;
const OUT = 128;

export function PhotoEditor({ src, t, onApply, onCancel }) {
  const ref = useRef(null);
  const [img, setImg] = useState(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    const im = new Image();
    im.onload = () => setImg(im);
    im.onerror = () => setError(true);
    im.src = src;
  }, [src]);

  const scaleOf = (z) => (img ? (VIEW / Math.min(img.naturalWidth, img.naturalHeight)) * z : 1);
  const clampPan = (p, z) => {
    if (!img) return p;
    const s = scaleOf(z);
    const mx = Math.max(0, (img.naturalWidth * s - VIEW) / 2);
    const my = Math.max(0, (img.naturalHeight * s - VIEW) / 2);
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  };

  const paint = (canvas, size, withMask) => {
    const ctx = canvas.getContext("2d");
    const k = size / VIEW;
    const s = scaleOf(zoom) * k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, size, size);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, size / 2 - w / 2 + pan.x * k, size / 2 - h / 2 + pan.y * k, w, h);
    if (withMask) {
      ctx.fillStyle = "rgba(10,12,30,0.55)";
      ctx.beginPath();
      ctx.rect(0, 0, size, size);
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  useEffect(() => {
    const c = ref.current;
    if (!c || !img) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = VIEW * dpr;
    c.height = VIEW * dpr;
    paint(c, VIEW * dpr, true);
  });

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, pan };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    setPan(clampPan({ x: d.pan.x + e.clientX - d.x, y: d.pan.y + e.clientY - d.y }, zoom));
  };
  const onUp = () => {
    drag.current = null;
  };

  const apply = () => {
    const c = document.createElement("canvas");
    c.width = OUT;
    c.height = OUT;
    paint(c, OUT, false);
    onApply(c.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div className="vbModal" role="dialog" aria-modal="true" aria-label={t.photoTitle}>
      <div className="vbModalBox">
        <h3>{t.photoTitle}</h3>
        {error ? (
          <p className="vbError">{t.photoError}</p>
        ) : (
          <>
            <p className="vbMuted">{t.photoHint}</p>
            <canvas
              ref={ref}
              className="vbCrop"
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            />
            <label className="vbSlider">
              <span>{t.photoZoom}</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => {
                  const z = Number(e.target.value);
                  setZoom(z);
                  setPan((p) => clampPan(p, z));
                }}
              />
            </label>
          </>
        )}
        <div className="vbRow">
          <button type="button" className="vbBtn" onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="button" className="vbBtn primary" disabled={!img} onClick={apply}>
            {t.photoApply}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- 터치 조작 ----------

const DEAD_X = 14;
const DEAD_UP = 26;
const DEAD_DOWN = 20;

export function TouchPad({ controls, t }) {
  const [stick, setStick] = useState(null); // { ox, oy, dx, dy }
  const pointer = useRef(null);
  const [jumpOn, setJumpOn] = useState(false);
  const [smashOn, setSmashOn] = useState(false);

  const setAxis = (dx, dy) => {
    const tc = controls.touch;
    tc.x = dx > DEAD_X ? 1 : dx < -DEAD_X ? -1 : 0;
    tc.y = dy < -DEAD_UP ? -1 : dy > DEAD_DOWN ? 1 : 0;
  };

  const down = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    pointer.current = e.pointerId;
    setStick({ ox: e.clientX - r.left, oy: e.clientY - r.top, dx: 0, dy: 0 });
    setAxis(0, 0);
  };
  const move = (e) => {
    if (pointer.current !== e.pointerId || !stick) return;
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - r.left - stick.ox;
    let dy = e.clientY - r.top - stick.oy;
    const len = Math.hypot(dx, dy);
    if (len > 44) {
      dx = (dx / len) * 44;
      dy = (dy / len) * 44;
    }
    setStick((s) => ({ ...s, dx, dy }));
    setAxis(dx, dy);
  };
  const up = (e) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setStick(null);
    setAxis(0, 0);
  };

  return (
    <div className="vbTouch">
      <div className="vbStickZone" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {stick && (
          <div className="vbStick" style={{ left: stick.ox, top: stick.oy }}>
            <div className="vbKnob" style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
          </div>
        )}
      </div>
      <div className="vbPadBtns">
        <button
          type="button"
          className={`vbPadBtn jump${jumpOn ? " on" : ""}`}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            controls.touch.jump = true;
            controls.touch.jumpTap = true;
            setJumpOn(true);
          }}
          onPointerUp={() => {
            controls.touch.jump = false;
            setJumpOn(false);
          }}
          onPointerCancel={() => {
            controls.touch.jump = false;
            setJumpOn(false);
          }}
        >
          {t.jump}
        </button>
        <button
          type="button"
          className={`vbPadBtn smash${smashOn ? " on" : ""}`}
          onPointerDown={(e) => {
            e.preventDefault();
            controls.touch.power = true;
            setSmashOn(true);
          }}
          onPointerUp={() => setSmashOn(false)}
          onPointerCancel={() => setSmashOn(false)}
        >
          {t.smash}
        </button>
      </div>
    </div>
  );
}
