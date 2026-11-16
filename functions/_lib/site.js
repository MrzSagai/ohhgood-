/* Shared helpers for Ohhgood! Pages Functions (no dependencies, runs on Cloudflare Workers runtime). */

export const ORIGIN = "https://ohhgood.store";
export const SITE_NAME = "Ohhgood!";
export const DEFAULT_OG_IMAGE = ORIGIN + "/assets/og-default.jpg";

/* Keep this string identical to the Content-Security-Policy in /_headers (scripts/qa.py checks it). */
export const CSP = "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

export const SECURITY_HEADERS = Object.freeze({
  "content-security-policy": CSP,
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  "strict-transport-security": "max-age=15552000"
});

/* Category keys are stored in content/products.json; slugs are the public URLs. */
export const CATEGORIES = Object.freeze([
  { key: "tidy", slug: "tidy-space", label: "Tidy Space", tagline: "Tools for a cleaner, calmer home." },
  { key: "cozy", slug: "cozy-ambience", label: "Cozy Ambience", tagline: "Warm light, scent & calm evenings." },
  { key: "ritual", slug: "slow-ritual", label: "Slow Ritual", tagline: "Journal, planner & tea for slow days." },
  { key: "green", slug: "green-corner", label: "Green Corner", tagline: "Plants & planters for a living corner." }
]);
export const categoryByKey = (key) => CATEGORIES.find((c) => c.key === key) || null;
export const categoryBySlug = (slug) => CATEGORIES.find((c) => c.slug === slug) || null;

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/* Only allow files inside /assets. Returns an absolute, URL-encoded path or "". */
export function assetPath(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.replace(/^\//, "");
  if (!/^assets\/[a-zA-Z0-9_./% -]+$/.test(trimmed) || trimmed.includes("..")) return "";
  try {
    return "/" + trimmed.split("/").map((part) => encodeURIComponent(decodeURIComponent(part))).join("/");
  } catch { return ""; }
}

export const cleanText = (value) => String(value ?? "").replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim();
export const hasBrand = (product) => {
  const brand = cleanText(product && product.brand);
  return Boolean(brand) && !/^brand not specified$/i.test(brand);
};
export const productName = (product) => cleanText(product.name);
export const displayName = (product) => cleanText([hasBrand(product) ? product.brand : "", product.name].filter(Boolean).join(" "));

export function trimText(value, max = 155) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–]+$/, "") + "…";
}

export function retailerInfo(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const amazon = /(^|\.)amazon\.[a-z.]+$/i.test(parsed.hostname) || parsed.hostname === "amzn.to";
    return { href: parsed.href, amazon, label: amazon ? "Check price on Amazon" : "View at retailer" };
  } catch { return null; }
}

export function unsplashSized(url, width) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "images.unsplash.com") return url;
    parsed.searchParams.set("w", String(width));
    return parsed.href;
  } catch { return url; }
}

export function isUnsplash(url) {
  return typeof url === "string" && /^https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+(?:\?|$)/.test(url);
}

/* Absolute image URL for social previews; falls back to the default brand image. */
export function absoluteImage(value) {
  if (isUnsplash(value)) return value;
  const path = assetPath(value);
  return path ? ORIGIN + path : DEFAULT_OG_IMAGE;
}

export const jsonLd = (data) =>
  '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, "\\u003c") + "</script>";

/* ---------- article body rendering (plain text or a very small allow-listed HTML subset) ---------- */
const ALLOWED_TAGS = new Set(["p", "h2", "h3", "ul", "ol", "li", "strong", "b", "em", "i", "a", "blockquote", "br"]);

function safeHref(href) {
  try {
    const url = new URL(String(href || "").trim(), ORIGIN + "/");
    if (url.protocol === "https:" || url.origin === ORIGIN) return url.href;
  } catch { /* ignore */ }
  return "";
}

