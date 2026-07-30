-- GrowthSprint — workspace content storage
-- Run in Supabase → SQL Editor. Safe to re-run.
--
-- Holds each workspace's roadmaps, creatives, copy bank and creative bank as a
-- single JSON document. This makes content shared across devices and teammates
-- (previously it lived only in one browser's localStorage). Reads/writes go
-- through the server, which scopes every access to the caller's workspace.

create table if not exists public.workspace_state (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  state        jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) on delete set null
);

alter table public.workspace_state enable row level security;

-- Members of the workspace may read and write its content.
drop policy if exists "members read state" on public.workspace_state;
create policy "members read state" on public.workspace_state
  for select using (public.is_member(workspace_id));

drop policy if exists "members write state" on public.workspace_state;
create policy "members write state" on public.workspace_state
  for all using (public.is_member(workspace_id)) with check (public.is_member(workspace_id));
