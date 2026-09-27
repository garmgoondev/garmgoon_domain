"use client";

const MESSAGES = {
  taken: "이미 사용 중인 방 코드입니다. 새 방을 만들어 주세요.",
  notFound: "방을 찾을 수 없습니다. 방 코드와 방장의 접속 상태를 확인해 주세요.",
  full: "방이 가득 찼습니다.",
  timeout: "연결 시간이 초과되었습니다. 네트워크를 확인하고 다시 시도해 주세요.",
  network: "온라인 연결에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.",
  closed: "상대방의 연결이 끊어졌습니다.",
  cancelled: "연결이 취소되었습니다.",
};

export function roomError(code) {
  return Object.assign(new Error(MESSAGES[code] || MESSAGES.network), { code });
}

// One transport for local tabs and remote devices: each action is delivered once.
// Never publish a room before the signaling server has registered its ID.
export class RoomPeer {
  constructor({ prefix, capacity = 1, onJoin = () => {}, onMessage = () => {}, onLeave = () => {}, onError = () => {}, makePeer, timeout = 15000 }) {
    Object.assign(this, { prefix, capacity, onJoin, onMessage, onLeave, onError, timeout });
    this.makePeer = makePeer || (async (id) => {
      const { Peer } = await import("peerjs");
      return new Peer(id, { config: { iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
      ] } });
    });
    this.connections = new Map();
    this.timers = new Set();
    this.closed = false;
  }

  later(fn, ms = this.timeout) {
    const timer = setTimeout(() => { this.timers.delete(timer); fn(); }, ms);
    this.timers.add(timer);
    return timer;
  }

  clear(timer) { clearTimeout(timer); this.timers.delete(timer); }

  async open(code, host, hello) {
    this.host = host;
    this.code = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{5,6}$/.test(this.code)) throw roomError("notFound");
    const peer = await this.makePeer(host ? this.prefix + this.code : undefined);
    if (this.closed) { peer.destroy(); throw roomError("cancelled"); }
    this.peer = peer;
    try {
      await new Promise((resolve, reject) => {
        const timer = this.later(() => fail(roomError("timeout")));
        const finish = () => { this.clear(timer); this.pending = null; resolve(); };
        const fail = (error) => { this.clear(timer); this.pending = null; reject(error); };
        this.pending = fail;
        peer.on("error", (error) => {
          if (this.closed) return;
          const code = error.type === "unavailable-id" ? "taken" : error.type === "peer-unavailable" ? "notFound" : "network";
          if (this.pending) this.pending(roomError(code));
          else this.onError(roomError(code));
        });
        peer.on("disconnected", () => {
          if (!this.closed && !peer.destroyed) {
            try { peer.reconnect(); } catch { this.onError(roomError("network")); }
          }
        });
        peer.on("close", () => {
          if (this.closed) return;
          if (this.pending) this.pending(roomError("closed"));
          else this.onError(roomError("closed"));
        });
        peer.on("connection", (conn) => {
          if (!host || this.closed) { conn.close(); return; }
          this.bind(conn);
        });
        peer.on("open", (id) => {
          if (this.closed) return;
          this.id = id;
          if (host) finish();
          else if (!this.outgoing) {
            this.outgoing = peer.connect(this.prefix + this.code, { reliable: true, serialization: "json" });
            this.bind(this.outgoing, hello, finish);
          }
        });
      });
      return this.id;
    } catch (error) { this.close(); throw error; }
  }

  bind(conn, hello, ready) {
    let admitted = false;
    const timer = this.later(() => conn.close());
    conn.on("open", () => {
      if (this.closed) { conn.close(); return; }
      if (!this.host) conn.send({ roomControl: "join", hello });
    });
    conn.on("data", (msg) => {
      if (this.closed || !msg || typeof msg !== "object") return;
      if (msg.roomControl === "join" && this.host && !admitted) {
        if (this.connections.size >= this.capacity) {
          conn.send({ roomControl: "full" });
          this.later(() => conn.close(), 200);
          return;
        }
        admitted = true;
        this.clear(timer);
        this.connections.set(conn.peer, conn);
        this.onJoin(conn.peer, msg.hello);
        conn.send({ roomControl: "ready" });
      } else if (msg.roomControl === "ready" && !this.host && !admitted) {
        admitted = true;
        this.clear(timer);
        this.connections.set(conn.peer, conn);
        ready();
      } else if (msg.roomControl === "full" && !this.host) {
        this.pending?.(roomError("full"));
      } else if (!msg.roomControl && (admitted || !this.host)) {
        this.onMessage(conn.peer, msg);
      }
    });
    conn.on("close", () => {
      this.clear(timer);
      const active = this.connections.get(conn.peer) === conn;
      if (active) this.connections.delete(conn.peer);
      if (this.closed) return;
      if (!this.host && this.pending) this.pending(roomError("closed"));
      else if (admitted && active) this.onLeave(conn.peer);
    });
    conn.on("error", () => {
      if (!this.closed && !this.host && this.pending) this.pending(roomError("network"));
      conn.close();
    });
  }

  send(data) {
    if (this.closed) return;
    for (const conn of this.connections.values()) {
      if (conn.open) conn.send(data);
    }
  }

  dropGuest() {
    const connections = [...this.connections.values()];
    this.connections.clear();
    for (const conn of connections) conn.close();
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.pending?.(roomError("cancelled"));
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.peer?.destroy();
    this.connections.clear();
  }
}
