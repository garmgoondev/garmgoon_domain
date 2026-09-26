// 말랑 배구 물리: 1997년 피카츄 배구의 물리와 컴퓨터 AI를 그대로 옮겼다.
// (gorisanson/pikachu-volleyball의 역공학 분석 참고)
// 좌표는 원작 화면 기준 432×304, 1프레임 단위 정수 계산이라 같은 입력이면 어느 기기에서나 결과가 같다.
// 온라인 대전은 이 성질을 이용해 입력만 주고받는다. 그래서 난수도 시드를 고정한 rng만 쓴다.

export const GROUND_WIDTH = 432;
export const GROUND_HALF_WIDTH = 216;
export const SCREEN_HEIGHT = 304;
export const PLAYER_LENGTH = 64;
export const PLAYER_HALF_LENGTH = 32;
export const PLAYER_TOUCHING_GROUND_Y = 244;
export const BALL_RADIUS = 20;
export const BALL_TOUCHING_GROUND_Y = 252;
export const NET_PILLAR_HALF_WIDTH = 25;
export const NET_PILLAR_TOP_TOP_Y = 176;
export const NET_PILLAR_TOP_BOTTOM_Y = 192;
const INFINITE_LOOP_LIMIT = 1000;

// 선수 상태
export const NORMAL = 0;
export const JUMPING = 1;
export const POWER_HIT = 2;
export const DIVING = 3;
export const LYING = 4;
export const WIN = 5;
export const LOST = 6;

// mulberry32. rand()는 원작처럼 0~32767 정수를 돌려준다
export function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  return () => next() >>> 17;
}

export const emptyInput = () => ({ xDirection: 0, yDirection: 0, powerHit: 0 });

function makePlayer(isPlayer2) {
  return {
    isPlayer2,
    isComputer: false,
    difficulty: "normal",
    x: 0,
    y: 0,
    yVelocity: 0,
    isCollisionWithBallHappened: false,
    state: NORMAL,
    frameNumber: 0,
    normalStatusArmSwingDirection: 1,
    delayBeforeNextFrame: 0,
    lyingDownDurationLeft: -1,
    divingDirection: 0,
    isWinner: false,
    gameEnded: false,
    computerWhereToStandBy: 0,
    computerBoldness: 0,
    // 쉬움 난이도에서 반응을 늦추려고 지난 판단을 붙잡아 둔다
    cpuHold: null,
    cpuHoldLeft: 0,
  };
}

function initPlayerForNewRound(p, rand) {
  p.x = p.isPlayer2 ? GROUND_WIDTH - 36 : 36;
  p.y = PLAYER_TOUCHING_GROUND_Y;
  p.yVelocity = 0;
  p.isCollisionWithBallHappened = false;
  p.state = NORMAL;
  p.frameNumber = 0;
  p.normalStatusArmSwingDirection = 1;
  p.delayBeforeNextFrame = 0;
  p.lyingDownDurationLeft = -1;
  p.isWinner = false;
  p.gameEnded = false;
  p.computerWhereToStandBy = 0;
  p.computerBoldness = rand() % 5;
  p.cpuHold = null;
  p.cpuHoldLeft = 0;
}

function makeBall() {
  return {
    x: 56,
    y: 0,
    xVelocity: 0,
    yVelocity: 1,
    expectedLandingPointX: 0,
    rotation: 0,
    fineRotation: 0,
    punchEffectX: 0,
    punchEffectY: 0,
    punchEffectRadius: 0,
    isPowerHit: false,
  };
}

function initBallForNewRound(b, isPlayer2Serve) {
  b.x = isPlayer2Serve ? GROUND_WIDTH - 56 : 56;
  b.y = 0;
  b.xVelocity = 0;
  b.yVelocity = 1;
  b.punchEffectRadius = 0;
  b.isPowerHit = false;
}

