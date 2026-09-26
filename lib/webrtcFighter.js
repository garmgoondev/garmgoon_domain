"use client";

// WebRTC + BroadcastChannel Multi-Transport Fighter Battle Manager
import { FIGHTER_SKILLS, ULTIMATE_SKILL } from "./fighterSkills.js";

export class FighterBattleManager {
  constructor({ onStateChange, onError, onActionFx }) {
    this.peer = null;
    this.broadcastChannel = null;
    this.hostConnection = null;
    this.connections = new Map();
    this.isHost = false;
    this.roomCode = null;
    this.myId = null;
    this.myNickname = "";
    this.opponentNickname = "";
    this.onStateChange = onStateChange || (() => {});
    this.onError = onError || (() => {});
    this.onActionFx = onActionFx || (() => {});

    this.battleState = {
      p1: { id: "p1", nickname: "Player 1", hp: 100, maxHp: 100, combo: 0, isGuarding: false, state: "idle" },
      p2: { id: null, nickname: "", hp: 100, maxHp: 100, combo: 0, isGuarding: false, state: "idle" },
      roundStatus: "WAITING",
      winner: null,
    };

    this.guardTimeout = null;
    this.joinRetryInterval = null;
  }

  generateClientId() {
    return "fighter-" + Math.random().toString(36).substring(2, 9);
  }

