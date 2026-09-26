// 말랑 배구 입력: 키보드와 터치를 원작 입력 {xDirection, yDirection, powerHit}으로 바꾼다.
// 스파이크(powerHit)와 점프는 틱 사이에 짧게 눌렀다 떼도 놓치지 않도록 "눌림"을 붙잡아 둔다.

const SOLO = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  power: ["Enter", "NumpadEnter", "Space", "KeyZ"],
};
const DUO_P1 = { left: ["KeyA"], right: ["KeyD"], up: ["KeyW"], down: ["KeyS"], power: ["KeyZ", "Space"] };
const DUO_P2 = { left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp"], down: ["ArrowDown"], power: ["Enter", "NumpadEnter"] };

export const neutralTouch = () => ({ x: 0, y: 0, jump: false, jumpTap: false, power: false });

export class Controls {
  constructor() {
    this.held = new Map(); // code → 누른 순서
    this.seq = 0;
    this.maps = [SOLO, null];
    this.latch = [{ up: false, power: false }, { up: false, power: false }];
    this.touch = neutralTouch();
    this.touchSlot = 0;
  }

  // mode: "solo"(내 자리 하나) | "duo"(한 키보드 둘)
  setMode(mode, soloSlot = 0) {
    this.maps = mode === "duo" ? [DUO_P1, DUO_P2] : soloSlot === 0 ? [SOLO, null] : [null, SOLO];
    this.touchSlot = soloSlot;
    this.clear();
  }

  clear() {
    this.held.clear();
    this.latch.forEach((l) => {
      l.up = false;
      l.power = false;
    });
    this.touch = neutralTouch();
  }

  // 게임 키면 true (페이지 스크롤을 막는 데 쓴다)
  keydown(code, repeat) {
    let used = false;
    this.maps.forEach((map, i) => {
      if (!map) return;
      for (const k of Object.keys(map)) {
        if (!map[k].includes(code)) continue;
        used = true;
        if (!repeat && (k === "power" || k === "up")) this.latch[i][k] = true;
      }
    });
    if (used && !this.held.has(code)) this.held.set(code, ++this.seq);
    return used;
  }

  keyup(code) {
    this.held.delete(code);
  }

  // 같은 방향 두 키 중 나중에 누른 쪽을 따른다
  axis(map, neg, pos) {
    const at = (names) => Math.max(0, ...map[names].map((c) => this.held.get(c) || 0));
    const a = at(neg);
    const b = at(pos);
    if (!a && !b) return 0;
    return b > a ? 1 : -1;
  }

  read(slot) {
    const map = this.maps[slot];
    const input = { xDirection: 0, yDirection: 0, powerHit: 0 };
    if (map) {
      const l = this.latch[slot];
      input.xDirection = this.axis(map, "left", "right");
      input.yDirection = this.axis(map, "up", "down");
      if (l.up) input.yDirection = -1;
      if (l.power) input.powerHit = 1;
      l.up = false;
      l.power = false;
    }
    if (slot === this.touchSlot) {
      // 스틱 위아래가 점프 버튼보다 먼저다 (점프 버튼을 누른 채 아래로 스파이크할 수 있게)
      const tc = this.touch;
      if (!input.xDirection) input.xDirection = tc.x;
      if (!input.yDirection) input.yDirection = tc.y || (tc.jump || tc.jumpTap ? -1 : 0);
      if (tc.power) input.powerHit = 1;
      tc.power = false;
      tc.jumpTap = false;
    }
    return input;
  }
}
