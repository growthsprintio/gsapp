// SERVER-ONLY. Resolves the Meta credentials for whoever is signed in.
import { createSupabaseServer, createSupabaseAdmin, supabaseConfigured } from './supabase-server';
import { getMetaConfig, getMetaConfigForWorkspace, type MetaConfig } from './meta';

export const ACTIVE_WORKSPACE_COOKIE = 'gs_workspace';

/**
 * The workspace the user is currently working in.
 * Prefers the active-workspace cookie (set by the switcher) but only after
 * confirming membership, so the cookie can't be used to reach someone else's
 * workspace. Falls back to their first membership.
 */
export async function getSessionWorkspaceId(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createSupabaseAdmin();
    if (!admin) return null;

    const { data: memberships } = await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    const ids = (memberships || []).map((m) => m.workspace_id);
    if (ids.length === 0) return null;

    const { cookies } = await import('next/headers');
    const preferred = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
    if (preferred && ids.includes(preferred)) return preferred;

    return ids[0];
  } catch {
    return null;
  }
}

/**
 * Meta config for the current session's workspace, falling back to env vars.
 * Deriving the workspace from the session (rather than a query param) means a
 * caller can't point the launch at someone else's ad account.
 */
export async function getSessionMetaConfig(): Promise<MetaConfig | null> {
  const workspaceId = await getSessionWorkspaceId();
  if (workspaceId) return getMetaConfigForWorkspace(workspaceId);
  return getMetaConfig();
}
