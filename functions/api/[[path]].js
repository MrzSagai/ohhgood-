const OWNER = "MrzSagai";
const REPO = "ohhgood-";
const BRANCH = "MrzSagai-Dev";
const ALLOWED_FILES = new Set(["content/products.json", "content/articles.json"]);
const SESSION_COOKIE = "ohhgood_admin";
const STATE_COOKIE = "ohhgood_oauth_state";
const SESSION_TTL = 8 * 60 * 60;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
}
function redirect(url, cookies = []) {
  const headers = new Headers({ Location: url, "Cache-Control": "no-store" });
  for (const value of cookies) headers.append("Set-Cookie", value);
  return new Response(null, { status: 302, headers });
}
function cookieValue(request, name) {
  const part = (request.headers.get("Cookie") || "").split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return part ? part.slice(name.length + 1) : "";
}
function cookie(name, value, options = {}) {
  const bits = [name + "=" + value, "Path=" + (options.path || "/"), "HttpOnly", "Secure", "SameSite=Lax"];
  if (options.maxAge !== undefined) bits.push("Max-Age=" + options.maxAge);
  return bits.join("; ");
}
function base64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function unbase64url(value) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function cryptoKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function seal(value, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(secret), new TextEncoder().encode(value));
  return base64url(new Uint8Array([...iv, ...new Uint8Array(encrypted)]));
}
async function unseal(value, secret) {
  try {
    const packed = unbase64url(value);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: packed.slice(0, 12) }, await cryptoKey(secret), packed.slice(12));
    return new TextDecoder().decode(plain);
  } catch { return ""; }
}
function allowedUsers(env) {
  return (env.ADMIN_GITHUB_USERS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
}
function githubHeaders(token) {
  return { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Ohhgood-CMS" };
}
async function appJwt(env) {
  const pem = String(env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  if (!env.GITHUB_APP_ID || !pem) throw new Error("GitHub App credentials are not configured.");
  const binary = atob(pem);
  const keyBytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const head = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const body = base64url(new TextEncoder().encode(JSON.stringify({ iat: now - 60, exp: now + 540, iss: String(env.GITHUB_APP_ID) })));
  const unsigned = head + "." + body;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return unsigned + "." + base64url(new Uint8Array(signature));
}
async function installationToken(env) {
  if (!env.GITHUB_APP_INSTALLATION_ID) throw new Error("GitHub App installation ID is not configured.");
  const jwt = await appJwt(env);
  const response = await fetch("https://api.github.com/app/installations/" + env.GITHUB_APP_INSTALLATION_ID + "/access_tokens", {
    method: "POST",
    headers: { ...githubHeaders(jwt), "content-type": "application/json" },
    body: JSON.stringify({ permissions: { contents: "write" } })
  });
  const data = await response.json();
  if (!response.ok || !data.token) throw new Error("Could not create a repository-scoped GitHub token: " + (data.message || response.status));
  return data.token;
}
async function session(request, env) {
  if (!env.SESSION_SECRET) return null;
  const raw = cookieValue(request, SESSION_COOKIE);
  if (!raw) return null;
  const decoded = await unseal(raw, env.SESSION_SECRET);
  if (!decoded) return null;
  try {
    const data = JSON.parse(decoded);
    if (!data.login || !data.exp || data.exp < Date.now()) return null;
    if (!allowedUsers(env).includes(String(data.login).toLowerCase())) return null;
    return { user: { login: data.login, avatar_url: data.avatar_url || "" } };
  } catch { return null; }
}
function validate(path, records) {
  if (!Array.isArray(records)) return "Content must be a JSON array.";
  if (path === "content/products.json") {
    const ids = new Set(), categories = new Set(["tidy", "cozy", "ritual", "green"]);
    for (const item of records) {
      if (!item || typeof item !== "object") return "Each product must be an object.";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || "") || ids.has(item.id)) return "Product IDs must be unique lowercase slugs.";
      ids.add(item.id);
      if (!item.brand || !item.name || !item.description) return "Product brand, name, and description are required.";
      if (!categories.has(item.category)) return "Invalid product category: " + item.id;
      if (!["draft", "published"].includes(item.status)) return "Invalid product status: " + item.id;
      if (item.image && (!/^assets\/[a-zA-Z0-9_./-]+$/.test(item.image) || item.image.includes(".."))) return "Product image must be a safe path under assets/.";
      if (item.status === "published" && !/^https:\/\/\S+$/i.test(item.retailer_url || "")) return "Published products require an HTTPS retailer URL: " + item.id;
      if (item.retailer_url && !/^https:\/\/\S+$/i.test(item.retailer_url)) return "Retailer URLs must use HTTPS: " + item.id;
      if (item.benefits !== undefined && !Array.isArray(item.benefits)) return "Product benefits must be a list: " + item.id;
    }
  } else {
    const slugs = new Set();
    for (const item of records) {
      if (!item || typeof item !== "object") return "Each article must be an object.";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug || "") || slugs.has(item.slug)) return "Article slugs must be unique lowercase slugs.";
      slugs.add(item.slug);
      if (!item.title) return "Article title is required: " + item.slug;
      if (!["draft", "published"].includes(item.status)) return "Invalid article status: " + item.slug;
      if (item.cover_image && !(String(item.cover_image).startsWith("https://") || (/^assets\/[a-zA-Z0-9_./-]+$/.test(item.cover_image) && !item.cover_image.includes("..")))) return "Article cover must be HTTPS or a safe assets/ path: " + item.slug;
    }
  }
  return "";
}
async function githubFile(token, path) {
  const url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path + "?ref=" + encodeURIComponent(BRANCH);
  const response = await fetch(url, { headers: githubHeaders(token) });
  if (!response.ok) throw new Error("GitHub read failed (" + response.status + ").");
  const data = await response.json();
  const binary = atob((data.content || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return { sha: data.sha, text: new TextDecoder().decode(bytes) };
}
async function api(request, env, path) {
  if (request.method === "PUT" && request.headers.get("Origin") !== new URL(request.url).origin) return json({ error: "Cross-origin write rejected." }, 403);
  const auth = await session(request, env);
  if (!auth) return json({ error: "Unauthorized. Sign in with the approved GitHub account." }, 401, { "set-cookie": cookie(SESSION_COOKIE, "", { maxAge: 0 }) });
  if (!ALLOWED_FILES.has(path)) return json({ error: "File is not editable." }, 404);
  const token = await installationToken(env);
  const url = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path + "?ref=" + encodeURIComponent(BRANCH);
  if (request.method === "GET") {
    const file = await githubFile(token, path);
    return json({ path, sha: file.sha, data: JSON.parse(file.text), branch: BRANCH, user: auth.user });
  }
  if (request.method !== "PUT") return json({ error: "Method not allowed." }, 405, { Allow: "GET, PUT" });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.data) || typeof body.sha !== "string") return json({ error: "Invalid request body." }, 400);
  const problem = validate(path, body.data);
  if (problem) return json({ error: problem }, 422);
  const current = await githubFile(token, path);
  if (current.sha !== body.sha) return json({ error: "This file changed on GitHub since it was opened. Reload before saving." }, 409);
  const content = JSON.stringify(body.data, null, 2) + "\n";
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const response = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({ message: "CMS: update " + path.split("/").pop(), content: btoa(binary), sha: current.sha, branch: BRANCH })
  });
  const result = await response.json();
  if (!response.ok) return json({ error: result.message || "GitHub could not save this file." }, response.status);
  return json({ ok: true, commit: result.commit && result.commit.sha, content_sha: result.content && result.content.sha });
}
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url), path = url.pathname;
  if (path === "/api/auth/login" && request.method === "GET") {
    if (!env.GITHUB_APP_CLIENT_ID || !env.GITHUB_APP_CLIENT_SECRET || !env.SESSION_SECRET || !env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY || !env.GITHUB_APP_INSTALLATION_ID || !allowedUsers(env).length) {
      return json({ error: "CMS auth is not configured. Add the GitHub App and Cloudflare secrets listed in CMS_ADMIN_SETUP.md." }, 503);
    }
    const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
    const callback = new URL("/api/auth/callback", url.origin).toString();
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", env.GITHUB_APP_CLIENT_ID);
    authorize.searchParams.set("redirect_uri", callback);
    authorize.searchParams.set("scope", "read:user");
    authorize.searchParams.set("state", state);
    return redirect(authorize.toString(), [cookie(STATE_COOKIE, state, { path: "/api/auth/callback", maxAge: 600 })]);
  }
  if (path === "/api/auth/callback" && request.method === "GET") {
    const state = url.searchParams.get("state") || "";
    const clearState = cookie(STATE_COOKIE, "", { path: "/api/auth/callback", maxAge: 0 });
    if (!state || state !== cookieValue(request, STATE_COOKIE) || url.searchParams.has("error")) return redirect(new URL("/admin/?auth=failed", url.origin).toString(), [clearState]);
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ client_id: env.GITHUB_APP_CLIENT_ID, client_secret: env.GITHUB_APP_CLIENT_SECRET, code: url.searchParams.get("code"), redirect_uri: new URL("/api/auth/callback", url.origin).toString(), state })
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) return redirect(new URL("/admin/?auth=failed", url.origin).toString(), [clearState]);
    const userResponse = await fetch("https://api.github.com/user", { headers: githubHeaders(tokenData.access_token) });
    const user = userResponse.ok ? await userResponse.json() : {};
    if (!allowedUsers(env).includes(String(user.login || "").toLowerCase())) return redirect(new URL("/admin/?auth=denied", url.origin).toString(), [clearState]);
    const value = await seal(JSON.stringify({ login: user.login, avatar_url: user.avatar_url || "", exp: Date.now() + SESSION_TTL * 1000 }), env.SESSION_SECRET);
    return redirect(new URL("/admin/", url.origin).toString(), [cookie(SESSION_COOKIE, value, { maxAge: SESSION_TTL }), clearState]);
  }
  if (path === "/api/auth/logout" && request.method === "POST") {
    if (request.headers.get("Origin") !== url.origin) return json({ error: "Cross-origin logout rejected." }, 403);
    return json({ ok: true }, 200, { "set-cookie": cookie(SESSION_COOKIE, "", { maxAge: 0 }) });
  }
  if (path === "/api/session" && request.method === "GET") {
    const auth = await session(request, env);
    return auth ? json({ authenticated: true, user: auth.user, branch: BRANCH }) : json({ authenticated: false }, 401);
  }
  if (path === "/api/content/products" || path === "/api/content/articles") {
    const file = path.endsWith("products") ? "content/products.json" : "content/articles.json";
    try { return await api(request, env, file); }
    catch (error) { return json({ error: error.message || "Unexpected server error." }, 500); }
  }
  return json({ error: "Not found." }, 404);
}
