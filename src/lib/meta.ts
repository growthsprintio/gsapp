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

export function getMetaConfig(): MetaConfig | null {
  // Treat unset OR template-placeholder values (from .env.example / scaffold) as not configured.
  const clean = (v?: string) => (v && !v.includes('PASTE_') ? v : undefined);
  const token = clean(process.env.META_ACCESS_TOKEN);
  const adAccountId = clean(process.env.META_AD_ACCOUNT_ID);
  const pageId = clean(process.env.META_PAGE_ID);
  if (!token || !adAccountId || !pageId) return null;
  return {
    token,
    adAccountId: adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`,
    pageId,
    instagramId: process.env.META_INSTAGRAM_ID || undefined,
    version: process.env.META_API_VERSION || 'v23.0',
  };
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
