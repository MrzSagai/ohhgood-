#!/usr/bin/env node
/* Local preview that mimics Cloudflare Pages: static files + _redirects + _headers + the Functions in /functions.
   Usage: node scripts/dev-server.mjs [port]   (then open http://localhost:8788)
   It is an approximation for development; always confirm on a real Cloudflare preview deployment. */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || 8788);
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8" };

const redirects = new Map();
for (const line of (await readFile(path.join(ROOT, "_redirects"), "utf8")).split("\n")) {
  const parts = line.trim().split(/\s+/);
  if (parts.length >= 2 && !line.startsWith("#")) redirects.set(parts[0], { to: parts[1], status: Number(parts[2] || 302) });
}
function parseHeaders(text) {
  const rules = []; let cur = null;
  for (const raw of text.split("\n")) {
    if (!raw.trim() || raw.startsWith("#")) continue;
    if (!raw.startsWith(" ")) { cur = { pattern: raw.trim(), set: [], detach: [] }; rules.push(cur); continue; }
    const line = raw.trim();
    if (line.startsWith("!")) cur.detach.push(line.slice(1).trim().toLowerCase());
    else { const i = line.indexOf(":"); cur.set.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
  }
  return rules;
}
const headerRules = parseHeaders(await readFile(path.join(ROOT, "_headers"), "utf8"));
const matches = (pattern, p) => pattern.endsWith("*") ? p.startsWith(pattern.slice(0, -1)) : p === pattern;
function staticHeaders(p) {
  const h = new Map();
  for (const rule of headerRules) if (matches(rule.pattern, p)) { rule.detach.forEach((d) => h.delete(d)); rule.set.forEach(([k, v]) => h.set(k.toLowerCase(), v)); }
  return h;
}

const load = (file) => import(pathToFileURL(path.join(ROOT, "functions", file)).href);
async function routeFunction(p) {
  if (p === "/") return load("index.js");
  if (p === "/product" || p === "/product/") return load("product.js");
  if (/^\/product\/[^/]+$/.test(p)) return load("product/[id].js");
  if (p === "/journal" || p === "/journal/") return load("journal.js");
  if (p === "/journal.html") return load("journal.html.js");
  if (/^\/journal\/[^/]+$/.test(p)) return load("journal/[slug].js");
  if (/^\/category\/[^/]+$/.test(p)) return load("category/[slug].js");
  if (p === "/sitemap.xml") return load("sitemap.xml.js");
  if (p.startsWith("/docs/") || p.startsWith("/scripts/")) return load(p.startsWith("/docs/") ? "docs/[[path]].js" : "scripts/[[path]].js");
  return null;
}

async function staticFile(p) {
  let target = p === "/" ? "/index.html" : p;
  let file = path.join(ROOT, decodeURIComponent(target));
  if (!file.startsWith(ROOT)) return null;
  for (const candidate of [file, file + ".html"]) {
    try { if ((await stat(candidate)).isFile()) return { file: candidate, explicitHtml: candidate === file && file.endsWith(".html") }; } catch { /* next */ }
  }
  return null;
}

const env = { ASSETS: { async fetch(request) {
  const found = await staticFile(new URL(request.url).pathname);
  if (!found) return new Response("Not found", { status: 404 });
  return new Response(await readFile(found.file), { headers: { "content-type": TYPES[path.extname(found.file)] || "application/octet-stream" } });
} } };

async function handle(req) {
  const url = new URL(req.url);
  const rule = redirects.get(url.pathname);
  if (rule) return new Response(null, { status: rule.status, headers: { location: new URL(rule.to, url.origin).href } });
  const fn = await routeFunction(url.pathname);
  if (fn && fn.onRequest) {
    const context = { request: req, env, waitUntil() {}, next: async () => staticResponse(url) };
    return fn.onRequest(context);
  }
  return staticResponse(url);
}
async function staticResponse(url) {
  const found = await staticFile(url.pathname);
  if (!found) return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
  if (found.explicitHtml && url.pathname !== "/") { /* Pages strips .html from pretty URLs */
    return new Response(null, { status: 308, headers: { location: url.pathname.replace(/(?:\/index)?\.html$/, "") || "/" } });
  }
  const headers = new Headers({ "content-type": TYPES[path.extname(found.file)] || "application/octet-stream" });
  for (const [k, v] of staticHeaders(url.pathname)) headers.set(k, v);
  return new Response(await readFile(found.file), { headers });
}

http.createServer(async (nodeReq, nodeRes) => {
  try {
    const req = new Request("http://localhost:" + PORT + nodeReq.url, { method: nodeReq.method });
    const res = await handle(req);
    nodeRes.writeHead(res.status, Object.fromEntries(res.headers));
    nodeRes.end(Buffer.from(await res.arrayBuffer()));
  } catch (error) { nodeRes.writeHead(500); nodeRes.end(String(error && error.stack || error)); }
}).listen(PORT, () => console.log("Ohhgood! dev server: http://localhost:" + PORT));
