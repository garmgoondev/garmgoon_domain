// Run with Playwright installed, or set PLAYWRIGHT_MODULE to its index.mjs path.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = new URL("../", import.meta.url);
const html = `<script src="/node_modules/peerjs/dist/peerjs.min.js"></script>
<script type="importmap">{"imports":{"peerjs":"data:text/javascript,export const Peer = window.Peer;"}}</script>`;
const server = createServer(async (req, res) => {
  if (req.url === "/") { res.setHeader("Content-Type", "text/html"); res.end(html); return; }
  if (!/^\/(lib\/[a-zA-Z0-9/]+\.js|node_modules\/peerjs\/dist\/peerjs.min.js)$/.test(req.url)) { res.writeHead(404).end(); return; }
  try { res.setHeader("Content-Type", "text/javascript"); res.end(await readFile(new URL(req.url.slice(1), root))); }
  catch { res.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ headless: true });
try {
  const pages = [];
  for (let i = 0; i < 3; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", (error) => console.error("Browser error:", error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    pages.push(page);
  }
  const [host, guest, extra] = pages;
  for (const game of ["race", "fighter", "volley"]) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    for (const page of pages) await page.evaluate(async (game) => {
      window.states = []; window.errors = []; window.messages = [];
      const options = {
        onStateChange: (state) => states.push(state),
        onError: (error) => errors.push(error.message || error),
        onOpen: () => window.manager.send({ t: "hello", name: "browser" }),
        onMessage: (message) => messages.push(message),
      };
      if (game === "race") {
        const { RacePeerManager } = await import("/lib/webrtcRace.js"); window.manager = new RacePeerManager(options);
      } else if (game === "fighter") {
        const { FighterBattleManager } = await import("/lib/webrtcFighter.js"); window.manager = new FighterBattleManager(options);
      } else {
        const { VolleyNet } = await import("/lib/volley/net.js"); window.manager = new VolleyNet(options);
      }
    }, game);
    await host.evaluate(({ game, code }) => game === "volley" ? manager.host(code) : manager.createRoom(code, "Same name"), { game, code });
    await guest.evaluate(({ game, code }) => game === "volley" ? manager.join(code) : manager.joinRoom(code, "Same name"), { game, code });
    if (game === "race") {
      assert.equal(await guest.evaluate(() => manager.players.length), 2);
      await host.evaluate(() => manager.startRace({ text: "hello" }));
      await guest.waitForFunction(() => states.some((s) => s.raceStarting));
      await guest.evaluate(() => manager.sendProgress({ progress: 100, wpm: 70, accuracy: 100, finished: true }));
      await host.waitForFunction(() => manager.players[1].finished);
      await host.evaluate(() => manager.resetRace());
      await guest.waitForFunction(() => states.some((s) => s.raceReset) && !manager.players[1].finished);
    } else {
      const result = await extra.evaluate(async ({ game, code }) => {
        try { if (game === "volley") await manager.join(code); else await manager.joinRoom(code, "third"); return "unexpected success"; }
        catch (error) { return error.code || error; }
      }, { game, code });
      assert.equal(result, "full");
      if (game === "fighter") {
        await host.evaluate(() => manager.startBattle());
        await guest.waitForFunction(() => manager.battleState.roundStatus === "FIGHT");
        const damage = await guest.evaluate(async () => {
          const { FIGHTER_SKILLS } = await import("/lib/fighterSkills.js");
          manager.castSkill(FIGHTER_SKILLS[0]); return FIGHTER_SKILLS[0].damage;
        });
        await host.waitForFunction((hp) => manager.battleState.p1.hp === hp, 100 - damage);
        await guest.waitForFunction((hp) => manager.battleState.p1.hp === hp, 100 - damage);
      } else {
        await host.waitForFunction(() => messages.some((m) => m.t === "hello"));
        await guest.waitForFunction(() => messages.some((m) => m.t === "hello"));
      }
    }
    for (const page of pages) await page.evaluate(() => manager.destroy ? manager.destroy() : manager.close());
    console.log(`PASS ${game}: separate browser contexts, public signaling, real WebRTC`);
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