export function sanitizeHTML(source) {
  const out = [], stack = [];
  const tokens = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\/?>|[^<]+|</g;
  let match;
  while ((match = tokens.exec(source))) {
    const token = match[0];
    if (token.startsWith("<!--")) continue;
    if (token === "<") { out.push("&lt;"); continue; }
    if (token[0] !== "<") {
      out.push(token.replace(/&(?!(?:#\d{1,7}|#x[0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});)/g, "&amp;").replace(/>/g, "&gt;"));
      continue;
    }
    const tag = match[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;
    if (token[1] === "/") {
      const index = stack.lastIndexOf(tag);
      if (index === -1) continue;
      while (stack.length - 1 > index) out.push("</" + stack.pop() + ">");
      out.push("</" + stack.pop() + ">");
      continue;
    }
    if (tag === "br") { out.push("<br>"); continue; }
    let attrs = "";
    if (tag === "a") {
      const found = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(match[2] || "");
      const safe = safeHref(found ? (found[1] ?? found[2] ?? found[3]) : "");
      if (safe) attrs = ' href="' + esc(safe) + '" rel="noopener noreferrer"';
    }
    out.push("<" + tag + attrs + ">");
    stack.push(tag);
  }
  while (stack.length) out.push("</" + stack.pop() + ">");
  return out.join("");
}

export function renderArticleBody(body) {
  const text = typeof body === "string" ? body : "";
  if (/<(p|h2|h3|ul|ol|li|blockquote|strong|em|a|br)[\s>/]/i.test(text)) return sanitizeHTML(text);
  return text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((block) => block.trim()).filter(Boolean).map((block) => {
    const isHeading = /^\d+\.\s+\S/.test(block) && block.length <= 90 && !block.includes("\n") && !/[.!?]$/.test(block);
    return isHeading ? "<h2>" + esc(block) + "</h2>" : "<p>" + esc(block).replace(/\n/g, "<br>") + "</p>";
  }).join("");
}

/* ---------- shared markup ---------- */
export function productCardHTML(product) {
  const image = assetPath(product.thumb) || assetPath(product.image);
  const category = categoryByKey(product.category);
  return '<a class="product-card" href="/product/' + encodeURIComponent(product.id) + '"><div class="product-image-wrap">' +
    (image ? '<img src="' + esc(image) + '" alt="" width="600" height="600" loading="lazy" decoding="async">' : "") +
    '<span class="product-peek" aria-hidden="true"><img src="/assets/CTA-product%20card.webp" alt="" loading="lazy" decoding="async"></span></div>' +
    '<span class="product-name">' + esc(displayName(product)) + '</span><small class="product-cat">' + esc(category ? category.label : "Find") + "</small></a>";
}

const logoHTML = (extraClass = "") =>
  '<a class="logo' + extraClass + '" href="/" aria-label="Ohhgood! home">' +
  '<span class="brand-logo-parts" aria-hidden="true"><img class="brand-cat-head" src="/assets/logo-cat-head.webp" alt="" width="128" height="128" decoding="async"><img class="brand-wordmark" src="/assets/logo-wordmark.webp" alt="" width="360" height="90" decoding="async"></span>' +
  '<span class="brand-logo-parts brand-logo-parts-dark" aria-hidden="true"><img class="brand-cat-head" src="/assets/logo-cat-head-dark.webp" alt="" width="128" height="128" decoding="async"><img class="brand-wordmark" src="/assets/logo-wordmark-dark.webp" alt="" width="360" height="90" decoding="async"></span></a>';

const NAV = [["Categories", "/#categories"], ["Finds", "/#featured"], ["Journal", "/journal"], ["About", "/#about"]];

export function headerHTML() {
  const links = (cls) => NAV.map(([label, href]) => '<a href="' + href + '">' + label + "</a>").join("");
  return '<header class="site-header"><div class="container header-inner">' + logoHTML() +
    '<nav class="desktop-nav" aria-label="Primary">' + links() + "</nav>" +
    '<div class="header-actions"><button class="theme-toggle" type="button" aria-label="Switch to dark mode">Dark mode</button>' +
    '<button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav"><span></span><span></span><span></span></button></div></div>' +
    '<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation" hidden>' + links() + "</nav></header>";
}

export function footerHTML(extra = "") {
  const categoryLinks = CATEGORIES.map((c) => '<a href="/category/' + c.slug + '">' + esc(c.label) + "</a>").join("");
  return '<footer class="footer"><div class="container footer-inner">' + logoHTML(" footer-logo") +
    "<p>Independent discoveries. No pressure, no made-up ratings.</p>" +
    '<p class="footer-disclosure">As an Amazon Associate I earn from qualifying purchases.</p>' +
    '<a class="footer-standards" href="/standards">Editorial standards &amp; disclosures ↗</a>' +
    '<nav class="footer-policy-links" aria-label="Shop by category">' + categoryLinks + "</nav>" +
    '<nav class="footer-policy-links" aria-label="Legal and contact"><a href="/journal">Journal</a><a href="/privacy">Privacy</a><a href="/contact">Contact</a></nav>' +
    '<span>© <span id="year">' + new Date().getUTCFullYear() + "</span> Ohhgood!</span>" + extra + "</div></footer>";
}

const FONTS_URL = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Nunito:wght@700;800;900&display=swap";

export function layout({ title, description, path, image, type = "website", robots = "index, follow, max-image-preview:large", jsonld = [], main, mainClass = "container" }) {
  const canonical = ORIGIN + path;
  const ogImage = image || DEFAULT_OG_IMAGE;
  return "<!doctype html>\n" +
    '<html lang="en-US" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + esc(title) + "</title>" +
    '<meta name="description" content="' + esc(description) + '"><meta name="robots" content="' + esc(robots) + '">' +
    '<link rel="canonical" href="' + esc(canonical) + '">' +
    '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fffdfa"><meta name="theme-color" media="(prefers-color-scheme: dark)" content="#201f1e">' +
    '<meta property="og:type" content="' + esc(type) + '"><meta property="og:site_name" content="Ohhgood!"><meta property="og:locale" content="en_US">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(description) + '"><meta property="og:url" content="' + esc(canonical) + '"><meta property="og:image" content="' + esc(ogImage) + '">' +
    '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(title) + '"><meta name="twitter:description" content="' + esc(description) + '"><meta name="twitter:image" content="' + esc(ogImage) + '">' +
    '<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">' +
    '<script src="/theme.js"></script>' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="' + FONTS_URL + '" rel="stylesheet">' +
    '<link rel="stylesheet" href="/styles.css">' + jsonld.map(jsonLd).join("") + "</head><body>" +
    '<a class="skip-link" href="#main">Skip to main content</a>' + headerHTML() +
    '<main id="main" class="' + esc(mainClass) + '">' + main + "</main>" + footerHTML() +
    '<script src="/site.js" defer></script></body></html>';
}

export const breadcrumbLd = (items) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], index) => ({ "@type": "ListItem", position: index + 1, name, item: ORIGIN + path }))
});