export class VolleyPhysics {
  // classicWall: 원작처럼 오른쪽 벽만 공 반지름만큼 바깥에 둔다.
  // 원작 버그라 왼쪽 선수가 유리해서(컴퓨터끼리 붙이면 왼쪽이 거의 다 이긴다) 기본은 양쪽 대칭이다
  constructor(rand, { classicWall = false } = {}) {
    this.rand = rand;
    this.players = [makePlayer(false), makePlayer(true)];
    this.ball = makeBall();
    this.ball.rightWall = classicWall ? GROUND_WIDTH : GROUND_WIDTH - BALL_RADIUS;
    // 화면 연출과 소리를 위한 사건 목록 (물리 결과에는 영향 없음)
    this.events = [];
  }

  newRound(isPlayer2Serve) {
    initPlayerForNewRound(this.players[0], this.rand);
    initPlayerForNewRound(this.players[1], this.rand);
    initBallForNewRound(this.ball, isPlayer2Serve);
  }

  setGameEnded(winnerIndex) {
    this.players.forEach((p, i) => {
      p.gameEnded = true;
      p.isWinner = i === winnerIndex;
    });
  }

  // 한 프레임 진행. 공이 땅에 닿았으면 true
  step(inputs) {
    const { players, ball } = this;
    const touchedGround = ballWorldStep(ball, this.events);
    for (let i = 0; i < 2; i++) {
      calculateExpectedLandingPointX(ball);
      playerStep(players[i], inputs[i], players[1 - i], ball, this.rand, this.events, i);
    }
    for (let i = 0; i < 2; i++) {
      const p = players[i];
      if (isCollision(ball, p.x, p.y)) {
        if (!p.isCollisionWithBallHappened) {
          ballPlayerCollision(ball, p.x, inputs[i], p.state, this.rand);
          p.isCollisionWithBallHappened = true;
          this.events.push({ type: "hit", player: i, power: ball.isPowerHit, x: ball.x, y: ball.y });
        }
      } else {
        p.isCollisionWithBallHappened = false;
      }
    }
    return touchedGround;
  }
}

function isCollision(ball, px, py) {
  return Math.abs(ball.x - px) <= PLAYER_HALF_LENGTH && Math.abs(ball.y - py) <= PLAYER_HALF_LENGTH;
}

function ballWorldStep(ball, events) {
  let fine = ball.fineRotation + ((ball.xVelocity / 2) | 0);
  if (fine < 0) fine += 50;
  else if (fine > 50) fine -= 50;
  ball.fineRotation = fine;
  ball.rotation = (fine / 10) | 0;

  const futureX = ball.x + ball.xVelocity;
  // 오른쪽 벽이 반지름만큼 바깥에 있는 것도 원작 그대로다
  if (futureX < BALL_RADIUS || futureX > ball.rightWall) ball.xVelocity = -ball.xVelocity;

  let futureY = ball.y + ball.yVelocity;
  if (futureY < 0) ball.yVelocity = 1;

  // 네트 기둥
  if (Math.abs(ball.x - GROUND_HALF_WIDTH) < NET_PILLAR_HALF_WIDTH && ball.y > NET_PILLAR_TOP_TOP_Y) {
    if (ball.y <= NET_PILLAR_TOP_BOTTOM_Y) {
      if (ball.yVelocity > 0) {
        ball.yVelocity = -ball.yVelocity;
        events.push({ type: "net", x: ball.x, y: ball.y });
      }
    } else if (ball.x < GROUND_HALF_WIDTH) {
      ball.xVelocity = -Math.abs(ball.xVelocity);
    } else {
      ball.xVelocity = Math.abs(ball.xVelocity);
    }
  }

  futureY = ball.y + ball.yVelocity;
  if (futureY > BALL_TOUCHING_GROUND_Y) {
    ball.yVelocity = -ball.yVelocity;
    ball.punchEffectX = ball.x;
    ball.y = BALL_TOUCHING_GROUND_Y;
    ball.punchEffectRadius = BALL_RADIUS;
    ball.punchEffectY = BALL_TOUCHING_GROUND_Y + BALL_RADIUS;
    events.push({ type: "ground", x: ball.x, power: ball.isPowerHit });
    return true;
  }
  ball.y = futureY;
  ball.x += ball.xVelocity;
  ball.yVelocity += 1;
  return false;
}

