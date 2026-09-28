// 우리집 보드 브라우저 시나리오. 로컬 D1에 0008까지 적용하고 `npx wrangler dev --port 8799`를 띄운 뒤,
// 가족 데이터가 빈 상태에서 실행한다. (.dev.vars에 VAPID 키가 있어야 알림 설정이 보인다)
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8799";
const shots = process.env.SHOTS_DIR || "tests/.shots";
const adminPassword = readFileSync(".dev.vars", "utf8").match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function newPage(viewport = { width: 1100, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: "ko-KR" });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  return page;
}

async function login(page, name, password) {
  await page.goto(base + "/family?tab=board");
  await page.locator(".famWhoItem", { hasText: name }).click();
  await page.getByPlaceholder(`${name}의 비밀번호`).fill(password);
  await page.getByRole("button", { name: "들어가기" }).click();
  await page.locator(".boardWeek").waitFor();
}

try {
  // 관리자가 API로 구성원을 만든다
  const admin = await newPage();
  await admin.request.post(base + "/api/login", { data: { password: adminPassword } });
  for (const [name, emoji] of [
    ["엄마", "👩"],
    ["아빠", "👨"],
  ]) {
    const r = await admin.request.post(base + "/api/p/family", { data: { name, emoji, color: name === "엄마" ? "#ec4899" : "#0ea5e9", password: "1234" } });
    assert.equal(r.status(), 200, await r.text());
  }

  const mom = await newPage();
  await login(mom, "엄마", "1234");

  // 반복 할 일: 매주 월·목 분리수거, 담당 아빠
  await mom.getByRole("button", { name: "+ 할 일" }).click();
  await mom.getByPlaceholder("할 일 (예: 분리수거)").fill("분리수거");
  await mom.locator(".boardForm .chip", { hasText: "아빠" }).click();
  await mom.locator(".boardForm .famSeg button", { hasText: "매주" }).click();
  await mom.locator(".boardWeekdays button", { hasText: "목" }).click();
  await mom.locator(".boardWeekdays button", { hasText: "월" }).click();
  // 월요일이 이미 켜져 있었다면 방금 꺼졌으니 다시 켠다
  if ((await mom.locator(".boardWeekdays button.on", { hasText: "월" }).count()) === 0) await mom.locator(".boardWeekdays button", { hasText: "월" }).click();
  await mom.getByRole("button", { name: "추가", exact: true }).click();
  await mom.locator(".boardTask", { hasText: "분리수거" }).first().waitFor();

  // 나만 보는 할 일 (오늘)
  await mom.getByRole("button", { name: "+ 할 일" }).click();
  await mom.getByPlaceholder("할 일 (예: 분리수거)").fill("비밀 선물 사기");
  await mom.locator(".boardForm .famSeg button", { hasText: "나만 보기" }).click();
  await mom.getByRole("button", { name: "추가", exact: true }).click();
  await mom.locator(".boardDay.today .boardTask", { hasText: "비밀 선물 사기" }).waitFor();
  await mom.locator(".boardDay.today .boardTask", { hasText: "비밀 선물 사기" }).locator(".boardCheck").click();
  await mom.locator(".boardDay.today .boardTask.done", { hasText: "비밀 선물 사기" }).waitFor();

  // 음력 생일
  await mom.locator(".boardSections button", { hasText: "기념일" }).click();
  await mom.getByRole("button", { name: "+ 기념일" }).click();
  await mom.getByPlaceholder("이름 (예: 할머니 생신)").fill("할머니 생신");
  await mom.locator(".boardForm .famSeg button", { hasText: "음력" }).click();
  await mom.getByLabel("월", { exact: true }).selectOption("8");
  await mom.getByLabel("일", { exact: true }).selectOption("20");
  await mom.getByPlaceholder(/태어난 해/).fill("1950");
  await mom.getByRole("button", { name: "저장" }).click();
  const bday = mom.locator(".boardDateItem", { hasText: "할머니 생신" });
  await bday.waitFor();
  assert.match(await bday.innerText(), /음력 8월 20일 → 9월 30일/);
  assert.match(await bday.innerText(), /76번째 생일/);
  await mom.screenshot({ path: `${shots}/b1-dates.png`, fullPage: true });

  // 기억할 정보: 전화번호는 눌러서 걸 수 있다
  await mom.locator(".boardSections button", { hasText: "정보" }).click();
  await mom.getByRole("button", { name: "+ 정보" }).click();
  await mom.getByPlaceholder("제목 (예: 소아과)").fill("튼튼 소아과");
  await mom.getByPlaceholder(/전화번호, 주소/).fill("02-123-4567\n평일 9시~18시, 토요일 오전만");
  await mom.getByRole("button", { name: "저장" }).click();
  const note = mom.locator(".boardNote", { hasText: "튼튼 소아과" });
  await note.waitFor();
  assert.equal(await note.locator('a[href="tel:021234567"]').count(), 1);
  await note.getByRole("button", { name: "고치기" }).click();
  await mom.getByPlaceholder(/전화번호, 주소/).fill("02-123-9999\n평일 9시~18시");
  await mom.getByRole("button", { name: "저장" }).click();
  await mom.locator(".boardNote", { hasText: "02-123-9999" }).getByRole("button", { name: "기록" }).click();
  await mom.locator(".boardHistory", { hasText: "02-123-4567" }).waitFor();
  await mom.getByRole("button", { name: "닫기" }).click();

  // 알림 설정 화면
  await mom.context().grantPermissions(["notifications"], { origin: base });
  await mom.getByRole("button", { name: "🔔 알림" }).click();
  await mom.getByText("아침 요약").waitFor();
  await mom.screenshot({ path: `${shots}/b2-notify.png`, fullPage: true });
  await mom.getByRole("button", { name: "🔔 알림" }).click();

  // 아빠(휴대폰): 가족 할 일만 보이고, 엄마의 비공개 할 일은 안 보인다
  const dad = await newPage({ width: 390, height: 844 });
  await login(dad, "아빠", "1234");
  await dad.locator(".boardTask", { hasText: "분리수거" }).first().waitFor();
  assert.equal(await dad.getByText("비밀 선물 사기").count(), 0);
  assert.ok((await dad.locator(".boardDday", { hasText: "할머니 생신" }).innerText()).includes("D-2"));
  await dad.screenshot({ path: `${shots}/b3-dad-week.png`, fullPage: true });

  // 아빠가 오늘(월) 분리수거 완료
  await dad.locator(".boardDay.today .boardTask", { hasText: "분리수거" }).locator(".boardCheck").click();
  await dad.locator(".boardDay.today .boardTask.done", { hasText: "아빠 완료" }).waitFor();

  // 정보 탭(휴대폰)
  await dad.locator(".boardSections button", { hasText: "정보" }).click();
  await dad.locator(".boardNote").first().waitFor();
  await dad.screenshot({ path: `${shots}/b5-dad-notes.png`, fullPage: true });

  // 엄마 화면: 할 일 주간 보기 (아빠의 완료 표시가 보인다)
  await mom.reload();
  await mom.locator(".boardSections button", { hasText: "할 일" }).click();
  await mom.locator(".boardDay.today .boardTask.done", { hasText: "분리수거" }).waitFor();
  await mom.screenshot({ path: `${shots}/b6-mom-week.png`, fullPage: true });

  assert.deepEqual(errors, []);
  console.log("family board UI OK →", shots);
} finally {
  await browser.close();
}
