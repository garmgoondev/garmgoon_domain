"use client";

// 말랑 배구 온라인 대전.
// 두 사람이 같은 시드로 같은 경기를 각자 돌리고, 입력만 주고받는다(락스텝).
// 내 입력은 delay 틱 뒤의 프레임에 쓰이도록 미리 보내고, 상대 입력이 도착한 프레임까지만 진행한다.

const ICE = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }];
const ID_PREFIX = "garmgoon-volley-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode() {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export class VolleyNet {
  /** handlers: onOpen(), onMessage(msg), onClose(), onError(code) */
  constructor(handlers) {
    this.h = handlers;
    this.peer = null;
    this.conn = null;
    this.closed = false;
  }

  async makePeer(id) {
    const { Peer } = await import("peerjs");
    return new Peer(id, { config: { iceServers: ICE } });
  }

  // 방 만들기. 코드가 이미 쓰이면 "taken"으로 실패한다
  async host(code) {
    const peer = await this.makePeer(ID_PREFIX + code);
    this.peer = peer;
    await new Promise((resolve, reject) => {
      let opened = false;
      peer.on("open", () => {
        opened = true;
        resolve();
      });
      peer.on("error", (err) => {
        if (!opened) reject(err.type === "unavailable-id" ? "taken" : "network");
        else if (err.type !== "peer-unavailable") this.h.onError?.("network");
      });
      setTimeout(() => !opened && reject("timeout"), 12000);
    });
    peer.on("disconnected", () => {
      if (!this.closed) peer.reconnect();
    });
    peer.on("connection", (conn) => {
      if (this.conn && this.conn.open) {
        conn.on("open", () => {
          conn.send({ t: "full" });
          setTimeout(() => conn.close(), 400);
        });
        return;
      }
      this.bind(conn);
    });
  }

  // 방 들어가기
  async join(code) {
    const peer = await this.makePeer(undefined);
    this.peer = peer;
    await new Promise((resolve, reject) => {
      let done = false;
      const fail = (why) => {
        if (done) return;
        done = true;
        reject(why);
      };
      peer.on("error", (err) => {
        if (!done) fail(err.type === "peer-unavailable" ? "notFound" : "network");
        else this.h.onError?.("network");
      });
      peer.on("open", () => {
        const conn = peer.connect(ID_PREFIX + code, { reliable: true, serialization: "json" });
        this.bind(conn, () => {
          if (done) return;
          done = true;
          resolve();
        });
      });
      setTimeout(() => fail("timeout"), 15000);
    });
  }

  bind(conn, onReady) {
    this.conn = conn;
    conn.on("open", () => {
      onReady?.();
      this.h.onOpen?.();
    });
    conn.on("data", (msg) => {
      if (conn !== this.conn) return;
      if (msg && msg.t === "full") {
        this.h.onError?.("full");
        return;
      }
      this.h.onMessage?.(msg);
    });
    conn.on("close", () => {
      if (conn !== this.conn) return;
      this.conn = null;
      if (!this.closed) this.h.onClose?.();
    });
    conn.on("error", () => {});
  }

  get connected() {
    return !!(this.conn && this.conn.open);
  }

  send(msg) {
    if (this.conn && this.conn.open) this.conn.send(msg);
  }

  // 방장은 손님만 내보내고 방은 계속 연다
  dropGuest() {
    const c = this.conn;
    this.conn = null;
    c?.close();
  }

  close() {
    this.closed = true;
    try {
      this.conn?.close();
    } catch {}
    try {
      this.peer?.destroy();
    } catch {}
    this.conn = null;
    this.peer = null;
  }
}

// 입력 한 개를 0~17 정수로 줄여 보낸다
const pack = (i) => i.xDirection + 1 + 3 * (i.yDirection + 1) + 9 * (i.powerHit ? 1 : 0);
const unpack = (v) => ({ xDirection: (v % 3) - 1, yDirection: (Math.floor(v / 3) % 3) - 1, powerHit: Math.floor(v / 9) });
const NEUTRAL = 4;

export class Lockstep {
  constructor(localSlot, delay, id) {
    this.id = id;
    this.slot = localSlot;
    this.delay = delay;
    this.frame = 0;
    this.local = new Map();
    this.remote = new Map();
    for (let f = 0; f < delay; f++) {
      this.local.set(f, NEUTRAL);
      this.remote.set(f, NEUTRAL);
    }
    this.nextLocal = delay;
    this.out = [];
    this.outFrom = 0;
    this.sums = new Map();
    this.peerSums = new Map();
    this.desync = false;
  }

  // 지금 프레임 + delay 까지 내 입력을 채운다
  pump(sample) {
    while (this.nextLocal <= this.frame + this.delay) {
      if (!this.out.length) this.outFrom = this.nextLocal;
      const v = pack(sample());
      this.local.set(this.nextLocal, v);
      this.out.push(v);
      this.nextLocal++;
    }
  }

  flush(send) {
    if (!this.out.length) return;
    send({ t: "in", g: this.id, f: this.outFrom, v: this.out });
    this.out = [];
  }

  receive(f, arr) {
    arr.forEach((v, k) => this.remote.set(f + k, v));
  }

  ready() {
    return this.remote.has(this.frame) && this.local.has(this.frame);
  }

  // 이번 프레임의 두 선수 입력 [왼쪽, 오른쪽]
  take() {
    const f = this.frame;
    const mine = unpack(this.local.get(f));
    const theirs = unpack(this.remote.get(f));
    this.local.delete(f);
    this.remote.delete(f);
    this.frame++;
    return this.slot === 0 ? [mine, theirs] : [theirs, mine];
  }

  // 같은 프레임의 경기 요약값이 서로 다르면 어긋난 것
  recordSum(f, h, send) {
    this.sums.set(f, h);
    send({ t: "cs", g: this.id, f, h });
    this.check(f);
  }

  receiveSum(f, h) {
    this.peerSums.set(f, h);
    this.check(f);
  }

  check(f) {
    if (!this.sums.has(f) || !this.peerSums.has(f)) return;
    if (this.sums.get(f) !== this.peerSums.get(f)) this.desync = true;
    this.sums.delete(f);
    this.peerSums.delete(f);
  }
}
