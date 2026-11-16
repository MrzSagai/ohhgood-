import { loadContent } from "./_lib/content.js";
import { SECURITY_HEADERS, esc, displayName, productCardHTML, trimText, edgeCached } from "./_lib/site.js";

const replaceBlock = (html, name, content) =>
  html.replace(new RegExp("<!--SSR:" + name + "-->[\\s\\S]*?<!--/SSR:" + name + "-->"), () => content);

export function injectHome(html, { products, articles }) {
  const grid = products.map(productCardHTML).join("");
  const all = '<ul id="all-finds-list">' + products.map((p) => '<li><a href="/product/' + encodeURIComponent(p.id) + '">' + esc(displayName(p)) + "</a></li>").join("") + "</ul>";
  const journal = '<ul class="journal-link-list">' + articles.map((a) => '<li><a href="/journal/' + encodeURIComponent(a.slug) + '">' + esc(a.title) + " →</a><p>" + esc(trimText(a.summary || "", 140)) + "</p></li>").join("") + "</ul>";
  let out = replaceBlock(html, "GRID", grid);
  out = replaceBlock(out, "ALL", all);
  return replaceBlock(out, "JOURNAL", journal);
}

/* Homepage: serve the static index.html with the catalog pre-rendered, so crawlers and no-JS visitors see real links.
   Any failure falls back to the untouched static page (the browser script then renders the grid). */
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return context.next();
  try {
    return await edgeCached(context, async () => {
      const staticResponse = await context.next();
      const type = staticResponse.headers.get("content-type") || "";
      if (!staticResponse.ok || !type.includes("text/html")) return staticResponse;
      const html = await staticResponse.text();
      const content = await loadContent(env, new URL(request.url).origin);
      const headers = new Headers({ "content-type": "text/html; charset=utf-8", ...SECURITY_HEADERS, "cache-control": "public, max-age=60, s-maxage=300" });
      return new Response(injectHome(html, content), { status: 200, headers });
    });
  } catch {
    return context.next();
  }
}
