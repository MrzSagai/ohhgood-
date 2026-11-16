(() => {
  const $ = (selector) => document.querySelector(selector);
  const state = { products: [], articles: [], productSha: "", articleSha: "", user: null, editing: null, branch: "" };
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
      state.branch = auth.branch || "";
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
      html += field("brand","Brand (leave blank if unknown)",p.brand);
      html += field("name","Product name",p.name,"text",true);
      html += selectField("category","Category",p.category,categories);
      html += field("description","Short description",p.description,"textarea",true);
      html += field("benefits","Benefits (one per line)",(p.benefits || []).join("\n"),"textarea",true);
      const lines = value => Array.isArray(value) ? value.join("\n") : (value || "");
      html += field("who_for","Who it may suit (one per line, optional)",lines(p.who_for),"textarea",true,"Shown on the product page. Write only what you can stand behind.");
      html += field("who_skip","Who may want to skip it (one per line, optional)",lines(p.who_skip),"textarea",true);
      html += field("check_before","What to check before buying (one per line, optional)",lines(p.check_before),"textarea",true);
      html += field("how_to","How to use it (one per line, optional)",lines(p.how_to),"textarea",true);
      html += '<div class="field full-field image-upload-field"><label>Product image</label><div class="image-upload-preview">' + (p.image ? '<img id="product-image-preview" src="' + esc(imageUrl(p.image)) + '" alt="Current product image">' : '<div id="product-image-preview" class="image-placeholder">No image selected</div>') + '</div><div class="image-upload-actions"><label class="button subtle upload-button" for="product-image-file">＋ Upload new image</label><input id="product-image-file" type="file" accept="image/jpeg,image/png,image/webp" hidden><button type="button" id="browse-assets" class="button subtle">Choose from assets</button><span id="image-upload-status" class="hint">' + (p.image ? esc(p.image) : 'Select an existing asset or upload a new image.') + '</span></div><div id="asset-library" class="asset-library" hidden><input id="asset-search" type="search" placeholder="Search image filename…"><select id="asset-select" size="7" aria-label="Choose an existing image"></select><div class="asset-library-actions"><span id="asset-count" class="hint"></span><button type="button" id="use-asset" class="button primary" disabled>Use selected image</button></div></div><input name="image" type="hidden" value="' + esc(p.image || '') + '"><span class="hint">Choose an image already stored in assets/ to swap products without uploading it again.</span></div>';
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

  async function optimizeImage(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d", { alpha:false });
      context.fillStyle = "#f5f1e9";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", 0.86));
      if (!blob) throw new Error("Browser could not optimize this image.");
      return blob;
    } finally { URL.revokeObjectURL(objectUrl); }
  }
  async function uploadProductImage(file) {
    const idInput = $('#editor-fields [name="id"]');
    const id = idInput ? idInput.value.trim() : "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Enter a valid product ID before uploading its image.");
    const status = $("#image-upload-status");
    const choose = $("#product-image-file");
    status.textContent = "Optimizing image…";
    choose.disabled = true;
    try {
      const blob = await optimizeImage(file);
      const form = new FormData();
      form.append("product_id", id);
      form.append("file", blob, id + ".webp");
      status.textContent = "Uploading to GitHub…";
      const response = await fetch("/api/media", { method:"POST", credentials:"same-origin", body:form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Image upload failed.");
      const hidden = $('#editor-fields [name="image"]');
      hidden.value = result.image;
      const preview = $("#product-image-preview");
      if (preview) {
        if (preview.tagName === "IMG") preview.src = URL.createObjectURL(blob);
        else {
          const img = document.createElement("img");
          img.id = "product-image-preview";
          img.alt = "New product image preview";
          img.src = URL.createObjectURL(blob);
          preview.replaceWith(img);
        }
      }
      status.textContent = result.image + " · uploaded";
      toast("Image uploaded · " + (result.commit || "").slice(0,7));
    } finally { choose.disabled = false; }
  }

  let assetLibrary = [];
  async function loadAssetLibrary() {
    const panel = $("#asset-library"), select = $("#asset-select"), search = $("#asset-search"), count = $("#asset-count"), use = $("#use-asset");
    panel.hidden = false;
    count.textContent = "Loading assets…";
    use.disabled = true;
    try {
      if (!assetLibrary.length) {
        const response = await fetch("/api/media/assets", { credentials:"same-origin" });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Could not load assets.");
        assetLibrary = result.images || [];
      }
      const renderOptions = () => {
        const query = search.value.trim().toLowerCase(), current = select.value;
        const matches = assetLibrary.filter(item => item.name.toLowerCase().includes(query));
        select.innerHTML = matches.map(item => '<option value="' + esc(item.path) + '">' + esc(item.name) + '</option>').join("");
        if (matches.some(item => item.path === current)) select.value = current;
        count.textContent = matches.length + " of " + assetLibrary.length + " images";
        use.disabled = !select.value;
      };
      search.oninput = renderOptions;
      select.onchange = () => { use.disabled = !select.value; };
      renderOptions();
      if (!assetLibrary.length) count.textContent = "No image files found in assets/.";
    } catch (error) { count.textContent = error.message; toast(error.message, true); }
  }
  function useSelectedAsset() {
    const select = $("#asset-select");
    if (!select.value) return;
    const path = select.value, hidden = $('#editor-fields [name="image"]');
    hidden.value = path;
    const preview = $("#product-image-preview");
    if (preview) {
      if (preview.tagName === "IMG") preview.src = imageUrl(path);
      else {
        const img = document.createElement("img");
        img.id = "product-image-preview";
        img.alt = "Selected product image";
        img.src = imageUrl(path);
        preview.replaceWith(img);
      }
    }
    $("#image-upload-status").textContent = path + " · selected from assets";
    $("#asset-library").hidden = true;
    toast("Image selected · remember to save changes");
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
    const existing = id ? (collection.find(x => x[key] === id) || {}) : {};
    const toLines = value => String(value || "").split("\n").map(x => x.trim()).filter(Boolean);
    let item;
    if (type === "product") {
      /* Merge onto the stored record so fields this form does not show (thumb, faq, ...) are never lost. */
      item = { ...existing, ...form, benefits:toLines(form.benefits) };
      for (const name of ["who_for","who_skip","check_before","how_to"]) {
        const items = toLines(form[name]);
        if (items.length) item[name] = items; else delete item[name];
      }
      if (existing.image && form.image !== existing.image) delete item.thumb;
    } else {
      item = { ...existing, ...form };
    }
    const next = id ? collection.map(x => x[key] === id ? item : x) : [...collection, item];
    const path = type === "product" ? "/api/content/products" : "/api/content/articles";
    const sha = type === "product" ? state.productSha : state.articleSha;
    const button = $("#save-editor"); button.disabled = true; button.textContent = "Saving…";
    try {
      const result = await request(path, { method:"PUT", body:JSON.stringify({ data:next, sha }) });
      if (type === "product") { state.products = next; state.productSha = result.content_sha; }
      else { state.articles = next; state.articleSha = result.content_sha; }
      $("#editor").close(); render(); toast("Saved to " + (state.branch || "GitHub") + " · " + (result.commit || "").slice(0,7));
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
  $("#editor-fields").addEventListener("change", async event => { if (event.target.id === "product-image-file" && event.target.files[0]) { try { await uploadProductImage(event.target.files[0]); } catch (error) { $("#image-upload-status").textContent = error.message; toast(error.message, true); } } });
  $("#editor-fields").addEventListener("click", event => {
    if (event.target.id === "browse-assets") loadAssetLibrary();
    if (event.target.id === "use-asset") useSelectedAsset();
  });
  $("#close-editor").addEventListener("click", () => $("#editor").close());
  $("#cancel-editor").addEventListener("click", () => $("#editor").close());
  $("#logout").addEventListener("click", async () => { await fetch("/api/auth/logout",{method:"POST"}); location.reload(); });
  init();
})();