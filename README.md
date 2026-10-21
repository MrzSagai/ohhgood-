# Ohhgood! V5 — clean independent rebuild

No code or styles from V4 are included. Only four concept product illustrations are reused. Pure static HTML/CSS/JS; works on Cloudflare Pages with build command empty and output directory `/`.

## Preview
Run `python -m http.server 8080` in this folder, then open localhost:8080. Do not open index.html directly from disk because browsers disallow fetching local JSON.

## Contents
- `index.html` — semantic content and components
- `styles.css` — mobile-first responsive design and tokenized themes
- `app.js` — category filters, mobile navigation, modal, keyboard focus, theme
- `content/products.json` — product data (all **draft/concept**)
- `assets/` — concept images reused from V4
- `robots.txt` — block crawlers until launch

All draft products appear in preview solely to exercise UI. Their retailer links are disabled, even if a URL is present. Never present concept visuals as verified retailer images. No invented prices, ratings, cart, newsletter sign-up, or affiliate links.

## Testing
Use automated screenshot and interaction checks before merging to production. Recheck on real phones as a final quality gate.

## Second UX/CMS pass
- Logo hover greeting and CTA feedback added in `styles.css`.
- Mobile navigation can close with Escape.
- `.pages.yml` connects Pages CMS to the existing JSON product records; `content/articles.json` and CMS_GUIDE.md prepare future articles.
- Actual CMS authorization and browser QA require verifying the connected GitHub repository and Cloudflare deployment.
