import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, ctx, jsonLdBlocks, mockEnv } from "./helpers.mjs";
import { onRequest as productRoute } from "../functions/product/[id].js";
import { onRequest as categoryRoute } from "../functions/category/[slug].js";
import { onRequest as journalRoute } from "../functions/journal.js";
import { onRequest as articleRoute } from "../functions/journal/[slug].js";
import { onRequest as sitemapRoute } from "../functions/sitemap.xml.js";
import { onRequest as indexRoute } from "../functions/index.js";
import { onRequest as legacyProduct } from "../functions/product.js";
import { sanitizeHTML, renderArticleBody, displayName, assetPath, trimText } from "../functions/_lib/site.js";

const O = "https://ohhgood.store";
const products = JSON.parse(await readFile(path.join(ROOT, "content/products.json"), "utf8"));
const articles = JSON.parse(await readFile(path.join(ROOT, "content/articles.json"), "utf8"));

test("every published product renders a complete, indexable page", async () => {
  for (const p of products.filter((x) => x.status === "published")) {
    const res = await productRoute(ctx(`${O}/product/${p.id}`));
    assert.equal(res.status, 200, p.id);
    const html = await res.text();
    assert.ok(html.startsWith("<!doctype html>"), p.id);
    assert.ok(html.includes(`<link rel="canonical" href="${O}/product/${p.id}">`), p.id);
    assert.equal((html.match(/<h1>/g) || []).length, 1, p.id);
    assert.ok(!/Brand not specified/i.test(html), p.id + " shows placeholder brand");
    assert.ok(!/<script(?![^>]*(src=|ld\+json))/i.test(html), p.id + " has inline script");
    assert.ok(html.includes('rel="nofollow sponsored noopener noreferrer"'), p.id);
    assert.ok(html.includes("As an Amazon Associate I earn from qualifying purchases."), p.id);
    assert.ok(html.includes("Illustrative image"), p.id);
    assert.ok(/<meta name="description" content="[^"]{20,160}">/.test(html), p.id);
    jsonLdBlocks(html).forEach((b) => assert.ok(b["@type"]));
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  }
});

test("unknown or malformed product ids return 404", async () => {
  assert.equal((await productRoute(ctx(`${O}/product/does-not-exist`))).status, 404);
  assert.equal((await productRoute(ctx(`${O}/product/..%2Fsecret`))).status, 404);
  assert.equal((await productRoute(ctx(`${O}/product/UPPER`))).status, 404);
});

test("legacy /product?id= redirects permanently", async () => {
  const res = await legacyProduct(ctx(`${O}/product?id=benq-screenbar-halo`));
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), `${O}/product/benq-screenbar-halo`);
  assert.equal((await legacyProduct(ctx(`${O}/product?id=%3Cscript%3E`))).headers.get("location"), `${O}/#featured`);
});

test("category pages list their products and carry guidance", async () => {
  for (const [slug, key] of [["tidy-space", "tidy"], ["cozy-ambience", "cozy"], ["slow-ritual", "ritual"], ["green-corner", "green"]]) {
    const html = await (await categoryRoute(ctx(`${O}/category/${slug}`))).text();
    const expected = products.filter((p) => p.category === key && p.status === "published").length;
    assert.equal((html.match(/class="product-card"/g) || []).length, expected, slug);
    assert.ok(html.includes("What to check before you buy"), slug);
    const ld = jsonLdBlocks(html).find((b) => b["@type"] === "CollectionPage");
    assert.equal(ld.mainEntity.itemListElement.length, expected);
  }
  assert.equal((await categoryRoute(ctx(`${O}/category/nope`))).status, 404);
});

