# Ohhgood! CMS workflow

1. Upload **all extracted site files**, including hidden `.pages.yml`, to the **root of the exact GitHub repo** connected to `ohhgood.pages.dev`.
2. Sign in to https://app.pagescms.org/ with GitHub and select that exact repository and branch.
3. Editors **Products** and **Journal drafts** should appear.
4. Edit a draft product and save. The CMS creates a GitHub commit; Cloudflare Pages redeploys automatically if Git integration is configured.
5. All four current products are **draft concept content**. The UI displays them **only as concept previews** and keeps all retailer buttons disabled. Prior to launch, confirm rights, accurate images, claims, retailer links and disclosure.
6. Journal editor is staged but the public article rendering is not implemented. Do not promise journal publishing yet.

No server, database or admin login endpoint is installed on the website itself. CMS authentication happens at Pages CMS via GitHub.
