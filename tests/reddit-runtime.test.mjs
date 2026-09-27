import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { fileURLToPath } from "node:url";

test("Reddit fetch runs in workerd and does not follow redirects", async () => {
  const script = buildSync({
    stdin: { contents: `import { fetchRedditRss } from './worker/reddit.js';
      export default { async fetch(request, env) {
        try { return new Response(await fetchRedditRss(env, 'https://www.reddit.com/r/SideProject/top/.rss')); }
        catch (error) { return Response.json({ status: error.status, message: error.message }, { status: 503 }); }
      }};`, resolveDir: fileURLToPath(new URL("../", import.meta.url)) },
    bundle: true, write: false, format: "esm", platform: "browser",
  }).outputFiles[0].text;
  let calls = 0;
  let redirect = false;
  const options = { modules: true, script, compatibilityDate: "2026-08-26", d1Databases: ["DB"],
    outboundService: async () => {
      calls++;
      return redirect ? new Response(null, { status: 302, headers: { location: "https://example.com/" } })
        : new Response('<feed xmlns="http://www.w3.org/2005/Atom"></feed>', { headers: { "content-type": "application/atom+xml" } });
    } };
  const mf = new Miniflare(convertV4MiniflareOptions(options));
  try {
    const db = await mf.getD1Database("DB");
    await db.exec("CREATE TABLE state (key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER)");
    let response = await mf.dispatchFetch("http://localhost/");
    assert.equal(response.status, 200, await response.text());
    assert.equal(calls, 1);
    await db.exec("DELETE FROM state");
    redirect = true;
    response = await mf.dispatchFetch("http://localhost/");
    assert.equal(response.status, 503);
    assert.equal(calls, 2, "redirect destination must not be requested");
    const state = await db.prepare("SELECT value FROM state WHERE key = 'reddit:rss:last-result'").first();
    const result = JSON.parse(state.value);
    assert.equal(result.httpStatus, 302);
    assert.equal(result.reason, "HTTP 302");
  } finally { await mf.dispose(); }
});
