# Power Ranger Electric

The residential website for Power Ranger Electric LLC. The homepage includes services and a realtor introduction. Separate pages cover Nick’s background and the realtor inquiry form.

## Cloudflare Pages

In Workers & Pages, create a Pages project and connect the `Meta7r0n/PRE-SITE-1` Git repository.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Root directory | Repository root |
| Build command | `exit 0` |
| Build output directory | `dist` |

The Pages build picks up `functions/api/inquiries.js` from the repository root. The website files in `dist` are already built. Use the Git integration so the deployment includes the function.

Check both forms at the deployment’s `pages.dev` address. When ready to use the business domain, add `prelectricnj.com` in the Pages project’s **Custom domains** settings. Replace conflicting Porkbun web records for the hostnames you connect. Keep the Workspace mail and verification records.

## Turn on inquiry email

| Form | Delivers to | Gmail subject |
| --- | --- | --- |
| Residential project planner | `inquiries@prelectricnj.com` | Website inquiry \| Homeowner |
| Realtor inquiry | `realtor@prelectricnj.com` | Website inquiry \| Realtor |

1. In [Google Workspace Admin](https://admin.google.com/), open **Directory → Users → Nick → Add Alternate Emails**. Add both addresses as aliases of `nick@prelectricnj.com` if needed. Make sure each can receive mail in Nick’s inbox.
2. In [Resend Domains](https://resend.com/domains), add `send.prelectricnj.com`. Add the sending DNS records Resend displays in Cloudflare and wait for Resend to verify the subdomain. The function sends as `website@send.prelectricnj.com`. Google Workspace continues to receive mail at `prelectricnj.com`.
3. In [Resend API Keys](https://resend.com/api-keys), create a key with **Sending access** for that domain. Add it as the encrypted `RESEND_API_KEY` under **Workers & Pages → your Pages project → Settings → Variables and Secrets** for Production. Production settings apply to the main branch deployment. Only use a Preview key if preview deployments should also send to the live inbox.
4. Deploy with the saved settings. On the production `pages.dev` URL, submit one test from each form and check Nick’s inbox for both subjects. The visitor’s email is the Reply-To address on each message. Copy and download are available while sending is being set up.

### Optional Cloudflare Turnstile

For additional protection on a public site, create a Turnstile widget in **Managed** mode and add the hostnames that will serve the forms, including the production `pages.dev` hostname if you use it for testing. In the same Pages environment as the mail key, set `TURNSTILE_SITE_KEY` as a variable and `TURNSTILE_SECRET_KEY` as an encrypted secret. Set the pair together and deploy again. The website renders the widget on review and the function verifies the token before sending.

## Local review

Run `python3 -m http.server 8000 --directory dist`, then open `http://localhost:8000/` for a static review. To run the function locally, run `npx wrangler pages dev dist` from the repository root. Local secrets belong in the git-ignored `.dev.vars` file. Using a live mail key sends to the two business addresses above.

## Site settings

`dist/site-config.js` contains the public contact, licensing, permit, and photo settings. Confirm those details before adding them. The current build shows preview notices and uses noindex directives.

Homeowner and realtor planners keep separate drafts in the browser session. Each lets the visitor review, copy, download, and send their inquiry. The form sends when the visitor selects **Send inquiry**. On an uncertain send, retrying the same inquiry reuses its request identifier.

The eagle badge is Power Ranger Electric's existing artwork. The font license is in `dist/assets/font-license.txt`.
