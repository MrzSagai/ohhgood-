(() => {
  const $ = (selector) => document.querySelector(selector);
  const state = { products: [], articles: [], productSha: "", articleSha: "", user: null, editing: null };
  const categories = [["tidy","Tidy Space"],["cozy","Cozy Ambience"],["ritual","Slow Ritual"],["green","Green Corner"]];
  const today = new Intl.DateTimeFormat("en", { weekday:"long", month:"short", day:"numeric", year:"numeric" }).format(new Date());
  $("#today").textContent = today;
  function toast(message, error = false) {
    const node = $("#toast"); node.textContent = message; node.style.background = error ? "#a94f4f" : "#252938";
    node.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 3200);
  }
  async function request(url, options = {}) {
    const response = await fetch(url, { credentials:"same-origin", ...options, headers:{ "content-type":"application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed (" + response.status + ").");
    return data;
  }
  function showLogin(message = "") {
    $("#app").hidden = true; $("#login-screen").hidden = false;
    if (message) $("#login-error").textContent = message;
  }
  async function init() {
    try {
      const auth = await request("/api/session");
      state.user = auth.user;
      $("#user-login").textContent = auth.user.login;
      $("#user-avatar").src = auth.user.avatar_url || "";
      const [products, articles] = await Promise.all([request("/api/content/products"), request("/api/content/articles")]);
      state.products = products.data; state.productSha = products.sha;
      state.articles = articles.data; state.articleSha = articles.sha;
      $("#app").hidden = false; $("#login-screen").hidden = true;
      render();
    } catch (error) {
      const params = new URLSearchParams(location.search);
      const message = params.has("auth") ? (params.get("auth") === "denied" ? "This GitHub account is not on the admin allowlist." : "GitHub sign-in did not complete. Please try again.") : "";
      showLogin(message);
      if (error.message && error.message !== "Unauthorized. Sign in with the approved GitHub account.") $("#login-error").textContent = error.message;
    }
  }
  function esc(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
  function imageUrl(path) {
    const value = String(path || "").trim();
    if (!value) return "";
    if (/^(?:https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("/")) return value;
    return "/" + value.replace(/^\.\//, "");
  }
  function statusTag(status) { return '<span class="status ' + (status === "published" ? "published" : "draft") + '">' + esc(status || "draft") + '</span>'; }
  function render() {
    const published = state.products.filter(p => p.status === "published").length;
    const drafts = state.products.filter(p => p.status !== "published").length + state.articles.filter(a => a.status !== "published").length;
    $("#stat-products").textContent = state.products.length;
    $("#stat-published").textContent = published;
    $("#stat-articles").textContent = state.articles.length;
    $("#stat-drafts").textContent = drafts;
    $("#nav-products").textContent = state.products.length;
    $("#nav-articles").textContent = state.articles.length;
    $("#recent-products").innerHTML = state.products.slice(0,5).map(p => '<div class="recent-row"><img class="recent-thumb" src="' + esc(imageUrl(p.image)) + '" alt=""><div class="recent-info"><strong>' + esc(p.name) + '</strong><small>' + esc(p.brand) + ' · ' + esc(p.category) + '</small></div>' + statusTag(p.status) + '</div>').join("") || '<p class="muted">No products yet.</p>';
    const missingImages = state.products.filter(p => !p.image).length;
    const noLinks = state.products.filter(p => p.status === "published" && !p.retailer_url).length;
    $("#health-list").innerHTML = [
      ["Published products", published + " / " + state.products.length, "good"],
      ["Draft content", String(drafts), drafts ? "attention" : "good"],
      ["Products missing image", String(missingImages), missingImages ? "attention" : "good"],
      ["Published products missing link", String(noLinks), noLinks ? "attention" : "good"]
    ].map(row => '<div class="health-row"><span>' + row[0] + '</span><span class="' + row[2] + '">' + row[1] + '</span></div>').join("");
    renderProducts(); renderArticles();
  }
  function renderProducts() {
    const query = $("#product-search").value.toLowerCase(), filter = $("#product-filter").value;
    const items = state.products.filter(p => (filter === "all" || p.status === filter) && [p.name,p.brand,p.id,p.category].join(" ").toLowerCase().includes(query));
    $("#product-count").textContent = items.length + " items";
    $("#products-table").innerHTML = items.map(p => '<tr><td><div class="product-cell"><img src="' + esc(imageUrl(p.image)) + '" alt=""><div><strong>' + esc(p.name) + '</strong><div class="muted">' + esc(p.brand) + '</div></div></div></td><td>' + esc(p.category) + '</td><td>' + statusTag(p.status) + '</td><td>' + (p.retailer_url ? '<a href="' + esc(p.retailer_url) + '" target="_blank" rel="noopener noreferrer">Open link ↗</a>' : '—') + '</td><td><button class="row-action" data-edit-product="' + esc(p.id) + '">Edit</button></td></tr>').join("") || '<tr><td colspan="5" class="empty-row">No products match this search.</td></tr>';
  }
  function renderArticles() {
    const query = $("#article-search").value.toLowerCase(), filter = $("#article-filter").value;
    const items = state.articles.filter(a => (filter === "all" || a.status === filter) && [a.title,a.slug,a.summary].join(" ").toLowerCase().includes(query));
    $("#article-count").textContent = items.length + " stories";
    $("#articles-table").innerHTML = items.map(a => '<tr><td><strong>' + esc(a.title) + '</strong><div class="muted">' + esc((a.summary || "").slice(0,90)) + '</div></td><td>' + esc(a.slug) + '</td><td>' + statusTag(a.status) + '</td><td><span class="muted">Saved to branch</span></td><td><button class="row-action" data-edit-article="' + esc(a.slug) + '">Edit</button></td></tr>').join("") || '<tr><td colspan="5" class="empty-row">No stories match this search.</td></tr>';
  }
  function field(name, label, value, type = "text", full = false, hint = "") {
    const input = type === "textarea" ? '<textarea name="' + name + '">' + esc(value || "") + '</textarea>' : '<input name="' + name + '" type="' + type + '" value="' + esc(value || "") + '">';
    return '<div class="field ' + (full ? "full-field" : "") + '"><label>' + label + '</label>' + input + (hint ? '<span class="hint">' + hint + '</span>' : "") + '</div>';
  }
  function selectField(name, label, value, options) {
    return '<div class="field"><label>' + label + '</label><select name="' + name + '">' + options.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === value ? " selected" : "") + '>' + esc(o[1]) + '</option>').join("") + '</select></div>';
  }
  function openEditor(type, item) {
    state.editing = { type, id: item ? (type === "product" ? item.id : item.slug) : null };
    $("#editor-kicker").textContent = type === "product" ? "CATALOG MANAGEMENT" : "EDITORIAL WORKSPACE";
    $("#editor-title").textContent = (item ? "Edit " : "Add ") + (type === "product" ? "product" : "article");
    let html = "";
    if (type === "product") {
      const p = item || { id:"",brand:"",name:"",category:"tidy",description:"",benefits:[],image:"",status:"draft",retailer_url:"" };
      html += field("id","Stable ID",p.id,"text",false,"Lowercase letters, numbers and hyphens.");
      html += field("brand","Brand",p.brand);
      html += field("name","Product name",p.name,"text",true);
      html += selectField("category","Category",p.category,categories);
      html += field("description","Short description",p.description,"textarea",true);
      html += field("benefits","Benefits (one per line)",(p.benefits || []).join("\n"),"textarea",true);
      html += field("image","Image path",p.image,"text",true,"Use a path under assets/, e.g. assets/item.webp.");
      html += field("retailer_url","Retailer URL",p.retailer_url,"url",true,"Published products require a verified HTTPS destination.");
      html += selectField("status","Status",p.status,[["draft","Draft"],["published","Published"]]);
    } else {
      const a = item || { slug:"",title:"",summary:"",cover_image:"",body:"",status:"draft" };
      html += field("slug","URL slug",a.slug,"text",false,"Lowercase words separated by hyphens.");
      html += field("title","Article title",a.title,"text",true);
      html += field("summary","Summary",a.summary,"textarea",true);
      html += field("cover_image","Cover image URL or assets/ path",a.cover_image,"text",true);
      html += field("body","Article body",a.body,"textarea",true,"Plain text or supported HTML from the existing editorial workflow.");
      html += selectField("status","Status",a.status,[["draft","Draft"],["published","Published"]]);
    }
    $("#editor-fields").innerHTML = html;
    $("#editor").showModal();
  }
  function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
  async function saveEditor(event) {
    event.preventDefault();
    const { type, id } = state.editing;
    const form = formObject(event.currentTarget);
    const collection = type === "product" ? state.products : state.articles;
    const key = type === "product" ? "id" : "slug";
    if (id && form[key] !== id && collection.some(x => x[key] === form[key])) return toast("That ID or slug already exists.", true);
    if (!id && collection.some(x => x[key] === form[key])) return toast("That ID or slug already exists.", true);
    const item = type === "product" ? { ...form, benefits:form.benefits.split("\n").map(x => x.trim()).filter(Boolean) } : form;
    const next = id ? collection.map(x => x[key] === id ? item : x) : [...collection, item];
    const path = type === "product" ? "/api/content/products" : "/api/content/articles";
    const sha = type === "product" ? state.productSha : state.articleSha;
    const button = $("#save-editor"); button.disabled = true; button.textContent = "Saving…";
    try {
      const result = await request(path, { method:"PUT", body:JSON.stringify({ data:next, sha }) });
      if (type === "product") { state.products = next; state.productSha = result.content_sha; }
      else { state.articles = next; state.articleSha = result.content_sha; }
      $("#editor").close(); render(); toast("Saved to main · " + (result.commit || "").slice(0,7));
    } catch (error) { toast(error.message, true); }
    finally { button.disabled = false; button.textContent = "Save changes"; }
  }
  function navigate(view) {
    document.querySelectorAll(".view").forEach(el => el.hidden = el.id !== "view-" + view);
    document.querySelectorAll(".nav-item[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view));
    $("#page-title").textContent = view === "overview" ? "Overview" : view === "products" ? "Products" : "Journal";
  }
  document.querySelectorAll(".nav-item[data-view]").forEach(el => el.addEventListener("click", () => navigate(el.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => navigate(el.dataset.go)));
  $("#add-product").addEventListener("click", () => openEditor("product"));
  $("#add-article").addEventListener("click", () => openEditor("article"));
  $("#product-search").addEventListener("input", renderProducts); $("#product-filter").addEventListener("change", renderProducts);
  $("#article-search").addEventListener("input", renderArticles); $("#article-filter").addEventListener("change", renderArticles);
  $("#products-table").addEventListener("click", e => { const button = e.target.closest("[data-edit-product]"); if (button) openEditor("product", state.products.find(p => p.id === button.dataset.editProduct)); });
  $("#articles-table").addEventListener("click", e => { const button = e.target.closest("[data-edit-article]"); if (button) openEditor("article", state.articles.find(a => a.slug === button.dataset.editArticle)); });
  $("#editor-form").addEventListener("submit", saveEditor);
  $("#close-editor").addEventListener("click", () => $("#editor").close());
  $("#cancel-editor").addEventListener("click", () => $("#editor").close());
  $("#logout").addEventListener("click", async () => { await fetch("/api/auth/logout",{method:"POST"}); location.reload(); });
  init();
})();