test("journal index, articles, drafts and legacy slug redirect", async () => {
  const idx = await (await journalRoute(ctx(`${O}/journal`))).text();
  const published = articles.filter((a) => a.status === "published");
  published.forEach((a) => assert.ok(idx.includes(`/journal/${a.slug}`)));
  articles.filter((a) => a.status !== "published").forEach((a) => assert.ok(!idx.includes(a.slug), "draft leaked"));
  for (const a of published) {
    const res = await articleRoute(ctx(`${O}/journal/${a.slug}`));
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.ok(html.includes(`<link rel="canonical" href="${O}/journal/${a.slug}">`));
    assert.ok(html.includes(a.title.replace(/&/g, "&amp;")));
    assert.ok(jsonLdBlocks(html).some((b) => b["@type"] === "Article"));
    assert.ok((html.match(/<h2>/g) || []).length >= 3, "numbered steps become headings");
  }
  const draft = articles.find((a) => a.status !== "published");
  assert.equal((await articleRoute(ctx(`${O}/journal/${draft.slug}`))).status, 404);
  const legacy = await journalRoute(ctx(`${O}/journal.html?slug=small-desk-improvements`));
  assert.equal(legacy.status, 301);
  assert.equal(legacy.headers.get("location"), `${O}/journal/small-desk-improvements`);
});

test("sitemap contains only canonical, published URLs", async () => {
  const xml = await (await sitemapRoute(ctx(`${O}/sitemap.xml`))).text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(locs).size, locs.length, "duplicates");
  assert.ok(locs.every((l) => l.startsWith(O) && !l.includes(".html") && !l.includes("?")));
  products.filter((p) => p.status === "published").forEach((p) => assert.ok(locs.includes(`${O}/product/${p.id}`)));
  assert.ok(!xml.includes("how-to-choose-a-candle-warmer-lamp"), "draft article in sitemap");
});

test("homepage injection fills the catalog and falls back safely", async () => {
  const html = await readFile(path.join(ROOT, "index.html"), "utf8");
  const next = async () => new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  const res = await indexRoute(ctx(`${O}/`, { next }));
  const out = await res.text();
  const n = products.filter((p) => p.status === "published").length;
  assert.equal((out.match(/class="product-card"/g) || []).length, n);
  assert.equal((out.match(/<li><a href="\/product\//g) || []).length, n);
  assert.ok(!out.includes("Loading finds"));
  assert.ok(!out.includes("SSR:GRID"));
  // content failure -> untouched static page
  const broken = { ...ctx("https://broken.example/", { next }), env: { ASSETS: { fetch: async () => new Response("x", { status: 500 }) } } };
  assert.equal(await (await indexRoute(broken)).text(), html);
});

test("sanitizer blocks scripts, handlers and unsafe links", () => {
  const evil = '<p onclick="x()">hi</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://example.com/x" target="_blank" onmouseover="y()">ok</a><a href="&#106;avascript:alert(1)">ent</a><iframe src="//evil"></iframe>';
  const out = sanitizeHTML(evil);
  assert.ok(!/<script|onerror|onclick|onmouseover|<img|<iframe|javascript:/i.test(out.replace(/&amp;#106;avascript:alert\(1\)/g, "")), out);
  assert.ok(out.includes('href="https://example.com/x" rel="noopener noreferrer"'));
  assert.equal(renderArticleBody("A & B < C\n\n1. Step title\n\nBody"), "<p>A &amp; B &lt; C</p><h2>1. Step title</h2><p>Body</p>");
  assert.equal(sanitizeHTML("<p>Tom &amp; Jerry</p>"), "<p>Tom &amp; Jerry</p>");
});

test("helpers", () => {
  assert.equal(displayName({ brand: "Brand not specified", name: "Amber Candle , 16 oz" }), "Amber Candle, 16 oz");
  assert.equal(displayName({ brand: "OXO", name: "Cleaner" }), "OXO Cleaner");
  assert.equal(assetPath("assets/../x"), "");
  assert.equal(assetPath("https://evil/x.png"), "");
  assert.equal(assetPath("assets/CTA-product card.webp"), "/assets/CTA-product%20card.webp");
  assert.ok(trimText("word ".repeat(80), 155).length <= 156);
});
