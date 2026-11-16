import { loadContent } from "../_lib/content.js";
import {
  ORIGIN, esc, assetPath, isUnsplash, unsplashSized, trimText, absoluteImage, renderArticleBody,
  layout, htmlResponse, notFoundResponse, breadcrumbLd, breadcrumbHTML, productCardHTML, edgeCached
} from "../_lib/site.js";

export function renderArticle(article, products) {
  const path = "/journal/" + article.slug;
  const description = trimText(article.summary || article.title, 155);
  const cover = isUnsplash(article.cover_image) ? unsplashSized(article.cover_image, 1100) : assetPath(article.cover_image);
  const crumbs = [["Home", "/"], ["Good Journal", "/journal"], [article.title, path]];
  const mentioned = (Array.isArray(article.related_products) ? article.related_products : [])
    .map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 4);
  const main = breadcrumbHTML(crumbs) + '<p class="eyebrow">GOOD JOURNAL</p><h1>' + esc(article.title) + '<span class="accent">.</span></h1>' +
    (article.summary ? '<p class="lead">' + esc(article.summary) + "</p>" : "") +
    (cover ? '<img class="article-cover-photo" src="' + esc(cover) + '" alt="" width="1100" height="825" fetchpriority="high" decoding="async">' : "") +
    '<div class="article-body is-rendered">' + renderArticleBody(article.body) + "</div>" +
    (mentioned.length ? '<section class="related-finds" aria-labelledby="mentioned-heading"><h2 id="mentioned-heading">Finds mentioned in this story</h2><p class="affiliate-note">As an Amazon Associate I earn from qualifying purchases.</p><div class="product-grid">' + mentioned.map(productCardHTML).join("") + "</div></section>" : "") +
    '<p><a class="journal-back" href="/journal">← Back to the Journal</a></p>';
  const articleLd = { "@context": "https://schema.org", "@type": "Article", headline: article.title, description, mainEntityOfPage: ORIGIN + path,
    ...(cover ? { image: [absoluteImage(article.cover_image)] } : {}),
    ...(article.date ? { datePublished: article.date } : {}), ...(article.updated ? { dateModified: article.updated } : {}),
    author: { "@type": "Organization", name: "Ohhgood!", url: ORIGIN + "/" },
    publisher: { "@type": "Organization", name: "Ohhgood!", url: ORIGIN + "/", logo: { "@type": "ImageObject", url: ORIGIN + "/assets/icon-192.png" } } };
  return layout({ title: article.title + " | Ohhgood! Journal", description, path, image: absoluteImage(article.cover_image), type: "article",
    mainClass: "container journal-article", main, jsonld: [breadcrumbLd(crumbs), articleLd] });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const slug = url.pathname.split("/").filter(Boolean).pop() || "";
  if (!/^[a-z0-9-]+$/.test(slug)) return notFoundResponse("Story not found");
  try {
    return await edgeCached(context, async () => {
      const { articles, products } = await loadContent(env, url.origin);
      const article = articles.find((a) => a.slug === slug);
      return article ? htmlResponse(renderArticle(article, products), { ttl: 300 }) : notFoundResponse("Story not found");
    });
  } catch { return new Response("Story temporarily unavailable", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }); }
}
