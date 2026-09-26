// 경기 진행: 서브 → 랠리 → 득점(슬로우 모션) → 암전 → 다음 서브, 목표 점수에 닿으면 끝.
// 원작처럼 모든 흐름을 "틱" 단위로만 센다. 벽시계를 쓰지 않아서 온라인 양쪽이 같은 틱에 같은 화면이 된다.

import { GROUND_HALF_WIDTH, VolleyPhysics, emptyInput, makeRng } from "./physics.js";

export const SLOW_MOTION_FRAMES = 6; // 득점 뒤 느리게 보여 주는 물리 프레임 수
const SLOW_MOTION_EVERY = 5; // 슬로우 모션 동안에는 5틱에 한 번만 물리를 돌린다
const FADE_OUT_TICKS = 12;
const READY_TICKS = 34;
const FADE_IN_TICKS = 12;
export const RESULT_DELAY_TICKS = 70; // 경기가 끝나고 결과 창을 띄우기까지

export class VolleyMatch {
  /**
   * seed: 난수 시드 (온라인은 방장이 정해서 나눠 준다)
   * cpu: [boolean, boolean] 각 자리가 컴퓨터인지
   */
  constructor({ seed = 1, winningScore = 15, cpu = [false, false], difficulty = "normal", classicWall = false } = {}) {
    this.rand = makeRng(seed);
    this.physics = new VolleyPhysics(this.rand, { classicWall });
    this.physics.players.forEach((p, i) => {
      p.isComputer = !!cpu[i];
      p.difficulty = difficulty;
    });
    this.winningScore = winningScore;
    this.scores = [0, 0];
    this.isPlayer2Serve = false;
    this.phase = "ready";
    this.phaseTick = 0;
    this.roundEnded = false;
    this.gameEnded = false;
    this.winner = -1;
    this.slowLeft = 0;
    this.slowSkip = 0;
    this.tickCount = 0;
    this.physicsSteps = 0; // 화면 보간용: 물리가 실제로 돈 횟수
    this.lastStepSlow = false;
    this.cpuInputs = [emptyInput(), emptyInput()];
    this.physics.newRound(false);
    this.physics.events.push({ type: "ready" });
  }

  // 암전 정도 0~1
  get fade() {
    if (this.phase === "fadeOut") return Math.min(1, this.phaseTick / FADE_OUT_TICKS);
    if (this.phase === "ready") return Math.max(0, 1 - this.phaseTick / FADE_IN_TICKS);
    return 0;
  }

  get isSlowMotion() {
    return this.slowLeft > 0;
  }

  // 사건 목록을 꺼내 간다 (화면 연출·소리용)
  drainEvents() {
    const ev = this.physics.events;
    this.physics.events = [];
    return ev;
  }

  // 한 틱 진행. inputs: 두 선수의 {xDirection, yDirection, powerHit}
  tick(inputs) {
    this.tickCount++;
    const ev = this.physics.events;

    if (this.phase === "ready") {
      this.phaseTick++;
      if (this.phaseTick >= READY_TICKS) {
        this.phase = "play";
        this.phaseTick = 0;
        ev.push({ type: "go" });
      }
      return;
    }

    if (this.phase === "fadeOut") {
      this.phaseTick++;
      if (this.phaseTick >= FADE_OUT_TICKS) {
        this.physics.newRound(this.isPlayer2Serve);
        this.roundEnded = false;
        this.phase = "ready";
        this.phaseTick = 0;
        this.physicsSteps++;
        this.lastStepSlow = false;
        ev.push({ type: "ready", reset: true });
      }
      return;
    }

    // play 또는 end: 물리를 돌린다
    if (this.slowLeft > 0) {
      this.slowSkip++;
      if (this.slowSkip % SLOW_MOTION_EVERY !== 0) return;
    }

    const use = inputs.map((inp, i) => (this.physics.players[i].isComputer ? this.cpuInputs[i] : inp || emptyInput()));
    const touched = this.physics.step(use);
    this.physicsSteps++;
    this.lastStepSlow = this.slowLeft > 0;

    if (this.phase === "end") {
      this.phaseTick++;
      if (this.phaseTick === RESULT_DELAY_TICKS) ev.push({ type: "result", winner: this.winner });
      return;
    }

    if (touched && !this.roundEnded && !this.gameEnded) {
      const scorer = this.physics.ball.punchEffectX < GROUND_HALF_WIDTH ? 1 : 0;
      this.scores[scorer] += 1;
      this.isPlayer2Serve = scorer === 1;
      const x = this.physics.ball.x;
      if (this.scores[scorer] >= this.winningScore) {
        this.gameEnded = true;
        this.winner = scorer;
        this.physics.setGameEnded(scorer);
        this.phase = "end";
        this.phaseTick = 0;
        ev.push({ type: "score", scorer, x, final: true, scores: [...this.scores] });
        ev.push({ type: "gameEnd", winner: scorer });
      } else {
        this.slowLeft = SLOW_MOTION_FRAMES;
        this.slowSkip = 0;
        ev.push({ type: "score", scorer, x, final: false, scores: [...this.scores] });
      }
      this.roundEnded = true;
    }

    if (this.roundEnded && !this.gameEnded) {
      if (this.slowLeft === 0) {
        this.phase = "fadeOut";
        this.phaseTick = 0;
      }
      this.slowLeft--;
      if (this.slowLeft < 0) this.slowLeft = 0;
    }
  }

  // 온라인 동기화 확인용 요약값
  checksum() {
    const { players, ball } = this.physics;
    let h = this.tickCount | 0;
    for (const v of [ball.x, ball.y, ball.xVelocity, ball.yVelocity, players[0].x, players[0].y, players[1].x, players[1].y, this.scores[0], this.scores[1]]) {
      h = (Math.imul(h, 31) + (v | 0)) | 0;
    }
    return h;
  }
}
