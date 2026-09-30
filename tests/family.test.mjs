import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./db.mjs";
import worker from "../worker/index.js";
import { cleanupFamilyFiles, hashPassword, verifyPassword } from "../worker/family.js";
import { sessionCookie } from "../worker/auth.js";

const ORIGIN = "https://garmgoon.test";

// R2처럼 쓸 수 있는 메모리 버킷
function bucket() {
  const store = new Map();
  return {
    store,
    async put(key, value, opts = {}) {
      store.set(key, { data: new Uint8Array(value), httpMetadata: opts.httpMetadata || {} });
    },
    async get(key, opts = {}) {
      const o = store.get(key);
      if (!o) return null;
      let data = o.data;
      if (opts.range) {
        const offset = opts.range.offset || 0;
        const length = opts.range.length !== undefined ? opts.range.length : data.length - offset;
        data = data.slice(offset, offset + length);
        return { body: data, httpMetadata: o.httpMetadata, range: { offset, length } };
      }
      return { body: o.data, httpMetadata: o.httpMetadata };
    },
    async delete(keys) {
      for (const k of [].concat(keys)) store.delete(k);
    },
  };
}

function setup(t) {
  const env = { ...database(), ADMIN_PASSWORD: "adminpw", FILES: bucket() };
  t.after(() => env.sqlite.close());
  return env;
}

function cookieOf(res) {
  return (res.headers.get("set-cookie") || "").split(";")[0];
}

