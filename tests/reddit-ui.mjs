import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch();
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8787";
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 950 } });
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    const common = { url: "https://www.reddit.com/r/SideProject/comments/example/", source: "reddit", sourceLabel: "r/SideProject",
      title: "UI fixture", headline: "작은 가게를 위한 예약 관리 서비스", summary: ["예약을 수기로 관리하는 작은 가게가 대상이에요.", "고객이 링크에서 예약 시간을 선택하는 방식이에요."],
      point: "업종별 예약 방식에 맞춰 서비스를 단순화할 수 있어요.", category: "기타", tags: [], kind: null, points: null, comments: null,
      collectedAt: Date.now(), discussion: { status: "sampled", sampledCount: 12, bodyBasis: "thread", fetchedAt: Date.now(),
        summary: { positive: ["예약 과정을 줄여준다는 반응이 있어요."], concerns: ["기존 도구와의 차별점을 묻는 의견이 있어요."], questions: ["무료 체험 여부를 질문했어요."] } } };
    const cards = [{ ...common, id: 1 }, { ...common, id: 2, headline: "댓글 요청이 제한된 경우", discussion: {
      status: "rate_limited", sampledCount: 0, bodyBasis: "listing", fetchedAt: Date.now(), summary: null,
    } }, { ...common, id: 3, headline: "본문을 수집하지 못한 경우", discussion: {
      status: "empty", sampledCount: 0, bodyBasis: "title", fetchedAt: Date.now(), summary: null,
    } }];
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      const data = path === "/api/ideas" ? { day: "2026-09-26", days: [], cards, pending: 0, scrapped: [] }
        : path === "/api/me" ? { authed: false } : { videos: [], channels: [], scrapped: [] };
      return route.fulfill({ json: data });
    });
    await page.goto(base);
    await page.getByText("수집 댓글 12개 기준 · 전체 여론 아님").waitFor();
    await page.getByText("긍정 반응", { exact: true }).waitFor();
    await page.getByText("본문 수집 불가 · 제목 기준 카드", { exact: false }).waitFor();
    assert.equal(await page.locator(".ncardDiscussion").count(), 3);
    assert.equal(await page.locator(".ncardDiscussionGroup").count(), 3);
    assert.equal(await page.locator(".ncardDiscussion").nth(1).locator(".ncardDiscussionGroup").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    if (process.env.TEST_SCREENSHOT && width === 390) await page.screenshot({ path: process.env.TEST_SCREENSHOT, fullPage: true });
    console.log(`PASS Reddit card UI at ${width}px: sampled reactions, request limit, missing body, no overflow`);
    await page.close();
  }
} finally { await browser.close(); }
