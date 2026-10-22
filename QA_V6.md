# Ohhgood! V6 Release Candidate — QA log
Date: 2026-10-22
Branch: development. Production main unchanged.

## Changes in this QA pass
- Restored accessible "Open menu" label when closing mobile navigation using Escape.
- Cleared stale target/rel attributes before setting each Quick Look retailer destination.
- Fetch product JSON with no-store to reduce stale CMS content after deploy.
- Named footer home link for screen readers.
- No changes to locked Journal photographs or product selection.

## Verified by source inspection
- All primary navigation IDs exist (#categories, #featured, #journal, #about).
- Products load from content/products.json; published products appear by default; preview-only drafts are visibly labeled and lack retailer links.
- Journal reads published articles from content/articles.json; article route exists.
- Mobile Quick Look grid places image, CTA, details in that order.
- Existing dark theme and prefers-reduced-motion CSS rules present.
- Homepage robots remain noindex and robots.txt disallows crawling; leave until launch sign-off.

## Browser checks still required before merge
- Desktop 1440, laptop ~1024, tablet ~768, mobile 390 and 320 CSS px.
- Menu toggle, click navigation, Escape to close, focus navigation.
- All four filter pills; Quick Look open, backdrop close, keyboard focus trap and restore.
- Quick Look CTA placement under image on mobile; ensure no horizontal overflow.
- Light/dark mode on home, Journal article, and standards page.
- All three Journal image URLs actually load and crop correctly; images are locked for now.
- Network/performance checks including product artwork files >1 MB and third-party hero photography.
- CMS save and Cloudflare preview deploy after latest changes.
- Review real policy text and affiliate disclosure before launch; current notice is informational, not a legal review.

## Release blockers
- Brand approved master logo/mascot still not exact.
- Four product images conceptual; Amazon URLs unverified and products are draft.
- Temporary third-party imagery provenance and rights per asset not finalized.
- Search UI deferred, video/social integrations out of scope.
- Production launch needs indexation decision, domain and release review.

Do not represent the above as tested in a browser until independently verified.

## Performance & responsive pass 2 (2026-10-22)
- Preconnected image host to reduce third-party image connection setup time.
- Added async decoding for product and Journal list images (lazy loading already existed).
- Added minimum-width and line-wrapping safeguards for narrow layouts, including extra rules under 390 px.
- Applied content-visibility: auto to Journal cards on wider screens to defer offscreen rendering.
- These are source improvements, **not audited Lighthouse scores or browser-tested fixes**. Real device validation remains required.
- Large legacy product PNG images remain untouched per the owner's asset lock. Compression/conversion to WebP or AVIF is a follow-up once approved replacement files are ready.
