import { feedAttr, feedTag, parseFeed } from "./feed.js";
import { chatJSON, hasLLM } from "./llm.js";
import { DAY, HOUR, decodeEntities, fetchText, log, parseJSON, truncate } from "./util.js";

const CHECK_INTERVAL = 3 * HOUR;
const CHANNELS_PER_TICK = 12;
const VIDEOS_PER_TICK = 2;
const FIRST_FETCH = 3;

// @handle, 채널 URL, UC로 시작하는 채널 ID 중 무엇을 넣어도 채널 정보를 찾는다.
export async function resolveChannel(input) {
  const raw = input.trim();
  let id = raw.match(/(UC[\w-]{22})/)?.[1];
  let handle = raw.match(/@([\w.\-가-힣]+)/)?.[1] || null;
  let thumbnail = null;
  if (!id) {
    const url = /^https?:\/\//.test(raw) ? raw : `https://www.youtube.com/@${raw.replace(/^@/, "")}`;
    const html = await fetchText(url, { headers: { "accept-language": "ko" }, maxBytes: 800_000 });
    id =
      html.match(/<meta itemprop="identifier" content="(UC[\w-]{22})"/)?.[1] ||
      html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ||
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1];
    thumbnail = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || null;
    handle = handle || html.match(/"vanityChannelUrl":"http:\/\/www\.youtube\.com\/@([^"]+)"/)?.[1] || null;
  }
  if (!id) throw new Error("채널을 찾지 못했어요. 채널 주소나 @핸들을 확인해 주세요.");
  const feed = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  const title = decodeEntities(feed.match(/<title>([^<]*)<\/title>/)?.[1] || handle || id);
  return { id, title, handle, thumbnail: thumbnail ? decodeEntities(thumbnail) : null, feed };
}

function parseVideos(feedXml) {
  return parseFeed(feedXml).map((e) => {
    const id = feedTag(e.block, "yt:videoId").trim();
    return {
      id,
      title: e.title,
      description: decodeEntities(feedTag(e.block, "media:description")).trim(),
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: e.publishedAt || Date.now(),
      isShort: /#shorts/i.test(e.title) || e.url.includes("/shorts/"),
    };
  });
}

function insertVideos(env, channelId, videos) {
  const now = Date.now();
  return videos.map((v) =>
    env.DB.prepare(
      "INSERT OR IGNORE INTO videos (id, channel_id, title, description, thumbnail, published_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(v.id, channelId, v.title, v.description, v.thumbnail, v.publishedAt, now),
  );
}

export async function addChannel(env, input) {
  const ch = await resolveChannel(input);
  const now = Date.now();
  const videos = parseVideos(ch.feed).filter((v) => !v.isShort).slice(0, FIRST_FETCH);
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO channels (id, title, handle, thumbnail, added_at, checked_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, thumbnail = COALESCE(excluded.thumbnail, channels.thumbnail)",
    ).bind(ch.id, ch.title, ch.handle, ch.thumbnail, now, now),
    ...insertVideos(env, ch.id, videos),
  ]);
  await log(env, "info", `유튜브 채널 추가: ${ch.title} (최근 영상 ${videos.length}개 요약 대기)`);
  return { id: ch.id, title: ch.title, handle: ch.handle, thumbnail: ch.thumbnail };
}

