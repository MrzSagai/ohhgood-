import { CATEGORIES } from "./site.js";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEYS = new Set(CATEGORIES.map((c) => c.key));
let memo = { at: 0, origin: "", value: null };

async function readJSON(env, origin, path) {
  const response = await env.ASSETS.fetch(new Request(new URL(path, origin)));
  if (!response.ok) throw new Error(path + " unavailable (" + response.status + ")");
  return response.json();
}

export const validProduct = (p) => p && typeof p === "object" && SLUG.test(p.id || "") && typeof p.name === "string" && p.name.trim() &&
  KEYS.has(p.category) && typeof p.description === "string" && p.status === "published" && /^https:\/\//i.test(p.retailer_url || "");
export const validArticle = (a) => a && typeof a === "object" && SLUG.test(a.slug || "") && typeof a.title === "string" && a.title.trim() && a.status === "published";

/* Published products/articles + optional category copy. Memoised for 60 s per isolate to keep Functions cheap. */
export async function loadContent(env, origin) {
  const now = Date.now();
  if (memo.value && memo.origin === origin && now - memo.at < 60000) return memo.value;
  const [products, articles, categories] = await Promise.all([
    readJSON(env, origin, "/content/products.json"),
    readJSON(env, origin, "/content/articles.json"),
    readJSON(env, origin, "/content/categories.json").catch(() => [])
  ]);
  if (!Array.isArray(products) || !Array.isArray(articles)) throw new Error("Invalid content files");
  const seen = new Set();
  const value = {
    products: products.filter((p) => validProduct(p) && !seen.has(p.id) && seen.add(p.id)),
    articles: articles.filter(validArticle),
    copy: Object.fromEntries((Array.isArray(categories) ? categories : []).filter((c) => c && KEYS.has(c.key)).map((c) => [c.key, c]))
  };
  memo = { at: now, origin, value };
  return value;
}
