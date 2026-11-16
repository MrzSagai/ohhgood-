import { loadContent } from "../_lib/content.js";
import {
  ORIGIN, categoryByKey, esc, assetPath, displayName, productName, trimText, retailerInfo, absoluteImage,
  layout, htmlResponse, notFoundResponse, breadcrumbLd, breadcrumbHTML, productCardHTML, edgeCached
} from "../_lib/site.js";

const list = (value) => (Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [])
  .filter((x) => typeof x === "string" && x.trim()).map((x) => "<li>" + esc(x.trim()) + "</li>").join("");
const section = (heading, value) => { const items = list(value); return items ? "<h2>" + heading + "</h2><ul>" + items + "</ul>" : ""; };

function relatedFor(product, products) {
  const same = products.filter((p) => p.category === product.category);
  const index = same.findIndex((p) => p.id === product.id);
  const rotated = [...same.slice(index + 1), ...same.slice(0, Math.max(index, 0))];
  return rotated.slice(0, 4);
}

export function renderProduct(product, products) {
  const category = categoryByKey(product.category);
  const name = displayName(product);
  const path = "/product/" + product.id;
  const image = assetPath(product.image);
  const retailer = retailerInfo(product.retailer_url);
  const description = trimText(product.description || "An independent find from Ohhgood!", 155);
  const crumbs = [["Home", "/"], [category.label, "/category/" + category.slug], [productName(product), path]];
  const faq = Array.isArray(product.faq) ? product.faq.filter((f) => f && typeof f.q === "string" && typeof f.a === "string")
    .map((f) => "<h3>" + esc(f.q) + "</h3><p>" + esc(f.a) + "</p>").join("") : "";
  const related = relatedFor(product, products);
  const cta = retailer
    ? '<p class="cta-row"><a class="button button-dark cta-retailer" href="' + esc(retailer.href) + '" target="_blank" rel="nofollow sponsored noopener noreferrer">' + retailer.label + ' <span aria-hidden="true">↗</span></a></p><p class="cta-note">Opens in a new tab. Check current price, availability and details before buying.</p>'
    : '<p class="cta-note">A retailer link has not been verified for this find yet.</p>';
  const main = breadcrumbHTML(crumbs) +
    '<article class="product-detail"><p class="eyebrow">' + esc(category.label.toUpperCase()) + "</p><h1>" + esc(name) + "</h1>" +
    '<p class="disclosure">(paid link) As an Amazon Associate I earn from qualifying purchases.</p>' +
    '<p class="intro">' + esc(product.description || "") + "</p>" +
    (image ? '<figure class="product-figure"><img src="' + esc(image) + '" alt="' + esc(productName(product)) + '" width="1200" height="900" fetchpriority="high" decoding="async"><figcaption>Illustrative image. Check the retailer listing for exact product photos.</figcaption></figure>' : "") +
    cta +
    (list(product.benefits) ? '<div class="info-box"><h2>Why we like it</h2><ul>' + list(product.benefits) + "</ul></div>" : "") +
    section("How to use it", product.how_to) + section("Who it may suit", product.who_for) +
    section("Who may want to skip it", product.who_skip) + section("What to check before buying", product.check_before) +
    (faq ? "<h2>FAQ</h2>" + faq : "") +
    '<p class="guide-link">New to this category? <a href="/category/' + category.slug + '">Read the ' + esc(category.label) + " buying notes →</a></p></article>" +
    (related.length ? '<section class="related-finds" aria-labelledby="related-heading"><h2 id="related-heading">More in ' + esc(category.label) + '</h2><div class="product-grid">' + related.map(productCardHTML).join("") + "</div></section>" : "");
  return layout({
    title: name + " | Ohhgood!", description, path, image: absoluteImage(product.image), type: "article", mainClass: "container product-page", main,
    jsonld: [breadcrumbLd(crumbs), { "@context": "https://schema.org", "@type": "WebPage", name, description, url: ORIGIN + path, isPartOf: { "@type": "WebSite", name: "Ohhgood!", url: ORIGIN + "/" } }]
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.pathname.split("/").filter(Boolean).pop() || "";
  if (!/^[a-z0-9-]+$/.test(id)) return notFoundResponse("Product not found");
  try {
    return await edgeCached(context, async () => {
      const { products } = await loadContent(env, url.origin);
      const product = products.find((p) => p.id === id);
      return product ? htmlResponse(renderProduct(product, products), { ttl: 300 }) : notFoundResponse("Product not found");
    });
  } catch (error) {
    return new Response("Product page temporarily unavailable", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
}