async function call(env, path, { method = "GET", body, cookie, form, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (cookie) init.headers.cookie = cookie;
  if (form) init.body = form;
  else if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await worker.fetch(new Request(`${ORIGIN}${path}`, init), env);
  const type = res.headers.get("content-type") || "";
  return { res, status: res.status, data: type.includes("json") ? await res.json() : null };
}

async function admin(env) {
  return (await sessionCookie(env, false)).split(";")[0];
}

async function addMember(env, name, password = "1234") {
  const { status, data } = await call(env, "/api/p/family", { method: "POST", cookie: await admin(env), body: { name, emoji: "🙂", color: "#336699", password } });
  assert.equal(status, 200, JSON.stringify(data));
  return data.member;
}

async function loginAs(env, member, password = "1234") {
  const { res, status } = await call(env, "/api/family/login", { method: "POST", body: { memberId: member.id, password } });
  assert.equal(status, 200);
  return cookieOf(res);
}

test("passwords are hashed with PBKDF2 and verified", async () => {
  const stored = await hashPassword("0000");
  assert.match(stored, /^pbkdf2\$100000\$/);
  assert.equal(await verifyPassword("0000", stored), true);
  assert.equal(await verifyPassword("0001", stored), false);
});

test("only the admin can manage members; members list is public", async (t) => {
  const env = setup(t);
  const denied = await call(env, "/api/p/family", { method: "POST", body: { name: "엄마", password: "1234" } });
  assert.equal(denied.status, 401);

  const mom = await addMember(env, "엄마");
  await addMember(env, "아빠");
  const dup = await call(env, "/api/p/family", { method: "POST", cookie: await admin(env), body: { name: "엄마", password: "1234" } });
  assert.equal(dup.status, 409);
  const short = await call(env, "/api/p/family", { method: "POST", cookie: await admin(env), body: { name: "아이", password: "12" } });
  assert.equal(short.status, 400);

  const { data } = await call(env, "/api/family/members");
  assert.deepEqual(data.members.map((m) => m.name), ["엄마", "아빠"]);
  assert.equal(data.members[0].password, undefined);

  // 관리자 로그인만으로는 가족 글을 볼 수 없다
  const posts = await call(env, "/api/family/posts", { cookie: await admin(env) });
  assert.equal(posts.status, 401);

  const cookie = await loginAs(env, mom);
  const me = await call(env, "/api/me", { cookie });
  assert.equal(me.data.authed, false);
  assert.equal(me.data.family.name, "엄마");
});

test("login locks the member after five wrong passwords", async (t) => {
  const env = setup(t);
  const mom = await addMember(env, "엄마");
  for (let i = 1; i <= 5; i++) {
    const r = await call(env, "/api/family/login", { method: "POST", body: { memberId: mom.id, password: "9999" } });
    assert.equal(r.status, 401);
  }
  const locked = await call(env, "/api/family/login", { method: "POST", body: { memberId: mom.id, password: "1234" } });
  assert.equal(locked.status, 429);

  // 관리자가 비밀번호를 재설정하면 잠금이 풀린다
  await call(env, `/api/p/family/${mom.id}`, { method: "PATCH", cookie: await admin(env), body: { password: "5678" } });
  await loginAs(env, mom, "5678");
});

test("private posts stay with their author; family posts are shared", async (t) => {
  const env = setup(t);
  const [mom, dad] = [await addMember(env, "엄마"), await addMember(env, "아빠")];
  const [momC, dadC] = [await loginAs(env, mom), await loginAs(env, dad)];

  const diary = await call(env, "/api/family/posts", {
    method: "POST",
    cookie: momC,
    body: { kind: "diary", visibility: "private", diaryDay: "2026-09-27", mood: "😊", body: "비밀 일기" },
  });
  assert.equal(diary.status, 200);
  const msg = await call(env, "/api/family/posts", { method: "POST", cookie: momC, body: { kind: "message", visibility: "family", body: "저녁 먹자" } });

  const dadFeed = await call(env, "/api/family/posts", { cookie: dadC });
  assert.deepEqual(dadFeed.data.posts.map((p) => p.body), ["저녁 먹자"]);
  assert.equal(dadFeed.data.posts[0].isNew, true);
  const momMine = await call(env, "/api/family/posts?scope=mine", { cookie: momC });
  assert.deepEqual(momMine.data.posts.map((p) => p.body), ["저녁 먹자", "비밀 일기"]);
  assert.equal(momMine.data.posts[1].mood, "😊");

  // 남의 비공개 글에는 댓글·반응을 달 수 없고, 고칠 수도 없다
  assert.equal((await call(env, `/api/family/posts/${diary.data.post.id}/comments`, { method: "POST", cookie: dadC, body: { body: "?" } })).status, 404);
  assert.equal((await call(env, `/api/family/posts/${msg.data.post.id}`, { method: "PATCH", cookie: dadC, body: { body: "해킹" } })).status, 404);

  const comment = await call(env, `/api/family/posts/${msg.data.post.id}/comments`, { method: "POST", cookie: dadC, body: { body: "좋아요!" } });
  assert.equal(comment.data.comment.author.name, "아빠");
  const react = await call(env, `/api/family/posts/${msg.data.post.id}/reactions`, { method: "PUT", cookie: dadC, body: { emoji: "❤️" } });
  assert.deepEqual(react.data.reactions, [{ emoji: "❤️", count: 1, mine: true, who: ["아빠"] }]);
  const bad = await call(env, `/api/family/posts/${msg.data.post.id}/reactions`, { method: "PUT", cookie: dadC, body: { emoji: "💩" } });
  assert.equal(bad.status, 400);

  // 엄마에게는 아빠의 댓글 1개가 새 소식이고, 확인하면 0이 된다
  assert.equal((await call(env, "/api/me", { cookie: momC })).data.family.unread, 1);
  await call(env, "/api/family/seen", { method: "POST", cookie: momC });
  assert.equal((await call(env, "/api/me", { cookie: momC })).data.family.unread, 0);

  // 비공개로 바꾸면 아빠 피드에서 사라진다
  const edited = await call(env, `/api/family/posts/${msg.data.post.id}`, { method: "PATCH", cookie: momC, body: { visibility: "private" } });
  assert.ok(edited.data.post.editedAt);
  assert.equal((await call(env, "/api/family/posts", { cookie: dadC })).data.posts.length, 0);

  const del = await call(env, `/api/family/posts/${msg.data.post.id}`, { method: "DELETE", cookie: momC });
  assert.equal(del.status, 200);
  assert.equal(env.sqlite.prepare("SELECT COUNT(*) AS n FROM family_comments").get().n, 0);
});

test("files follow the visibility of their post", async (t) => {
  const env = setup(t);
  const [mom, dad] = [await addMember(env, "엄마"), await addMember(env, "아빠")];
  const [momC, dadC] = [await loginAs(env, mom), await loginAs(env, dad)];

  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "바다.jpg", { type: "image/jpeg" }));
  form.append("preview", new File([new Uint8Array([4, 5])], "p.webp", { type: "image/webp" }));
  form.append("thumb", new File([new Uint8Array([6])], "t.webp", { type: "image/webp" }));
  form.append("width", "4000");
  form.append("height", "3000");
  const up = await call(env, "/api/family/files", { method: "POST", cookie: momC, form });
  assert.equal(up.status, 200);
  const file = up.data.file;
  assert.equal(file.isImage, true);
  assert.equal(file.hasPreview, true);
  assert.equal(env.FILES.store.size, 3);

  // 글에 붙기 전에는 올린 사람만 볼 수 있다
  assert.equal((await call(env, `/api/family/files/${file.id}`, { cookie: dadC })).status, 404);

  const post = await call(env, "/api/family/posts", { method: "POST", cookie: momC, body: { kind: "message", visibility: "family", body: "", fileIds: [file.id] } });
  assert.equal(post.data.post.files[0].id, file.id);

  const thumb = await call(env, `/api/family/files/${file.id}?v=thumb`, { cookie: dadC });
  assert.equal(thumb.status, 200);
  assert.equal(thumb.res.headers.get("content-type"), "image/webp");
  assert.deepEqual([...new Uint8Array(await thumb.res.arrayBuffer())], [6]);
  const original = await call(env, `/api/family/files/${file.id}?download`, { cookie: dadC });
  assert.match(original.res.headers.get("content-disposition"), /^attachment; filename\*=UTF-8''%EB%B0%94%EB%8B%A4\.jpg$/);

  const photos = await call(env, "/api/family/photos", { cookie: dadC });
  assert.equal(photos.data.photos.length, 1);

  await call(env, `/api/family/posts/${post.data.post.id}`, { method: "PATCH", cookie: momC, body: { visibility: "private" } });
  assert.equal((await call(env, `/api/family/files/${file.id}`, { cookie: dadC })).status, 404);
  assert.equal((await call(env, "/api/family/photos", { cookie: dadC })).data.photos.length, 0);

  // 스크립트가 들어갈 수 있는 SVG는 이미지로 보여 주지 않고 내려받게 한다
  const svg = new FormData();
  svg.append("file", new File(["<svg onload=alert(1)>"], "x.svg", { type: "image/svg+xml" }));
  const upSvg = await call(env, "/api/family/files", { method: "POST", cookie: momC, form: svg });
  assert.equal(upSvg.data.file.isImage, false);
  const served = await call(env, `/api/family/files/${upSvg.data.file.id}`, { cookie: momC });
  assert.match(served.res.headers.get("content-disposition"), /^attachment/);
  assert.equal(served.res.headers.get("x-content-type-options"), "nosniff");

  // 파일을 빼고 저장하면 저장소에서도 지워진다
  await call(env, `/api/family/posts/${post.data.post.id}`, { method: "PATCH", cookie: momC, body: { body: "사진 뺌", fileIds: [] } });
  assert.equal([...env.FILES.store.keys()].filter((k) => k.includes(file.id)).length, 0);

  // 하루 지난 미사용 업로드는 정리된다
  env.sqlite.prepare("UPDATE family_files SET created_at = 0 WHERE post_id IS NULL").run();
  assert.equal(await cleanupFamilyFiles(env), 1);
  assert.equal(env.FILES.store.size, 0);
});

