// SERVER-ONLY. Publishing outreach briefs to the shared_briefs table.
import { randomBytes } from 'crypto';
import { createSupabaseAdmin } from './supabase-server';
import { publicView } from './outreach';
import type { OutreachBrief } from './types';

const MAX_BYTES = 100_000;

/** Narrow an untrusted request body to the brief fields we rely on. */
export function readBrief(body: unknown): OutreachBrief | null {
  const b = (body as { brief?: unknown })?.brief as OutreachBrief | undefined;
  if (!b || typeof b !== 'object') return null;
  if (typeof b.id !== 'string' || typeof b.title !== 'string') return null;
  if (b.kind !== 'creator' && b.kind !== 'design') return null;
  if (!Array.isArray(b.deliverables) || !Array.isArray(b.references)) return null;
  if (JSON.stringify(b).length > MAX_BYTES) return null;
  return b;
}

const newToken = () => randomBytes(16).toString('base64url');

/**
 * Create or refresh the shared copy. A token the client sends is only reused
 * when it already belongs to this workspace and brief, so a caller can't
 * overwrite someone else's shared brief by guessing or replaying a token.
 */
export async function publishBrief(
  workspaceId: string,
  brief: OutreachBrief,
): Promise<{ token: string } | { error: string }> {
  const admin = createSupabaseAdmin();
  if (!admin) return { error: 'Sharing is not configured on the server.' };

  let token: string | null = null;
  if (brief.shareToken) {
    const { data } = await admin.from('shared_briefs')
      .select('token').eq('token', brief.shareToken)
      .eq('workspace_id', workspaceId).eq('brief_id', brief.id).maybeSingle();
    if (data) token = data.token;
  }

  const view = publicView(brief);
  if (token) {
    const { error } = await admin.from('shared_briefs')
      .update({ brief: view, updated_at: new Date().toISOString() }).eq('token', token);
    if (error) return { error: tableHint(error.message) };
    return { token };
  }

  token = newToken();
  const { error } = await admin.from('shared_briefs').insert({
    token, workspace_id: workspaceId, brief_id: brief.id, brief: view,
  });
  if (error) return { error: tableHint(error.message) };
  return { token };
}

function tableHint(msg: string) {
  return /shared_briefs/.test(msg) && /does not exist|schema cache/.test(msg)
    ? 'Sharing needs a one-time database update: run supabase/schema-shared-briefs.sql.'
    : msg;
}

export function briefUrl(req: Request, token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || new URL(req.url).origin;
  return `${base}/b/${token}`;
}
