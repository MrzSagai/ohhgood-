#!/usr/bin/env python3
"""Ohhgood! static QA. Run locally (`python3 scripts/qa.py`) or in CI. Exit code 1 on any ERROR.

Checks content/schema, assets, internal links, SEO basics, redirects, headers/CSP sync and size budgets.
It replaces the old inline workflow script, whose link check only inspected the last link of each page.
"""
from __future__ import annotations
import json, os, re, subprocess, sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
errors: list[str] = []
warnings: list[str] = []
err = errors.append
warn = warnings.append
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
CATS = {"tidy", "cozy", "ritual", "green"}
CAT_SLUGS = {"tidy-space", "cozy-ambience", "slow-ritual", "green-corner"}
TAG = "ohhgood0c-20"
PAGES = ["index.html", "privacy.html", "standards.html", "contact.html"]
STATIC_ROUTES = {"/": "index.html", "/privacy": "privacy.html", "/standards": "standards.html", "/contact": "contact.html"}


def load(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        err(f"{path}: invalid JSON ({exc})")
        return []


products, articles, categories = load("content/products.json"), load("content/articles.json"), load("content/categories.json")
product_ids = {p.get("id") for p in products}
published_articles = {a.get("slug") for a in articles if a.get("status") == "published"}

# ---------- content ----------
seen = set()
for p in products:
    pid = p.get("id", "?")
    if not SLUG.match(pid or ""): err(f"product {pid}: invalid id")
    if pid in seen: err(f"product {pid}: duplicate id")
    seen.add(pid)
    if p.get("category") not in CATS: err(f"product {pid}: invalid category")
    if not str(p.get("name", "")).strip(): err(f"product {pid}: missing name")
    if p.get("status") not in ("draft", "published"): err(f"product {pid}: invalid status")
    if not isinstance(p.get("benefits"), list): err(f"product {pid}: benefits must be a list")
    if re.search(r"\s,", p.get("name", "")): warn(f"product {pid}: stray space before comma in name")
    if re.search(r"brand not specified", p.get("brand", ""), re.I): warn(f"product {pid}: placeholder brand text; leave brand blank instead")
    for field in ("image", "thumb"):
        v = p.get(field)
        if v and not os.path.isfile(unquote(v)): err(f"product {pid}: {field} file missing ({v})")
    url = p.get("retailer_url", "")
    if p.get("status") == "published":
        u = urlsplit(url)
        if u.scheme != "https" or not u.hostname: err(f"product {pid}: published product needs an https retailer_url")
        elif re.search(r"(^|\.)amazon\.com$", u.hostname) and parse_qs(u.query).get("tag") != [TAG]:
            err(f"product {pid}: Amazon link must carry tag={TAG}")
    img = p.get("image", "")
    if img.endswith(".svg"): warn(f"product {pid}: concept SVG image still in use")
for a in articles:
    slug = a.get("slug", "?")
    if not SLUG.match(slug or ""): err(f"article {slug}: invalid slug")
    if not str(a.get("title", "")).strip(): err(f"article {slug}: missing title")
    if a.get("status") not in ("draft", "published"): err(f"article {slug}: invalid status")
    for rid in a.get("related_products", []) or []:
        if rid not in product_ids: err(f"article {slug}: related product '{rid}' does not exist")
    cover = a.get("cover_image", "")
    if cover and not cover.startswith("https://") and not os.path.isfile(unquote(cover.lstrip("/"))): err(f"article {slug}: cover file missing")
if len({a.get("slug") for a in articles}) != len(articles): err("duplicate article slugs")
cat_keys = {c.get("key") for c in categories}
if cat_keys != CATS: err(f"content/categories.json must define exactly {sorted(CATS)}")

# ---------- HTML pages ----------
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs, self.ids, self.h1, self.meta, self.canonical, self.title, self._t = [], set(), 0, {}, "", "", False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a: self.ids.add(a["id"])
        if tag == "h1": self.h1 += 1
        if tag == "title": self._t = True
        if tag == "meta" and a.get("name"): self.meta[a["name"]] = a.get("content", "")
        if tag == "link" and a.get("rel") == "canonical": self.canonical = a.get("href", "")
        if tag in ("a", "link", "script", "img", "source"):
            for k in ("href", "src"):
                if a.get(k): self.refs.append((tag, a[k]))
    def handle_endtag(self, tag):
        if tag == "title": self._t = False
    def handle_data(self, data):
        if self._t: self.title += data

def route_ok(path: str) -> bool:
    if path in STATIC_ROUTES or path in ("/journal", "/sitemap.xml"): return True
    if path.startswith("/product/"): return path.split("/")[2] in product_ids
    if path.startswith("/journal/"): return path.split("/")[2] in published_articles
    if path.startswith("/category/"): return path.split("/")[2] in CAT_SLUGS
    if path == "/#featured": return True
    return False

parsed = {}
for name in PAGES:
    if not os.path.isfile(name): err(f"{name}: missing"); continue
    text = Path(name).read_text(encoding="utf-8")
    if not text.lstrip().lower().startswith("<!doctype html"): err(f"{name}: missing <!doctype html> (quirks mode)")
    p = Page(); p.feed(text); parsed[name] = p
    if not p.title.strip(): err(f"{name}: empty <title>")
    elif len(p.title.strip()) > 70: warn(f"{name}: title is {len(p.title.strip())} chars (search results cut off near 60)")
    if not p.meta.get("description"): err(f"{name}: missing meta description")
    if p.h1 != 1 and name != "index.html": warn(f"{name}: expected exactly one <h1>, found {p.h1}")
    if not p.canonical.startswith("https://ohhgood.store/"): err(f"{name}: missing/invalid canonical")
    if "noindex" in p.meta.get("robots", ""): err(f"{name}: unexpected noindex")
    for tag, ref in p.refs:
        if ref.startswith(("http:", "https:", "mailto:", "data:", "javascript:")): continue
        path, _, frag = ref.partition("#")
        path = path.split("?")[0]
        if not path and frag:
            if frag not in p.ids: err(f"{name}: broken in-page anchor #{frag}")
            continue
        full = ("/" + frag if False else path)
        if path.startswith("/"):
            if os.path.isfile(unquote(path.lstrip("/"))) or route_ok(path): continue
            if path in ("/api/auth/login",): continue
            err(f"{name}: broken link {ref}")
        else:
            err(f"{name}: relative link {ref} (use absolute paths)")
idx = Path("index.html").read_text(encoding="utf-8")
for marker in ("SSR:GRID", "SSR:ALL", "SSR:JOURNAL"):
    if f"<!--{marker}-->" not in idx or f"<!--/{marker}-->" not in idx: err(f"index.html: marker {marker} missing")
if "As an Amazon Associate I earn from qualifying purchases." not in idx: err("index.html: Amazon Associate disclosure missing")
for name in PAGES:
    t = Path(name).read_text(encoding="utf-8")
    if "As an Amazon Associate" in t and "As an Amazon Associate I earn from qualifying purchases." not in t: err(f"{name}: non-standard Associate wording")
for tgt in ("featured", "categories", "journal", "about", "product-grid", "mobile-nav"):
    if tgt not in parsed["index.html"].ids: err(f"index.html: id '{tgt}' missing")

# ---------- CSS / JS asset references ----------
css = Path("styles.css").read_text(encoding="utf-8")
for u in re.findall(r"url\(([^)]+)\)", css):
    u = u.strip().strip("\"'")
    if u.startswith(("data:", "http:", "https:", "#")): continue
    if not os.path.isfile(unquote(u.split("?")[0])): err(f"styles.css: missing asset {u}")
for js in ("app.js", "site.js", "theme.js", "pinterest-init.js", "pinterest-tag.js"):
    r = subprocess.run(["node", "--check", js], capture_output=True, text=True)
    if r.returncode: err(f"{js}: {r.stderr.strip()[:200]}")
for f in sorted(Path("functions").rglob("*.js")) + [Path("admin/admin.js")]:
    r = subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)
    if r.returncode: err(f"{f}: syntax error {r.stderr.strip()[:200]}")

