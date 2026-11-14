# Ohhgood! Custom Admin — setup

The custom admin lives at \`/admin/\`. It is a separate interface and stylesheet; it does not change the public storefront.

## What is implemented

- GitHub sign-in with an allowlist of administrator usernames.
- Dashboard overview with product, publication, article, and draft counts.
- Product list, search, status filter, add, and edit.
- Journal list, search, status filter, add, and edit.
- Server-side validation for IDs/slugs, categories, statuses, HTTPS retailer links, and safe image paths.
- Saves create Git commits directly on \`main\`.
- Optimistic SHA check prevents overwriting a file that changed after the editor loaded it.
- The GitHub installation token and private key stay in Cloudflare Pages Functions; no GitHub write token is sent to the browser.

Media upload, delete, categories/settings screens, revision restore, and rich-text visual editing are not part of this first admin release. Use draft status to temporarily remove content from publication. Images can currently be referenced by a path in \`assets/\` or an existing HTTPS cover image for journal stories.

## One-time GitHub App setup

Use a GitHub App rather than a broad personal access token or an OAuth token with repository write scope. Install it only on this repository.

1. Open GitHub **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. Set a recognizable name such as **Ohhgood CMS**.
3. Set the Homepage URL to the deployed Ohhgood! site or the branch preview URL used for admin.
4. Enable **User authorization (OAuth) flow**.
5. Add the callback URL:
   \`https://YOUR-ADMIN-HOST/api/auth/callback\`
   The host must exactly match the host where you open \`/admin/\`. Use `https://ohhgood.store/api/auth/callback` for the production admin. Register a separate callback only if a preview admin is deliberately configured.
6. Under repository permissions, set **Contents: Read and write**. Metadata read-only is required by GitHub.
7. Do not enable unrelated permissions or webhook access for this first version.
8. Create the app, note its **App ID** and **Client ID**, and generate a **Client secret**.
9. Generate a private key and download the PEM file. Keep it private. GitHub-generated RSA keys are commonly PKCS#1 (`BEGIN RSA PRIVATE KEY`); the Pages Function imports PKCS#8, so convert it before adding the secret: `openssl pkcs8 -topk8 -nocrypt -in github-app-key.pem -out github-app-key-pkcs8.pem`. Paste the complete converted PEM (`BEGIN PRIVATE KEY` / `END PRIVATE KEY`) into Cloudflare.
10. Install the app and choose **Only select repositories → MrzSagai/ohhgood-**. Do not install it on all repositories.
11. Find the installation ID from the installation's GitHub URL or the installed-app settings page.

The app's OAuth authorization is only used to identify the signed-in GitHub user (\`read:user\`). Actual repository reads/writes use a short-lived installation token scoped to the installed repository and the Contents permission.

## Cloudflare Pages environment variables

In the Cloudflare dashboard, open the Pages project connected to this repository, then **Settings → Variables and Secrets**. Add these to the **Preview** environment for the \`main\` deployment. Add them to Production only if you later choose to expose the admin on the production deployment.

| Variable | Value | Secret? |
|---|---|---|
| \`GITHUB_APP_CLIENT_ID\` | GitHub App Client ID | No |
| \`GITHUB_APP_CLIENT_SECRET\` | GitHub App client secret | Yes |
| \`GITHUB_APP_ID\` | GitHub App numeric ID | No |
| \`GITHUB_APP_PRIVATE_KEY\` | Full PEM private key contents | Yes |
| \`GITHUB_APP_INSTALLATION_ID\` | Installation ID for this repository | No |
| \`SESSION_SECRET\` | Long random secret, at least 32 characters | Yes |
| \`ADMIN_GITHUB_USERS\` | Allowed GitHub login(s), comma-separated | No |

For \`GITHUB_APP_PRIVATE_KEY\`, paste the complete PEM including the BEGIN/END lines. Cloudflare secret values must be entered in the dashboard; never commit them to the repository. Generate \`SESSION_SECRET\` with a password manager or a cryptographically secure random generator.

After adding or changing variables, redeploy the Production deployment so the Pages Function receives them.

## Open the admin

1. Open the branch preview URL for \`main\`.
2. Visit \`/admin/\`.
3. Choose **Continue with GitHub** and authorize the GitHub App.
4. Sign in using a GitHub username listed in \`ADMIN_GITHUB_USERS\`.
5. Add or edit content. Saving writes a commit to \`main\`; Cloudflare Pages then rebuilds the production site from `main`.

## Important deployment notes

- The callback URL configured in the GitHub App must exactly match the host used to open the admin. The production callback URL must match `https://ohhgood.store/api/auth/callback` exactly.
- This implementation is pinned to repository \`MrzSagai/ohhgood-\` and branch \`main\`. It cannot write to another repository or branch.
- The admin HTML/CSS/JS are public static assets, but the content APIs require an authenticated, allowlisted session.
- Sessions are encrypted, HttpOnly, Secure, SameSite=Lax cookies and expire after eight hours.
- The first version edits JSON records only. It does not upload files, so place images in \`assets/\` through GitHub or a future media-upload workflow.
- Keep Pages CMS as a fallback editor until the custom admin has been deployed and tested end-to-end.
