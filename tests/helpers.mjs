import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* Minimal stand-in for the Pages `env.ASSETS` binding: serves repo files by URL path. */
export function mockEnv() {
  return {
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url);
        let p = decodeURIComponent(url.pathname);
        if (p === "/") p = "/index.html";
        try {
          const body = await readFile(path.join(ROOT, p));
          const type = p.endsWith(".json") ? "application/json" : p.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream";
          return new Response(body, { status: 200, headers: { "content-type": type } });
        } catch { return new Response("Not found", { status: 404 }); }
      }
    }
  };
}

export function ctx(url, extra = {}) {
  const request = new Request(url, extra.init);
  return { request, env: mockEnv(), waitUntil() {}, next: extra.next || (async () => new Response("next", { status: 200 })) };
}

export function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}
