// Start npm run dev first. Uses separate browser contexts and real public signaling.
import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3100";
const errors = [];
async function page() {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
}
try {
  const host = await page(); const guest = await page();
  for (const game of ["race", "fighter"]) {
    const query = game === "fighter" ? "?mode=fighter" : "";
    await host.goto(base + "/games/typing" + query);
    await host.getByRole("button", { name: game === "race" ? /Live Multiplayer/ : /1v1 Live Duel/ }).click();
    await host.getByRole("button", { name: game === "race" ? "Create Room & Enter Lobby" : /Create Duel Room/ }).click();
    await host.locator(".roomCodeValue").waitFor();
    const code = await host.locator(".roomCodeValue").innerText();
    await guest.goto(base + `/games/typing?room=${code}${game === "fighter" ? "&mode=fighter" : ""}`);
    await guest.getByRole("button", { name: game === "race" ? "Join Room 🚀" : /Enter Duel Room/ }).click();
    await guest.locator(".roomCodeValue").waitFor();
    assert.equal(await guest.locator(".roomCodeValue").innerText(), code);
    if (game === "race") {
      await host.waitForFunction(() => document.querySelectorAll(".playerBadge").length === 2);
      await guest.waitForFunction(() => document.querySelectorAll(".playerBadge").length === 2);
      await host.getByRole("button", { name: "Start Race! 🚦", exact: true }).click();
      await guest.locator(".countdownOverlay").waitFor();
    } else {
      await host.locator(".fighterRosterCard.guest.connected").waitFor();
      await host.getByRole("button", { name: /Start Fight! \(START FIGHT\)/ }).click();
      await guest.locator(".fighterRosterContainer").waitFor({ state: "hidden" });
    }
    await host.goto("about:blank");
    await guest.locator(".roomCodeValue").waitFor({ state: "hidden" });
    if (game === "race") {
      // A cancelled countdown must not start an orphaned race four seconds later.
      await guest.waitForTimeout(4500);
      await guest.getByRole("button", { name: "Join Room 🚀" }).waitFor();
    }
    console.log(`PASS UI ${game}: create, invite link, join, host disconnect recovery`);
  }
  await guest.goto(base + "/games/typing?room=ZZZZZZ");
  await guest.getByRole("button", { name: "Join Room 🚀" }).click();
  await guest.getByText(/Couldn't join the room/).waitFor();
  assert.equal(await guest.locator(".roomCodeValue").count(), 0);
  await guest.locator('input[maxlength="8"]').fill("BAD");
  await guest.getByRole("button", { name: "Join Room 🚀" }).click();
  await guest.getByRole("button", { name: "Join Room 🚀" }).waitFor();
  console.log("PASS UI invalid room: error displayed, no false lobby, retry available");
  await host.goto(base + "/games/volley");
  await host.getByRole("button", { name: /Online Match/ }).click();
  await host.getByRole("button", { name: "Create room", exact: true }).click();
  await host.locator(".vbCode").waitFor();
  const code = await host.locator(".vbCode").innerText();
  await guest.goto(base + `/games/volley?room=${code}`);
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await guest.locator(".vbCode").waitFor();
  const start = host.getByRole("button", { name: /▶.*Start/ });
  await start.click();
  await host.locator(".vbCode").waitFor({ state: "hidden" });
  await guest.locator(".vbCode").waitFor({ state: "hidden" });
  console.log("PASS UI volley: create, invite link, join, start match");
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
