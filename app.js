// Ohhgood! app.js - v2, CMS connected, grid links to product.html?id=, no Quick Look
const CAT_LABEL = { tidy:"Tidy Space", cozy:"Cozy Ambience", ritual:"Slow Ritual", green:"Green Corner" };
const CAT_IMG = { tidy:"assets/category-tidy.webp", cozy:"assets/category-cozy.webp", ritual:"assets/category-ritual.webp", green:"assets/category-green.webp" };
let ALL = [];
let activeCat = "all";

function clean(s){ if(!s) return ""; return String(s).replace(/—/g, ",").replace(/–/g, "-").replace(/\[entity-[^\]]+\]/g, "Amazon"); }

async function loadProducts(){
  const grid = document.getElementById("product-grid");
  if(!grid) return;
  try{
    let data=null;
    for(const url of ["content/products.json","products.json"]){
      try{ const r=await fetch(url); if(r.ok){ data=await r.json(); break; } }catch(e){}
    }
    if(!data) throw new Error("no data");
    ALL = data.filter(p=>p.status!=="draft");
    renderCategories();
    renderGrid();
  }catch(e){
    grid.innerHTML = "<p>Products not found. Export products.json from CMS and upload to content/ folder.</p>";
  }
}

function renderCategories(){
  const wrap = document.getElementById("category-cards");
  if(!wrap) return;
  wrap.innerHTML = Object.keys(CAT_LABEL).map(c=>{
    const count = ALL.filter(p=>p.category===c).length;
    return `<a class="cat-card" href="#featured" data-cat="${c}"><img src="${CAT_IMG[c]}" alt="${CAT_LABEL[c]}" onerror="this.style.display='none'"><span>${CAT_LABEL[c]}</span><small>${count} finds</small></a>`;
  }).join("");
  wrap.querySelectorAll(".cat-card").forEach(el=>el.addEventListener("click",()=>{
    activeCat = el.dataset.cat; renderGrid(); setFilterUI();
  }));
}

function renderGrid(){
  const grid = document.getElementById("product-grid");
  const list = activeCat==="all" ? ALL : ALL.filter(p=>p.category===activeCat);
  if(!list.length){ grid.innerHTML="<p>No finds in this category yet.</p>"; return; }
  grid.innerHTML = list.map(p=>`
    <a class="product-card" href="product.html?id=${encodeURIComponent(p.id)}">
      <img src="${clean(p.image)}" alt="${clean(p.name)}" loading="lazy">
      <span class="product-name">${clean(p.brand)} ${clean(p.name)}</span>
      <small class="product-cat">${CAT_LABEL[p.category]||p.category}</small>
    </a>`).join("");
}

function setFilterUI(){
  document.querySelectorAll("[data-filter]").forEach(b=>{
    b.classList.toggle("active", b.dataset.filter===activeCat);
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{
    activeCat=b.dataset.filter; renderGrid(); setFilterUI();
  }));
  loadProducts();
});
