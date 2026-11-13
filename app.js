/* Ohhgood! catalog controller — data-driven, fail-closed, and CMS-safe. */
"use strict";
const CATEGORY_LABELS = Object.freeze({tidy:"Tidy Space",cozy:"Cozy Ambience",ritual:"Slow Ritual",green:"Green Corner"});
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));
let allProducts = [];
let activeCategory = "all";
let searchTerm = "";
function safeImagePath(value) {
  return typeof value === "string" && /^assets\/[a-zA-Z0-9_./% -]+$/.test(value) && !value.includes("..") ? value : "";
}
function isValidProduct(product) {
  return product && typeof product === "object" &&
    typeof product.id === "string" && /^[a-z0-9-]+$/.test(product.id) &&
    typeof product.brand === "string" && product.brand.trim() &&
    typeof product.name === "string" && product.name.trim() &&
    VALID_CATEGORIES.has(product.category) &&
    typeof product.description === "string" && safeImagePath(product.image) !== "";
}
function matchesSearch(product) {
  if (!searchTerm) return true;
  return [product.brand,product.name,product.description,...(Array.isArray(product.benefits)?product.benefits:[])]
    .join(" ").toLocaleLowerCase().includes(searchTerm);
}
function setFilterUI() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const selected = button.dataset.filter === activeCategory;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
function renderGrid() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const visible = allProducts.filter((product) =>
    (activeCategory === "all" || product.category === activeCategory) && matchesSearch(product));
  grid.replaceChildren();
  if (!visible.length) {
    const message = document.createElement("p");
    message.textContent = searchTerm ? "No finds match your search. Try another keyword." : "No finds in this category yet.";
    grid.appendChild(message);
    return;
  }
  const fragment = document.createDocumentFragment();
  visible.forEach((product) => {
    const link = document.createElement("a");
    link.className = "product-card";
    link.href = "product.html?id=" + encodeURIComponent(product.id);
    const image = document.createElement("img");
    image.src = safeImagePath(product.image);
    image.alt = product.name;
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => { image.hidden = true; }, { once: true });
    const name = document.createElement("span");
    name.className = "product-name";
    name.textContent = product.brand + " " + product.name;
    const category = document.createElement("small");
    category.className = "product-cat";
    category.textContent = CATEGORY_LABELS[product.category];
    link.append(image,name,category);
    fragment.appendChild(link);
  });
  grid.appendChild(fragment);
}
async function loadProducts() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  try {
    const response = await fetch("content/products.json",{headers:{Accept:"application/json"}});
    if (!response.ok) throw new Error("Product data request failed (" + response.status + ").");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Product data must be a JSON array.");
    const seenIds = new Set();
    allProducts = [];
    data.forEach((product,index) => {
      if (!isValidProduct(product) || seenIds.has(product.id)) {
        console.warn("Skipping invalid or duplicate product record at index",index);
        return;
      }
      seenIds.add(product.id);
      if (product.status === "published") allProducts.push(product);
    });
    renderGrid();
  } catch (error) {
    console.error("Ohhgood! could not load catalog:",error);
    grid.replaceChildren();
    const message = document.createElement("p");
    message.textContent = "Finds could not be loaded right now. Please refresh in a moment.";
    grid.appendChild(message);
  }
}
document.addEventListener("DOMContentLoaded",() => {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click",() => { activeCategory=button.dataset.filter||"all";setFilterUI();renderGrid(); });
  });
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click",() => {
      activeCategory=VALID_CATEGORIES.has(button.dataset.category)?button.dataset.category:"all";
      setFilterUI();renderGrid();
      document.getElementById("featured")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
  const search=document.getElementById("find-search-input");
  const clear=document.getElementById("clear-find-search");
  if(search) search.addEventListener("input",() => {searchTerm=search.value.trim().toLocaleLowerCase();if(clear)clear.hidden=!search.value;renderGrid();});
  if(clear&&search) clear.addEventListener("click",() => {search.value="";searchTerm="";clear.hidden=true;search.focus();renderGrid();});
  setFilterUI();
  loadProducts();
});
