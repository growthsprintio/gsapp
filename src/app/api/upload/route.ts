import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { getSessionWorkspaceId } from '@/lib/meta-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'creatives';
const MAX_BYTES = 30 * 1024 * 1024;
const ALLOWED = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime',
];

/** Keep the stored name readable but safe as a URL path segment. */
function safeName(name: string) {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 60) || 'asset';
  const ext = (dot > 0 ? name.slice(dot + 1) : '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
  return `${base}-${Date.now().toString(36)}.${ext}`;
}

/**
 * POST /api/upload — multipart form with `file`.
 * Stores the asset in the workspace's folder and returns its public URL, which
 * is what the brief and Creative Bank hold onto.
 */
export async function POST(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId) return NextResponse.json({ error: 'No active workspace.' }, { status: 400 });
  if (!admin) return NextResponse.json({ error: 'Storage is not configured on the server.' }, { status: 500 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'No file was attached.' }, { status: 400 });

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: `${file.type || 'That file type'} is not supported. Use JPG, PNG, WebP, GIF, MP4 or MOV.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 30MB.` },
      { status: 413 },
    );
  }

  // Workspace-scoped path so one tenant's assets never collide with another's.
  const path = `${workspaceId}/${safeName(file.name)}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    const missingBucket = /bucket.*not found/i.test(error.message);
    return NextResponse.json(
      { error: missingBucket ? 'The "creatives" storage bucket does not exist yet — run supabase/schema-storage.sql.' : error.message },
      { status: 502 },
    );
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl, name: file.name, type: file.type });
}
