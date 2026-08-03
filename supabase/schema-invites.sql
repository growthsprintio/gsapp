-- GrowthSprint — workspace invites
-- Run in Supabase → SQL Editor. Safe to re-run.
--
-- Lets an admin invite someone by email before that person has an account.
-- On sign-up (or next sign-in) any pending invite for their email is accepted
-- automatically, joining them to the workspace with the intended role.

create table if not exists public.workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email        text not null,
  role         text not null default 'member' check (role in ('admin','member','viewer')),
  token        text not null unique,
  invited_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);

-- One outstanding invite per email per workspace.
create unique index if not exists workspace_invites_pending_idx
  on public.workspace_invites (workspace_id, lower(email))
  where accepted_at is null;

create index if not exists workspace_invites_email_idx on public.workspace_invites (lower(email));

alter table public.workspace_invites enable row level security;

-- Members can see their workspace's invites; the server (service role) manages
-- creation and acceptance.
drop policy if exists "members read invites" on public.workspace_invites;
create policy "members read invites" on public.workspace_invites
  for select using (public.is_member(workspace_id));

drop policy if exists "members manage invites" on public.workspace_invites;
create policy "members manage invites" on public.workspace_invites
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
