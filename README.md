# Turmoil in the Turnsoil

A small editable indie manga website. GitHub Pages serves the public pages, while Supabase Free provides the database, owner login, private file storage, and subscriber list. An optional Formspree endpoint can forward new signups to the creator's email.

## First setup

Read [`EDITING_AND_GITHUB_PAGES.md`](EDITING_AND_GITHUB_PAGES.md) before deploying. It explains how to create the Supabase project, run `supabase/schema.sql`, add the site owner, configure GitHub Actions variables and secrets, and deploy the backend function. Keep Supabase on the Free plan and monitor usage to maintain the $0 goal.

## Editing

Edit `client/src/site-content.json` for page wording, content, episodes, and Devos entries. Use the owner-only **File Storage** page on the deployed site to upload artwork, fonts, trailers, episode PDFs, and devotional PDFs. New files stay private until published.
