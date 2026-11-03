# Ohhgood! CMS workflow

1. Upload **all extracted site files**, including hidden `.pages.yml`, to the **root of the exact GitHub repo** connected to `ohhgood.pages.dev`.
2. Sign in to https://app.pagescms.org/ with GitHub and select that exact repository and branch.
3. Editors **Products** and **Journal drafts** should appear.
4. Edit a draft product and save. The CMS creates a GitHub commit; Cloudflare Pages redeploys automatically if Git integration is configured.
5. All four current products are **draft concept content**. The UI displays them **only as concept previews** and keeps all retailer buttons disabled. Prior to launch, confirm rights, accurate images, claims, retailer links and disclosure.
6. Journal editor is staged but the public article rendering is not implemented. Do not promise journal publishing yet.

No server, database or admin login endpoint is installed on the website itself. CMS authentication happens at Pages CMS via GitHub.

## Publication rules (V5)
- Only products with `status: published` appear in the public Featured Finds grid. Drafts remain in CMS and are not displayed on the website; avoid using draft to hide confidential content because the JSON source is publicly retrievable.
- A published product without a verified retailer URL remains viewable in Quick Look, but its retailer CTA is disabled.
- Only published Journal entries appear in the homepage Journal and can be opened at `journal.html?slug=your-story-slug`.
- Keep article slugs unique, lowercase letters/numbers/hyphens (example `desk-reset-guide`).
- The article body is displayed as safe plain text. Advanced rich text styling is not yet supported.
- All four starter products are initially drafts. To avoid an empty Featured Finds section when launching this change, publish only the verified, launch-ready items in Pages CMS first.
- The current site contains `noindex,nofollow` metadata; switch SEO indexing on only at public launch after final review.
