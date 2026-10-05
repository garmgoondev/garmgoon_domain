import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'data');
await mkdir(out, { recursive: true });
const evidence = { startedAt: new Date().toISOString(), scope: 'Read-only HTTP GET and Cloudflare GET; no deployment, DNS or remote database writes', pages: [] };
async function get(url, redirect = 'follow') {
  const time = Date.now();
  try {
    const r = await fetch(url, { redirect, headers: { Accept: 'text/html,application/xml,text/plain' }, signal: AbortSignal.timeout(25000) });
    const body = await r.text();
    return { url, finalUrl: r.url, status: r.status, elapsedMs: Date.now() - time,
      headers: Object.fromEntries(['date','content-type','location','x-us-cache','cf-cache-status','x-robots-tag','etag'].map(k => [k, r.headers.get(k)]).filter(([,v]) => v)), body };
  } catch (e) { return { url, error: e.message }; }
}
function meta(r) {
  const body = r.body ?? '';
  const head = body.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const canonicals = [...body.matchAll(/<link\b[^>]*>/gi)].filter(m => /rel=["']canonical["']/i.test(m[0])).map(m => m[0].match(/href=["']([^"']*)["']/i)?.[1]);
  const title = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const description = [...body.matchAll(/<meta\b[^>]*>/gi)].find(m => /name=["']description["']/i.test(m[0]))?.[0];
  const robots = [...body.matchAll(/<meta\b[^>]*>/gi)].filter(m => /name=["'](?:robots|googlebot)["']/i.test(m[0])).map(m => m[0]);
  const { body: ignored, ...rest } = r;
  return { ...rest, title, description, canonicals, canonicalInHead: canonicals.length > 0 && /rel=["']canonical["']/i.test(head), robots, localhostInCanonical: canonicals.some(x => /localhost|127\.0\.0\.1/i.test(x ?? '')) };
}
const sitemap = await get('https://utahsays.com/sitemap.xml');
evidence.sitemap = { ...sitemap, body: undefined, urls: [...(sitemap.body ?? '').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replace(/&amp;/g,'&')) };
const urls = [...new Set([...evidence.sitemap.urls, 'https://utahsays.com/?tab=new','https://utahsays.com/?tab=food','https://utahsays.com/best-beginner-hike-in-utah?utm_source=review'])];
evidence.sitemapInvalidOrigins = evidence.sitemap.urls.filter(u => new URL(u).origin !== 'https://utahsays.com');
// Inspect live production paths even when the published sitemap contains a wrong origin.
urls.splice(0, urls.length, ...new Set(urls.map(u => { const parsed = new URL(u); return `https://utahsays.com${parsed.pathname}${parsed.search}`; })));
let n = 0;
await Promise.all(Array.from({ length: 4 }, async () => { while(n < urls.length) { const url = urls[n++]; evidence.pages.push(meta(await get(url))); } }));
evidence.redirects = [];
for (const url of ['https://www.utahsays.com/about?utm_source=review','http://utahsays.com/about','https://utahsays.garmgoon-domain.workers.dev/about']) evidence.redirects.push(meta(await get(url, 'manual')));
evidence.robots = await get('https://utahsays.com/robots.txt');
evidence.otherSites = [];
for (const url of ['https://garmgoon.com/','https://garmgoon.com/family','https://everydaytutor.net/','https://www.everydaytutor.net/tutors/taipei','https://www.everydaytutor.net/tutors/taipei/english','https://www.everydaytutor.net/insights/taipei-english-tutor-rates','https://seo.garmgoon.com/mcp']) evidence.otherSites.push(meta(await get(url)));
for (const page of evidence.otherSites) if (page.finalUrl?.includes('cloudflareaccess.com')) page.finalUrl = new URL(page.finalUrl).origin + new URL(page.finalUrl).pathname;
evidence.sitemapVariants = [];
for (const url of ['https://utahsays.com/sitemap.xml?review=20261005','https://utahsays.com/robots.txt?review=20261005']) evidence.sitemapVariants.push(await get(url));
try {
  const auth = await readFile(path.join(process.env.APPDATA, 'xdg.config/.wrangler/config/default.toml'), 'utf8');
  const token = auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
  if (!token) throw new Error('Cloudflare token unavailable');
  const api = 'https://api.cloudflare.com/client/v4/accounts/c61cba217caf3a5eef264a0136510e72/workers/scripts/utahsays';
  const deploymentResponse = await fetch(api + '/deployments', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  evidence.deployments = { status: deploymentResponse.status, data: await deploymentResponse.json() };
  const settingsResponse = await fetch(api + '/settings', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  const settings = await settingsResponse.json();
  evidence.workerSettings = { status: settingsResponse.status, success: settings.success, publicVars: settings.result?.bindings?.filter(b => b.type === 'plain_text' && ['NEXT_PUBLIC_SITE_URL','ALLOW_INDEXING'].includes(b.name)), errors: settings.errors };
} catch(e) { evidence.cloudflareError = e.message; }
evidence.finishedAt = new Date().toISOString();
const name = `${evidence.finishedAt.slice(0,10)}-review-live-evidence.json`;
let dest = path.join(out, name), version = 2;
while (await readFile(dest).then(() => true, () => false)) dest = path.join(out, name.replace('.json', `-v${version++}.json`));
await writeFile(dest, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ output: dest, startedAt: evidence.startedAt, finishedAt: evidence.finishedAt, sitemapUrls: evidence.sitemap.urls.length, invalidSitemapOrigins: evidence.sitemapInvalidOrigins.length, pages: evidence.pages.length, failed: evidence.pages.filter(p => p.status !== 200 || p.canonicals.length !== 1 || p.localhostInCanonical || !p.canonicalInHead), nonSelf: evidence.pages.filter(p => p.url.split('?')[0].replace(/\/$/,'') !== p.canonicals[0]?.replace(/\/$/,'')), redirects: evidence.redirects, latestDeployment: evidence.deployments?.data?.result?.deployments?.[0], settings: evidence.workerSettings }, null, 2));