function playerStep(p, input, other, ball, rand, events, index) {
  if (p.isComputer) computerInput(p, ball, other, input, rand);

  if (p.state === LYING) {
    p.lyingDownDurationLeft -= 1;
    if (p.lyingDownDurationLeft < -1) p.state = NORMAL;
    return;
  }

  let vx = 0;
  if (p.state < WIN) vx = p.state < DIVING ? input.xDirection * 6 : p.divingDirection * 8;

  const futureX = p.x + vx;
  p.x = futureX;
  if (!p.isPlayer2) {
    if (futureX < PLAYER_HALF_LENGTH) p.x = PLAYER_HALF_LENGTH;
    else if (futureX > GROUND_HALF_WIDTH - PLAYER_HALF_LENGTH) p.x = GROUND_HALF_WIDTH - PLAYER_HALF_LENGTH;
  } else if (futureX < GROUND_HALF_WIDTH + PLAYER_HALF_LENGTH) {
    p.x = GROUND_HALF_WIDTH + PLAYER_HALF_LENGTH;
  } else if (futureX > GROUND_WIDTH - PLAYER_HALF_LENGTH) {
    p.x = GROUND_WIDTH - PLAYER_HALF_LENGTH;
  }

  if (p.state < DIVING && input.yDirection === -1 && p.y === PLAYER_TOUCHING_GROUND_Y) {
    p.yVelocity = -16;
    p.state = JUMPING;
    p.frameNumber = 0;
    events.push({ type: "jump", player: index, x: p.x });
  }

  const futureY = p.y + p.yVelocity;
  p.y = futureY;
  if (futureY < PLAYER_TOUCHING_GROUND_Y) {
    p.yVelocity += 1;
  } else if (futureY > PLAYER_TOUCHING_GROUND_Y) {
    p.yVelocity = 0;
    p.y = PLAYER_TOUCHING_GROUND_Y;
    p.frameNumber = 0;
    if (p.state === DIVING) {
      p.state = LYING;
      p.frameNumber = 0;
      p.lyingDownDurationLeft = 3;
      events.push({ type: "slide", player: index, x: p.x });
    } else {
      p.state = NORMAL;
      events.push({ type: "land", player: index, x: p.x });
    }
  }

  if (input.powerHit === 1) {
    if (p.state === JUMPING) {
      p.delayBeforeNextFrame = 5;
      p.frameNumber = 0;
      p.state = POWER_HIT;
      events.push({ type: "swing", player: index });
    } else if (p.state === NORMAL && input.xDirection !== 0) {
      p.state = DIVING;
      p.frameNumber = 0;
      p.divingDirection = input.xDirection;
      p.yVelocity = -5;
      events.push({ type: "dive", player: index, x: p.x, dir: input.xDirection });
    }
  }

  if (p.state === JUMPING) {
    p.frameNumber = (p.frameNumber + 1) % 3;
  } else if (p.state === POWER_HIT) {
    if (p.delayBeforeNextFrame < 1) {
      p.frameNumber += 1;
      if (p.frameNumber > 4) {
        p.frameNumber = 0;
        p.state = JUMPING;
      }
    } else {
      p.delayBeforeNextFrame -= 1;
    }
  } else if (p.state === NORMAL) {
    p.delayBeforeNextFrame += 1;
    if (p.delayBeforeNextFrame > 3) {
      p.delayBeforeNextFrame = 0;
      const future = p.frameNumber + p.normalStatusArmSwingDirection;
      if (future < 0 || future > 4) p.normalStatusArmSwingDirection = -p.normalStatusArmSwingDirection;
      p.frameNumber += p.normalStatusArmSwingDirection;
    }
  }

  if (p.gameEnded) {
    if (p.state === NORMAL) {
      p.state = p.isWinner ? WIN : LOST;
      p.delayBeforeNextFrame = 0;
      p.frameNumber = 0;
    }
    if (p.frameNumber < 4) {
      p.delayBeforeNextFrame += 1;
      if (p.delayBeforeNextFrame > 4) {
        p.delayBeforeNextFrame = 0;
        p.frameNumber += 1;
      }
    }
  }
}

