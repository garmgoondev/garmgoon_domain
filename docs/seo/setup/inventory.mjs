import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Read-only discovery. Never prints or persists Cloudflare credentials.
const seoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devRoot = "D:/Dev";
const accountId = "c61cba217caf3a5eef264a0136510e72";
const credentialPath = path.join(process.env.APPDATA, "xdg.config/.wrangler/config/default.toml");
const auth = await readFile(credentialPath, "utf8");
const token = auth.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
if (!token) throw new Error("Cloudflare login is required.");

async function query(apiPath) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    return { unavailable: true, status: response.status,
      errors: data.errors?.map(({ code, message }) => ({ code, message })) };
  }
  if (Array.isArray(data.result) && data.result_info?.total_pages > 1) {
    const items = [...data.result];
    for (let page = 2; page <= data.result_info.total_pages; page++) {
      const url = new URL(`https://api.cloudflare.com/client/v4${apiPath}`);
      url.searchParams.set("page", String(page));
      const nextResponse = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const next = await nextResponse.json();
      if (!nextResponse.ok || !next.success) throw new Error(`Incomplete Cloudflare inventory for ${apiPath}: page ${page} could not be read.`);
      items.push(...next.result);
    }
    return items;
  }
  return data.result;
}

const [workerDomains, pagesProjects, zones, workers, workerSubdomain] = await Promise.all([
  query(`/accounts/${accountId}/workers/domains`),
  query(`/accounts/${accountId}/pages/projects`),
  query(`/zones?account.id=${accountId}&per_page=100`),
  query(`/accounts/${accountId}/workers/scripts`),
  query(`/accounts/${accountId}/workers/subdomain`),
]);
const localProjects = [];
for (const entry of await readdir(devRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "open-seo") continue;
  const directory = path.join(devRoot, entry.name);
  const names = await readdir(directory);
  if (!names.includes(".git") && !names.includes("package.json")) continue;
  localProjects.push({ name: entry.name, directory,
    deploymentConfigs: names.filter((name) => /^(wrangler\.(jsonc?|toml)|vercel\.json|netlify\.toml|CNAME)$/.test(name)) });
}

const sites = new Map();
function addSite(domain, deployment, source) {
  if (!domain) return;
  const canonical = domain.replace(/^www\./, "");
  if (canonical === "seo.garmgoon.com") return;
  const current = sites.get(canonical) ?? { domain: canonical, aliases: [], deployments: [],
    sources: [], openSeoProjectId: null, registrationStatus: "pending", gscStatus: "not_connected" };
  if (!current.aliases.includes(domain)) current.aliases.push(domain);
  if (!current.deployments.includes(deployment)) current.deployments.push(deployment);
  if (!current.sources.includes(source)) current.sources.push(source);
  sites.set(canonical, current);
}
if (Array.isArray(workerDomains)) {
  for (const item of workerDomains) if (item.enabled !== false) addSite(item.hostname, item.service, "Cloudflare Worker custom domain");
}
if (Array.isArray(pagesProjects)) {
  for (const project of pagesProjects) {
    const customDomains = (project.domains ?? []).filter((domain) => !domain.endsWith(".pages.dev"));
    for (const domain of customDomains.length ? customDomains : [project.subdomain]) addSite(domain, project.name, "Cloudflare Pages domain");
  }
}
if (Array.isArray(workers) && workerSubdomain.subdomain) {
  const assignedWorkers = new Set(Array.isArray(workerDomains) ? workerDomains.map(({ service }) => service) : []);
  for (const worker of workers) {
    if (assignedWorkers.has(worker.id) || worker.id.startsWith("open-seo") || worker.id.startsWith("alchemy")) continue;
    const settings = await query(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(worker.id)}/subdomain`);
    if (settings.enabled) addSite(`${worker.id}.${workerSubdomain.subdomain}.workers.dev`, worker.id, "Cloudflare public Worker hostname");
  }
}
const registry = {
  generatedAt: new Date().toISOString(), hub: "https://seo.garmgoon.com",
  mcp: "https://seo.garmgoon.com/mcp", workspace: "shared-workspace",
  discoveryScope: "Current Cloudflare account and immediate local repositories; other hosting accounts and external sites require discovery.",
  sites: [...sites.values()].sort((a, b) => a.domain.localeCompare(b.domain)),
  cloudflareZones: Array.isArray(zones) ? zones.map(({ name, status }) => ({ name, status })) : zones,
  localProjects,
  pagesProjects: Array.isArray(pagesProjects) ? pagesProjects.map(({ name, subdomain, domains }) => ({ name, subdomain, domains })) : pagesProjects,
  unavailableSources: Object.entries({ workerDomains, pagesProjects, zones }).filter(([, value]) => value.unavailable).map(([source, value]) => ({ source, ...value })),
};
registry.dnsCandidates = [];
if (Array.isArray(zones)) {
  for (const zone of zones) {
    const records = await query(`/zones/${zone.id}/dns_records?per_page=100`);
    if (!Array.isArray(records)) {
      registry.unavailableSources.push({ source: `DNS candidates for ${zone.name}`, ...records });
      continue;
    }
    for (const { name, type } of records) {
      if (["A", "AAAA", "CNAME"].includes(type)) registry.dnsCandidates.push({ hostname: name, type, zone: zone.name, status: "requires_website_verification" });
    }
  }
}
await mkdir(path.join(seoRoot, "projects"), { recursive: true });
const date = new Date().toISOString().slice(0, 10);
let output = path.join(seoRoot, "projects", `${date}-discovery.json`);
if (existsSync(output)) {
  let version = 2;
  while (existsSync(path.join(seoRoot, "projects", `${date}-discovery-v${version}.json`))) {
    version++;
  }
  output = path.join(seoRoot, "projects", `${date}-discovery-v${version}.json`);
}
await writeFile(output, JSON.stringify(registry, null, 2) + "\n");
console.log(JSON.stringify({ output, sites: registry.sites.map(({ domain }) => domain),
  localProjectCount: localProjects.length, unavailableSources: registry.unavailableSources }, null, 2));
