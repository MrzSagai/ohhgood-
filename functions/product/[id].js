const CATEGORY_LABELS = { tidy: "Tidy Space", cozy: "Cozy Ambience", ritual: "Slow Ritual", green: "Green Corner" };
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const safeImage = (value) => typeof value === "string" && /^assets\/[a-zA-Z0-9_./% -]+$/.test(value) && !value.includes("..") ? "/" + value : "";
const list = (value) => Array.isArray(value) ? value.filter((x) => typeof x === "string" && x.trim()).map((x) => "<li>" + esc(x) + "</li>").join("") : "";
function render(product, products, url) {
  const title = product.brand + " " + product.name + " | Ohhgood!";
  const description = String(product.description || "An independent find from Ohhgood!").slice(0, 160);
  const canonical = url.origin + "/product/" + product.id;
  const image = safeImage(product.image);
  const category = CATEGORY_LABELS[product.category] || "Find";
  const retailer = (() => { try { const u = new URL(product.retailer_url); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } })();
  const related = products.filter((p) => p && p.status === "published" && p.category === product.category && p.id !== product.id).slice(0, 3);
  const relatedHTML = related.map((p) => {
    const src = safeImage(p.image);
    return '<a href="/product/' + encodeURIComponent(p.id) + '">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(p.name) + '" loading="lazy">' : "") + '<span>' + esc(p.brand + " " + p.name) + '</span></a>';
  }).join("");
  const cta = retailer ? '<a class="cta-below-img" href="' + esc(retailer) + '" target="_blank" rel="nofollow sponsored noopener noreferrer">View at Retailer</a><p class="cta-note">Opens the retailer in a new tab. Check current price, availability, and details before buying.</p>' : '<p class="cta-note">A retailer link has not been verified for this find yet.</p>';
  const optional = (heading, value) => {
    const items = Array.isArray(value) ? value : (typeof value === "string" ? value.split("\n").filter(Boolean) : []);
    return items.length ? "<h2>" + heading + "</h2><ul>" + list(items) + "</ul>" : "";
  };
  const faq = Array.isArray(product.faq) ? product.faq.filter((f) => f && typeof f.q === "string" && typeof f.a === "string").map((f) => "<h3>" + esc(f.q) + "</h3><p>" + esc(f.a) + "</p>").join("") : "";
  const body = '<p class="crumb"><a href="/">Home</a> / <a href="/#featured">' + esc(category) + '</a> / ' + esc(product.name) + '</p>' +
    '<p class="eyebrow">' + esc(category) + '</p><h1>' + esc(product.brand) + " " + esc(product.name) + '</h1>' +
    '<p class="disclosure">(paid link) As an Amazon Associate I earn from qualifying purchases. Check price, stock, and details on the retailer site before buying.</p>' +
    '<p class="intro">' + esc(description) + '</p>' + (image ? '<img class="product-hero" src="' + esc(image) + '" alt="' + esc(product.name) + '" loading="eager" decoding="async">' : "") + cta +
    (Array.isArray(product.benefits) && product.benefits.length ? '<div class="box"><h2 style="margin-top:0">Why we like it</h2><ul>' + list(product.benefits) + '</ul></div>' : "") +
    optional("How to use it", product.how_to) + optional("Who it may suit", product.who_for) +
    optional("Who may want to skip it", product.who_skip) + optional("What to check before buying", product.check_before) +
    (faq ? "<h2>FAQ</h2>" + faq : "") +
    (relatedHTML ? '<h2>Related finds in ' + esc(category) + '</h2><div class="related">' + relatedHTML + '</div>' : "") +
    '<p style="margin-top:28px"><a href="/#featured">Back to all finds</a></p>';
  const schema = { "@context":"https://schema.org", "@type":"Product", name:product.brand + " " + product.name, description, category, brand:{ "@type":"Brand", name:product.brand }, ...(image ? { image:url.origin + image } : {}) };
  return { title, description, canonical, image: image ? url.origin + image : "", body, schema };
}
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const id = url.pathname.split("/").filter(Boolean).pop() || "";
  if (!/^[a-z0-9-]+$/.test(id)) return new Response("Not found", { status:404 });
  try {
    const [templateResponse, dataResponse] = await Promise.all([
      env.ASSETS.fetch(new Request(new URL("/product.html", url.origin))),
      env.ASSETS.fetch(new Request(new URL("/content/products.json", url.origin)))
    ]);
    if (!templateResponse.ok || !dataResponse.ok) throw new Error("Product assets unavailable");
    const [template, products] = await Promise.all([templateResponse.text(), dataResponse.json()]);
    if (!Array.isArray(products)) throw new Error("Invalid product catalog");
    const product = products.find((p) => p && p.id === id && p.status === "published");
    if (!product) return new Response("Product not found", { status:404, headers:{ "content-type":"text/plain; charset=utf-8" } });
    const meta = render(product, products, url);
    let output = template
      .replace('href="styles.css"', 'href="/styles.css"')
      .replace('href="index.html"', 'href="/"')
      .replace('href="index.html#categories"', 'href="/#categories"')
      .replace('href="index.html#featured"', 'href="/#featured"')
      .replace('href="index.html#journal"', 'href="/#journal"')
      .replace('href="standards.html"', 'href="/standards.html"')
      .replace('<title>Product - Ohhgood!</title>', '<title>' + esc(meta.title) + '</title>')
      .replace('<meta name="description" content="Independent product finds from Ohhgood!, with useful details and honest considerations.">', '<meta name="description" content="' + esc(meta.description) + '">')
      .replace('<meta property="og:title" content="Product finds — Ohhgood!">', '<meta property="og:title" content="' + esc(meta.title) + '">')
      .replace('<meta property="og:description" content="Independent product finds from Ohhgood!.">', '<meta property="og:description" content="' + esc(meta.description) + '">')
      .replace('<link rel="canonical" href="https://ohhgood.store/product.html">', '<link rel="canonical" href="' + esc(meta.canonical) + '">')
      .replace('<meta property="og:type" content="product">', '<meta property="og:type" content="product"><meta property="og:url" content="' + esc(meta.canonical) + '"><meta property="og:image" content="' + esc(meta.image) + '"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(meta.title) + '"><meta name="twitter:description" content="' + esc(meta.description) + '"><meta name="twitter:image" content="' + esc(meta.image) + '">')
      .replace('<main class="product-page" id="app"><p style="padding:40px 0;text-align:center">Loading product...</p></main>', '<main class="product-page" id="app">' + meta.body + '</main>');
    output = output.replace('</head>', '<script type="application/ld+json">' + JSON.stringify(meta.schema).replace(/</g, "\\u003c") + '</script></head>');
    return new Response(output, { headers:{ "content-type":"text/html; charset=utf-8", "cache-control":"public, max-age=300, s-maxage=900", "x-content-type-options":"nosniff" } });
  } catch (error) {
    return new Response("Product page temporarily unavailable", { status:503, headers:{ "content-type":"text/plain; charset=utf-8", "cache-control":"no-store" } });
  }
}