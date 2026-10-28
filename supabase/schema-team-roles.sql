-- GrowthSprint — team job roles and display names
-- Run in Supabase → SQL Editor. Safe to re-run.
--
-- `role` on workspace_members is the permission level (admin / member /
-- viewer). These columns are what someone *does* — strategist, designer,
-- media buyer — and the name to show for them. Briefs use the job role to
-- suggest and prefill owners, and to decide whose turn it is at each stage.

alter table public.workspace_members
  add column if not exists job_role text
    check (job_role in ('strategist', 'designer', 'creator', 'media_buyer', 'copywriter', 'other')),
  add column if not exists display_name text;
