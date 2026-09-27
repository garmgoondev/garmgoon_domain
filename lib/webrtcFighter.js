"use client";

import { RoomPeer, roomError } from "./roomPeer.js";
import { FIGHTER_SKILLS, ULTIMATE_SKILL } from "./fighterSkills.js";

export class FighterBattleManager {
  constructor({ onStateChange, onError, onActionFx }) {
    this.isHost = false;
    this.roomCode = null;
    this.myId = null;
    this.myNickname = "";
    this.opponentNickname = "";
    this.onStateChange = onStateChange || (() => {});
    this.onError = onError || (() => {});
    this.onActionFx = onActionFx || (() => {});

    this.actionTimers = new Set();
    this.battleState = {
      p1: { id: "p1", nickname: "Player 1", hp: 100, maxHp: 100, combo: 0, isGuarding: false, state: "idle" },
      p2: { id: null, nickname: "", hp: 100, maxHp: 100, combo: 0, isGuarding: false, state: "idle" },
      roundStatus: "WAITING",
      winner: null,
    };

  }

  makeTransport() {
    this.transport = new RoomPeer({
      prefix: "garmgoon-fight-", capacity: 1,
      onJoin: (id, hello) => this.handleHostMessage({ type: "join_fighter", senderId: id, nickname: hello?.nickname }),
      onMessage: (id, msg) => this.isHost ? this.handleHostMessage({ ...msg, senderId: id }) : this.handleGuestMessage(msg),
      onLeave: () => {
        if (this.isHost) this.handleHostMessage({ type: "leave_room", senderId: this.battleState.p2.id });
        else {
          this.onStateChange({ opponentLeft: true });
          this.onError(roomError("closed"));
        }
      },
      onError: (error) => this.onError(error),
    });
    return this.transport;
  }

  async createRoom(roomCode, hostNickname) {
    this.isHost = true;
    this.roomCode = roomCode.trim().toUpperCase();
    this.myNickname = hostNickname;
    this.myId = await this.makeTransport().open(this.roomCode, true);
    this.battleState.p1.id = this.myId;
    this.battleState.p1.nickname = hostNickname;
    this.onStateChange({ isHost: true, roomCode: this.roomCode, battleState: structuredClone(this.battleState) });
    return this.roomCode;
  }

  async joinRoom(roomCode, guestNickname) {
    this.isHost = false;
    this.roomCode = roomCode.trim().toUpperCase();
    this.myNickname = guestNickname;
    await this.makeTransport().open(this.roomCode, false, { nickname: guestNickname });
    this.myId = this.transport.id;
  }

  clearActions() {
    for (const timer of this.actionTimers) clearTimeout(timer);
    this.actionTimers.clear();
  }

  later(action, delay) {
    const timer = setTimeout(() => { this.actionTimers.delete(timer); action(); }, delay);
    this.actionTimers.add(timer);
  }

  // --- COMBAT ACTIONS ---
  castSkill(skill) {
    if (this.battleState.roundStatus !== "FIGHT") return;

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

    this.later(() => {
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
        this.later(() => {
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

      this.later(() => {
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
    this.onStateChange({ battleState: structuredClone(this.battleState) });
  }

  handleHostMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type !== "join_fighter" && msg.senderId !== this.battleState.p2.id) return;

    if (msg.type === "join_fighter") {
      this.battleState.p2.id = msg.senderId;
      this.battleState.p2.nickname = msg.nickname;
      this.opponentNickname = msg.nickname;

      this.syncBattleState();
      this.onStateChange({ opponentJoined: true, connected: true, battleState: structuredClone(this.battleState) });
    } else if (msg.type === "request_skill_cast") {
      const skill = [...FIGHTER_SKILLS, ULTIMATE_SKILL].find((s) => s.id === msg.skillId);
      if (skill && this.battleState.roundStatus === "FIGHT" && !this.battleState.winner) {
        this.executeSkill({ isP1: false, skill });
      }
    } else if (msg.type === "leave_room") {
      this.clearActions();
      this.battleState.p2.id = null;
      this.battleState.p2.nickname = "";
      this.battleState.roundStatus = "WAITING";
      this.syncBattleState();
      this.onStateChange({ opponentLeft: true, battleState: structuredClone(this.battleState) });
    }
  }

  handleGuestMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === "room_sync" || msg.type === "battle_state_sync") {
      this.battleState = msg.battleState;
      this.onStateChange({ connected: true, battleState: structuredClone(this.battleState) });
    } else if (msg.type === "battle_start") {
      this.battleState = msg.battleState;
      this.onStateChange({ battleStarted: true, battleState: structuredClone(this.battleState) });
    } else if (msg.type === "action_fx") {
      this.onActionFx(msg.fx);
    } else if (msg.type === "reset_to_lobby") {
      this.battleState = msg.battleState;
      this.onStateChange({ resetToLobby: true, battleState: structuredClone(this.battleState) });
    }
  }

  sendToHost(data) { this.transport?.send({ ...data, senderId: this.myId }); }

  broadcast(data) { this.transport?.send({ ...data, senderId: this.myId }); }

  startBattle() {
    if (!this.isHost || !this.battleState.p2.id) return;
    this.clearActions();
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
    this.onStateChange({ battleStarted: true, battleState: structuredClone(this.battleState) });
  }

  resetToLobby() {
    if (!this.isHost) return;
    this.clearActions();
    this.battleState.roundStatus = "WAITING";
    this.battleState.winner = null;

    const msg = {
      type: "reset_to_lobby",
      battleState: this.battleState,
      senderId: this.myId,
    };
    this.broadcast(msg);
    this.onStateChange({ resetToLobby: true, battleState: structuredClone(this.battleState) });
  }

  restartBattle() {
    this.startBattle();
  }

  destroy() { this.clearActions(); this.transport?.close(); }
}