# ---------- headers / CSP sync ----------
site_js = Path("functions/_lib/site.js").read_text(encoding="utf-8")
m = re.search(r'export const CSP = "([^"]+)"', site_js)
headers = Path("_headers").read_text(encoding="utf-8")
if not m or f"Content-Security-Policy: {m.group(1)}" not in headers: err("_headers: Content-Security-Policy differs from functions/_lib/site.js (keep them identical)")
if m and "https://s.pinimg.com" not in m.group(1): err("CSP: Pinterest script host s.pinimg.com is missing")
if m and "https://ct.pinterest.com" not in m.group(1): err("CSP: Pinterest pixel host ct.pinterest.com is missing")
if "2613721244798" not in site_js or "/pinterest-init.js" not in site_js or "/pinterest-tag.js" not in site_js: err("Functions layout: Pinterest Tag base, ID, or outbound tracking script is missing")
if not Path("pinterest-init.js").is_file() or not Path("pinterest-tag.js").is_file(): err("Pinterest Tag script files are missing")
for f in PAGES:
    page = Path(f).read_text(encoding="utf-8")
    if 'name="p:domain_verify" content="cc3f590b77ddd998c2fb596f820938d6"' not in page: err(f"{f}: Pinterest domain verification meta is missing")
    if 'src="/pinterest-init.js"' not in page or 'src="/pinterest-tag.js"' not in page: err(f"{f}: Pinterest Tag scripts are missing")
