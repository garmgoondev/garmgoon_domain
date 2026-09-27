// Diagnose the deployed connection with separate browser processes.
// FORCE_RELAY=1 models networks where a direct peer-to-peer route is unavailable.
import { chromium } from "playwright";
const base = process.env.TEST_BASE_URL || "https://garmgoon.com";
const relay = process.env.FORCE_RELAY === "1";
const defaultIce = process.env.DEFAULT_ICE === "1";
const browsers = [];
try {
  const pages = [];
  for (let i = 0; i < 2; i++) {
    const browser = await chromium.launch(); browsers.push(browser);
    const page = await browser.newPage({ locale: "en-US" });
    await page.addInitScript(({ relay, defaultIce }) => {
      window.connectionDiagnostics = [];
      let defaultConfig;
      const Native = window.RTCPeerConnection;
      window.RTCPeerConnection = new Proxy(Native, {
        construct(Target, args) {
          if (!defaultConfig) defaultConfig = structuredClone(args[0]);
          else if (defaultIce) args[0] = { ...args[0], iceServers: defaultConfig.iceServers };
          if (relay) args[0] = { ...args[0], iceTransportPolicy: "relay" };
          const pc = Reflect.construct(Target, args);
          const entry = { policy: pc.getConfiguration().iceTransportPolicy,
            servers: pc.getConfiguration().iceServers.map((s) => s.urls),
            states: [], candidateTypes: [], iceErrors: [], selectedPair: null };
          window.connectionDiagnostics.push(entry);
          for (const type of ["icegatheringstatechange", "iceconnectionstatechange", "connectionstatechange", "signalingstatechange"]) {
            pc.addEventListener(type, () => entry.states.push({ event: type,
              ice: pc.iceConnectionState, gathering: pc.iceGatheringState,
              connection: pc.connectionState, signaling: pc.signalingState }));
          }
          pc.addEventListener("icecandidate", (event) => {
            if (event.candidate) entry.candidateTypes.push(event.candidate.type);
          });
          pc.addEventListener("icecandidateerror", (event) => {
            entry.iceErrors.push({ url: event.url, code: event.errorCode });
          });
          pc.addEventListener("connectionstatechange", async () => {
            if (pc.connectionState !== "connected") return;
            const stats = await pc.getStats();
            for (const stat of stats.values()) if (stat.type === "candidate-pair" && stat.nominated && stat.state === "succeeded") {
              entry.selectedPair = { local: stats.get(stat.localCandidateId)?.candidateType,
                remote: stats.get(stat.remoteCandidateId)?.candidateType, protocol: stats.get(stat.localCandidateId)?.protocol };
            }
          });
          return pc;
        },
      });
    }, { relay, defaultIce });
    pages.push(page);
  }
  const [host, guest] = pages;
  await host.goto(base + "/games/typing");
  await host.getByRole("button", { name: /Live Multiplayer/ }).click();
  await host.getByRole("button", { name: "Create Room & Enter Lobby" }).click();
  await host.locator(".roomCodeValue").waitFor();
  const code = await host.locator(".roomCodeValue").innerText();
  await guest.goto(base + `/games/typing?room=${code}`);
  await guest.getByRole("button", { name: "Join Room 🚀" }).click();
  let outcome;
  try { await guest.locator(".roomCodeValue").waitFor({ timeout: 20000 }); outcome = "joined"; }
  catch { outcome = await guest.locator("body").innerText().then((text) => text.split("\n").filter((line) => /join the room|초과|연결/.test(line)).join(" ")); }
  console.log(JSON.stringify({ relay, defaultIce, outcome, host: await host.evaluate(() => connectionDiagnostics),
    guest: await guest.evaluate(() => connectionDiagnostics) }, null, 2));
} finally { await Promise.all(browsers.map((browser) => browser.close())); }
