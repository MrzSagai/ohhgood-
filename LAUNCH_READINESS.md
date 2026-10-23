# Ohhgood! — Launch Readiness V7
Updated: 2026-10-24. **Prelaunch planning — not launch authorization.**

## Completed on `development`
- Four product cards use their selected WebP marketing illustrations and verified-format Amazon Associates SiteStripe links carrying `tag=ohhgood-20`.
- Product status is `published` **on development only** (not production `main`).
- Product card image and title open Quick Look; retailer CTA is enabled for published items. The user visually confirmed the link became active; end-to-end Amazon landing checks are still not recorded for each item.
- GitHub V7 static QA covers JavaScript syntax, CMS data, assets, URL format, affiliate IDs, disclosure, and indexing controls.
- Static SEO descriptions and Open Graph/Twitter summary text prepared for homepage, Journal, and Editorial Standards; no canonical site URL claimed.

## Blocking checkpoints before public launch
1. **Choose/confirm final public domain.** Only then set canonical URL, `og:url`, robots sitemap link, sitemap URLs, and the Search Console property. Never use a random Cloudflare preview hash as canonical.
2. **Affiliate readiness.** Confirm Amazon Associates account is eligible, register the actual public site in account, and check each of the four ASIN destination pages plus selected variants and affiliate attribution.
3. **Browser QA.** Verify mobile and desktop light/dark modes, logo, hero image, sleeping-cat footer, all article pages, keyboard navigation, Quick Look links, and real Cloudflare deployment. GitHub static QA is not browser QA.
4. **Analytics and compliance.** Choose a privacy-appropriate analytics setup and publish or confirm applicable privacy/contact disclosures as needed. Avoid unreviewed analytics scripts or ad claims.
5. **Publish gate.** Only after approval, change `robots.txt` and `noindex,nofollow` across HTML, then merge reviewed `development` to `main`; confirm deployed production behavior and indexing settings.

## Fixed products (staging)
| Product | Variant | ASIN |
|---|---|---|
| JOYROOM JR-ZS368 Magnetic Cable Organizer | White 9-Pack | B0CH159ZNT |
| Lamicall Adjustable Phone Stand | Black | B01M7U6F8T |
| OXO Sweep & Swipe Laptop Cleaner | White | B07W1L7TCF |
| BAGSMART Electronics Organizer Travel Case | B-Grey (not Pomona) | B0D3XFN86F |

## Safety
- Production `main` remains unchanged.
- Keep `robots.txt` disallow and HTML `noindex` until launch decision.
- Do not invent product test claims, prices, ratings, or review figures.
