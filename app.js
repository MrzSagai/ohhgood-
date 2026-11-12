// Ohhgood! - app.js - FULL VERSION - 4 Niches: Tidy / Cozy / Ritual / Green
// Tinggal timpa file app.js lama. Gak perlu edit apa-apa lagi.

const PRODUCTS_URL = 'content/products.json';
const ALLOWED_CATEGORIES = ['tidy', 'cozy', 'ritual', 'green'];

let allProducts = [];
let currentFilter = 'all';
let currentSearch = '';

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getFilteredProducts() {
  let list = allProducts.filter(p => p.status === 'published');
  if (currentFilter !== 'all') {
    list = list.filter(p => p.category === currentFilter);
  }
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    list = list.filter(p => {
      const hay = [p.brand, p.name, p.description, ...(p.benefits || [])].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  return list;
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  const list = getFilteredProducts();
  if (!list.length) {
    grid.innerHTML = '<p>No finds yet in this category.</p>';
    return;
  }
  grid.innerHTML = list.map(p => `
    <article class="product-card" data-id="${escapeHTML(p.id)}" tabindex="0" role="button" aria-label="${escapeHTML(p.brand)} ${escapeHTML(p.name)}">
      <div class="product-image-wrap"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.brand)} ${escapeHTML(p.name)}" loading="lazy" decoding="async"></div>
      <div class="product-card-footer">
        <div class="product-card-text"><span class="product-brand">${escapeHTML(p.brand)}</span><h3 class="product-title">${escapeHTML(p.name)}</h3></div>
        <span class="product-arrow" aria-hidden="true">&gt;</span>
      </div>
    </article>
  `).join('');
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => openQuickLook(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQuickLook(card.dataset.id); } });
  });
}

function openQuickLook(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  const backdrop = document.getElementById('modal-backdrop');
  const img = document.getElementById('quicklook-image');
  const brand = document.getElementById('quicklook-brand');
  const title = document.getElementById('quicklook-title');
  const desc = document.getElementById('quicklook-desc');
  const benefits = document.getElementById('quicklook-benefits');
  const cta = document.getElementById('retailer-cta');
  if (img) { img.src = p.image; img.alt = `${p.brand} ${p.name}`; }
  if (brand) brand.textContent = p.brand;
  if (title) title.textContent = p.name;
  if (desc) desc.textContent = p.description;
  if (benefits) benefits.innerHTML = (p.benefits || []).map(b => `<li>${escapeHTML(b)}</li>`).join('');
  if (cta) {
    if (p.retailer_url) {
      cta.href = p.retailer_url;
      cta.textContent = 'View at Retailer ↗';
      cta.classList.remove('is-disabled');
      cta.removeAttribute('aria-disabled');
      cta.removeAttribute('tabindex');
    } else {
      cta.textContent = 'Retailer link coming soon ↗';
      cta.classList.add('is-disabled');
    }
  }
  if (backdrop) { backdrop.hidden = false; document.body.style.overflow = 'hidden'; }
}

function closeQuickLook() {
  const backdrop = document.getElementById('modal-backdrop');
  if (backdrop) backdrop.hidden = true;
  document.body.style.overflow = '';
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-row .filter').forEach(btn => {
    const active = btn.dataset.filter === filter;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  renderProducts();
}

function initFilters() {
  document.querySelectorAll('.filter-row .filter').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.category;
      if (cat && ALLOWED_CATEGORIES.includes(cat)) {
        setFilter(cat);
        document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

function initSearch() {
  const input = document.getElementById('find-search-input');
  const clear = document.getElementById('clear-find-search');
  if (!input) return;
  input.addEventListener('input', () => {
    currentSearch = input.value.trim();
    if (clear) clear.hidden = !currentSearch;
    renderProducts();
  });
  if (clear) clear.addEventListener('click', () => { input.value = ''; currentSearch = ''; clear.hidden = true; renderProducts(); });
}

function initModal() {
  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeQuickLook);
  if (backdrop) backdrop.addEventListener('click', e => { if (e.target === backdrop) closeQuickLook(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeQuickLook(); });
}

function initHeader() {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  const themeBtn = document.querySelector('.theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const cur = html.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', next);
    themeBtn.textContent = next === 'light' ? 'Dark mode' : 'Light mode';
    themeBtn.setAttribute('aria-label', next === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
  });
  const menuBtn = document.querySelector('.menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (menuBtn && mobileNav) menuBtn.addEventListener('click', () => {
    const open = mobileNav.hidden === false;
    mobileNav.hidden = open;
    menuBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
}

async function loadProducts() {
  const grid = document.getElementById('product-grid');
  try {
    const res = await fetch(PRODUCTS_URL);
    if (!res.ok) throw new Error('Failed to load products');
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : (data.products || []);
    // Safety: only allowed categories show
    allProducts = allProducts.filter(p => ALLOWED_CATEGORIES.includes(p.category));
    renderProducts();
  } catch (err) {
    if (grid) grid.innerHTML = '<p>Unable to load products. Please refresh.</p>';
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  initSearch();
  initModal();
  initHeader();
  loadProducts();
});