  setupBroadcastChannel(roomCode) {
    if (typeof globalThis.BroadcastChannel === "undefined") return;
    try {
      this.broadcastChannel = new BroadcastChannel(`garmgoon_fighter_${roomCode}`);
      this.broadcastChannel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || !msg.type || msg.senderId === this.myId) return;

        if (this.isHost) {
          this.handleHostMessage(msg);
        } else {
          this.handleGuestMessage(msg);
        }
      };
    } catch (e) {
      console.warn("BroadcastChannel error:", e);
    }
  }

  async initPeer(targetPeerId = null) {
    if (!this.myId) {
      this.myId = this.generateClientId();
    }
    if (typeof window === "undefined") return this.myId;
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
          console.warn("PeerJS error:", err);
          if (!this.myId) {
            this.myId = this.generateClientId();
            resolve(this.myId);
          }
        });
        setTimeout(() => {
          if (!this.myId) {
            this.myId = this.generateClientId();
            resolve(this.myId);
          }
        }, 2000);
      });
    } catch (e) {
      this.myId = this.generateClientId();
      return this.myId;
    }
  }

  // --- HOST: CREATE ROOM ---
  async createRoom(roomCode, hostNickname) {
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase();
    this.myNickname = hostNickname;

    this.setupBroadcastChannel(this.roomCode);
    const targetPeerId = `garmgoon-fight-${this.roomCode}`;
    await this.initPeer(targetPeerId);

    this.battleState.p1.id = this.myId;
    this.battleState.p1.nickname = hostNickname;
    this.battleState.p2.id = null;
    this.battleState.p2.nickname = "";
    this.battleState.roundStatus = "WAITING";
    this.battleState.winner = null;

    if (this.peer) {
      this.peer.on("connection", (conn) => {
        this.connections.set(conn.peer, conn);

        conn.on("data", (data) => {
          this.handleHostMessage(data);
        });

        conn.on("open", () => {
          conn.send({
            type: "room_sync",
            battleState: this.battleState,
            senderId: this.myId,
          });
        });

        conn.on("close", () => {
          this.connections.delete(conn.peer);
          if (this.battleState.p2.id === conn.peer) {
            this.battleState.p2.id = null;
            this.battleState.p2.nickname = "";
            this.battleState.roundStatus = "WAITING";
            this.syncBattleState();
            this.onStateChange({ opponentLeft: true, battleState: { ...this.battleState } });
            this.onError(new Error("상대방의 연결이 끊어졌습니다."));
          }
        });
      });
    }

    this.onStateChange({ isHost: true, roomCode: this.roomCode, battleState: { ...this.battleState } });
    return this.roomCode;
  }

  // --- GUEST: JOIN ROOM ---
  async joinRoom(roomCode, guestNickname) {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    this.myNickname = guestNickname;

    this.setupBroadcastChannel(this.roomCode);
    await this.initPeer();

    this.sendToHost({
      type: "join_fighter",
      nickname: this.myNickname,
      senderId: this.myId,
    });

    if (this.peer && this.peer.connect) {
      const hostPeerId = `garmgoon-fight-${this.roomCode}`;
      try {
        const conn = this.peer.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on("data", (data) => {
          this.handleGuestMessage(data);
        });

        conn.on("open", () => {
          conn.send({
            type: "join_fighter",
            nickname: this.myNickname,
            senderId: this.myId,
          });
        });
      } catch (e) {
        console.warn("Peer connection attempt failed:", e);
      }
    }

    return new Promise((resolve) => {
      let resolved = false;
      this.joinRetryInterval = setInterval(() => {
        if (resolved) {
          clearInterval(this.joinRetryInterval);
          return;
        }
        this.sendToHost({
          type: "join_fighter",
          nickname: this.myNickname,
          senderId: this.myId,
        });
      }, 1200);

      const origChange = this.onStateChange;
      this.onStateChange = (state) => {
        origChange(state);
        if (state.connected) {
          resolved = true;
          if (this.joinRetryInterval) clearInterval(this.joinRetryInterval);
          resolve();
        }
      };

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (this.joinRetryInterval) clearInterval(this.joinRetryInterval);
          resolve();
        }
      }, 5000);
    });
  }

  // --- COMBAT ACTIONS ---
  castSkill(skill) {
    const isP1 = this.isHost;

    if (this.isHost) {
      this.executeSkill({ isP1: true, skill });
    } else {
      // Send request to host
      this.sendToHost({
        type: "request_skill_cast",
        skillId: skill.id,
        senderId: this.myId,
      });
    }
  }

  dispatchActionFx(fx) {
    this.onActionFx(fx);
    this.broadcast({
      type: "action_fx",
      fx,
      senderId: this.myId,
    });
  }

  executeSkill({ isP1, skill }) {
    const attacker = isP1 ? this.battleState.p1 : this.battleState.p2;
    const defender = isP1 ? this.battleState.p2 : this.battleState.p1;

    let fxType = "hit";
    let textFx = "";

    // Set animation state
    attacker.state = skill.id === "ultimate" ? "ultimate" : skill.id === "heavy" ? "attack_heavy" : skill.type === "guard" ? "guard" : "attack_light";

    setTimeout(() => {
      if (this.battleState.winner) return;
      attacker.state = "idle";
      this.syncBattleState();
    }, 500);

    if (skill.type === "attack" || skill.type === "ultimate") {
      let dmg = skill.damage;
      let wasGuarded = defender.isGuarding;

      if (wasGuarded) {
        dmg = Math.round(dmg * 0.3); // 70% damage reduction
        defender.hp = Math.max(0, defender.hp - dmg);
        // Reflect parry damage back to attacker!
        attacker.hp = Math.max(0, attacker.hp - 8);
        textFx = `BLOCKED! -${dmg}`;
        fxType = "guard";

        this.dispatchActionFx({ target: isP1 ? "p2" : "p1", text: textFx, type: "guard" });
        this.dispatchActionFx({ target: isP1 ? "p1" : "p2", text: "PARRY -8", type: "dmg" });
      } else {
        defender.hp = Math.max(0, defender.hp - dmg);
        defender.state = "hit";
        setTimeout(() => {
          if (defender.state === "hit") defender.state = "idle";
          this.syncBattleState();
        }, 300);

        textFx = skill.id === "ultimate" ? `⚡ CRITICAL -${dmg}` : `-${dmg}`;
        fxType = skill.id === "ultimate" ? "ultDmg" : "dmg";
        this.dispatchActionFx({ target: isP1 ? "p2" : "p1", text: textFx, type: fxType, isHeavy: skill.id === "heavy" || skill.id === "ultimate" });
      }

      // Combo management
      if (skill.id === "ultimate") {
        attacker.combo = 0; // Reset combo after ultimate
      } else {
        attacker.combo = Math.min(3, (attacker.combo || 0) + 1);
      }
    } else if (skill.type === "heal") {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + (skill.healAmount || 16));
      this.dispatchActionFx({ target: isP1 ? "p1" : "p2", text: `+${skill.healAmount} HEAL`, type: "heal" });
    } else if (skill.type === "guard") {
      attacker.isGuarding = true;
      this.dispatchActionFx({ target: isP1 ? "p1" : "p2", text: "GUARD UP!", type: "guard" });

      setTimeout(() => {
        attacker.isGuarding = false;
        this.syncBattleState();
      }, skill.durationMs || 4000);
    }

    // Check K.O.
    if (defender.hp <= 0) {
      defender.hp = 0;
      defender.state = "ko";
      this.battleState.roundStatus = "KO";
      this.battleState.winner = isP1 ? "p1" : "p2";
    } else if (attacker.hp <= 0) {
      attacker.hp = 0;
      attacker.state = "ko";
      this.battleState.roundStatus = "KO";
      this.battleState.winner = isP1 ? "p2" : "p1";
    }

    this.syncBattleState();
  }

  syncBattleState() {
    const msg = {
      type: "battle_state_sync",
      battleState: this.battleState,
      senderId: this.myId,
    };
    this.broadcast(msg);
    this.onStateChange({ battleState: { ...this.battleState } });
  }

  handleHostMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "join_fighter") {
      this.battleState.p2.id = msg.senderId;
      this.battleState.p2.nickname = msg.nickname;
      this.opponentNickname = msg.nickname;

      this.syncBattleState();
      this.onStateChange({ opponentJoined: true, connected: true, battleState: { ...this.battleState } });
    } else if (msg.type === "request_skill_cast") {
      const skill = [...FIGHTER_SKILLS, ULTIMATE_SKILL].find((s) => s.id === msg.skillId);
      if (skill && !this.battleState.winner) {
        this.executeSkill({ isP1: false, skill });
      }
    } else if (msg.type === "leave_room") {
      this.battleState.p2.id = null;
      this.battleState.p2.nickname = "";
      this.battleState.roundStatus = "WAITING";
      this.syncBattleState();
      this.onStateChange({ opponentLeft: true, battleState: { ...this.battleState } });
    }
  }

  handleGuestMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "room_sync" || msg.type === "battle_state_sync") {
      this.battleState = msg.battleState;
      this.onStateChange({ connected: true, battleState: { ...this.battleState } });
    } else if (msg.type === "battle_start") {
      this.battleState = msg.battleState;
      this.onStateChange({ battleStarted: true, battleState: { ...this.battleState } });
    } else if (msg.type === "action_fx") {
      this.onActionFx(msg.fx);
    } else if (msg.type === "reset_to_lobby") {
      this.battleState = msg.battleState;
      this.onStateChange({ resetToLobby: true, battleState: { ...this.battleState } });
    }
  }

  sendToHost(data) {
    data.senderId = this.myId;
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(data); } catch (e) {}
    }
    if (this.hostConnection && this.hostConnection.open) {
      try { this.hostConnection.send(data); } catch (e) {}
    }
  }

  broadcast(data) {
    data.senderId = this.myId;
    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(data); } catch (e) {}
    }
    this.connections.forEach((conn) => {
      if (conn.open) {
        try { conn.send(data); } catch (e) {}
      }
    });
  }

  startBattle() {
    this.battleState.p1.hp = 100;
    this.battleState.p1.combo = 0;
    this.battleState.p1.isGuarding = false;
    this.battleState.p1.state = "idle";

    this.battleState.p2.hp = 100;
    this.battleState.p2.combo = 0;
    this.battleState.p2.isGuarding = false;
    this.battleState.p2.state = "idle";

    this.battleState.roundStatus = "FIGHT";
    this.battleState.winner = null;

    const msg = {
      type: "battle_start",
      battleState: this.battleState,
      senderId: this.myId,
    };
    this.broadcast(msg);
    this.onStateChange({ battleStarted: true, battleState: { ...this.battleState } });
  }

  resetToLobby() {
    this.battleState.roundStatus = "WAITING";
    this.battleState.winner = null;

    const msg = {
      type: "reset_to_lobby",
      battleState: this.battleState,
      senderId: this.myId,
    };
    this.broadcast(msg);
    this.onStateChange({ resetToLobby: true, battleState: { ...this.battleState } });
  }

  restartBattle() {
    this.startBattle();
  }

  destroy() {
    if (this.joinRetryInterval) clearInterval(this.joinRetryInterval);
    if (!this.isHost) {
      this.sendToHost({ type: "leave_room", senderId: this.myId });
    }
    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch (e) {}
      this.broadcastChannel = null;
    }
    if (this.hostConnection) {
      try { this.hostConnection.close(); } catch (e) {}
      this.hostConnection = null;
    }
    this.connections.forEach((c) => {
      try { c.close(); } catch (e) {}
    });
    this.connections.clear();
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
  }
}
