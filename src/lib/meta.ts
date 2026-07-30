/**
 * Meta Marketing API client — SERVER ONLY.
 * Never import this into client components; it reads secrets from process.env.
 *
 * Model: ads are launched INTO EXISTING campaigns/ad sets (picked in the UI).
 * We never create campaigns or ad sets — budget, targeting, schedule and
 * placements are owned by the ad set the user selects. Everything we create
 * (creative + ad) starts PAUSED for human review.
 */

export interface MetaConfig {
  token: string;
  adAccountId: string; // act_XXXXXXXX
  pageId: string;
  instagramId?: string;
  version: string;
}

/**
 * Env values often arrive with stray whitespace, wrapping quotes, or a copied
 * "Bearer " prefix. Normalise those so a paste slip doesn't look like an auth failure.
 */
function cleanEnv(v?: string): string | undefined {
  if (!v) return undefined;
  let s = v.trim().replace(/^Bearer\s+/i, '');
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\s+/g, ''); // tokens/IDs never contain whitespace
  if (!s || s.includes('PASTE_')) return undefined;
  return s;
}

export function getMetaConfig(): MetaConfig | null {
  const token = cleanEnv(process.env.META_ACCESS_TOKEN);
  const adAccountId = cleanEnv(process.env.META_AD_ACCOUNT_ID);
  const pageId = cleanEnv(process.env.META_PAGE_ID);
  if (!token || !adAccountId || !pageId) return null;
  return {
    token,
    adAccountId: adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`,
    pageId,
    instagramId: process.env.META_INSTAGRAM_ID || undefined,
    version: process.env.META_API_VERSION || 'v23.0',
  };
}

/**
 * Per-workspace credentials from the database (multi-tenant path).
 * Falls back to env vars when a workspace has no connection yet, so the
 * single-account setup keeps working during the transition.
 */
export async function getMetaConfigForWorkspace(workspaceId?: string): Promise<MetaConfig | null> {
  if (workspaceId) {
    const { createSupabaseAdmin } = await import('./supabase-server');
    const admin = createSupabaseAdmin();
    if (admin) {
      const { data } = await admin
        .from('meta_connections')
        .select('access_token, ad_account_id, page_id, instagram_id')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (data?.access_token && data.ad_account_id && data.page_id) {
        return {
          token: data.access_token,
          adAccountId: data.ad_account_id.startsWith('act_') ? data.ad_account_id : `act_${data.ad_account_id}`,
          pageId: data.page_id,
          instagramId: data.instagram_id || undefined,
          version: process.env.META_API_VERSION || 'v23.0',
        };
      }
    }
  }
  return getMetaConfig(); // env fallback
}

const graph = (cfg: MetaConfig, path: string) =>
  `https://graph.facebook.com/${cfg.version}/${path}`;

function toApiError(json: Record<string, any>, status: number): Error {
  const e = json.error || {};
  return new Error(e.error_user_msg || e.message || `Meta API error (${status})`);
}

async function metaPost(cfg: MetaConfig, path: string, body: Record<string, unknown>) {
  const res = await fetch(graph(cfg, path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: cfg.token }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw toApiError(json, res.status);
  return json as { id: string };
}

async function metaGet(cfg: MetaConfig, path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, access_token: cfg.token });
  const res = await fetch(`${graph(cfg, path)}?${qs}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw toApiError(json, res.status);
  return json;
}

// ── list existing campaigns / ad sets (for the launch selector) ───────────────

export interface AdSetOption {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  campaignName: string;
}

export async function listAdSets(cfg: MetaConfig): Promise<AdSetOption[]> {
  const json = await metaGet(cfg, `${cfg.adAccountId}/adsets`, {
    fields: 'id,name,status,campaign{id,name,status}',
    limit: '200',
  });
  return (json.data || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    campaignId: a.campaign?.id || '',
    campaignName: a.campaign?.name || 'Unknown campaign',
  }));
}

// ── launch: create Ad Creative + Ad inside an EXISTING ad set ─────────────────

/** The subset of a RoadmapItem the client sends to /api/meta/launch. */
export interface LaunchPayload {
  adName: string;
  primaryText?: string;
  headline?: string;
  adDescription?: string;
  landingPage?: string;
  creativeLink?: string; // public image URL (option A)
  metaCTA?: string;
  metaAdSetId?: string; // REQUIRED — the existing ad set to launch into
}

export interface LaunchResult {
  creativeId: string;
  adId: string;
}

export async function launchToMeta(cfg: MetaConfig, p: LaunchPayload): Promise<LaunchResult> {
  if (!p.metaAdSetId) throw new Error('No ad set selected.');

  // 1. Ad Creative (image ad via public URL — option A)
  const linkData: Record<string, unknown> = {
    link: p.landingPage,
    message: p.primaryText,
    name: p.headline,
    description: p.adDescription,
    picture: p.creativeLink,
  };
  if (p.metaCTA) linkData.call_to_action = { type: p.metaCTA, value: { link: p.landingPage } };

  const storySpec: Record<string, unknown> = { page_id: cfg.pageId, link_data: linkData };
  if (cfg.instagramId) storySpec.instagram_actor_id = cfg.instagramId;

  const creative = await metaPost(cfg, `${cfg.adAccountId}/adcreatives`, {
    name: `${p.adName} — Creative`,
    object_story_spec: storySpec,
  });

  // 2. Ad — into the selected existing ad set, PAUSED for review
  const ad = await metaPost(cfg, `${cfg.adAccountId}/ads`, {
    name: p.adName,
    adset_id: p.metaAdSetId,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  });

  return { creativeId: creative.id, adId: ad.id };
}

// ── assets available to a connected token (for the picker) ────────────────────

export interface MetaAssets {
  adAccounts: { id: string; name: string; currency: string; status: number }[];
  pages: { id: string; name: string }[];
}

/** Lists the ad accounts and Pages the OAuth-connected user can advertise with. */
export async function listAssets(token: string, version = process.env.META_API_VERSION || 'v23.0'): Promise<MetaAssets> {
  const call = async (path: string, fields: string) => {
    const res = await fetch(`https://graph.facebook.com/${version}/${path}?` +
      new URLSearchParams({ fields, limit: '200', access_token: token }));
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.data || [];
  };

  const [accounts, pages] = await Promise.all([
    call('me/adaccounts', 'id,name,currency,account_status'),
    call('me/accounts', 'id,name'),
  ]);

  return {
    adAccounts: accounts.map((a: any) => ({
      id: a.id, name: a.name || a.id, currency: a.currency || '', status: a.account_status ?? 0,
    })),
    pages: pages.map((p: any) => ({ id: p.id, name: p.name || p.id })),
  };
}