export function breadcrumbHTML(items) {
  return '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + items.map(([name, path], index) =>
    "<li>" + (index === items.length - 1 ? '<span aria-current="page">' + esc(name) + "</span>" : '<a href="' + path + '">' + esc(name) + "</a>") + "</li>").join("") + "</ol></nav>";
}

/* ---------- responses ---------- */
export function htmlResponse(html, { status = 200, ttl = 0 } = {}) {
  const headers = new Headers({ "content-type": "text/html; charset=utf-8", ...SECURITY_HEADERS });
  headers.set("cache-control", status === 200 && ttl ? "public, max-age=60, s-maxage=" + ttl : "no-store");
  return new Response(html, { status, headers });
}

export function notFoundResponse(message = "Page not found") {
  const main = '<div class="not-found"><p class="eyebrow">404</p><h1>' + esc(message) + '<span class="accent">.</span></h1><p>The page you are looking for may have moved. Try browsing all finds.</p><p><a class="button button-dark" href="/#featured">Browse all finds</a></p></div>';
  const html = layout({ title: message + " — Ohhgood!", description: "This page could not be found.", path: "/404", robots: "noindex, follow", main });
  return htmlResponse(html, { status: 404 });
}

/* Cache successful GET responses at the Cloudflare edge for a few minutes. No-op without the Cache API. */
export async function edgeCached(context, build) {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheable = cache && context.request.method === "GET";
  const key = new Request(new URL(context.request.url).toString());
  if (cacheable) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const response = await build();
  if (cacheable && response.status === 200) context.waitUntil(cache.put(key, response.clone()));
  return response;
}
