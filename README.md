# Power Ranger Electric

The residential website for Power Ranger Electric LLC. The homepage includes services and a realtor introduction. Separate pages cover Nick’s background and the realtor inquiry form.

## Cloudflare Pages

Connect `Meta7r0n/PRE-SITE-1` to a Cloudflare Pages project with these settings.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Root directory | Repository root |
| Build command | `exit 0` |
| Build output directory | `dist` |

Check the deployment at its `pages.dev` address, then add `prelectricnj.com` in the Pages project’s **Custom domains** settings. Replace the existing Porkbun web records for hostnames added to the project if Cloudflare reports a conflict. Mail and verification records live in the same DNS zone and should be preserved during the website connection.

## Local review

Run `python3 -m http.server 8000 --directory dist`, then open `http://localhost:8000/`.

## Site settings

`dist/site-config.js` contains the public contact, licensing, permit, and photo settings. Confirm those details before adding them. The current build shows preview notices and uses noindex directives.

Homeowner and realtor planners keep separate drafts in the browser session. Each can prepare a brief for copy or download. With a configured address, the email button opens a draft in the visitor's mail app. Automatic delivery requires a mail endpoint and a verified receiving inbox.

The eagle badge is Power Ranger Electric's existing artwork. The font license is in `dist/assets/font-license.txt`.
