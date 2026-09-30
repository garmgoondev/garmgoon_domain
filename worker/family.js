import { hmac, timingSafeEqual } from "./auth.js";
import { boardCleanupStatements, handleBoard } from "./board.js";
import { handlePush, notifyMembers } from "./push.js";
import { DAY, httpError, json } from "./util.js";

// 가족 공간. 관리자 로그인(gg_session)과 별개로 구성원마다 비밀번호와 세션(gg_family)이 있다.

const COOKIE = "gg_family";
const MAX_AGE = 180 * 24 * 60 * 60;
const ITERATIONS = 100000;
const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const PAGE = 20;
const MAX_FILE = 25 * 1024 * 1024;
const MAX_VARIANT = 5 * 1024 * 1024;
const MAX_FILES_PER_POST = 20;
const MAX_BODY = 20000;
const MAX_COMMENT = 2000;
// 브라우저에서 바로 보여 줘도 안전한 이미지 형식. SVG처럼 스크립트가 들어갈 수 있는 형식은 일반 파일로 다룬다.
const INLINE_IMAGES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
// 브라우저에서 바로 재생 가능한 동영상 형식
const INLINE_VIDEOS = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime"]);

function detectMime(file) {
  let mime = String(file.type || "").toLowerCase().slice(0, 100);
  if (!mime || mime === "application/octet-stream") {
    const ext = (file.name || "").split(".").pop().toLowerCase();
    const map = {
      mp4: "video/mp4",
      m4v: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      ogg: "video/ogg",
      ogv: "video/ogg",
      mkv: "video/x-matroska",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      avif: "image/avif",
      pdf: "application/pdf",
    };
    if (map[ext]) mime = map[ext];
  }
  return mime || "application/octet-stream";
}

function isVideoMime(mime, name) {
  if (mime && (mime.startsWith("video/") || INLINE_VIDEOS.has(mime))) return true;
  if (name && /\.(mp4|webm|mov|m4v|ogg|ogv|mkv)$/i.test(name)) return true;
  return false;
}
export const REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🙏"];
const enc = new TextEncoder();

// ---------- 비밀번호 ----------

function b64url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return b64url(new Uint8Array(bits));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64url(salt)}$${await derive(password, salt, ITERATIONS)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iterations, salt, hash] = String(stored).split("$");
  if (scheme !== "pbkdf2" || !salt || !hash) return false;
  return timingSafeEqual(await derive(password, fromB64url(salt), Number(iterations)), hash);
}

function passwordError(password) {
  if (typeof password !== "string" || password.trim().length < 4) return "비밀번호는 4자 이상으로 정해 주세요.";
  if (password.length > 64) return "비밀번호가 너무 길어요.";
  return null;
}

// ---------- 세션 ----------

// SESSION_SECRET이 없으면 관리자 비밀번호를 비밀값으로 쓴다. 둘 다 없으면 가족 로그인을 막는다.
function familySecret(env) {
  const base = `${env.SESSION_SECRET || ""}:${(env.ADMIN_PASSWORD || "").trim()}`;
  return base === ":" ? null : `family:${base}`;
}

async function familyCookie(env, member, secure) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${member.id}.${member.session_version}.${exp}`;
  const value = `${payload}.${await hmac(familySecret(env), payload)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure ? "; Secure" : ""}`;
}

function clearFamilyCookie(secure) {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function currentMember(request, env) {
  const secret = familySecret(env);
  if (!secret) return null;
  const value = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`))?.[1];
  const [id, version, exp, sig] = (value || "").split(".");
  if (!sig || Number(exp) < Date.now() / 1000) return null;
  if (!timingSafeEqual(sig, await hmac(secret, `${id}.${version}.${exp}`))) return null;
  const member = await env.DB.prepare("SELECT * FROM family_members WHERE id = ?").bind(Number(id)).first();
  return member && member.session_version === Number(version) ? member : null;
}

// ---------- 변환 ----------

function publicMember(m) {
  return { id: m.id, name: m.name, emoji: m.emoji, color: m.color };
}

function fileFromRow(f) {
  return {
    id: f.id,
    name: f.name,
    mime: f.mime,
    size: f.size,
    width: f.width,
    height: f.height,
    isImage: Boolean(f.is_image),
    isVideo: isVideoMime(f.mime, f.name),
    hasPreview: Boolean(f.has_preview),
  };
}

