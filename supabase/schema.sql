-- GrowthSprint — multi-tenant schema
-- Run this in Supabase → SQL Editor → New query → Run.
-- Safe to re-run: everything is IF NOT EXISTS / idempotent.

-- ── Workspaces ────────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null default 'brand' check (type in ('brand','agency','personal')),
  industry    text,
  website     text,
  created_at  timestamptz not null default now()
);

-- ── Membership: which auth user belongs to which workspace ────────────────────
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('admin','member','viewer')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

-- ── Meta connections: one per workspace (per-tenant credentials) ──────────────
create table if not exists public.meta_connections (
  workspace_id   uuid primary key references public.workspaces(id) on delete cascade,
  access_token   text not null,          -- long-lived user token from OAuth
  token_expires  timestamptz,
  ad_account_id  text,                   -- act_XXXXXXXX
  page_id        text,
  instagram_id   text,
  connected_by   uuid references auth.users(id) on delete set null,
  meta_user_name text,
  updated_at     timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.meta_connections  enable row level security;

-- Helper: is the current user a member of this workspace?
create or replace function public.is_member(ws uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws and m.user_id = auth.uid()
  );
$$;

-- Workspaces: members can read; any authenticated user can create one
drop policy if exists "read own workspaces" on public.workspaces;
create policy "read own workspaces" on public.workspaces
  for select using (public.is_member(id));

drop policy if exists "create workspaces" on public.workspaces;
create policy "create workspaces" on public.workspaces
  for insert with check (auth.uid() is not null);

drop policy if exists "update own workspaces" on public.workspaces;
create policy "update own workspaces" on public.workspaces
  for update using (public.is_member(id));

-- Members: you can see rows for workspaces you belong to, and add yourself
drop policy if exists "read memberships" on public.workspace_members;
create policy "read memberships" on public.workspace_members
  for select using (user_id = auth.uid() or public.is_member(workspace_id));

drop policy if exists "insert own membership" on public.workspace_members;
create policy "insert own membership" on public.workspace_members
  for insert with check (user_id = auth.uid() or public.is_member(workspace_id));

-- Meta connections: members only. Tokens are never exposed to the browser —
-- server routes read them with the service role key.
drop policy if exists "members read meta connection" on public.meta_connections;
create policy "members read meta connection" on public.meta_connections
  for select using (public.is_member(workspace_id));

drop policy if exists "members write meta connection" on public.meta_connections;
create policy "members write meta connection" on public.meta_connections
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
