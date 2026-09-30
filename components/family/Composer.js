"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { MAX_FILE, MOODS, fileUrl, formatSize, prepareFile, uploadFile } from "../../lib/family";
import { todayLocal } from "../../lib/format";

let seq = 0;

// 새 글 쓰기와 글 고치기를 함께 맡는다. 파일은 고르는 즉시 올리고, 저장할 때 글에 붙인다.
export default function Composer({ post, defaults, onSaved, onCancel }) {
  const [kind, setKind] = useState(post?.kind || defaults.kind);
  const [visibility, setVisibility] = useState(post?.visibility || defaults.visibility);
  const [diaryDay, setDiaryDay] = useState(post?.diaryDay || todayLocal());
  const [mood, setMood] = useState(post?.mood || "");
  const [body, setBody] = useState(post?.body || "");
  const [items, setItems] = useState(() =>
    (post?.files || []).map((f) => ({
      key: `f${f.id}`,
      file: f,
      name: f.name,
      size: f.size,
      isImage: f.isImage,
      isVideo: f.isVideo || (!f.isImage && (f.mime?.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg)$/i.test(f.name))),
      thumb: f.hasPreview ? fileUrl(f.id, "thumb") : f.isImage ? fileUrl(f.id) : null,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const saved = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const originalIds = new Set((post?.files || []).map((f) => f.id));

  // 저장하지 않고 닫으면 새로 올린 파일을 지운다 (남은 것은 서버가 하루 뒤 정리)
  useEffect(
    () => () => {
      if (saved.current) return;
      for (const it of itemsRef.current) {
        if (it.file && !originalIds.has(it.file.id)) api(`/api/family/files/${it.file.id}`, { method: "DELETE" }).catch(() => {});
        if (it.local) URL.revokeObjectURL(it.local);
      }
    },
    [],
  );

  // 새 글이면 글 종류에 맞춰 공개 범위 기본값을 바꾼다
  function pickKind(k) {
    setKind(k);
    if (!post) setVisibility(k === "diary" ? "private" : "family");
  }

  const update = (key, patch) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  async function addFiles(fileList) {
    const files = [...fileList];
    if (!files.length) return;
    setError("");
    const added = files.map((f) => {
      const isImg = (f.type || "").startsWith("image/");
      const isVid = (f.type || "").startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg)$/i.test(f.name || "");
      return {
        key: `n${++seq}`,
        raw: f,
        name: f.name || "파일",
        size: f.size,
        isImage: isImg,
        isVideo: isVid,
        local: isImg ? URL.createObjectURL(f) : null,
        progress: 0,
        error: f.size > MAX_FILE ? `25MB가 넘어요 (${formatSize(f.size)})` : null,
      };
    });
    setItems((list) => [...list, ...added]);
    // 휴대폰 회선에서도 안정적이도록 한 개씩 차례로 올린다
    for (const it of added.filter((a) => !a.error)) {
      try {
        const prepared = await prepareFile(it.raw);
        const file = await uploadFile(prepared, (p) => update(it.key, { progress: p }));
        update(it.key, { file, progress: 1, isImage: file.isImage, isVideo: file.isVideo || it.isVideo });
      } catch (e) {
        update(it.key, { error: e.message });
      }
    }
  }

  function remove(it) {
    setItems((list) => list.filter((x) => x.key !== it.key));
    if (it.file && !originalIds.has(it.file.id)) api(`/api/family/files/${it.file.id}`, { method: "DELETE" }).catch(() => {});
    if (it.local) URL.revokeObjectURL(it.local);
  }

  const uploading = items.some((it) => !it.file && !it.error);
  const ready = items.filter((it) => it.file);

  async function submit(e) {
    e.preventDefault();
    if (!body.trim() && !ready.length) return setError("내용을 쓰거나 파일을 붙여 주세요.");
    setBusy(true);
    setError("");
    try {
      const payload = { kind, visibility, diaryDay, mood, body, fileIds: ready.map((it) => it.file.id) };
      const res = post ? await api(`/api/family/posts/${post.id}`, { method: "PATCH", body: payload }) : await api("/api/family/posts", { method: "POST", body: payload });
      saved.current = true;
      for (const it of items) if (it.local) URL.revokeObjectURL(it.local);
      if (!post) {
        setBody("");
        setMood("");
        setItems([]);
        saved.current = false;
      }
      onSaved(res.post);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={`panel famComposer${dragging ? " dragging" : ""}`}
      onSubmit={submit}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget) || setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <div className="famComposerTop">
        <div className="famSeg" role="group" aria-label="글 종류">
          <button type="button" className={kind === "message" ? "on" : ""} onClick={() => pickKind("message")}>
            💬 메시지
          </button>
          <button type="button" className={kind === "diary" ? "on" : ""} onClick={() => pickKind("diary")}>
            📔 일기
          </button>
        </div>
        <div className="famSeg" role="group" aria-label="공개 범위">
          <button type="button" className={visibility === "family" ? "on" : ""} onClick={() => setVisibility("family")}>
            👨‍👩‍👧 가족 공개
          </button>
          <button type="button" className={visibility === "private" ? "on" : ""} onClick={() => setVisibility("private")}>
            🔒 나만 보기
          </button>
        </div>
      </div>

      {kind === "diary" ? (
        <div className="famDiaryRow">
          <input type="date" className="input famDate" value={diaryDay} max={todayLocal()} onChange={(e) => setDiaryDay(e.target.value)} aria-label="일기 날짜" />
          <div className="famMoods" role="group" aria-label="오늘의 기분">
            {MOODS.map(([m, label]) => (
              <button key={m} type="button" className={mood === m ? "on" : ""} title={label} aria-label={label} aria-pressed={mood === m} onClick={() => setMood(mood === m ? "" : m)}>
                {m}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <textarea
        className="textarea"
        rows={kind === "diary" ? 5 : 3}
        placeholder={kind === "diary" ? "오늘 하루는 어땠나요?" : "가족에게 남길 말을 적어 주세요"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onPaste={(e) => {
          if (e.clipboardData.files.length) {
            e.preventDefault();
            addFiles(e.clipboardData.files);
          }
        }}
      />

      {items.length ? (
        <div className="famAttachList">
          {items.map((it) => (
            <div key={it.key} className={`famAttach${it.error ? " failed" : ""}`}>
              {it.isVideo ? (
                <span className="famAttachIcon">🎬</span>
              ) : it.local || it.thumb ? (
                <img src={it.local || it.thumb} alt="" />
              ) : (
                <span className="famAttachIcon">📎</span>
              )}
              <span className="famAttachName" title={it.name}>
                {it.error || it.name}
              </span>
              {!it.file && !it.error ? (
                <span className="famAttachProgress">
                  <span style={{ width: `${Math.round((it.progress || 0) * 100)}%` }} />
                </span>
              ) : null}
              <button type="button" className="famAttachRemove" onClick={() => remove(it)} aria-label={`${it.name} 빼기`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="famComposerFoot">
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
        <button type="button" className="btn small ghost" onClick={() => inputRef.current.click()}>
          📎 사진·파일
        </button>
        <span className="muted famHint">파일당 25MB · 동영상 재생 지원 · 사진은 자동 최적화</span>
        <span className="famSpacer" />
        {onCancel ? (
          <button type="button" className="btn small ghost" onClick={onCancel}>
            취소
          </button>
        ) : null}
        <button className="btn small brand" disabled={busy || uploading}>
          {uploading ? "올리는 중…" : busy ? "저장 중…" : post ? "고치기" : "남기기"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
