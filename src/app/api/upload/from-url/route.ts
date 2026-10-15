import { NextResponse } from 'next/server';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { isBlockedAddress } from '@/lib/net-guard';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { getSessionWorkspaceId } from '@/lib/meta-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'creatives';
const MAX_BYTES = 30 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function assertPublicHost(urlStr: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error('That is not a valid URL.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only http and https links can be imported.');
  }

  const host = url.hostname;
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => { throw new Error(`Could not resolve ${host}.`); });

  if (addresses.length === 0) throw new Error(`Could not resolve ${host}.`);
  if (addresses.some((a) => isBlockedAddress(a.address))) {
    throw new Error('That host is not publicly reachable.');
  }
  return url;
}

/**
 * Google Drive share links serve an HTML page, not the file, and the old
 * uc?export=view path now 403s. The thumbnail endpoint still returns image
 * bytes — lower resolution and rate-limited, but it imports, after which we
 * host our own copy and never touch Drive again.
 */
function rewriteKnownHosts(url: URL): { url: URL; note?: string } {
  const driveId = url.hostname.endsWith('drive.google.com')
    ? (url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id'))
    : null;

  if (driveId) {
    return {
      url: new URL(`https://drive.google.com/thumbnail?id=${driveId}&sz=w2000`),
      note: 'Imported from Google Drive at preview resolution — Drive will not serve the full-size file to an app. Upload the original for best quality.',
    };
  }

  if (url.hostname.endsWith('dropbox.com')) {
    const u = new URL(url.toString());
    u.searchParams.set('raw', '1');
    u.searchParams.delete('dl');
    return { url: u };
  }

  return { url };
}

/** POST /api/upload/from-url — fetch an image once and host it ourselves. */
export async function POST(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId) return NextResponse.json({ error: 'No active workspace.' }, { status: 400 });
  if (!admin) return NextResponse.json({ error: 'Storage is not configured on the server.' }, { status: 500 });

  const { url: raw } = await req.json().catch(() => ({ url: '' }));
  if (!raw) return NextResponse.json({ error: 'Paste a link to import.' }, { status: 400 });

  let target: URL;
  let note: string | undefined;
  try {
    const rewritten = rewriteKnownHosts(await assertPublicHost(String(raw).trim()));
    target = await assertPublicHost(rewritten.url.toString());
    note = rewritten.note;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid link.' }, { status: 400 });
  }

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(target, { signal: ctl.signal, redirect: 'follow' });
  } catch {
    return NextResponse.json({ error: `Could not fetch ${target.hostname}. It may be private or slow to respond.` }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `That link returned ${res.status}. Google Drive and Dropbox share links often block this — upload the file instead.` },
      { status: 502 },
    );
  }

  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED.includes(type)) {
    return NextResponse.json(
      { error: `That link returned ${type || 'no content type'}, not an image. Make sure it points straight at the file.` },
      { status: 415 },
    );
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: `That image is ${(buf.byteLength / 1024 / 1024).toFixed(1)}MB; the limit is 30MB.` }, { status: 413 });
  }
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: 'That link returned an empty file.' }, { status: 502 });
  }

  const ext = type.split('/')[1].replace('jpeg', 'jpg');
  const base = (target.pathname.split('/').pop() || 'imported').replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 50) || 'imported';
  const path = `${workspaceId}/${base}-${Date.now().toString(36)}.${ext}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: type, upsert: false });

  if (error) {
    const missingBucket = /bucket.*not found/i.test(error.message);
    return NextResponse.json(
      { error: missingBucket ? 'The "creatives" storage bucket does not exist yet — run supabase/schema-storage.sql.' : error.message },
      { status: 502 },
    );
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl, note });
}
