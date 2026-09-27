"use client";

import { RoomPeer, roomError } from "./roomPeer.js";

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

  makeTransport() {
    this.transport = new RoomPeer({
      prefix: "garmgoon-race-", capacity: PLAYER_COLORS.length - 1,
      onJoin: (id, hello) => this.handleHostDataReceived(id, { type: "join", nickname: hello?.nickname, senderId: id }),
      onMessage: (id, msg) => this.isHost ? this.handleHostDataReceived(id, { ...msg, senderId: id }) : this.handleGuestDataReceived(msg),
      onLeave: (id) => this.isHost ? this.handleGuestDisconnect(id) : this.onError(roomError("closed")),
      onError: (error) => this.onError(error),
    });
    return this.transport;
  }

  async createRoom(roomCode, hostNickname) {
    this.isHost = true;
    this.roomCode = roomCode.trim().toUpperCase();
    this.myNickname = hostNickname;
    this.myId = await this.makeTransport().open(this.roomCode, true);
    this.players = [{ id: this.myId, nickname: hostNickname, isHost: true,
      color: PLAYER_COLORS[0], progress: 0, wpm: 0, accuracy: 100, finished: false, rank: null }];
    this.onStateChange({ isHost: true, roomCode: this.roomCode, players: [...this.players] });
    return this.roomCode;
  }

  handleGuestDisconnect(peerId) {
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

  async joinRoom(roomCode, guestNickname) {
    this.isHost = false;
    this.roomCode = roomCode.trim().toUpperCase();
    this.myNickname = guestNickname;
    await this.makeTransport().open(this.roomCode, false, { nickname: guestNickname });
    this.myId = this.transport.id;
    this.myColor = this.players.find((p) => p.id === this.myId)?.color || PLAYER_COLORS[0];
  }

  handleGuestDataReceived(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "player_list") {
      this.players = msg.players || [];
      const me = this.players.find((p) => p.id === (this.myId || this.transport?.id));
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
      p.accuracy = 100;
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

  sendToHost(data) { this.transport?.send({ ...data, senderId: this.myId }); }

  broadcast(data) { this.transport?.send({ ...data, senderId: this.myId }); }

  resetRace() {
    if (!this.isHost) return;
    this.players.forEach((p) => {
      p.progress = 0;
      p.wpm = 0;
      p.accuracy = 100;
      p.finished = false;
      p.rank = null;
    });
    this.broadcast({ type: "player_list", players: this.players });
    this.broadcast({ type: "race_reset" });
    this.onStateChange({ raceReset: true, players: [...this.players] });
  }

  destroy() { this.transport?.close(); }
}
