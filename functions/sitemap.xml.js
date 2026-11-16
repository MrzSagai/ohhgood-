import { loadContent } from "./_lib/content.js";
import { ORIGIN, CATEGORIES, esc } from "./_lib/site.js";

/* Generated from content/*.json so the sitemap can never go stale. <lastmod> is only emitted when a record has `updated`/`date`. */
export async function onRequest(context) {
  const { request, env } = context;
  try {
    const { products, articles } = await loadContent(env, new URL(request.url).origin);
    const entry = (path, extra = {}) => "<url><loc>" + esc(ORIGIN + path) + "</loc>" + (extra.lastmod ? "<lastmod>" + esc(extra.lastmod) + "</lastmod>" : "") + "</url>";
    const lastmod = (r) => (typeof (r.updated || r.date) === "string" && /^\d{4}-\d{2}-\d{2}/.test(r.updated || r.date) ? (r.updated || r.date) : "");
    const urls = [entry("/"), entry("/journal"),
      ...CATEGORIES.map((c) => entry("/category/" + c.slug)),
      ...articles.map((a) => entry("/journal/" + a.slug, { lastmod: lastmod(a) })),
      ...products.map((p) => entry("/product/" + p.id, { lastmod: lastmod(p) })),
      entry("/standards"), entry("/privacy"), entry("/contact")];
    return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.join("") + "</urlset>\n", {
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=900", "x-content-type-options": "nosniff" }
    });
  } catch { return new Response("Sitemap temporarily unavailable", { status: 503, headers: { "cache-control": "no-store" } }); }
}