function commentFromRow(c, members, me) {
  return {
    id: c.id,
    postId: c.post_id,
    body: c.body,
    author: members.get(c.member_id),
    mine: c.member_id === me.id,
    createdAt: c.created_at,
    editedAt: c.edited_at,
    isNew: c.member_id !== me.id && c.created_at > me.seen_at,
  };
}

async function memberMap(env) {
  const { results } = await env.DB.prepare("SELECT id, name, emoji, color FROM family_members").all();
  return new Map(results.map((m) => [m.id, publicMember(m)]));
}

function marks(list) {
  return list.map(() => "?").join(",");
}

// 글 목록에 작성자·첨부·댓글·반응을 붙인다
async function hydrate(env, me, rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [members, files, comments, reactions] = await Promise.all([
    memberMap(env),
    env.DB.prepare(`SELECT * FROM family_files WHERE post_id IN (${marks(ids)}) ORDER BY created_at, id`).bind(...ids).all(),
    env.DB.prepare(`SELECT * FROM family_comments WHERE post_id IN (${marks(ids)}) ORDER BY created_at`).bind(...ids).all(),
    env.DB.prepare(`SELECT * FROM family_reactions WHERE post_id IN (${marks(ids)}) ORDER BY created_at`).bind(...ids).all(),
  ]);
  const group = (list) => {
    const map = new Map();
    for (const x of list) map.set(x.post_id, [...(map.get(x.post_id) || []), x]);
    return map;
  };
  const [filesBy, commentsBy, reactionsBy] = [group(files.results), group(comments.results), group(reactions.results)];
  return rows.map((p) => ({
    id: p.id,
    kind: p.kind,
    visibility: p.visibility,
    diaryDay: p.diary_day,
    mood: p.mood,
    body: p.body,
    author: members.get(p.member_id),
    mine: p.member_id === me.id,
    createdAt: p.created_at,
    editedAt: p.edited_at,
    isNew: p.member_id !== me.id && p.created_at > me.seen_at,
    files: (filesBy.get(p.id) || []).map(fileFromRow),
    comments: (commentsBy.get(p.id) || []).map((c) => commentFromRow(c, members, me)),
    reactions: summarizeReactions(reactionsBy.get(p.id) || [], members, me),
  }));
}

function summarizeReactions(rows, members, me) {
  return REACTIONS.map((emoji) => {
    const who = rows.filter((r) => r.emoji === emoji);
    return { emoji, count: who.length, mine: who.some((r) => r.member_id === me.id), who: who.map((r) => members.get(r.member_id)?.name).filter(Boolean) };
  }).filter((r) => r.count);
}

async function postForMember(env, me, id) {
  const post = await env.DB.prepare("SELECT * FROM family_posts WHERE id = ?").bind(Number(id)).first();
  if (!post || (post.visibility !== "family" && post.member_id !== me.id)) return null;
  return post;
}

