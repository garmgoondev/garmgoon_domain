"use client";

import { useState } from "react";
import { fileUrl, formatSize } from "../../lib/family";
import Lightbox from "./Lightbox";

const SINGLE_MAX_HEIGHT = 560;

// 사진 한 장은 원래 비율 그대로, 여러 장은 격자로 보여 준다
function Gallery({ images, onOpen }) {
  if (images.length === 1) {
    const img = images[0];
    const ratio = img.width && img.height ? img.width / img.height : null;
    return (
      <button
        type="button"
        className="famSingle"
        onClick={() => onOpen(0)}
        style={ratio ? { aspectRatio: `${img.width} / ${img.height}`, width: `min(100%, ${Math.round(SINGLE_MAX_HEIGHT * ratio)}px)` } : undefined}
      >
        <img src={fileUrl(img.id, img.hasPreview ? "preview" : null)} alt={img.name} loading="lazy" />
      </button>
    );
  }
  const shown = images.slice(0, 4);
  return (
    <div className={`famGrid n${shown.length}`}>
      {shown.map((img, i) => (
        <button key={img.id} type="button" className="famCell" onClick={() => onOpen(i)}>
          <img src={fileUrl(img.id, img.hasPreview ? (images.length === 2 ? "preview" : "thumb") : null)} alt={img.name} loading="lazy" />
          {i === 3 && images.length > 4 ? <span className="famMore">+{images.length - 4}</span> : null}
        </button>
      ))}
    </div>
  );
}

function fileIcon(f) {
  if (f.mime.startsWith("image/")) return "🖼️";
  if (f.mime.startsWith("video/")) return "🎬";
  if (f.mime.startsWith("audio/")) return "🎵";
  if (f.mime === "application/pdf") return "📕";
  if (/zip|compressed|tar/.test(f.mime)) return "🗜️";
  if (/sheet|excel|csv/.test(f.mime)) return "📊";
  if (/presentation|powerpoint/.test(f.mime)) return "📽️";
  if (/word|document|text/.test(f.mime)) return "📄";
  return "📎";
}

export default function Media({ files, author }) {
  const [open, setOpen] = useState(null);
  const images = files.filter((f) => f.isImage);
  const others = files.filter((f) => !f.isImage);
  return (
    <>
      {images.length ? <Gallery images={images} onOpen={setOpen} /> : null}
      {others.length ? (
        <div className="famFiles">
          {others.map((f) => (
            <a key={f.id} className="famFile" href={fileUrl(f.id)} download={f.name}>
              <span className="famFileIcon">{fileIcon(f)}</span>
              <span className="famFileName">{f.name}</span>
              <span className="muted">{formatSize(f.size)}</span>
            </a>
          ))}
        </div>
      ) : null}
      {open !== null ? <Lightbox photos={images.map((i) => ({ ...i, author }))} index={open} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
