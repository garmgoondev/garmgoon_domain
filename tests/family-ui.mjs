// 먼저 로컬 D1 마이그레이션을 적용하고 `npx wrangler dev --port 8799`를 띄운다. 빈 로컬 DB에서 실행한다.
// 관리자 → 구성원 추가, 엄마: 사진 글·비공개 일기, 아빠: 확인·댓글·반응 순서로 실제 브라우저에서 확인한다.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8799";
const shots = process.env.SHOTS_DIR || "tests/.shots";
const adminPassword = readFileSync(".dev.vars", "utf8").match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

// 크기가 다른 테스트 사진을 만든다
async function makePhoto(path, width, height, hue) {
  const p = await browser.newPage({ viewport: { width, height } });
  await p.setContent(`<body style="margin:0;background:linear-gradient(135deg,hsl(${hue} 80% 60%),hsl(${hue + 60} 80% 40%));height:100vh;display:grid;place-items:center;font:bold 120px sans-serif;color:#fff">${width}×${height}</body>`);
  await p.screenshot({ path, type: "jpeg", quality: 90 });
  await p.close();
}

async function newPage(viewport = { width: 1100, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: "ko-KR" });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/401|404/.test(m.text()) && errors.push(m.text()));
  return page;
}

async function familyLogin(page, name, password) {
  await page.goto(base + "/family");
  await page.locator(".famWhoItem", { hasText: name }).click();
  await page.getByPlaceholder(`${name}의 비밀번호`).fill(password);
  await page.getByRole("button", { name: "들어가기" }).click();
  await page.locator(".famComposer").waitFor();
}