test("video files can be streamed with range requests, played inline, and downloaded", async (t) => {
  const env = setup(t);
  const [mom, dad] = [await addMember(env, "엄마"), await addMember(env, "아빠")];
  const [momC, dadC] = [await loginAs(env, mom), await loginAs(env, dad)];

  // 1) 동영상 업로드 (MP4)
  const videoData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  const form = new FormData();
  form.append("file", new File([videoData], "놀이터.mp4", { type: "video/mp4" }));
  const up = await call(env, "/api/family/files", { method: "POST", cookie: momC, form });
  assert.equal(up.status, 200);
  const vid = up.data.file;
  assert.equal(vid.isImage, false);
  assert.equal(vid.isVideo, true);
  assert.equal(vid.mime, "video/mp4");
  assert.equal(vid.size, 10);

  // 확장자 기반 MIME 자동 추론 (MIME이 비어 있거나 octet-stream일 때)
  const formInfer = new FormData();
  formInfer.append("file", new File([new Uint8Array([1, 2, 3])], "춤.webm", { type: "application/octet-stream" }));
  const upInfer = await call(env, "/api/family/files", { method: "POST", cookie: momC, form: formInfer });
  assert.equal(upInfer.status, 200);
  assert.equal(upInfer.data.file.isVideo, true);
  assert.equal(upInfer.data.file.mime, "video/webm");

  // 2) 가족 공유 글에 동영상 첨부
  const post = await call(env, "/api/family/posts", {
    method: "POST",
    cookie: momC,
    body: { kind: "message", visibility: "family", body: "놀이터 영상이에요", fileIds: [vid.id] },
  });
  assert.equal(post.status, 200);
  assert.equal(post.data.post.files[0].isVideo, true);
  assert.equal(post.data.post.files[0].isImage, false);

  // 3) 다른 가족(아빠) 피드에서도 isVideo 플래그 확인
  const feed = await call(env, "/api/family/posts", { cookie: dadC });
  assert.equal(feed.status, 200);
  const feedFile = feed.data.posts[0].files[0];
  assert.equal(feedFile.isVideo, true);

  // 4) 일반 재생 요청: 200 OK, inline Content-Disposition, accept-ranges 지원
  const stream = await call(env, `/api/family/files/${vid.id}`, { cookie: dadC });
  assert.equal(stream.status, 200);
  assert.equal(stream.res.headers.get("content-type"), "video/mp4");
  assert.match(stream.res.headers.get("content-disposition"), /^inline; filename\*=UTF-8''%EB%86%80%EC%9D%B4%ED%84%B0\.mp4$/);
  assert.equal(stream.res.headers.get("accept-ranges"), "bytes");
  assert.equal(stream.res.headers.get("content-length"), "10");
  assert.match(stream.res.headers.get("content-security-policy"), /media-src 'self'/);

  // 5) Range 스트리밍 요청: bytes=2-6 (총 10바이트 중 2번부터 6번 인덱스까지 5바이트)
  const rangePart = await call(env, `/api/family/files/${vid.id}`, {
    cookie: dadC,
    headers: { range: "bytes=2-6" },
  });
  assert.equal(rangePart.status, 206);
  assert.equal(rangePart.res.headers.get("content-range"), "bytes 2-6/10");
  assert.equal(rangePart.res.headers.get("content-length"), "5");
  assert.deepEqual([...new Uint8Array(await rangePart.res.arrayBuffer())], [30, 40, 50, 60, 70]);

  // 6) 접미사 Range 요청: bytes=-4 (마지막 4바이트)
  const rangeSuffix = await call(env, `/api/family/files/${vid.id}`, {
    cookie: dadC,
    headers: { range: "bytes=-4" },
  });
  assert.equal(rangeSuffix.status, 206);
  assert.equal(rangeSuffix.res.headers.get("content-range"), "bytes 6-9/10");
  assert.equal(rangeSuffix.res.headers.get("content-length"), "4");
  assert.deepEqual([...new Uint8Array(await rangeSuffix.res.arrayBuffer())], [70, 80, 90, 100]);

  // 7) 시작 지정 Range 요청: bytes=7-
  const rangeOpen = await call(env, `/api/family/files/${vid.id}`, {
    cookie: dadC,
    headers: { range: "bytes=7-" },
  });
  assert.equal(rangeOpen.status, 206);
  assert.equal(rangeOpen.res.headers.get("content-range"), "bytes 7-9/10");
  assert.equal(rangeOpen.res.headers.get("content-length"), "3");
  assert.deepEqual([...new Uint8Array(await rangeOpen.res.arrayBuffer())], [80, 90, 100]);

  // 8) 범위 초과 Range 요청: 416 Range Not Satisfiable
  const rangeOob = await call(env, `/api/family/files/${vid.id}`, {
    cookie: dadC,
    headers: { range: "bytes=20-30" },
  });
  assert.equal(rangeOob.status, 416);
  assert.equal(rangeOob.res.headers.get("content-range"), "bytes */10");

  // 9) 명시적 다운로드 요청: attachment 반환
  const dl = await call(env, `/api/family/files/${vid.id}?download`, { cookie: dadC });
  assert.equal(dl.status, 200);
  assert.match(dl.res.headers.get("content-disposition"), /^attachment; filename\*=UTF-8''%EB%86%80%EC%9D%B4%ED%84%B0\.mp4$/);
});

