# Ohhgood!

Static site on Cloudflare Pages with a few Pages Functions. Content lives in `content/*.json` and is edited through `/admin/` (GitHub App login) or Pages CMS (`.pages.yml`).

## How pages are served
| URL | Source |
|---|---|
| `/`, `/privacy`, `/standards`, `/contact` | static HTML (`/` is also pre-rendered with the catalog by `functions/index.js`) |
| `/product/<id>` | `functions/product/[id].js` |
| `/category/<slug>` | `functions/category/[slug].js` (copy lives in `content/categories.json`) |
| `/journal`, `/journal/<slug>` | `functions/journal.js`, `functions/journal/[slug].js` |
| `/sitemap.xml` | `functions/sitemap.xml.js` (generated from content, never edit by hand) |
| `/api/*`, `/admin/` | CMS (see `docs/CMS_ADMIN_SETUP.md`) |

Shared HTML, headers and helpers: `functions/_lib/site.js`. Security headers for static files: `_headers` (its CSP must equal the one in `site.js`; QA checks this).

## Cloudflare Pages settings
Framework preset: none. Build command: empty. Output directory: `/` (repository root). Nothing in this repo needs a build step.

Optional variables (Settings → Variables): `GITHUB_CONTENT_BRANCH` (default `main`) makes `/admin/` write to another branch, for example `development` on a preview deployment. `GITHUB_OWNER` / `GITHUB_REPO` override the repository.

## Local work
```bash
python3 scripts/qa.py                 # content, links, SEO, headers, redirects, size budgets
node --test tests/render.test.mjs     # renders every product/category/article through the Functions
python3 scripts/optimize_images.py    # create grid thumbnails for new product images
node scripts/dev-server.mjs           # local preview with Functions, redirects and headers (needs Node 22)
```
GitHub Actions runs QA and the render tests on pushes and PRs to `main` and `development`, and generates thumbnails when product images change.

## Editing rules
* Product IDs and article slugs are lowercase letters, digits and hyphens. Changing one breaks its URL, so add a line to `_redirects` pointing the old URL straight at the new one.
* Leave `brand` blank when unknown. Do not type placeholder text.
* Amazon links must use `https://www.amazon.com/dp/<ASIN>?tag=ohhgood0c-20`.
* Optional product fields shown on the page: `who_for`, `who_skip`, `check_before`, `how_to`, `faq`. Only write what you can stand behind.
* Articles can list `related_products` (product IDs) to show a "Finds mentioned" block, and `date` / `updated` (`YYYY-MM-DD`) for structured data and the sitemap.
* Internal notes live in `docs/` and are not served publicly.