// ── connection diagnostics ────────────────────────────────────────────────────

export interface MetaCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/** Verifies each link in the chain so setup problems are obvious before a push. */
export async function verifyConnection(cfg: MetaConfig): Promise<MetaCheck[]> {
  const checks: MetaCheck[] = [];

  // 1. Token valid?
  try {
    const me = await metaGet(cfg, 'me', { fields: 'id,name' });
    checks.push({ label: 'Access token', ok: true, detail: me.name ? `Authenticated as ${me.name}` : 'Token is valid' });
  } catch (e) {
    // Describe the SHAPE of the token (never the token) so paste errors are diagnosable.
    const t = cfg.token;
    const shape = `length ${t.length}, starts "${t.slice(0, 4)}"`;
    const hints: string[] = [];
    if (!t.startsWith('EAA')) hints.push('Meta tokens normally start with "EAA" — this may be an App ID/Secret rather than an access token');
    if (t.length < 100) hints.push('this looks too short — the copy was probably truncated');
    const why = e instanceof Error ? e.message : 'Invalid token';
    checks.push({
      label: 'Access token',
      ok: false,
      detail: `${why} — ${shape}${hints.length ? '. ' + hints.join('; ') : ''}`,
    });
    return checks; // nothing else can succeed
  }

  // 2. Ad account reachable?
  try {
    const acct = await metaGet(cfg, cfg.adAccountId, { fields: 'name,account_status,currency' });
    const active = acct.account_status === 1;
    checks.push({
      label: 'Ad account',
      ok: active,
      detail: active
        ? `${acct.name} (${acct.currency})`
        : `${acct.name} — account status ${acct.account_status} (not active; check billing)`,
    });
  } catch (e) {
    checks.push({ label: 'Ad account', ok: false, detail: e instanceof Error ? e.message : 'Not reachable' });
  }

  // 3. Page reachable?
  try {
    const page = await metaGet(cfg, cfg.pageId, { fields: 'name' });
    checks.push({ label: 'Facebook Page', ok: true, detail: page.name || cfg.pageId });
  } catch (e) {
    checks.push({ label: 'Facebook Page', ok: false, detail: e instanceof Error ? e.message : 'Not reachable' });
  }

  // 4. Campaigns / ad sets available to launch into?
  try {
    const adsets = await listAdSets(cfg);
    const campaigns = new Set(adsets.map((a) => a.campaignId)).size;
    checks.push({
      label: 'Campaigns & ad sets',
      ok: adsets.length > 0,
      detail: adsets.length > 0
        ? `${campaigns} campaign${campaigns !== 1 ? 's' : ''}, ${adsets.length} ad set${adsets.length !== 1 ? 's' : ''}`
        : 'None found — create a campaign and ad set in Ads Manager first',
    });
  } catch (e) {
    checks.push({ label: 'Campaigns & ad sets', ok: false, detail: e instanceof Error ? e.message : 'Could not list' });
  }

  return checks;
}

// ── ad insights (reporting) ───────────────────────────────────────────────────

export interface AdInsights {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  dateStart: string;
  dateStop: string;
}

export async function getAdInsights(cfg: MetaConfig, adId: string): Promise<AdInsights | null> {
  const json = await metaGet(cfg, `${adId}/insights`, {
    fields: 'impressions,reach,clicks,spend,ctr,cpc',
    date_preset: 'last_30d',
  });
  const row = json.data?.[0];
  if (!row) return null; // no delivery yet
  return {
    impressions: Number(row.impressions || 0),
    reach: Number(row.reach || 0),
    clicks: Number(row.clicks || 0),
    spend: Number(row.spend || 0),
    ctr: Number(row.ctr || 0),
    cpc: Number(row.cpc || 0),
    dateStart: row.date_start,
    dateStop: row.date_stop,
  };
}
