"use client";

// 말랑 배구 온라인 대전.
// 두 사람이 같은 시드로 같은 경기를 각자 돌리고, 입력만 주고받는다(락스텝).
// 내 입력은 delay 틱 뒤의 프레임에 쓰이도록 미리 보내고, 상대 입력이 도착한 프레임까지만 진행한다.

import { RoomPeer } from "../roomPeer.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode() {
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export class VolleyNet {
  constructor(handlers) {
    this.h = handlers;
    this.transport = new RoomPeer({
      prefix: "garmgoon-volley-",
      onJoin: () => this.h.onOpen?.(),
      onMessage: (_id, msg) => this.h.onMessage?.(msg),
      onLeave: () => this.h.onClose?.(),
      onError: (error) => this.h.onError?.(error.code),
    });
  }

  async host(code) {
    try { await this.transport.open(code, true); }
    catch (error) { this.close(); throw error.code || "network"; }
  }

  async join(code) {
    try {
      await this.transport.open(code, false);
      this.h.onOpen?.();
    } catch (error) { this.close(); throw error.code || "network"; }
  }

  get connected() { return this.transport.connections.size > 0; }
  send(msg) { this.transport.send(msg); }
  dropGuest() { this.transport.dropGuest(); }
  close() { this.transport.close(); }
}

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
