import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8799";

async function run() {
  console.log("Starting scroll lock E2E test...");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 14 mobile viewport

    // 1) Test LeaderboardModal scroll lock on /games/typing
    console.log("Testing LeaderboardModal scroll lock on /games/typing...");
    await page.goto(`${BASE}/games/typing`, { waitUntil: "networkidle" });

    // Initial page scroll
    const initialOverflow = await page.evaluate(() => ({
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
    }));
    assert.equal(initialOverflow.html, "");
    assert.equal(initialOverflow.body, "");

    // Click Leaderboard button
    const lbBtn = page.getByRole("button", { name: /명예의 전당|Hall of Fame/ });
    await lbBtn.click();
    await page.locator(".modalOverlay").waitFor({ state: "visible" });

    // Check that html & body overflow are locked to hidden
    const lockedOverflow = await page.evaluate(() => ({
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
    }));
    assert.equal(lockedOverflow.html, "hidden", "html overflow must be hidden while modal is open");
    assert.equal(lockedOverflow.body, "hidden", "body overflow must be hidden while modal is open");

    // Scroll wheel over modal
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    assert.equal(scrollAfter, scrollBefore, "Background page scroll position must not change while modal is open");

    // Close modal via Escape
    await page.keyboard.press("Escape");
    await page.locator(".modalOverlay").waitFor({ state: "detached" });

    // Check that html & body overflow are restored
    const restoredOverflow = await page.evaluate(() => ({
      html: document.documentElement.style.overflow,
      body: document.body.style.overflow,
    }));
    assert.equal(restoredOverflow.html, "");
    assert.equal(restoredOverflow.body, "");
    console.log("✓ LeaderboardModal scroll lock passed!");

    // 2) Test Lightbox CSS & behavior
    console.log("Testing Lightbox scroll lock and touch styles...");
    await page.goto(`${BASE}/family`, { waitUntil: "networkidle" });
    
    // Evaluate Lightbox CSS rules
    const famLightboxCSS = await page.evaluate(() => {
      const div = document.createElement("div");
      div.className = "famLightbox";
      document.body.appendChild(div);
      const computed = window.getComputedStyle(div);
      const res = {
        position: computed.position,
        touchAction: computed.touchAction,
        overscrollBehavior: computed.overscrollBehaviorY || computed.overscrollBehavior,
      };
      document.body.removeChild(div);
      return res;
    });

    assert.equal(famLightboxCSS.position, "fixed");
    assert.equal(famLightboxCSS.touchAction, "none", "famLightbox must have touch-action: none");
    assert.match(famLightboxCSS.overscrollBehavior, /contain/, "famLightbox must have overscroll-behavior: contain");
    console.log("✓ Lightbox CSS properties verified:", famLightboxCSS);

    console.log("ALL SCROLL LOCK E2E TESTS PASSED!");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
