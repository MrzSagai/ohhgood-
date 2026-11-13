# Ohhgood! CMS workflow

## Where publishing happens
- The website is a static HTML/CSS/JavaScript site. It does not have its own admin login, database, or server-side API.
- Pages CMS authenticates with GitHub. Select this repository and the `MrzSagai-Dev` branch when editing this development version.
- Changes saved in Pages CMS are Git commits. Cloudflare Pages deploys them when this branch is connected to a deployment environment.

## Products
- Product records live in `content/products.json`.
- The current data file contains 22 records, currently marked `published`.
- Only records with `status: "published"` and valid required fields are eligible for the homepage catalog and product detail route.
- Use exactly one category value: `tidy`, `cozy`, `ritual`, or `green`.
- Keep `id` unique and stable after publication. Use lowercase letters, numbers, and hyphens.
- Use a product-specific image stored under `assets/`. Confirm that it depicts the exact product/variant and that its use is permitted.
- A retailer URL must be copied from the actual retailer listing, checked manually, and kept blank until verified. The site only treats HTTPS URLs as eligible retailer links.
- Do not invent prices, ratings, review counts, product tests, specifications, or claims. Add only information supported by the listing or an actual editorial check.
- Draft records are excluded from the public catalog, but the JSON file itself is publicly retrievable on a static site. Do not put confidential information in it.

## Journal
- Article records live in `content/articles.json`.
- Only records with `status: "published"` and a unique lowercase slug are shown on the public Journal.
- Article body content may be plain text or CMS rich-text HTML. The public renderer rebuilds supported text, heading, list, and link elements safely; unsupported markup is discarded.
- Use HTTPS links and images from approved sources. Verify image usage rights before publication.
- Published article URLs use `journal.html?slug=your-story-slug`; the sitemap is updated alongside article publication.

## Before publishing
1. Preview the changed record on the development deployment.
2. Check product name, brand, category, description, image, benefits, and retailer destination.
3. Check the affiliate disclosure and ensure the destination is genuinely the retailer listing.
4. Check the article title, summary, body, cover image, and links.
5. Confirm the sitemap includes every published article and product route.
6. Keep this guide aligned with the actual schema and behavior; do not describe features that are not implemented.

## Important
The CMS is an editor for repository content, not a private product database. Publicly served JSON files can be inspected by visitors even when individual records are marked draft.