// 오래 확인하지 않은 채널부터 새 영상을 확인한다. 확인할 채널이 없으면 false.
export async function checkChannels(env) {
  const { results } = await env.DB.prepare("SELECT id, title, added_at FROM channels WHERE checked_at < ? ORDER BY checked_at LIMIT ?")
    .bind(Date.now() - CHECK_INTERVAL, CHANNELS_PER_TICK)
    .all();
  if (!results.length) return false;
  const now = Date.now();
  const feeds = await Promise.allSettled(results.map((c) => fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`)));
  const stmts = [];
  for (const [i, r] of feeds.entries()) {
    const ch = results[i];
    stmts.push(env.DB.prepare("UPDATE channels SET checked_at = ? WHERE id = ?").bind(now, ch.id));
    if (r.status === "rejected") {
      await log(env, "warn", `채널 확인 실패 (${ch.title}): ${r.reason?.message}`);
      continue;
    }
    // 채널을 추가한 뒤, 최근 7일 안에 올라온 영상만 새로 받는다
    const since = Math.max(ch.added_at, now - 7 * DAY) - DAY;
    const fresh = parseVideos(r.value).filter((v) => !v.isShort && v.publishedAt > since);
    stmts.push(...insertVideos(env, ch.id, fresh));
  }
  await env.DB.batch(stmts);
  return true;
}

async function fetchTranscript(videoId) {
  // 안드로이드 앱 클라이언트로 자막 목록을 받는다. 유튜브가 서버 요청을 막으면 실패한다.
  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)" },
    body: JSON.stringify({
      context: { client: { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34, hl: "ko" } },
      videoId,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`player ${res.status}`);
  const data = await res.json();
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  if (!tracks.length) throw new Error("자막 없음");
  const pick =
    tracks.find((t) => t.languageCode === "ko" && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "ko") ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks[0];
  const xml = await fetchText(pick.baseUrl.replace(/&fmt=[^&]*/, ""), { timeout: 10000 });
  const lines = [...xml.matchAll(/<(?:text|p)\b[^>]*>([\s\S]*?)<\/(?:text|p)>/g)].map((m) =>
    decodeEntities(decodeEntities(m[1].replace(/<[^>]+>/g, ""))).trim(),
  );
  const text = lines.filter(Boolean).join(" ");
  if (text.length < 200) throw new Error("자막이 너무 짧음");
  return text.slice(0, 30000);
}

async function summarizeVideo(env, v, channelTitle) {
  let basis = "description";
  let source = v.description || "";
  try {
    source = await fetchTranscript(v.id);
    basis = "transcript";
  } catch (e) {
    console.log(`자막 실패 ${v.id}: ${e.message}`);
  }
  if (basis === "description" && source.length < 40) basis = "title";

  if (!hasLLM(env)) {
    return { basis: "none", oneLiner: "", summary: v.description ? [truncate(v.description, 280)] : [], points: [], tags: [] };
  }
  const out = await chatJSON(env, {
    system:
      "당신은 바쁜 창업가를 위해 유튜브 영상을 요약해 주는 에디터입니다. 반드시 한국어로, 영상에서 실제로 다룬 내용만 정리하세요. 근거가 설명란이나 제목뿐이면 추측하지 말고 확인 가능한 범위에서만 짧게 쓰세요.",
    user: `채널: ${channelTitle}
영상 제목: ${v.title}
근거 자료(${basis === "transcript" ? "자막" : basis === "description" ? "영상 설명란" : "제목만 있음"}):
${source || "(없음)"}

JSON으로만 답하세요.
{
  "one_liner": "이 영상을 한 문장으로 (40자 이내)",
  "summary": ["요약 1", "요약 2", "요약 3"],
  "points": ["기억할 핵심 포인트나 실행 아이디어 (최대 5개)"],
  "tags": ["키워드1", "키워드2", "키워드3"]
}`,
    maxTokens: 1200,
  });
  return {
    basis,
    oneLiner: String(out.one_liner || ""),
    summary: (Array.isArray(out.summary) ? out.summary : []).slice(0, 3).map(String),
    points: (Array.isArray(out.points) ? out.points : []).slice(0, 5).map(String),
    tags: (Array.isArray(out.tags) ? out.tags : []).slice(0, 4).map((t) => String(t).replace(/^#/, "")),
  };
}

export async function summarizeVideos(env) {
  const { results } = await env.DB.prepare(
    "SELECT v.*, c.title AS channel_title FROM videos v JOIN channels c ON c.id = v.channel_id WHERE v.status = 'new' ORDER BY v.published_at DESC LIMIT ?",
  )
    .bind(VIDEOS_PER_TICK)
    .all();
  if (!results.length) return 0;
  const done = await Promise.allSettled(results.map((v) => summarizeVideo(env, v, v.channel_title)));
  const stmts = [];
  for (const [i, r] of done.entries()) {
    const v = results[i];
    if (r.status === "fulfilled") {
      const s = r.value;
      stmts.push(
        env.DB.prepare("UPDATE videos SET status = 'done', basis = ?, one_liner = ?, summary = ?, points = ?, tags = ? WHERE id = ?").bind(
          s.basis, s.oneLiner, JSON.stringify(s.summary), JSON.stringify(s.points), JSON.stringify(s.tags), v.id,
        ),
      );
    } else {
      await log(env, "warn", `영상 요약 실패 (${v.title}): ${r.reason?.message}`);
      stmts.push(
        env.DB.prepare(`UPDATE videos SET attempts = attempts + 1, status = CASE WHEN attempts >= 2 THEN 'failed' ELSE 'new' END WHERE id = ?`).bind(v.id),
      );
    }
  }
  await env.DB.batch(stmts);
  return results.length;
}

export function videoFromRow(r) {
  return {
    id: r.id,
    channelId: r.channel_id,
    channelTitle: r.channel_title,
    channelThumbnail: r.channel_thumbnail,
    title: r.title,
    thumbnail: r.thumbnail,
    publishedAt: r.published_at,
    basis: r.basis,
    oneLiner: r.one_liner || "",
    summary: parseJSON(r.summary, []),
    points: parseJSON(r.points, []),
    tags: parseJSON(r.tags, []),
    description: r.status === "done" && r.basis === "none" ? truncate(r.description || "", 280) : undefined,
  };
}
