-- Turmoil In The Turnsoil: Supabase setup
-- Run once in Supabase Dashboard > SQL Editor. Do not put service_role keys in the website.

create extension if not exists pgcrypto;

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_assets (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  file_path text not null unique,
  category text not null check (category in ('images','logos','audio','video','episodes','fonts')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  is_published boolean not null default false,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists site_assets_public_idx on public.site_assets (is_published, created_at desc);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (length(email) <= 320 and position('@' in email) > 1),
  created_at timestamptz not null default now()
);

alter table public.site_admins enable row level security;
alter table public.site_assets enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- A logged-in user can discover only whether their own account is an administrator.
create policy "site admin can read own admin marker" on public.site_admins
  for select to authenticated using (user_id = auth.uid());

-- Only listed administrators can manage site asset metadata.
create policy "admins read all site assets" on public.site_assets
  for select to authenticated using (exists (select 1 from public.site_admins a where a.user_id = auth.uid()));
create policy "admins create site assets" on public.site_assets
  for insert to authenticated with check (uploaded_by = auth.uid() and exists (select 1 from public.site_admins a where a.user_id = auth.uid()));
create policy "admins update site assets" on public.site_assets
  for update to authenticated using (exists (select 1 from public.site_admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.site_admins a where a.user_id = auth.uid()));
create policy "admins delete site assets" on public.site_assets
  for delete to authenticated using (exists (select 1 from public.site_admins a where a.user_id = auth.uid()));

-- Public visitors may subscribe but cannot read, change, or delete anyone's email.
create policy "public can add newsletter email" on public.newsletter_subscribers
  for insert to anon, authenticated with check (length(email) <= 320 and position('@' in email) > 1);
create policy "admins read newsletter emails" on public.newsletter_subscribers
  for select to authenticated using (exists (select 1 from public.site_admins a where a.user_id = auth.uid()));
create policy "admins delete newsletter emails" on public.newsletter_subscribers
  for delete to authenticated using (exists (select 1 from public.site_admins a where a.user_id = auth.uid()));

-- Private bucket: the site will expose only signed URLs for files whose rows are published.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', false, 52428800, null)
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = null;

create policy "admins upload files to private site bucket" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'site-assets' and exists (select 1 from public.site_admins a where a.user_id = auth.uid())
  );
create policy "admins read private site bucket" on storage.objects
  for select to authenticated using (
    bucket_id = 'site-assets' and exists (select 1 from public.site_admins a where a.user_id = auth.uid())
  );
create policy "admins replace files in private site bucket" on storage.objects
  for update to authenticated using (
    bucket_id = 'site-assets' and exists (select 1 from public.site_admins a where a.user_id = auth.uid())
  ) with check (
    bucket_id = 'site-assets' and exists (select 1 from public.site_admins a where a.user_id = auth.uid())
  );
create policy "admins delete files in private site bucket" on storage.objects
  for delete to authenticated using (
    bucket_id = 'site-assets' and exists (select 1 from public.site_admins a where a.user_id = auth.uid())
  );

-- After creating your Supabase Auth user, replace the email below and run:
-- insert into public.site_admins (user_id)
-- select id from auth.users where email = 'YOUR-LOGIN-EMAIL';
-- This grants the owner access to the File Storage and Subscribers pages.
