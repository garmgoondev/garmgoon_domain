// 우리집 보드 세 화면(할 일·정보·기념일)을 데스크톱과 휴대폰 크기로 찍는다. family-board-ui.mjs를 돌린 로컬 데이터가 있어야 한다.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8799";
const shots = process.env.SHOTS_DIR || "tests/.shots";
const tag = process.argv[2] || "now";
const browser = await chromium.launch();
for (const [name, viewport] of [["pc", { width: 1100, height: 900 }], ["m", { width: 390, height: 844 }]]) {
  const page = await (await browser.newContext({ viewport, locale: "ko-KR" })).newPage();
  await page.goto(base + "/family?tab=board");
  await page.locator(".famWhoItem", { hasText: "엄마" }).click();
  await page.getByPlaceholder("엄마의 비밀번호").fill("1234");
  await page.getByRole("button", { name: "들어가기" }).click();
  await page.locator(".boardWeek").waitFor();
  for (const [section, wait] of [["할 일", ".boardWeek"], ["정보", ".boardNote"], ["기념일", ".boardDateItem"]]) {
    await page.locator(".boardSections button", { hasText: section }).click();
    await page.locator(wait).first().waitFor();
    await page.locator(".board").screenshot({ path: `${shots}/ui-${tag}-${name}-${section}.png` });
  }
}
await browser.close();
