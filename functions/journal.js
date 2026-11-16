import { loadContent } from "./_lib/content.js";
import {
  ORIGIN, esc, assetPath, isUnsplash, unsplashSized, trimText, layout, htmlResponse, breadcrumbLd, breadcrumbHTML, edgeCached
} from "./_lib/site.js";

const coverSrc = (value, width) => (isUnsplash(value) ? unsplashSized(value, width) : assetPath(value));

export function renderJournalIndex(articles) {
  const cards = articles.map((a) => {
    const src = coverSrc(a.cover_image, 640);
    return '<li class="journal-item"><a href="/journal/' + encodeURIComponent(a.slug) + '">' +
      (src ? '<img class="journal-thumb" src="' + esc(src) + '" alt="" width="640" height="480" loading="lazy" decoding="async">' : "") +
      "<h2>" + esc(a.title) + "</h2><p>" + esc(a.summary || "") + '</p><span class="read-more">Read the story →</span></a></li>';
  }).join("");
  const crumbs = [["Home", "/"], ["Good Journal", "/journal"]];
  const main = breadcrumbHTML(crumbs) + '<p class="eyebrow">GOOD JOURNAL</p><h1>Ideas, tips and little discoveries<span class="accent">.</span></h1>' +
    '<p class="lead">Practical ideas for calmer everyday routines and better-organized spaces.</p><ul class="journal-grid">' + cards + "</ul>";
  return layout({
    title: "Good Journal — Calm Home & Desk Ideas | Ohhgood!", description: "Practical ideas for calmer everyday routines, tidier desks and cozier evenings from the Ohhgood! journal.",
    path: "/journal", mainClass: "container journal-index", main,
    jsonld: [breadcrumbLd(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: "Good Journal", url: ORIGIN + "/journal",
      hasPart: articles.map((a) => ({ "@type": "Article", headline: a.title, url: ORIGIN + "/journal/" + a.slug })) }]
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (slug) { /* legacy /journal.html?slug=... links */
    const target = /^[a-z0-9-]+$/.test(slug) ? "/journal/" + slug : "/journal";
    return Response.redirect(new URL(target, url.origin).toString(), 301);
  }
  try {
    return await edgeCached(context, async () => {
      const { articles } = await loadContent(env, url.origin);
      return htmlResponse(renderJournalIndex(articles), { ttl: 300 });
    });
  } catch { return new Response("Journal temporarily unavailable", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }); }
}