function ballPlayerCollision(ball, playerX, input, playerState, rand) {
  if (ball.x < playerX) ball.xVelocity = -((Math.abs(ball.x - playerX) / 3) | 0);
  else if (ball.x > playerX) ball.xVelocity = (Math.abs(ball.x - playerX) / 3) | 0;
  if (ball.xVelocity === 0) ball.xVelocity = (rand() % 3) - 1;

  const absVy = Math.abs(ball.yVelocity);
  ball.yVelocity = -absVy;
  if (absVy < 15) ball.yVelocity = -15;

  if (playerState === POWER_HIT) {
    const speed = (Math.abs(input.xDirection) + 1) * 10;
    ball.xVelocity = ball.x < GROUND_HALF_WIDTH ? speed : -speed;
    ball.punchEffectX = ball.x;
    ball.punchEffectY = ball.y;
    ball.yVelocity = Math.abs(ball.yVelocity) * input.yDirection * 2;
    ball.punchEffectRadius = BALL_RADIUS;
    ball.isPowerHit = true;
  } else {
    ball.isPowerHit = false;
  }
  calculateExpectedLandingPointX(ball);
}

function calculateExpectedLandingPointX(ball) {
  const c = { x: ball.x, y: ball.y, xVelocity: ball.xVelocity, yVelocity: ball.yVelocity };
  let loop = 0;
  for (;;) {
    loop++;
    const futureX = c.x + c.xVelocity;
    if (futureX < BALL_RADIUS || futureX > ball.rightWall) c.xVelocity = -c.xVelocity;
    if (c.y + c.yVelocity < 0) c.yVelocity = 1;
    if (Math.abs(c.x - GROUND_HALF_WIDTH) < NET_PILLAR_HALF_WIDTH && c.y > NET_PILLAR_TOP_TOP_Y) {
      // 원작에서도 여기만 <= 가 아니라 < 다
      if (c.y < NET_PILLAR_TOP_BOTTOM_Y) {
        if (c.yVelocity > 0) c.yVelocity = -c.yVelocity;
      } else if (c.x < GROUND_HALF_WIDTH) {
        c.xVelocity = -Math.abs(c.xVelocity);
      } else {
        c.xVelocity = Math.abs(c.xVelocity);
      }
    }
    c.y += c.yVelocity;
    if (c.y > BALL_TOUCHING_GROUND_Y || loop >= INFINITE_LOOP_LIMIT) break;
    c.x += c.xVelocity;
    c.yVelocity += 1;
  }
  ball.expectedLandingPointX = c.x;
}

function expectedLandingPointXWhenPowerHit(xDir, yDir, ball) {
  const c = { x: ball.x, y: ball.y, xVelocity: ball.xVelocity, yVelocity: ball.yVelocity };
  c.xVelocity = c.x < GROUND_HALF_WIDTH ? (Math.abs(xDir) + 1) * 10 : -(Math.abs(xDir) + 1) * 10;
  c.yVelocity = Math.abs(c.yVelocity) * yDir * 2;
  let loop = 0;
  for (;;) {
    loop++;
    const futureX = c.x + c.xVelocity;
    if (futureX < BALL_RADIUS || futureX > ball.rightWall) c.xVelocity = -c.xVelocity;
    if (c.y + c.yVelocity < 0) c.yVelocity = 1;
    if (Math.abs(c.x - GROUND_HALF_WIDTH) < NET_PILLAR_HALF_WIDTH && c.y > NET_PILLAR_TOP_TOP_Y) {
      if (c.yVelocity > 0) c.yVelocity = -c.yVelocity;
    }
    c.y += c.yVelocity;
    if (c.y > BALL_TOUCHING_GROUND_Y || loop >= INFINITE_LOOP_LIMIT) return c.x;
    c.x += c.xVelocity;
    c.yVelocity += 1;
  }
}

