"use client";

// WebRTC + BroadcastChannel Multi-Transport Race Manager
// Supports instant 0ms local tab-to-tab communication (BroadcastChannel)
// and cross-device peer-to-peer communication (WebRTC DataChannel via PeerJS)

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
    this.broadcastChannel = null;
    this.connections = new Map(); // Host: peerId -> DataConnection
    this.hostConnection = null;   // Guest: DataConnection to host
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
    this.joinRetryInterval = null;
  }

  // Generate fallback random ID if PeerJS is delayed
  generateClientId() {
    return "client-" + Math.random().toString(36).substring(2, 9);
  }

  // --- BROADCAST CHANNEL SETUP (Same Desktop / Cross-Tab Instant Sync) ---
  setupBroadcastChannel(roomCode) {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    try {
      this.broadcastChannel = new BroadcastChannel(`garmgoon_race_${roomCode}`);
      this.broadcastChannel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || !msg.type) return;

        // Ignore messages sent by self
        if (msg.senderId === this.myId) return;

        if (this.isHost) {
          this.handleHostDataReceived(msg.senderId, msg);
        } else {
          this.handleGuestDataReceived(msg);
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel not supported or failed:", e);
    }
  }

  // --- PEERJS INITIALIZATION ---
  async initPeer(targetPeerId = null) {
    if (typeof window === "undefined") return null;

    try {
      const { Peer } = await import("peerjs");

      const peerOptions = {
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:global.stun.twilio.com:3478" },
          ],
        },
      };

      return new Promise((resolve) => {
        const p = targetPeerId ? new Peer(targetPeerId, peerOptions) : new Peer(peerOptions);

        p.on("open", (id) => {
          this.peer = p;
          this.myId = id;
          resolve(id);
        });

        p.on("error", (err) => {
          console.warn("PeerJS warning/error:", err);
          // If PeerJS cloud is slow or errors out, fallback to local client ID so local BroadcastChannel still works!
          if (!this.myId) {
            this.myId = this.generateClientId();
            resolve(this.myId);
          }
        });

        // Resolve after 2 seconds timeout so user isn't stuck waiting for PeerJS broker
        setTimeout(() => {
          if (!this.myId) {
            this.myId = this.generateClientId();
            resolve(this.myId);
          }
        }, 2000);
      });
    } catch (err) {
      console.warn("PeerJS load error, using local fallback:", err);
      this.myId = this.generateClientId();
      return this.myId;
    }
  }

  // --- HOST: CREATE ROOM ---
  async createRoom(roomCode, hostNickname) {
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase();
    this.myNickname = hostNickname;
    this.myColor = PLAYER_COLORS[0];

    // 1. Setup local BroadcastChannel
    this.setupBroadcastChannel(this.roomCode);

    // 2. Setup WebRTC Peer
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

    if (this.peer) {
      this.peer.on("connection", (conn) => {
        this.handleIncomingGuest(conn);
      });
    }

    this.onStateChange({
      isHost: true,
      roomCode: this.roomCode,
      players: [...this.players],
    });

    return this.roomCode;
  }

  handleIncomingGuest(conn) {
    this.connections.set(conn.peer, conn);

    // Attach event listeners immediately (NOT nested inside open)
    conn.on("data", (data) => {
      this.handleHostDataReceived(conn.peer, data);
    });

    conn.on("open", () => {
      // Send current player list immediately upon open
      conn.send({
        type: "player_list",
        players: this.players,
        senderId: this.myId,
      });
    });

    conn.on("close", () => {
      this.handleGuestDisconnect(conn.peer);
    });

    conn.on("error", (err) => {
      console.warn("Guest connection error:", err);
    });
  }

  handleGuestDisconnect(peerId) {
    this.connections.delete(peerId);
    this.players = this.players.filter((p) => p.id !== peerId);
    this.broadcast({ type: "player_list", players: this.players });
    this.onPlayerLeft(peerId);
    this.onStateChange({ players: [...this.players] });
  }

  handleHostDataReceived(peerId, msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "join") {
      const senderId = msg.senderId || peerId;
      const existing = this.players.find((p) => p.id === senderId);
      if (!existing) {
        const color = getRandomColor(this.players.length);
        const newPlayer = {
          id: senderId,
          nickname: msg.nickname || `Racer-${String(senderId).slice(-4)}`,
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

      // Broadcast updated list to all
      this.broadcast({ type: "player_list", players: this.players });
      this.onStateChange({ players: [...this.players] });
    } else if (msg.type === "progress") {
      const senderId = msg.senderId || peerId;
      const p = this.players.find((pl) => pl.id === senderId);
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

  // --- GUEST: JOIN ROOM ---
  async joinRoom(roomCode, guestNickname) {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    this.myNickname = guestNickname;

    // 1. Setup local BroadcastChannel
    this.setupBroadcastChannel(this.roomCode);

    // 2. Setup WebRTC Peer
    await this.initPeer();

    // Broadcast join via BroadcastChannel immediately (for same-desktop tabs)
    this.sendToHost({
      type: "join",
      nickname: this.myNickname,
      senderId: this.myId,
    });

    // Also connect via WebRTC if peer exists
    if (this.peer && this.peer.connect) {
      const hostPeerId = `garmgoon-race-${this.roomCode}`;
      try {
        const conn = this.peer.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on("data", (data) => {
          this.handleGuestDataReceived(data);
        });

        conn.on("open", () => {
          conn.send({
            type: "join",
            nickname: this.myNickname,
            senderId: this.myId,
          });
        });

        conn.on("close", () => {
          // If we are not already connected via BroadcastChannel
          console.warn("Host connection closed");
        });
      } catch (err) {
        console.warn("Peer connection attempt:", err);
      }
    }

    // Keep retrying join message every 1.5 seconds until we receive player_list
    return new Promise((resolve) => {
      let resolved = false;

      const checkJoined = (players) => {
        if (!resolved && players && players.some((p) => p.id === this.myId || p.nickname === this.myNickname)) {
          resolved = true;
          if (this.joinRetryInterval) clearInterval(this.joinRetryInterval);
          resolve();
        }
      };

      // Periodic join ping
      this.joinRetryInterval = setInterval(() => {
        if (resolved) {
          clearInterval(this.joinRetryInterval);
          return;
        }
        this.sendToHost({
          type: "join",
          nickname: this.myNickname,
          senderId: this.myId,
        });
      }, 1200);

      // Listen for player list in onStateChange wrapper
      const originalStateChange = this.onStateChange;
      this.onStateChange = (state) => {
        originalStateChange(state);
        if (state.players) {
          checkJoined(state.players);
        }
      };

      // Timeout fallback after 6s
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (this.joinRetryInterval) clearInterval(this.joinRetryInterval);
          resolve(); // Resolve anyway so UI moves to lobby
        }
      }, 6000);
    });
  }

  handleGuestDataReceived(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "player_list") {
      this.players = msg.players || [];
      const me = this.players.find((p) => p.id === this.myId || p.nickname === this.myNickname);
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

  // --- ACTIONS ---

  startRace(textData) {
    if (!this.isHost) return;
    const startTime = Date.now() + 4000;
    this.players.forEach((p) => {
      p.progress = 0;
      p.wpm = 0;
      p.finished = false;
      p.rank = null;
    });

    const msg = {
      type: "race_start",
      textData,
      startTime,
      senderId: this.myId,
    };

    this.broadcast(msg);

    this.onStateChange({
      raceStarting: true,
      textData,
      startTime,
      players: [...this.players],
    });
  }

  sendProgress({ progress, wpm, accuracy, finished }) {
    const payload = {
      type: "progress",
      progress,
      wpm,
      accuracy,
      finished,
      senderId: this.myId,
    };

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
    } else {
      this.sendToHost(payload);
    }
  }

  sendToHost(data) {
    data.senderId = this.myId;

    // Send via local BroadcastChannel (0ms cross-tab)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(data);
      } catch (e) {}
    }

    // Send via WebRTC DataChannel (remote peer)
    if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(data);
      } catch (e) {}
    }
  }

  broadcast(data) {
    data.senderId = this.myId;

    // 1. Local BroadcastChannel (Same-computer tabs)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(data);
      } catch (e) {}
    }

    // 2. WebRTC Connections (Cross-device peers)
    this.connections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(data);
        } catch (e) {}
      }
    });
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

  destroy() {
    if (this.joinRetryInterval) {
      clearInterval(this.joinRetryInterval);
      this.joinRetryInterval = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch (e) {}
      this.broadcastChannel = null;
    }
    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch (e) {}
      this.hostConnection = null;
    }
    this.connections.forEach((c) => {
      try {
        c.close();
      } catch (e) {}
    });
    this.connections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
  }
}
