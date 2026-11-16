# Ohhgood! — Final QA V7 / Prelaunch gate
Date: 2026-10-23
Branch audited: `development`

## Automated checks — PASS
GitHub Actions V7 launch static QA confirms:
- JavaScript syntax.
- All HTML route asset links, CSS image URLs, JavaScript image references, CMS product images, and local journal covers exist.
- Valid JSON collections, unique product IDs, valid article slugs, and product status values.
- Published products require HTTPS retailer URLs.
- All supplied Amazon.com product links use tracking tag `ohhgood-20`.
- Quick Look retailer CTA retains `noopener noreferrer sponsored`.
- Required Amazon Associate disclosure exists.
- Prelaunch `robots.txt` disallows crawling and homepage/journal/standards contain `noindex`.

## Launch blockers — not yet validated
1. **Browser QA required**: visual review on Chrome/Brave/Safari including desktop and mobile; dark-mode logo and hero; Footer Sleeping-cat; Quick Look click targets; modal keyboard focus; nav, filter, search and category interactions.
2. **Products are all draft**: deliberately not visible on public production. Approve and switch to published in development only after the final click-through/retailer match check, then verify product links and disclosures.
3. **SEO unlock requires explicit launch approval**: robots.txt and all noindex flags must not be removed yet. Confirm search metadata, domain/canonical, sitemap and Search Console before release.
4. **Affiliate compliance/business**: verify Amazon Associates account status, website registration, disclosures, image illustration messaging and that each selected ASIN/variant is the intended destination.
5. **Cloudflare deploy/browser test**: GitHub Action success is not evidence that Cloudflare deployed or browser rendering is correct.

## Release protections
- Do not modify `main`, remove prelaunch noindex, or mark products published without explicit approval.
- Retain approved brand art and functional Cloudflare CMS pipeline; do not perform speculative redesigns.
