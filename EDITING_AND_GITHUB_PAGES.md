# Hosting and editing Turmoil in the Turnsoil for $0

## What runs where

GitHub stores the source and publishes the public website at no charge from a public repository. **The website now has a real backend**: Supabase Free provides the database, owner login, subscriber list, and private file storage. A Supabase Edge Function issues short-lived links only for files you publish. GitHub Pages alone cannot run that backend; the frontend calls Supabase over HTTPS.

No custom domain is included free. Use the GitHub Pages address, such as `https://YOUR-USERNAME.github.io/` if the repository is named `YOUR-USERNAME.github.io`, or `https://YOUR-USERNAME.github.io/turmoil-in-the-turnsoil/` for a repository named `turmoil-in-the-turnsoil`.

## Keep the bill at $0

Use only Supabase's **Free** plan and do not add paid add-ons or upgrade the organization. Current Free allowances include a 500 MB database, 1 GB file storage (50 MB max per file), 5 GB egress, 50,000 monthly active users, and 500,000 Edge Function invocations. Supabase's official billing guide says Free-plan use is not charged; when a Free quota is exceeded, Supabase notifies you and continued overages can result in service restrictions. Do not upgrade to clear a restriction if you must stay at $0—wait for quota reset or reduce usage. Paid plans can bill overages. Supabase may also pause a Free project after a week of low activity. See the current [Supabase pricing page](https://supabase.com/pricing), [billing/quotas guide](https://supabase.com/docs/guides/platform/billing-on-supabase), [cost control page](https://supabase.com/docs/guides/platform/cost-control), and [project pausing guide](https://supabase.com/docs/guides/platform/free-project-pausing); limits can change. A paused/restricted backend means login, uploads, and signups may temporarily stop until restored or the quota resets.

Each file may be up to 50 MB, but all files together must remain within the 1 GB storage allowance. Uploaded art/PDFs are stored in a private bucket. Only published assets receive a signed public URL; an already-issued URL can remain usable for up to one hour after unpublishing. The signup form can save addresses in Supabase and, optionally, forward each signup to your email through Formspree. It does not send mail to subscribers. With Supabase enabled, export the addresses from the owner-only Subscribers page as CSV.

## First-time setup

### 1. Put the source in GitHub

Create a **public** GitHub repository. Add all extracted project files at its root (not the ZIP itself), including the hidden `.github/` folder. Do not upload `.env` files, passwords, API secrets, `node_modules/`, or `dist/`. In **Settings → Pages**, set the deployment source to **GitHub Actions**.

### 2. Create a Supabase Free project

Create a Supabase account and project, leaving the organization on the Free plan. In **Project Settings → API**, copy the project URL, the public anon/publishable key, and the project reference/ID. The anon/publishable key is designed for browser use when Row Level Security is enabled. **Never expose a service-role/secret key in frontend code or a `VITE_` variable.**

### 3. Create the tables and private Storage bucket

In Supabase, open **SQL Editor → New query**. Copy and run the entire file `supabase/schema.sql` from this repository once. It creates the metadata tables, row-level-security rules, and a private `site-assets` bucket. These policies let visitors add their own email to the mailing list, but only let the explicitly allowlisted site owner read subscriber addresses, manage assets, and upload files.

### 4. Add the owner account

In Supabase **Authentication → Users**, create an owner user with an email and password. Copy that user's UUID. In **SQL Editor**, run this, replacing the example UUID with the exact user ID:

```sql
insert into public.site_admins (user_id)
values ('PASTE-THE-OWNER-USER-UUID-HERE');
```

The owner signs into the site's **File Storage** page with that same email and password. Keep the password private.

### 5. Set GitHub repository variables and secrets

In GitHub open **Settings → Secrets and variables → Actions**. Add these **repository variables**:

- `SUPABASE_URL` — the project's HTTPS URL.
- `SUPABASE_ANON_KEY` — the public anon/publishable key.
- `SUPABASE_PROJECT_ID` — the project reference/ID.
- `SUPABASE_DEPLOY_ENABLED` — the exact text `true` to enable automatic Edge Function deployment.
- `FORMSPREE_ENDPOINT` — optional. Use the endpoint for your Formspree form (for example, `https://formspree.io/f/yourformid`) to forward each signup to your verified email address.

Add this **repository secret**:

- `SUPABASE_ACCESS_TOKEN` — a Supabase personal access token used only by the GitHub deploy workflow. Create one in your Supabase account settings. Never put it in a committed file.

`SUPABASE_URL` and the public anon key are intentionally embedded in the built browser app; they are not admin secrets. Safety depends on the SQL row-level-security policies. The deploy token remains secret and is used only in GitHub Actions.

### Optional: receive new signup emails with Formspree

Create a form in Formspree, set its notification recipient to your email, and complete Formspree's email verification. Copy the form endpoint URL and add it as the `FORMSPREE_ENDPOINT` repository variable above. The site forwards signups there automatically on its next deployment. If Supabase is also configured, the same address is saved in your private subscriber database so you can export the list as CSV from the owner-only Subscribers page. If only Formspree is configured, signups are forwarded to your inbox without using the site's Supabase list. Check Formspree's current plan limits and submission retention in its dashboard. Do not put a private API or service-role key in the website; this integration needs only the public form endpoint.

### 6. Deploy

After committing those repository variables and secret, open **Actions → Deploy Supabase functions → Run workflow** once. This deploys the public-assets function. Then open **Actions → Deploy website → Run workflow**. Future commits to `main` automatically rebuild the website; changes under `supabase/` also trigger the function deployment workflow.

If you have not added the Supabase variables yet, the public site still builds, but backend controls remain disconnected. After the first successful deploy, test in order: open File Storage and sign in; upload a small image as a draft; publish it; confirm it appears on the public page; submit a test signup and confirm it appears under Subscribers. Remove test subscriber data before launch if desired.

## Editing later

Edit `client/src/site-content.json` on GitHub to change page text, add characters, episodes, or devotional entries. Commit the edit to `main`; the Pages workflow will publish it. Episodes and Devos each link the PDF whose filename matches the entry, and otherwise show that entry's configured missing-message text. The Devos page is directly after Episodes in the navigation.

For images, fonts, audio, video, and PDFs, use the site's **File Storage** page on your GitHub Pages site. Sign in as the owner, select a category, upload the file, then choose **Publish on site**. Use the exact filenames below to fill existing slots. Uploads stay private until published; unpublishing prevents the site from issuing new public links.

| Page slot | Filename | Allowed formats |
|---|---|---|
| Header mark | `logo-v.png` | PNG, JPEG, WebP, GIF |
| Studio logo | `logo-utys.png` | PNG, JPEG, WebP, GIF |
| Home sketch — Yanagi | `yanagi-cute.png` | PNG, JPEG, WebP, GIF |
| Home sketch — Firebeet | `firebeet-cute.png` | PNG, JPEG, WebP, GIF |
| Trailer | `trailer.mp4` or `trailer.mp3` | MP4/WebM video or MP3/WAV/M4A/OGG audio |
| Title font | `THIORN.otf` | TTF, OTF, WOFF, WOFF2 |
| Body font | `BubbleSans.otf` | TTF, OTF, WOFF, WOFF2 |
| Emphasis font | `ZUDJ-I.TTF` | TTF, OTF, WOFF, WOFF2 |
| Yanagi | `yanagi.png` | PNG, JPEG, WebP, GIF |
| Firebeet | `firebeet.png` | PNG, JPEG, WebP, GIF |
| Wormfolk | `wormfolk.png` | PNG, JPEG, WebP, GIF |
| Skeletors | `skeletors.png` | PNG, JPEG, WebP, GIF |
| Sediments | `sediments.png` | PNG, JPEG, WebP, GIF |
| Soldiers | `soldiers.png` | PNG, JPEG, WebP, GIF |
| Supreme Leader | `leader.png` | PNG, JPEG, WebP, GIF |
| Episode 0 | `ep0.pdf` | PDF |
| Episode 1 | `ep1.pdf` | PDF |
| Devotional for Episode 0 | `devo0.pdf` | PDF |
| Devotional for Episode 1 | `devo1.pdf` | PDF |

File extensions must match the actual format. If the asset is a JPG/WebP rather than PNG, edit its filename in `client/src/site-content.json` to the real filename and extension. You only need to add files you have ready.

## Privacy and safety notes

- This is a public website and a public source repository. Do not commit credentials, private drafts, or confidential content.
- Email subscribers are personal data. Only the administrator can list or export them; visitors cannot read the list. Do not collect addresses until you have privacy/consent language appropriate to your audience.
- The newsletter form stores an email address in Supabase but does not send confirmation or marketing messages. The Subscribers page lets the owner download a CSV.
- Supabase's Free projects can pause after inactivity and do not include downloadable database backups. Keep your own backups of content and subscriber data.
- GitHub Pages remains the frontend host. Supabase runs the backend services (database, authentication, private storage, and the public asset-link function).
