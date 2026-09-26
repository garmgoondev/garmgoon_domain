"use client";

// WebRTC Multiplayer Manager using PeerJS
export const PLAYER_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
];

export function getRandomColor(index = 0) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class RacePeerManager {
  constructor({ onStateChange, onError, onPlayerJoined, onPlayerLeft }) {
    this.peer = null;
    this.connections = new Map(); // For host: peerId -> DataConnection
    this.hostConnection = null;   // For guest: DataConnection to host
    this.isHost = false;
    this.roomCode = null;
    this.myId = null;
    this.myNickname = "";
    this.myColor = PLAYER_COLORS[0];
    this.onStateChange = onStateChange || (() => {});
    this.onError = onError || (() => {});
    this.onPlayerJoined = onPlayerJoined || (() => {});
    this.onPlayerLeft = onPlayerLeft || (() => {});

    this.players = [];
  }

  async initPeer(peerId = null) {
    if (typeof window === "undefined") return null;

    // Dynamically import PeerJS so SSR doesn't fail
    const { Peer } = await import("peerjs");

    return new Promise((resolve, reject) => {
      try {
        const p = peerId ? new Peer(peerId) : new Peer();

        p.on("open", (id) => {
          this.peer = p;
          this.myId = id;
          resolve(id);
        });

        p.on("error", (err) => {
          console.error("PeerJS error:", err);
          this.onError(err);
          // If ID already taken, reject
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // --- HOST FUNCTIONS ---

  async createRoom(roomCode, hostNickname) {
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase();
    this.myNickname = hostNickname;
    this.myColor = PLAYER_COLORS[0];

    const targetPeerId = `garmgoon-race-${this.roomCode}`;
    await this.initPeer(targetPeerId);

    this.players = [
      {
        id: this.myId,
        nickname: hostNickname,
        isHost: true,
        color: this.myColor,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        rank: null,
      },
    ];

    this.peer.on("connection", (conn) => {
      this.handleIncomingGuest(conn);
    });

    this.onStateChange({
      isHost: true,
      roomCode: this.roomCode,
      players: [...this.players],
    });

    return this.roomCode;
  }

  handleIncomingGuest(conn) {
    conn.on("open", () => {
      this.connections.set(conn.peer, conn);

      conn.on("data", (data) => {
        this.handleHostDataReceived(conn.peer, data);
      });

      conn.on("close", () => {
        this.connections.delete(conn.peer);
        this.players = this.players.filter((p) => p.id !== conn.peer);
        this.broadcast({ type: "player_list", players: this.players });
        this.onPlayerLeft(conn.peer);
        this.onStateChange({ players: [...this.players] });
      });
    });
  }

  handleHostDataReceived(peerId, msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "join") {
      const existing = this.players.find((p) => p.id === peerId);
      if (!existing) {
        const color = getRandomColor(this.players.length);
        const newPlayer = {
          id: peerId,
          nickname: msg.nickname || `Racer-${peerId.slice(-4)}`,
          isHost: false,
          color,
          progress: 0,
          wpm: 0,
          accuracy: 100,
          finished: false,
          rank: null,
        };
        this.players.push(newPlayer);
        this.onPlayerJoined(newPlayer);
      }
      this.broadcast({ type: "player_list", players: this.players });
      this.onStateChange({ players: [...this.players] });
    } else if (msg.type === "progress") {
      const p = this.players.find((pl) => pl.id === peerId);
      if (p) {
        p.progress = msg.progress;
        p.wpm = msg.wpm;
        p.accuracy = msg.accuracy;
        if (msg.finished && !p.finished) {
          p.finished = true;
          const finishedCount = this.players.filter((x) => x.finished).length;
          p.rank = finishedCount;
        }
      }
      this.broadcast({ type: "player_list", players: this.players });
      this.onStateChange({ players: [...this.players] });
    }
  }

  // --- GUEST FUNCTIONS ---

  async joinRoom(roomCode, guestNickname) {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    this.myNickname = guestNickname;

    await this.initPeer();

    const hostPeerId = `garmgoon-race-${this.roomCode}`;
    const conn = this.peer.connect(hostPeerId, { reliable: true });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("방에 연결할 수 없습니다. 방 코드를 확인해주세요."));
      }, 9000);

      conn.on("open", () => {
        clearTimeout(timeout);
        this.hostConnection = conn;

        // Join message
        conn.send({
          type: "join",
          nickname: this.myNickname,
        });

        conn.on("data", (data) => {
          this.handleGuestDataReceived(data);
        });

        conn.on("close", () => {
          this.onError(new Error("방장과의 연결이 끊어졌습니다."));
        });

        resolve();
      });

      conn.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  handleGuestDataReceived(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "player_list") {
      this.players = msg.players || [];
      const me = this.players.find((p) => p.id === this.myId);
      if (me) {
        this.myColor = me.color;
      }
      this.onStateChange({ players: [...this.players] });
    } else if (msg.type === "race_start") {
      this.onStateChange({
        raceStarting: true,
        textData: msg.textData,
        startTime: msg.startTime,
      });
    } else if (msg.type === "race_reset") {
      this.onStateChange({
        raceReset: true,
      });
    }
  }

  // --- COMMON GAME ACTIONS ---

  startRace(textData) {
    if (!this.isHost) return;
    const startTime = Date.now() + 4000; // 3 sec countdown + 1 sec buffer
    this.players.forEach((p) => {
      p.progress = 0;
      p.wpm = 0;
      p.finished = false;
      p.rank = null;
    });

    this.broadcast({
      type: "race_start",
      textData,
      startTime,
    });

    this.onStateChange({
      raceStarting: true,
      textData,
      startTime,
      players: [...this.players],
    });
  }

  sendProgress({ progress, wpm, accuracy, finished }) {
    if (this.isHost) {
      const me = this.players.find((p) => p.id === this.myId);
      if (me) {
        me.progress = progress;
        me.wpm = wpm;
        me.accuracy = accuracy;
        if (finished && !me.finished) {
          me.finished = true;
          const finishedCount = this.players.filter((x) => x.finished).length;
          me.rank = finishedCount;
        }
      }
      this.broadcast({ type: "player_list", players: this.players });
      this.onStateChange({ players: [...this.players] });
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: "progress",
        progress,
        wpm,
        accuracy,
        finished,
      });
    }
  }

  resetRace() {
    if (!this.isHost) return;
    this.players.forEach((p) => {
      p.progress = 0;
      p.wpm = 0;
      p.finished = false;
      p.rank = null;
    });
    this.broadcast({ type: "race_reset" });
    this.onStateChange({ raceReset: true, players: [...this.players] });
  }

  broadcast(data) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  destroy() {
    if (this.hostConnection) {
      this.hostConnection.close();
      this.hostConnection = null;
    }
    this.connections.forEach((c) => c.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
