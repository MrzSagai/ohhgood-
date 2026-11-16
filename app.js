/* Ohhgood! homepage catalog: category filter + search over the pre-rendered product grid.
   The server already renders every card; this script only re-filters in place. Fail-closed on bad data. */
"use strict";
const CATEGORY_LABELS = Object.freeze({ tidy: "Tidy Space", cozy: "Cozy Ambience", ritual: "Slow Ritual", green: "Green Corner" });
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));
let allProducts = [];
let activeCategory = "all";
let searchTerm = "";

const safeImagePath = (value) =>
  typeof value === "string" && /^\/?assets\/[a-zA-Z0-9_./% -]+$/.test(value) && !value.includes("..") ? "/" + value.replace(/^\//, "") : "";
const cleanText = (value) => String(value || "").replace(/\s+,/g, ",").replace(/\s{2,}/g, " ").trim();
const hasBrand = (p) => typeof p.brand === "string" && p.brand.trim() && !/^brand not specified$/i.test(p.brand.trim());
const displayName = (p) => cleanText((hasBrand(p) ? p.brand + " " : "") + p.name);

function isValidProduct(p) {
  return p && typeof p === "object" && typeof p.id === "string" && /^[a-z0-9-]+$/.test(p.id) &&
    typeof p.name === "string" && p.name.trim() && VALID_CATEGORIES.has(p.category) &&
    typeof p.description === "string" && safeImagePath(p.image) !== "";
}
function matchesSearch(p) {
  if (!searchTerm) return true;
  return [p.brand, p.name, p.description, ...(Array.isArray(p.benefits) ? p.benefits : [])].join(" ").toLocaleLowerCase().includes(searchTerm);
}
function setFilterUI() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const selected = button.dataset.filter === activeCategory;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
function cardFor(p) {
  const link = document.createElement("a");
  link.className = "product-card";
  link.href = "/product/" + encodeURIComponent(p.id);
  const wrap = document.createElement("div");
  wrap.className = "product-image-wrap";
  const image = document.createElement("img");
  const thumb = safeImagePath(p.thumb);
  image.src = thumb || safeImagePath(p.image);
  image.alt = "";
  image.width = 600; image.height = 600;
  image.loading = "lazy"; image.decoding = "async";
  image.addEventListener("error", () => { if (thumb && image.src.indexOf(thumb) !== -1) image.src = safeImagePath(p.image); else image.hidden = true; }, { once: true });
  const peek = document.createElement("span");
  peek.className = "product-peek";
  peek.setAttribute("aria-hidden", "true");
  const peekImage = document.createElement("img");
  peekImage.src = "/assets/CTA-product%20card.webp"; peekImage.alt = ""; peekImage.loading = "lazy"; peekImage.decoding = "async";
  peek.appendChild(peekImage);
  wrap.append(image, peek);
  const name = document.createElement("span");
  name.className = "product-name";
  name.textContent = displayName(p);
  const category = document.createElement("small");
  category.className = "product-cat";
  category.textContent = CATEGORY_LABELS[p.category];
  link.append(wrap, name, category);
  return link;
}
function renderGrid() {
  const grid = document.getElementById("product-grid");
  if (!grid || !allProducts.length) return;
  const visible = allProducts.filter((p) => (activeCategory === "all" || p.category === activeCategory) && matchesSearch(p));
  grid.replaceChildren();
  if (!visible.length) {
    const message = document.createElement("p");
    message.textContent = searchTerm ? "No finds match your search. Try another keyword." : "No finds in this category yet.";
    grid.appendChild(message);
    return;
  }
  const fragment = document.createDocumentFragment();
  visible.forEach((p) => fragment.appendChild(cardFor(p)));
  grid.appendChild(fragment);
}
async function loadProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const serverRendered = grid.querySelector(".product-card") !== null;
  try {
    const response = await fetch("/content/products.json", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Product data request failed (" + response.status + ").");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Product data must be a JSON array.");
    const seen = new Set();
    allProducts = data.filter((p) => isValidProduct(p) && p.status === "published" && !seen.has(p.id) && seen.add(p.id));
    if (!serverRendered || activeCategory !== "all" || searchTerm) renderGrid();
  } catch (error) {
    console.error("Ohhgood! could not load catalog:", error);
    if (!serverRendered) {
      grid.replaceChildren();
      const message = document.createElement("p");
      message.textContent = "Finds could not be loaded right now. Please refresh in a moment.";
      grid.appendChild(message);
    }
  }
}
function chooseCategory(key) {
  activeCategory = VALID_CATEGORIES.has(key) ? key : "all";
  setFilterUI();
  renderGrid();
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => chooseCategory(button.dataset.filter || "all")));
  document.querySelectorAll("[data-category]").forEach((card) => card.addEventListener("click", (event) => {
    if (!allProducts.length || event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return; /* let the link work normally */
    event.preventDefault();
    chooseCategory(card.dataset.category);
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const search = document.getElementById("find-search-input");
  const clear = document.getElementById("clear-find-search");
  if (search) search.addEventListener("input", () => { searchTerm = search.value.trim().toLocaleLowerCase(); if (clear) clear.hidden = !search.value; renderGrid(); });
  if (clear && search) clear.addEventListener("click", () => { search.value = ""; searchTerm = ""; clear.hidden = true; search.focus(); renderGrid(); });
  setFilterUI();
  loadProducts();
});
