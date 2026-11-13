// Ohhgood! - app.js - FIX: Product Page, bukan Quick Look
// Grid compact: gambar + black bar nama doang. Klik -> finds/*.html

const PRODUCTS_URL = 'content/products.json';
const ALLOWED_CATEGORIES = ['tidy', 'cozy', 'ritual', 'green'];

let allProducts = [];
let currentFilter = 'all';
let currentSearch = '';

function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Mapping id di products.json -> slug file di finds/
const PRODUCT_URLS = {
  'yecaye-cable-tray-l-clamp': 'finds/yecaye-under-desk-cable-tray-l-clamp.html',
  'joyroom-cable-organizer': 'finds/joyroom-magnetic-cable-organizer-9-pack.html',
  'lamicall-phone-stand': 'finds/lamicall-adjustable-cell-phone-stand.html',
  '【entity-oxo¦canonical_name=OXO】-laptop-cleaner': 'finds/【entity-oxo¦canonical_name=OXO】-sweep-swipe-laptop-cleaner.html',
  'bagsmart-electronics-organizer': 'finds/bagsmart-electronics-organizer-travel-case.html',
  'yecaye-cable-tray-all-metal': 'finds/yecaye-under-desk-cable-tray-all-metal-clamp-mount.html',
  's-and-c-living-bamboo-dividers': 'finds/s-and-c-living-bamboo-drawer-dividers-4-pack.html',
  'homeify-under-desk-drawer': 'finds/homeify-under-desk-drawer-organizer-2-drawer.html',
  'dawntrees-felt-desk-mat': 'finds/dawntrees-large-felt-desk-mat-40x16.html',
  'weenson-dual-monitor-stand': 'finds/weenson-dual-monitor-stand-white-bamboo.html',
  'rocdeer-bamboo-monitor-shelf': 'finds/rocdeer-bamboo-dual-monitor-shelf.html',
  'mind-design-purpose-planner': 'finds/mind-design-purpose-planner-walnut-holder.html',
  'nuvograin-laptop-stand': 'finds/nuvograin-adjustable-vertical-laptop-stand-walnut.html',
  'maxgear-mesh-3pack': 'finds/maxgear-mesh-pen-holder-3-pack.html',
  'benq-screenbar-halo': 'finds/benq-screenbar-halo-monitor-light.html',
  // Produk baru - belum ada finds/*.html nya, sementara fallback ke #featured
  // Nanti kalo udah dibuatin finds-nya, tambahin di sini
  'amber-sandalwood-candle': 'finds/amber-sandalwood-candle.html',
  'candle-warmer-lamp': 'finds/candle-warmer-lamp.html',
  'linen-journal-a5': 'finds/linen-journal-a5.html',
  'herbal-tea-ritual-set': 'finds/herbal-tea-ritual-set.html',
  'omysa-midcentury-planter': 'finds/omysa-midcentury-planter.html',
  'ceramic-planter-stand-set': 'finds/ceramic-planter-stand-set.html',
  'monstera-starter-plant': 'finds/monstera-starter-plant.html',
};

function getProductUrl(p) {
  return PRODUCT_URLS[p.id] || '#featured';
}

function getFilteredProducts() {
  let list = allProducts.filter(p => p.status === 'published');
  if (currentFilter !== 'all') list = list.filter(p => p.category === currentFilter);
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    list = list.filter(p => [p.brand, p.name, p.description, ...(p.benefits || [])].join(' ').toLowerCase().includes(q));
  }
  return list;
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  const list = getFilteredProducts();
  if (!list.length) { grid.innerHTML = '<p>No finds yet in this category.</p>'; return; }
  // SAMA KAYAK SCREENSHOT: gambar + black bar nama doang, tapi ini <a> ke Product Page, BUKAN Quick Look
  grid.innerHTML = list.map(p => `
    <a class="product-card" href="${getProductUrl(p)}" aria-label="${escapeHTML(p.brand)} ${escapeHTML(p.name)}">
      <div class="product-image-wrap"><img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.brand)} ${escapeHTML(p.name)}" loading="lazy" decoding="async"></div>
      <div class="product-card-footer"><h3 class="product-title">${escapeHTML(p.name)}</h3></div>
    </a>
  `).join('');
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
  input.addEventListener('input', () => { currentSearch = input.value.trim(); if (clear) clear.hidden = !currentSearch; renderProducts(); });
  if (clear) clear.addEventListener('click', () => { input.value = ''; currentSearch = ''; clear.hidden = true; renderProducts(); });
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
  initHeader();
  loadProducts();
});