if "2613721244798" not in Path("privacy.html").read_text(encoding="utf-8"): err("privacy.html: Pinterest Tag disclosure is missing")
for token in ("X-Content-Type-Options: nosniff", "Strict-Transport-Security", "Referrer-Policy"):
    if token not in headers: err(f"_headers: {token} missing")
for f in PAGES + ["admin/index.html"]:
    t = Path(f).read_text(encoding="utf-8")
    if re.search(r"<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>", t): err(f"{f}: inline <script> is blocked by the CSP; move it to a file")
    if re.search(r"\son(click|load|error|submit|change)=", t, re.I): err(f"{f}: inline event handler is blocked by the CSP")

# ---------- redirects ----------
rules = {}
for line in Path("_redirects").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#"): continue
    parts = line.split()
    if len(parts) < 2: err(f"_redirects: bad line '{line}'"); continue
    src, dst = parts[0], parts[1]
    if src in rules: err(f"_redirects: duplicate source {src}")
    rules[src] = dst
for src, dst in rules.items():
    if dst in rules: err(f"_redirects: redirect chain {src} -> {dst} -> {rules[dst]}")
    if not route_ok(dst) and not os.path.isfile(dst.lstrip("/")): err(f"_redirects: {src} points to missing destination {dst}")

# ---------- robots / sitemap ----------
robots = Path("robots.txt").read_text(encoding="utf-8")
if re.search(r"^Disallow:\s*/\s*$", robots, re.M): err("robots.txt blocks the whole site")
if "Sitemap: https://ohhgood.store/sitemap.xml" not in robots: err("robots.txt: sitemap line missing")
if Path("sitemap.xml").exists(): err("static sitemap.xml must not exist (functions/sitemap.xml.js generates it)")

# ---------- thumbnails + size budgets ----------
r = subprocess.run([sys.executable, "scripts/optimize_images.py", "--check"], capture_output=True, text=True)
if r.returncode: err("thumbnails missing: run python3 scripts/optimize_images.py\n  " + r.stdout.strip().replace("\n", "\n  "))
for f in Path("assets").iterdir():
    if f.is_file() and f.stat().st_size > 450 * 1024 and f.suffix in (".webp", ".jpg", ".jpeg"):
        warn(f"{f}: {f.stat().st_size // 1024} KB is heavy for the web")
if Path("styles.css").stat().st_size > 90 * 1024: warn("styles.css is over 90 KB")

for w in warnings: print("WARN :", w)
for e in errors: print("ERROR:", e)
print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
sys.exit(1 if errors else 0)