async function unreadCount(env, me) {
  const row = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM family_posts WHERE visibility = 'family' AND member_id != ? AND created_at > ?)
          + (SELECT COUNT(*) FROM family_comments c JOIN family_posts p ON p.id = c.post_id
             WHERE c.member_id != ? AND c.created_at > ? AND (p.visibility = 'family' OR p.member_id = ?)) AS n`,
  )
    .bind(me.id, me.seen_at, me.id, me.seen_at, me.id)
    .first();
  return row?.n || 0;
}

// /api/me에 붙는 가족 로그인 정보. 가족 테이블이 아직 없어도 사이트 전체가 멈추지 않게 한다.
export async function familySummary(request, env) {
  try {
    const me = await currentMember(request, env);
    return me ? { ...publicMember(me), unread: await unreadCount(env, me) } : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// ---------- 파일 ----------

const fileKey = (id, variant) => `family/${id}/${variant}`;

async function deleteFiles(env, ids) {
  if (!ids.length) return;
  if (env.FILES) await env.FILES.delete(ids.flatMap((id) => ["original", "preview", "thumb"].map((v) => fileKey(id, v))));
  await env.DB.prepare(`DELETE FROM family_files WHERE id IN (${marks(ids)})`).bind(...ids).run();
}

function isUpload(v) {
  return v && typeof v === "object" && typeof v.arrayBuffer === "function";
}

async function uploadFile(env, me, request) {
  if (!env.FILES) return httpError(503, "파일 저장소(R2)가 연결되지 않았어요.");
  if (Number(request.headers.get("content-length")) > MAX_FILE + 2 * MAX_VARIANT + 64 * 1024) return httpError(413, "파일은 25MB까지 올릴 수 있어요.");
  const form = await request.formData();
  const file = form.get("file");
  if (!isUpload(file)) return httpError(400, "파일이 없어요.");
  if (file.size > MAX_FILE) return httpError(413, "파일은 25MB까지 올릴 수 있어요.");
  const mime = detectMime(file);
  const isImage = INLINE_IMAGES.has(mime);
  const preview = form.get("preview");
  const thumb = form.get("thumb");
  const variantOk = (v) => isImage && isUpload(v) && INLINE_IMAGES.has(v.type) && v.size <= MAX_VARIANT;
  const hasPreview = variantOk(preview) && variantOk(thumb);
  const dim = (v) => Math.min(Math.max(Math.round(Number(v)) || 0, 0), 100000) || null;
  const id = crypto.randomUUID().replace(/-/g, "");

  await Promise.all([
    env.FILES.put(fileKey(id, "original"), await file.arrayBuffer(), { httpMetadata: { contentType: mime } }),
    hasPreview && env.FILES.put(fileKey(id, "preview"), await preview.arrayBuffer(), { httpMetadata: { contentType: preview.type } }),
    hasPreview && env.FILES.put(fileKey(id, "thumb"), await thumb.arrayBuffer(), { httpMetadata: { contentType: thumb.type } }),
  ]);
  const row = await env.DB.prepare(
    "INSERT INTO family_files (id, member_id, name, mime, size, width, height, is_image, has_preview, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
  )
    .bind(id, me.id, String(file.name || "파일").slice(0, 200), mime, file.size, dim(form.get("width")), dim(form.get("height")), isImage ? 1 : 0, hasPreview ? 1 : 0, Date.now())
    .first();
  return json({ file: fileFromRow(row) });
}

async function serveFile(env, me, id, request, url) {
  const row = await env.DB.prepare(
    "SELECT f.*, p.visibility, p.member_id AS owner FROM family_files f LEFT JOIN family_posts p ON p.id = f.post_id WHERE f.id = ?",
  )
    .bind(id)
    .first();
  // 글에 붙은 파일은 그 글을 볼 수 있는 사람만, 아직 안 붙은 파일은 올린 사람만 본다
  const allowed = row && (row.post_id ? row.visibility === "family" || row.owner === me.id : row.member_id === me.id);
  if (!allowed) return httpError(404, "파일을 찾을 수 없어요.");
  const asked = url.searchParams.get("v");
  const variant = row.has_preview && (asked === "preview" || asked === "thumb") ? asked : "original";
  const isVideo = isVideoMime(row.mime, row.name);
  const download = url.searchParams.has("download") || (!row.is_image && !isVideo);
  const etag = `"${id}-${variant}${download ? "-d" : ""}"`;
  const headers = {
    etag,
    "cache-control": "private, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
    "accept-ranges": "bytes",
  };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  const rangeHeader = !download && request.headers.get("range");
  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    const rawRange = rangeHeader.slice(6).trim();
    const match = rawRange.match(/^(\d*)-(\d*)$/);
    if (!match) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, "content-range": `bytes */${row.size}` },
      });
    }
    const total = row.size;
    let start = match[1] ? parseInt(match[1], 10) : undefined;
    let end = match[2] ? parseInt(match[2], 10) : undefined;

    if (start === undefined && end !== undefined) {
      start = Math.max(0, total - end);
      end = total - 1;
    } else if (start !== undefined && end === undefined) {
      end = total - 1;
    }

    if (start === undefined || end === undefined || start > end || start >= total) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, "content-range": `bytes */${total}` },
      });
    }

    end = Math.min(end, total - 1);
    const length = end - start + 1;

    const obj = await env.FILES?.get(fileKey(id, variant), {
      range: { offset: start, length },
    });
    if (!obj) return httpError(404, "파일을 찾을 수 없어요.");

    let body = obj.body;
    if (body instanceof Uint8Array && (!obj.range || obj.range.length !== length)) {
      body = body.slice(start, start + length);
    }

    const name = encodeURIComponent(row.name).replace(/['()*!]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(body, {
      status: 206,
      headers: {
        ...headers,
        "content-type": variant === "original" ? row.mime : obj.httpMetadata?.contentType || "image/webp",
        "content-disposition": `inline; filename*=UTF-8''${name}`,
        "content-range": `bytes ${start}-${end}/${total}`,
        "content-length": String(length),
      },
    });
  }

  const obj = await env.FILES?.get(fileKey(id, variant));
  if (!obj) return httpError(404, "파일을 찾을 수 없어요.");
  const name = encodeURIComponent(row.name).replace(/['()*!]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(obj.body, {
    status: 200,
    headers: {
      ...headers,
      "content-type": variant === "original" ? row.mime : obj.httpMetadata?.contentType || "image/webp",
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
      "content-length": String(row.size),
    },
  });
}

// 글에 붙지 않은 채 하루가 지난 업로드를 지운다 (크론에서 호출)
export async function cleanupFamilyFiles(env) {
  const { results } = await env.DB.prepare("SELECT id FROM family_files WHERE post_id IS NULL AND created_at < ? LIMIT 50").bind(Date.now() - DAY).all();
  await deleteFiles(env, results.map((r) => r.id));
  return results.length;
}

// 응답을 보낸 뒤에 이어서 할 일 (알림 등). 실패해도 요청에는 영향이 없다.
function later(ctx, promise) {
  const safe = promise.catch((e) => console.error(e));
  ctx?.waitUntil?.(safe);
}

function preview(text, n = 100) {
  const t = text.replace(/s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

// ---------- 글 ----------

function readPost(b, current) {
  const kind = b.kind ?? current?.kind;
  const visibility = b.visibility ?? current?.visibility;
  if (!["diary", "message"].includes(kind)) return { error: "글 종류가 잘못됐어요." };
  if (!["private", "family"].includes(visibility)) return { error: "공개 범위가 잘못됐어요." };
  const body = String(b.body ?? current?.body ?? "").trim();
  if (body.length > MAX_BODY) return { error: `글은 ${MAX_BODY.toLocaleString()}자까지 쓸 수 있어요.` };
  const day = b.diaryDay ?? current?.diary_day;
  const diaryDay = kind === "diary" && /^\d{4}-\d{2}-\d{2}$/.test(day || "") ? day : null;
  if (kind === "diary" && !diaryDay) return { error: "일기 날짜를 골라 주세요." };
  const mood = kind === "diary" ? String(b.mood ?? current?.mood ?? "").slice(0, 16) || null : null;
  const fileIds = Array.isArray(b.fileIds) ? [...new Set(b.fileIds.map(String))] : null;
  if (fileIds && fileIds.length > MAX_FILES_PER_POST) return { error: `파일은 한 글에 ${MAX_FILES_PER_POST}개까지 붙일 수 있어요.` };
  return { kind, visibility, body, diaryDay, mood, fileIds };
}

async function attachFiles(env, me, postId, fileIds) {
  if (!fileIds?.length) return;
  await env.DB.prepare(`UPDATE family_files SET post_id = ? WHERE member_id = ? AND post_id IS NULL AND id IN (${marks(fileIds)})`)
    .bind(postId, me.id, ...fileIds)
    .run();
}

async function onePost(env, me, id) {
  const row = await env.DB.prepare("SELECT * FROM family_posts WHERE id = ?").bind(id).first();
  return (await hydrate(env, me, [row]))[0];
}

async function listPosts(env, me, url) {
  const scope = url.searchParams.get("scope") === "mine" ? "mine" : "family";
  const author = Number(url.searchParams.get("member")) || null;
  const kind = ["diary", "message"].includes(url.searchParams.get("kind")) ? url.searchParams.get("kind") : null;
  const before = Number(url.searchParams.get("before")) || Date.now() + DAY;
  const where = [scope === "mine" ? "member_id = ?" : "visibility = 'family'"];
  const binds = scope === "mine" ? [me.id] : [];
  if (scope === "family" && author) where.push("member_id = ?"), binds.push(author);
  if (kind) where.push("kind = ?"), binds.push(kind);
  const { results } = await env.DB.prepare(`SELECT * FROM family_posts WHERE ${where.join(" AND ")} AND created_at < ? ORDER BY created_at DESC LIMIT ?`)
    .bind(...binds, before, PAGE)
    .all();
  return json({
    posts: await hydrate(env, me, results),
    nextBefore: results.length === PAGE ? results[results.length - 1].created_at : null,
  });
}

async function createPost(env, me, request, ctx) {
  const p = readPost(await request.json());
  if (p.error) return httpError(400, p.error);
  if (!p.body && !p.fileIds?.length) return httpError(400, "내용을 쓰거나 파일을 붙여 주세요.");
  const now = Date.now();
  const row = await env.DB.prepare(
    "INSERT INTO family_posts (member_id, kind, visibility, diary_day, mood, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(me.id, p.kind, p.visibility, p.diaryDay, p.mood, p.body, now, now)
    .first();
  await attachFiles(env, me, row.id, p.fileIds);
  const post = await onePost(env, me, row.id);
  // 가족 공개 글은 다른 구성원에게 알린다
  if (post.visibility === "family") {
    later(
      ctx,
      (async () => {
        const { results } = await env.DB.prepare("SELECT id FROM family_members WHERE id != ?").bind(me.id).all();
        const photos = post.files.filter((f) => f.isImage).length;
        const videos = post.files.filter((f) => f.isVideo).length;
        const fileSummary = videos && !photos
          ? (videos === 1 ? "동영상 1개" : `동영상 ${videos}개`)
          : photos && !videos
          ? `사진 ${photos}장`
          : photos && videos
          ? `사진 ${photos}장·동영상 ${videos}개`
          : `파일 ${post.files.length}개`;
        await notifyMembers(env, results.map((r) => r.id), {
          title: `${me.emoji} ${me.name} · 새 ${post.kind === "diary" ? "일기" : "메시지"}`,
          body: preview(post.body) || (post.files.length ? fileSummary : ""),
          url: "/family",
          tag: `post-${post.id}`,
        });
      })(),
    );
  }
  return json({ post });
}

async function updatePost(env, me, id, request) {
  const current = await env.DB.prepare("SELECT * FROM family_posts WHERE id = ? AND member_id = ?").bind(Number(id), me.id).first();
  if (!current) return httpError(404, "내가 쓴 글만 고칠 수 있어요.");
  const p = readPost(await request.json(), current);
  if (p.error) return httpError(400, p.error);
  const now = Date.now();
  if (p.fileIds) {
    const { results } = await env.DB.prepare("SELECT id FROM family_files WHERE post_id = ?").bind(current.id).all();
    await deleteFiles(env, results.map((r) => r.id).filter((f) => !p.fileIds.includes(f)));
    await attachFiles(env, me, current.id, p.fileIds);
  }
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM family_files WHERE post_id = ?").bind(current.id).first();
  if (!p.body && !n) return httpError(400, "내용을 쓰거나 파일을 붙여 주세요.");
  await env.DB.prepare("UPDATE family_posts SET kind = ?, visibility = ?, diary_day = ?, mood = ?, body = ?, updated_at = ?, edited_at = ? WHERE id = ?")
    .bind(p.kind, p.visibility, p.diaryDay, p.mood, p.body, now, now, current.id)
    .run();
  return json({ post: await onePost(env, me, current.id) });
}

async function deletePost(env, me, id) {
  const post = await env.DB.prepare("SELECT id FROM family_posts WHERE id = ? AND member_id = ?").bind(Number(id), me.id).first();
  if (!post) return httpError(404, "내가 쓴 글만 지울 수 있어요.");
  const { results } = await env.DB.prepare("SELECT id FROM family_files WHERE post_id = ?").bind(post.id).all();
  await deleteFiles(env, results.map((r) => r.id));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM family_comments WHERE post_id = ?").bind(post.id),
    env.DB.prepare("DELETE FROM family_reactions WHERE post_id = ?").bind(post.id),
    env.DB.prepare("DELETE FROM family_posts WHERE id = ?").bind(post.id),
  ]);
  return json({ ok: true });
}

async function addComment(env, me, postId, request, ctx) {
  const post = await postForMember(env, me, postId);
  if (!post) return httpError(404, "글을 찾을 수 없어요.");
  const body = String((await request.json()).body ?? "").trim();
  if (!body || body.length > MAX_COMMENT) return httpError(400, `댓글은 1~${MAX_COMMENT.toLocaleString()}자로 써 주세요.`);
  const row = await env.DB.prepare("INSERT INTO family_comments (post_id, member_id, body, created_at) VALUES (?, ?, ?, ?) RETURNING *")
    .bind(post.id, me.id, body, Date.now())
    .first();
  // 글쓴이와 그 글에 댓글을 단 사람들에게 알린다
  later(
    ctx,
    (async () => {
      const { results } = await env.DB.prepare("SELECT DISTINCT member_id FROM family_comments WHERE post_id = ?").bind(post.id).all();
      const ids = [...new Set([post.member_id, ...results.map((r) => r.member_id)])].filter((id) => id !== me.id);
      await notifyMembers(env, ids, { title: `💬 ${me.emoji} ${me.name} · 댓글`, body: preview(body), url: "/family", tag: `post-${post.id}` });
    })(),
  );
  return json({ comment: commentFromRow(row, await memberMap(env), me) });
}

async function commentApi(env, me, id, request) {
  const current = await env.DB.prepare("SELECT * FROM family_comments WHERE id = ? AND member_id = ?").bind(Number(id), me.id).first();
  if (!current) return httpError(404, "내가 쓴 댓글만 고치거나 지울 수 있어요.");
  if (request.method === "DELETE") {
    await env.DB.prepare("DELETE FROM family_comments WHERE id = ?").bind(current.id).run();
    return json({ ok: true });
  }
  const body = String((await request.json()).body ?? "").trim();
  if (!body || body.length > MAX_COMMENT) return httpError(400, `댓글은 1~${MAX_COMMENT.toLocaleString()}자로 써 주세요.`);
  const row = await env.DB.prepare("UPDATE family_comments SET body = ?, edited_at = ? WHERE id = ? RETURNING *").bind(body, Date.now(), current.id).first();
  return json({ comment: commentFromRow(row, await memberMap(env), me) });
}

async function toggleReaction(env, me, postId, request) {
  const post = await postForMember(env, me, postId);
  if (!post) return httpError(404, "글을 찾을 수 없어요.");
  const { emoji } = await request.json();
  if (!REACTIONS.includes(emoji)) return httpError(400, "쓸 수 없는 반응이에요.");
  const existing = await env.DB.prepare("SELECT 1 AS x FROM family_reactions WHERE post_id = ? AND member_id = ? AND emoji = ?").bind(post.id, me.id, emoji).first();
  await (existing
    ? env.DB.prepare("DELETE FROM family_reactions WHERE post_id = ? AND member_id = ? AND emoji = ?").bind(post.id, me.id, emoji)
    : env.DB.prepare("INSERT INTO family_reactions (post_id, member_id, emoji, created_at) VALUES (?, ?, ?, ?)").bind(post.id, me.id, emoji, Date.now())
  ).run();
  const { results } = await env.DB.prepare("SELECT * FROM family_reactions WHERE post_id = ? ORDER BY created_at").bind(post.id).all();
  return json({ reactions: summarizeReactions(results, await memberMap(env), me) });
}

async function listPhotos(env, url) {
  const before = Number(url.searchParams.get("before")) || Date.now() + DAY;
  const limit = 60;
  const [{ results }, members] = await Promise.all([
    env.DB.prepare(
      `SELECT f.*, p.member_id AS owner, p.id AS post FROM family_files f JOIN family_posts p ON p.id = f.post_id
       WHERE f.is_image = 1 AND p.visibility = 'family' AND f.created_at < ? ORDER BY f.created_at DESC LIMIT ?`,
    )
      .bind(before, limit)
      .all(),
    memberMap(env),
  ]);
  return json({
    photos: results.map((f) => ({ ...fileFromRow(f), postId: f.post, author: members.get(f.owner), createdAt: f.created_at })),
    nextBefore: results.length === limit ? results[results.length - 1].created_at : null,
  });
}

// ---------- 내 정보 ----------

async function updateMe(env, me, request, secure) {
  const b = await request.json();
  const emoji = b.emoji !== undefined ? String(b.emoji).trim().slice(0, 16) || me.emoji : me.emoji;
  const color = /^#[0-9a-f]{6}$/i.test(b.color || "") ? b.color : me.color;
  let password = me.password;
  let version = me.session_version;
  if (b.newPassword !== undefined) {
    if (!(await verifyPassword(String(b.currentPassword ?? "").trim(), me.password))) return httpError(400, "지금 비밀번호가 맞지 않아요.");
    const err = passwordError(b.newPassword);
    if (err) return httpError(400, err);
    password = await hashPassword(b.newPassword.trim());
    version += 1;
  }
  const row = await env.DB.prepare("UPDATE family_members SET emoji = ?, color = ?, password = ?, session_version = ? WHERE id = ? RETURNING *")
    .bind(emoji, color, password, version, me.id)
    .first();
  // 비밀번호를 바꾸면 다른 기기의 세션은 끊기고 지금 기기만 새 쿠키로 이어진다
  const headers = version !== me.session_version ? { "set-cookie": await familyCookie(env, row, secure) } : {};
  return json({ member: publicMember(row) }, { headers });
}

async function login(env, request, secure) {
  if (!familySecret(env)) return httpError(503, "SESSION_SECRET 또는 ADMIN_PASSWORD가 설정되지 않았어요.");
  const { memberId, password } = await request.json();
  const now = Date.now();
  const member = await env.DB.prepare("SELECT * FROM family_members WHERE id = ?").bind(Number(memberId)).first();
  if (!member) return httpError(404, "구성원을 찾을 수 없어요.");
  if (member.locked_until > now) {
    return httpError(429, `비밀번호를 여러 번 틀렸어요. ${Math.ceil((member.locked_until - now) / 60000)}분 뒤에 다시 해 주세요.`);
  }
  if (typeof password !== "string" || !(await verifyPassword(password.trim(), member.password))) {
    const fails = member.failed_logins + 1;
    const locked = fails >= MAX_FAILS;
    await env.DB.prepare("UPDATE family_members SET failed_logins = ?, locked_until = ? WHERE id = ?")
      .bind(locked ? 0 : fails, locked ? now + LOCK_MS : 0, member.id)
      .run();
    await new Promise((r) => setTimeout(r, 800));
    return httpError(401, locked ? `비밀번호를 ${MAX_FAILS}번 틀려서 ${LOCK_MS / 60000}분 동안 잠겼어요.` : `비밀번호가 맞지 않아요. (${fails}/${MAX_FAILS})`);
  }
  await env.DB.prepare("UPDATE family_members SET failed_logins = 0, locked_until = 0 WHERE id = ?").bind(member.id).run();
  return json({ member: publicMember(member) }, { headers: { "set-cookie": await familyCookie(env, member, secure) } });
}

// /api/family/...
export async function handleFamily(request, env, url, path, ctx) {
  const secure = url.protocol === "https:";
  const method = request.method;
  const origin = request.headers.get("origin");
  // 다른 사이트에서 보낸 쓰기 요청은 거절한다
  if (method !== "GET" && origin && origin !== url.origin) return httpError(403, "허용되지 않는 요청");
  const sub = path.slice("/api/family".length) || "/";
  // 파일 업로드(multipart)와 본문 없는 요청 말고는 JSON만 받는다
  // (실제 런타임에선 본문 없는 POST도 body가 빈 스트림이라 content-length로 판단한다)
  const hasBody = Number(request.headers.get("content-length") || 0) > 0 || request.headers.has("transfer-encoding");
  if (hasBody && sub !== "/files" && !(request.headers.get("content-type") || "").includes("application/json")) {
    return httpError(415, "JSON 요청만 받습니다.");
  }

  if (sub === "/members" && method === "GET") {
    const { results } = await env.DB.prepare("SELECT id, name, emoji, color FROM family_members ORDER BY created_at, id").all();
    return json({ members: results.map(publicMember) });
  }
  if (sub === "/login" && method === "POST") return login(env, request, secure);
  if (sub === "/logout" && method === "POST") return json({ ok: true }, { headers: { "set-cookie": clearFamilyCookie(secure) } });

  const me = await currentMember(request, env);
  if (!me) return httpError(401, "가족 로그인이 필요해요.");

  if (sub === "/me") {
    if (method === "GET") return json({ member: publicMember(me), unread: await unreadCount(env, me), seenAt: me.seen_at });
    if (method === "PATCH") return updateMe(env, me, request, secure);
  }
  if (sub === "/seen" && method === "POST") {
    await env.DB.prepare("UPDATE family_members SET seen_at = ? WHERE id = ?").bind(Date.now(), me.id).run();
    return json({ ok: true });
  }
  if (sub === "/posts") {
    if (method === "GET") return listPosts(env, me, url);
    if (method === "POST") return createPost(env, me, request, ctx);
  }
  if (sub === "/photos" && method === "GET") return listPhotos(env, url);
  if (sub === "/board" || sub.startsWith("/board/")) return handleBoard(env, me, request, url, sub.slice("/board".length));
  if (sub === "/push" || sub.startsWith("/push/")) return handlePush(env, me, request, sub.slice("/push".length));
  if (sub === "/files" && method === "POST") return uploadFile(env, me, request);

  const m = sub.match(/^\/(posts|comments|files)\/([^/]+)(?:\/(comments|reactions))?$/);
  if (m) {
    const [, resource, id, child] = m;
    if (resource === "posts" && child === "comments" && method === "POST") return addComment(env, me, id, request, ctx);
    if (resource === "posts" && child === "reactions" && method === "PUT") return toggleReaction(env, me, id, request);
    if (resource === "posts" && !child && method === "PATCH") return updatePost(env, me, id, request);
    if (resource === "posts" && !child && method === "DELETE") return deletePost(env, me, id);
    if (resource === "comments" && !child && (method === "PATCH" || method === "DELETE")) return commentApi(env, me, id, request);
    if (resource === "files" && !child && method === "GET") return serveFile(env, me, id, request, url);
    if (resource === "files" && !child && method === "DELETE") {
      const file = await env.DB.prepare("SELECT id FROM family_files WHERE id = ? AND member_id = ? AND post_id IS NULL").bind(id, me.id).first();
      if (file) await deleteFiles(env, [file.id]);
      return json({ ok: true });
    }
  }
  return httpError(404, "없는 API");
}

// ---------- 관리자: 구성원 관리 (/api/p/family) ----------

function readProfile(b) {
  const name = String(b.name ?? "").trim();
  const emoji = String(b.emoji ?? "").trim().slice(0, 16) || "🙂";
  const color = /^#[0-9a-f]{6}$/i.test(b.color || "") ? b.color : "#ff5a36";
  return { name, emoji, color };
}

export async function familyAdminApi(env, request, id) {
  const now = Date.now();
  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      `SELECT m.id, m.name, m.emoji, m.color, m.locked_until, m.created_at, m.seen_at,
              (SELECT COUNT(*) FROM family_posts p WHERE p.member_id = m.id) AS posts
       FROM family_members m ORDER BY m.created_at, m.id`,
    ).all();
    return json({
      members: results.map((m) => ({ ...publicMember(m), posts: m.posts, locked: m.locked_until > now, lastSeenAt: m.seen_at || null, createdAt: m.created_at })),
      storage: Boolean(env.FILES),
    });
  }
  if (request.method === "POST") {
    const b = await request.json();
    const p = readProfile(b);
    if (!p.name || p.name.length > 20) return httpError(400, "이름은 1~20자로 정해 주세요.");
    const err = passwordError(b.password);
    if (err) return httpError(400, err);
    const dup = await env.DB.prepare("SELECT 1 AS x FROM family_members WHERE name = ?").bind(p.name).first();
    if (dup) return httpError(409, "같은 이름의 구성원이 있어요.");
    const row = await env.DB.prepare("INSERT INTO family_members (name, emoji, color, password, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *")
      .bind(p.name, p.emoji, p.color, await hashPassword(b.password.trim()), now)
      .first();
    return json({ member: publicMember(row) });
  }
  const member = id && (await env.DB.prepare("SELECT * FROM family_members WHERE id = ?").bind(Number(id)).first());
  if (!member) return httpError(404, "구성원을 찾을 수 없어요.");
  if (request.method === "PATCH") {
    const b = await request.json();
    const p = readProfile({ name: member.name, emoji: member.emoji, color: member.color, ...b });
    if (!p.name || p.name.length > 20) return httpError(400, "이름은 1~20자로 정해 주세요.");
    if (p.name !== member.name && (await env.DB.prepare("SELECT 1 AS x FROM family_members WHERE name = ?").bind(p.name).first())) {
      return httpError(409, "같은 이름의 구성원이 있어요.");
    }
    let password = member.password;
    let version = member.session_version;
    if (b.password) {
      const err = passwordError(b.password);
      if (err) return httpError(400, err);
      password = await hashPassword(b.password.trim());
      version += 1;
    }
    // 비밀번호를 재설정하면 잠금도 풀고 그 구성원의 기존 세션은 끊는다
    const row = await env.DB.prepare(
      "UPDATE family_members SET name = ?, emoji = ?, color = ?, password = ?, session_version = ?, failed_logins = 0, locked_until = 0 WHERE id = ? RETURNING *",
    )
      .bind(p.name, p.emoji, p.color, password, version, member.id)
      .first();
    return json({ member: publicMember(row) });
  }
  if (request.method === "DELETE") {
    // 구성원이 쓴 글·댓글·반응·파일을 모두 지운다
    const { results } = await env.DB.prepare(
      "SELECT f.id FROM family_files f LEFT JOIN family_posts p ON p.id = f.post_id WHERE f.member_id = ? OR p.member_id = ?",
    )
      .bind(member.id, member.id)
      .all();
    await deleteFiles(env, results.map((r) => r.id));
    const ownPosts = "SELECT id FROM family_posts WHERE member_id = ?";
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM family_comments WHERE member_id = ? OR post_id IN (${ownPosts})`).bind(member.id, member.id),
      env.DB.prepare(`DELETE FROM family_reactions WHERE member_id = ? OR post_id IN (${ownPosts})`).bind(member.id, member.id),
      env.DB.prepare("DELETE FROM family_posts WHERE member_id = ?").bind(member.id),
      ...boardCleanupStatements(env, member.id),
      env.DB.prepare("DELETE FROM family_members WHERE id = ?").bind(member.id),
    ]);
    return json({ ok: true });
  }
  return httpError(405, "허용되지 않는 요청");
}