test("changing a password ends other sessions", async (t) => {
  const env = setup(t);
  const mom = await addMember(env, "엄마");
  const oldCookie = await loginAs(env, mom);
  const wrong = await call(env, "/api/family/me", { method: "PATCH", cookie: oldCookie, body: { currentPassword: "0000", newPassword: "abcd" } });
  assert.equal(wrong.status, 400);
  const changed = await call(env, "/api/family/me", { method: "PATCH", cookie: oldCookie, body: { currentPassword: "1234", newPassword: "abcd" } });
  assert.equal(changed.status, 200);
  const newCookie = cookieOf(changed.res);
  assert.equal((await call(env, "/api/family/me", { cookie: oldCookie })).status, 401);
  assert.equal((await call(env, "/api/family/me", { cookie: newCookie })).status, 200);
});

test("cross-site writes are rejected", async (t) => {
  const env = setup(t);
  const mom = await addMember(env, "엄마");
  const cookie = await loginAs(env, mom);
  const r = await call(env, "/api/family/posts", {
    method: "POST",
    cookie,
    headers: { origin: "https://evil.example" },
    body: { kind: "message", visibility: "family", body: "x" },
  });
  assert.equal(r.status, 403);
});

test("deleting a member removes everything they wrote", async (t) => {
  const env = setup(t);
  const [mom, dad] = [await addMember(env, "엄마"), await addMember(env, "아빠")];
  const [momC, dadC] = [await loginAs(env, mom), await loginAs(env, dad)];
  const post = await call(env, "/api/family/posts", { method: "POST", cookie: dadC, body: { kind: "message", visibility: "family", body: "hi" } });
  await call(env, `/api/family/posts/${post.data.post.id}/comments`, { method: "POST", cookie: momC, body: { body: "hello" } });
  const momPost = await call(env, "/api/family/posts", { method: "POST", cookie: momC, body: { kind: "message", visibility: "family", body: "엄마 글" } });
  await call(env, `/api/family/posts/${momPost.data.post.id}/comments`, { method: "POST", cookie: dadC, body: { body: "아빠 댓글" } });

  const del = await call(env, `/api/p/family/${dad.id}`, { method: "DELETE", cookie: await admin(env) });
  assert.equal(del.status, 200);
  assert.equal((await call(env, "/api/family/me", { cookie: dadC })).status, 401);
  const feed = await call(env, "/api/family/posts", { cookie: momC });
  assert.deepEqual(feed.data.posts.map((p) => [p.body, p.comments.length]), [["엄마 글", 0]]);
});
