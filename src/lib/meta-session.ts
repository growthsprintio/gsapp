// SERVER-ONLY. Resolves the Meta credentials for whoever is signed in.
import { createSupabaseServer, createSupabaseAdmin, supabaseConfigured } from './supabase-server';
import { getMetaConfig, getMetaConfigForWorkspace, type MetaConfig } from './meta';

/** The signed-in user's first workspace id, or null. */
export async function getSessionWorkspaceId(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const admin = createSupabaseAdmin();
    if (!admin) return null;

    const { data } = await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    return data?.workspace_id ?? null;
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
