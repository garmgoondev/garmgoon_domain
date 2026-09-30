import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8799";
const OUT_DIR = "tests/.shots/mobile-audit";
mkdirSync(OUT_DIR, { recursive: true });

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/cards", name: "cards" },
  { path: "/youtube", name: "youtube" },
  { path: "/trends", name: "trends" },
  { path: "/games", name: "games" },
  { path: "/games/adofai", name: "adofai" },
  { path: "/games/typing", name: "typing-fighter" },
  { path: "/games/volley", name: "volley" },
  { path: "/family", name: "family" },
  { path: "/login", name: "login" },
  { path: "/tools", name: "tools" },
  { path: "/scrap", name: "scrap" },
  { path: "/settings", name: "settings" },
];

const VIEWPORTS = [
  { width: 390, height: 844, name: "iphone14" },
  { width: 360, height: 780, name: "galaxy" },
];

const ADMIN_PW = "localtest";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      locale: "ko-KR",
    });
    const page = await context.newPage();

    // 1) Public routes
    for (const r of ROUTES.filter(x => !["settings", "tools", "scrap"].includes(x.name))) {
      const url = `${BASE}${r.path}`;
      try {
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(400);

        const metrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerWidth = window.innerWidth;
          const hasOverflow = scrollWidth > innerWidth + 1;
          return { scrollWidth, innerWidth, hasOverflow };
        });

        const shotPath = `${OUT_DIR}/${r.name}-${vp.name}.png`;
        await page.screenshot({ path: shotPath, fullPage: false });
        results.push({ route: r.path, viewport: vp.name, ...metrics, shot: shotPath });
      } catch (err) {
        results.push({ route: r.path, viewport: vp.name, error: err.message });
      }
    }

    // 2) Log in as Admin to test settings, tools, scrap
    try {
      await page.goto(`${BASE}/login`);
      await page.locator("#password").fill(ADMIN_PW);
      await page.getByRole("button", { name: "로그인" }).click();
      await page.waitForTimeout(1000);

      for (const p of ["settings", "tools", "scrap"]) {
        await page.goto(`${BASE}/${p}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);
        const shotPath = `${OUT_DIR}/${p}-authed-${vp.name}.png`;
        await page.screenshot({ path: shotPath, fullPage: false });
        results.push({ route: `/${p} (authed)`, viewport: vp.name, shot: shotPath });
      }
    } catch (e) {
      console.error("Admin login test error:", e);
    }

    // 3) Family tabs test (login as member if members exist)
    try {
      await page.goto(`${BASE}/family`, { waitUntil: "networkidle" });
      const whoCount = await page.locator(".famWhoItem").count();
      if (whoCount > 0) {
        await page.locator(".famWhoItem").first().click();
        const pwInput = page.getByPlaceholder(/비밀번호/);
        if (await pwInput.isVisible()) {
          await pwInput.fill("1111");
          await page.getByRole("button", { name: "들어가기" }).click();
          await page.waitForTimeout(600);
        }
      }

      for (const tab of ["family", "mine", "board", "photos"]) {
        const tabBtn = page.locator(`.famTabs button`, { hasText: tab === "family" ? "가족" : tab === "mine" ? "내 공간" : tab === "board" ? "우리집" : "사진" });
        if (await tabBtn.isVisible()) {
          await tabBtn.click();
          await page.waitForTimeout(400);
          const shotPath = `${OUT_DIR}/family-tab-${tab}-${vp.name}.png`;
          await page.screenshot({ path: shotPath, fullPage: false });
          results.push({ route: `/family?tab=${tab}`, viewport: vp.name, shot: shotPath });
        }
      }
    } catch (e) {
      console.error("Family test error:", e);
    }

    await context.close();
  }

  await browser.close();
  console.log("Audit complete. Results count:", results.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