try {
  await makePhoto(`${shots}/wide.jpg`, 2400, 1350, 20);
  await makePhoto(`${shots}/tall.jpg`, 1200, 1800, 200);
  await makePhoto(`${shots}/square.jpg`, 1500, 1500, 120);
  writeFileSync(`${shots}/memo.txt`, "가족 여행 준비물\n- 수건\n- 선크림\n");

  // 1) 관리자가 구성원을 추가한다
  const admin = await newPage();
  await admin.goto(base + "/login?next=/family");
  await admin.locator("#password").fill(adminPassword);
  await admin.getByRole("button", { name: "로그인" }).click();
  await admin.waitForURL(/\/family/);
  await admin.getByText("가족 구성원 관리").waitFor();
  for (const [name, pw, emoji] of [
    ["엄마", "1111", "👩"],
    ["아빠", "2222", "👨"],
  ]) {
    await admin.getByRole("button", { name: "+ 구성원 추가" }).click();
    await admin.getByPlaceholder("이름 (예: 엄마)").fill(name);
    await admin.locator(".famMemberForm .famPickRow button", { hasText: emoji }).click();
    await admin.getByPlaceholder("비밀번호 (4자 이상)").fill(pw);
    await admin.getByRole("button", { name: "추가", exact: true }).click();
    await admin.locator(".famMemberRow", { hasText: name }).waitFor();
  }
  await admin.screenshot({ path: `${shots}/01-admin.png`, fullPage: true });

  // 2) 엄마: 틀린 비밀번호 → 올바른 비밀번호
  const mom = await newPage();
  await mom.goto(base + "/family");
  await mom.locator(".famWhoItem", { hasText: "엄마" }).click();
  await mom.getByPlaceholder("엄마의 비밀번호").fill("9999");
  await mom.getByRole("button", { name: "들어가기" }).click();
  await mom.getByText("비밀번호가 맞지 않아요. (1/5)").waitFor();
  await mom.screenshot({ path: `${shots}/02-login.png` });
  await familyLogin(mom, "엄마", "1111");

  // 사진 한 장 (가로)
  await mom.locator(".famComposer textarea").fill("주말 바다 다녀왔어요 🌊\n다음엔 다 같이 가요!");
  await mom.locator('.famComposer input[type="file"]').setInputFiles([`${shots}/wide.jpg`]);
  await mom.locator(".famAttach img").waitFor();
  await mom.waitForFunction(() => !document.querySelector(".famAttachProgress"));
  await mom.getByRole("button", { name: "남기기", exact: true }).click();
  await mom.locator(".famPost", { hasText: "주말 바다" }).waitFor();

  // 사진 세 장 + 일반 파일
  await mom.locator(".famComposer textarea").fill("여행 사진 모음 + 준비물");
  await mom.locator('.famComposer input[type="file"]').setInputFiles([`${shots}/tall.jpg`, `${shots}/square.jpg`, `${shots}/wide.jpg`, `${shots}/memo.txt`]);
  await mom.waitForFunction(() => document.querySelectorAll(".famAttach").length === 4 && !document.querySelector(".famAttachProgress"));
  await mom.getByRole("button", { name: "남기기", exact: true }).click();
  await mom.locator(".famPost", { hasText: "여행 사진 모음" }).locator(".famGrid.n3").waitFor();

  // 한 장짜리 사진은 원래 비율(16:9)로 보인다
  const single = await mom.locator(".famSingle").first().boundingBox();
  assert.ok(Math.abs(single.width / single.height - 2400 / 1350) < 0.03, `aspect ${single.width / single.height}`);

  // 비공개 일기
  await mom.locator(".famTabs button", { hasText: "내 공간" }).click();
  await mom.locator(".famComposer textarea").fill("오늘은 조금 피곤했지만 뿌듯한 하루.");
  await mom.locator(".famMoods button[aria-label='피곤']").click();
  await mom.getByRole("button", { name: "남기기", exact: true }).click();
  await mom.locator(".famPost.diary").waitFor();
  assert.equal(await mom.locator(".famPost.diary .famMood").innerText(), "😴");
  await mom.screenshot({ path: `${shots}/03-mine.png`, fullPage: true });

  // 3) 아빠: 가족 글만 보이고 비공개 일기는 안 보인다
  const dad = await newPage({ width: 390, height: 844 });
  await familyLogin(dad, "아빠", "2222");
  await dad.locator(".famPost").nth(1).waitFor();
  assert.equal(await dad.locator(".famPost").count(), 2);
  assert.equal(await dad.getByText("뿌듯한 하루").count(), 0);
  assert.equal(await dad.locator(".famPost .famNew").count(), 2);
  await dad.screenshot({ path: `${shots}/04-dad-mobile.png`, fullPage: true });

  // 반응과 댓글
  const post = dad.locator(".famPost", { hasText: "주말 바다" });
  await post.getByRole("button", { name: "반응 남기기" }).click();
  await post.locator(".famReactMenu button", { hasText: "❤️" }).click();
  await post.locator(".famReaction.mine", { hasText: "1" }).waitFor();
  await post.getByPlaceholder("댓글 달기").fill("멋지다! 다음엔 나도 갈래");
  await post.getByRole("button", { name: "등록" }).click();
  await post.locator(".famComment", { hasText: "멋지다" }).waitFor();

  // 라이트박스: 세 장짜리 글의 두 번째 사진
  await dad.locator(".famPost", { hasText: "여행 사진 모음" }).locator(".famCell").nth(1).click();
  await dad.locator(".famLightbox img").waitFor();
  await dad.waitForFunction(() => document.querySelector(".famLightbox img").complete);
  assert.match(await dad.locator(".famLightboxBar").innerText(), /2 \/ 3/);
  await dad.screenshot({ path: `${shots}/05-lightbox-mobile.png` });
  await dad.keyboard.press("Escape");

  // 사진 모아보기 (가족 공개 사진 4장)
  await dad.locator(".famTabs button", { hasText: "사진" }).click();
  await dad.locator(".famPhoto").nth(3).waitFor();
  assert.equal(await dad.locator(".famPhoto").count(), 4);
  await dad.screenshot({ path: `${shots}/06-photos-mobile.png`, fullPage: true });

  // 4) 엄마에게 새 소식 배지(아빠 댓글 1개)가 붙는다
  await mom.goto(base + "/");
  await mom.locator(".navBadge").waitFor();
  assert.equal(await mom.locator(".navBadge").innerText(), "1");
  await mom.goto(base + "/family");
  await mom.locator(".famComment .famNew").waitFor();
  await mom.screenshot({ path: `${shots}/07-mom-feed.png`, fullPage: true });

  // 5) 글 고치기: 사진 하나 빼기
  const edit = mom.locator(".famPost", { hasText: "여행 사진 모음" });
  await edit.getByRole("button", { name: "고치기" }).first().click();
  await mom.locator(".famComposer").nth(1).locator(".famAttachRemove").first().click();
  await mom.locator(".famComposer .btn.brand", { hasText: "고치기" }).click();
  await mom.locator(".famPost", { hasText: "여행 사진 모음" }).locator(".famGrid.n2").waitFor();
  await mom.locator(".famPost", { hasText: "여행 사진 모음" }).getByText("수정됨").waitFor();

  assert.deepEqual(errors, []);
  console.log("family UI OK →", shots);
} finally {
  await browser.close();
}
