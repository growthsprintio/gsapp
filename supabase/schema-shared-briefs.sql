-- GrowthSprint — briefs shared with people outside the team
-- Run in Supabase → SQL Editor. Safe to re-run.
--
-- A creator or designer opens /b/{token} without an account, so the shared
-- copy of the brief has to live somewhere readable by token alone. Only the
-- recipient-facing fields are stored here (see publicView in lib/outreach).
--
-- RLS is on with no policies: only the server (service role) reads or writes,
-- and it always scopes by token or by the caller's workspace.

create table if not exists public.shared_briefs (
  token        text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brief_id     text not null,
  brief        jsonb not null,
  viewed_at    timestamptz,
  submissions  jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists shared_briefs_workspace_idx on public.shared_briefs (workspace_id);

alter table public.shared_briefs enable row level security;
