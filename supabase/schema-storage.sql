-- GrowthSprint — creative asset storage
-- Run in Supabase → SQL Editor. Safe to re-run.
--
-- Designers drop files into the app instead of hosting them elsewhere and
-- pasting links. The bucket is public so thumbnails render directly and Meta
-- can be handed a real image; files are written server-side with the service
-- role, so the policies below only govern reads.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creatives',
  'creatives',
  true,
  31457280, -- 30MB, matching Meta's ad image ceiling
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read: the whole point is a URL that renders in the app and that
-- Meta's crawler can reach. Nothing secret belongs in this bucket.
drop policy if exists "creatives are publicly readable" on storage.objects;
create policy "creatives are publicly readable" on storage.objects
  for select using (bucket_id = 'creatives');

-- Writes and deletes go through the server (service role bypasses RLS), so no
-- anon/authenticated insert policy is granted on purpose.
