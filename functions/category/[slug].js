import { loadContent } from "../_lib/content.js";
import {
  ORIGIN, CATEGORIES, categoryBySlug, esc, trimText, displayName, layout, htmlResponse, notFoundResponse,
  breadcrumbLd, breadcrumbHTML, productCardHTML, edgeCached, absoluteImage
} from "../_lib/site.js";

export function renderCategory(category, copy, products) {
  const items = products.filter((p) => p.category === category.key);
  const path = "/category/" + category.slug;
  const crumbs = [["Home", "/"], [category.label, path]];
  const intro = (copy.intro || [category.tagline]).map((t) => "<p>" + esc(t) + "</p>").join("");
  const checklist = Array.isArray(copy.checklist) && copy.checklist.length
    ? '<section class="info-box" aria-labelledby="check-heading"><h2 id="check-heading">What to check before you buy</h2><ul>' + copy.checklist.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul></section>" : "";
  const others = CATEGORIES.filter((c) => c.key !== category.key).map((c) => '<a href="/category/' + c.slug + '">' + esc(c.label) + "</a>").join("");
  const description = trimText(copy.description || category.tagline, 155);
  const main = breadcrumbHTML(crumbs) + '<p class="eyebrow">' + esc(category.label.toUpperCase()) + "</p><h1>" + esc(copy.title || category.label) + '<span class="accent">.</span></h1>' +
    '<div class="lead-block">' + intro + "</div>" +
    '<p class="affiliate-note">As an Amazon Associate I earn from qualifying purchases. <a href="/standards">How we choose and disclose ↗</a></p>' +
    '<div class="product-grid category-grid">' + items.map(productCardHTML).join("") + "</div>" + checklist +
    '<nav class="category-switch" aria-label="Other categories"><span>Explore more:</span>' + others + "</nav>";
  return layout({
    title: (copy.title || category.label) + " | Ohhgood!", description, path, image: items[0] ? absoluteImage(items[0].image) : undefined, mainClass: "container category-page", main,
    jsonld: [breadcrumbLd(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: copy.title || category.label, description, url: ORIGIN + path,
      mainEntity: { "@type": "ItemList", itemListElement: items.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: displayName(p), url: ORIGIN + "/product/" + p.id })) } }]
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const category = categoryBySlug(url.pathname.split("/").filter(Boolean).pop() || "");
  if (!category) return notFoundResponse("Category not found");
  try {
    return await edgeCached(context, async () => {
      const { products, copy } = await loadContent(env, url.origin);
      return htmlResponse(renderCategory(category, copy[category.key] || {}, products), { ttl: 300 });
    });
  } catch { return new Response("Category temporarily unavailable", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } }); }
}