function landsOnOtherSide(x, p, other) {
  const side = Number(p.isPlayer2);
  return (x <= side * GROUND_HALF_WIDTH || x >= side * GROUND_WIDTH + GROUND_HALF_WIDTH) && Math.abs(x - other.x) > PLAYER_LENGTH;
}

function decidePowerHit(p, ball, other, input, rand) {
  const tryDirs = (yFrom, yTo, yStep) => {
    for (let xDir = 1; xDir > -1; xDir--) {
      for (let yDir = yFrom; yDir !== yTo; yDir += yStep) {
        if (landsOnOtherSide(expectedLandingPointXWhenPowerHit(xDir, yDir, ball), p, other)) {
          input.xDirection = xDir;
          input.yDirection = yDir;
          return true;
        }
      }
    }
    return false;
  };
  return rand() % 2 === 0 ? tryDirs(-1, 2, 1) : tryDirs(1, -2, -1);
}

// 원작 컴퓨터 AI. 난이도는 원작 판단 위에 반응 속도와 실수만 덧붙인다
function computerInput(p, ball, other, input, rand) {
  if (p.difficulty === "easy" && p.cpuHoldLeft > 0) {
    p.cpuHoldLeft -= 1;
    Object.assign(input, p.cpuHold);
    return;
  }

  input.xDirection = 0;
  input.yDirection = 0;
  input.powerHit = 0;
  // 원작은 판마다 대담함(0~4)을 무작위로 정한다. 시뮬레이션해 보면 4가 가장 강해서 어려움은 4로 고정한다
  const bold = p.difficulty === "hard" ? 4 : p.computerBoldness;
  const side = Number(p.isPlayer2);

  let target = ball.expectedLandingPointX;
  if (Math.abs(ball.x - p.x) > 100 && Math.abs(ball.xVelocity) < bold + 5) {
    const left = side * GROUND_HALF_WIDTH;
    if ((ball.expectedLandingPointX <= left || ball.expectedLandingPointX >= side * GROUND_WIDTH + GROUND_HALF_WIDTH) && p.computerWhereToStandBy === 0) {
      target = left + ((GROUND_HALF_WIDTH / 2) | 0);
    }
  }

  if (Math.abs(target - p.x) > bold + 8) {
    input.xDirection = p.x < target ? 1 : -1;
  } else if (rand() % 20 === 0) {
    p.computerWhereToStandBy = rand() % 2;
  }

  if (p.state === NORMAL) {
    if (
      Math.abs(ball.xVelocity) < bold + 3 &&
      Math.abs(ball.x - p.x) < PLAYER_HALF_LENGTH &&
      ball.y > -36 &&
      ball.y < 10 * bold + 84 &&
      ball.yVelocity > 0
    ) {
      input.yDirection = -1;
    }
    const left = side * GROUND_HALF_WIDTH;
    const right = (side + 1) * GROUND_HALF_WIDTH;
    if (
      ball.expectedLandingPointX > left &&
      ball.expectedLandingPointX < right &&
      Math.abs(ball.x - p.x) > bold * 5 + PLAYER_LENGTH &&
      ball.x > left &&
      ball.x < right &&
      ball.y > 174
    ) {
      input.powerHit = 1;
      input.xDirection = p.x < ball.x ? 1 : -1;
    }
  } else if (p.state === JUMPING || p.state === POWER_HIT) {
    if (Math.abs(ball.x - p.x) > 8) input.xDirection = p.x < ball.x ? 1 : -1;
    if (Math.abs(ball.x - p.x) < 48 && Math.abs(ball.y - p.y) < 48) {
      const skip = p.difficulty === "easy" && rand() % 3 !== 0;
      if (!skip && decidePowerHit(p, ball, other, input, rand)) {
        input.powerHit = 1;
        if (Math.abs(other.x - p.x) < 80 && input.yDirection !== -1) input.yDirection = -1;
      }
    }
  }

  if (p.difficulty === "easy") {
    // 판단을 몇 프레임 붙잡아 두면 한 박자 늦게 움직인다
    p.cpuHold = { xDirection: input.xDirection, yDirection: input.yDirection, powerHit: 0 };
    p.cpuHoldLeft = 3;
  }
}
