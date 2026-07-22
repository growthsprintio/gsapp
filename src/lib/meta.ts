/**
 * Meta Marketing API client — SERVER ONLY.
 * Never import this into client components; it reads secrets from process.env.
 *
 * MVP scope: single ad account (credentials in env vars), image ads via a
 * public image URL (option A), everything created PAUSED for human review.
 */

export interface MetaConfig {
  token: string;
  adAccountId: string; // act_XXXXXXXX
  pageId: string;
  instagramId?: string;
  version: string;
}

export function getMetaConfig(): MetaConfig | null {
  const token = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !adAccountId || !pageId) return null;
  return {
    token,
    adAccountId: adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`,
    pageId,
    instagramId: process.env.META_INSTAGRAM_ID || undefined,
    version: process.env.META_API_VERSION || 'v23.0',
  };
}

/** The subset of a RoadmapItem the client sends to /api/meta/launch. */
export interface LaunchPayload {
  adName: string;
  primaryText?: string;
  headline?: string;
  adDescription?: string;
  landingPage?: string;
  creativeLink?: string; // public image URL (option A)
  metaObjective?: string;
  metaCampaignName?: string;
  metaDailyBudget?: string;
  metaOptimizationGoal?: string;
  metaCTA?: string;
  metaStartDate?: string;
  metaEndDate?: string;
  metaLocations?: string;
  metaAgeMin?: string;
  metaAgeMax?: string;
  metaGender?: string;
  metaPlacements?: string; // comma-joined
}

const graph = (cfg: MetaConfig, path: string) =>
  `https://graph.facebook.com/${cfg.version}/${path}`;

async function metaPost(cfg: MetaConfig, path: string, body: Record<string, unknown>) {
  const res = await fetch(graph(cfg, path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: cfg.token }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new Error(e.error_user_msg || e.message || `Meta API error (${res.status})`);
  }
  return json as { id: string };
}

// ── small mappers ─────────────────────────────────────────────────────────────

const COUNTRY_CODES: Record<string, string> = {
  'united states': 'US', usa: 'US', us: 'US', 'united kingdom': 'GB', uk: 'GB',
  canada: 'CA', ca: 'CA', australia: 'AU', au: 'AU', germany: 'DE', france: 'FR',
  spain: 'ES', italy: 'IT', netherlands: 'NL', ireland: 'IE', mexico: 'MX',
  brazil: 'BR', india: 'IN', japan: 'JP', 'new zealand': 'NZ',
};

function toCountryCodes(raw?: string): string[] {
  if (!raw) return ['US'];
  const codes = raw.split(',').map((s) => s.trim()).filter(Boolean).map((tok) => {
    const lc = tok.toLowerCase();
    if (COUNTRY_CODES[lc]) return COUNTRY_CODES[lc];
    if (/^[A-Za-z]{2}$/.test(tok)) return tok.toUpperCase(); // already an ISO code
    return null;
  }).filter(Boolean) as string[];
  return codes.length ? [...new Set(codes)] : ['US'];
}

// our placement value -> Meta publisher platform + position field
const PLACEMENT_MAP: Record<string, { platform: string; posField: string; pos: string }> = {
  facebook_feed: { platform: 'facebook', posField: 'facebook_positions', pos: 'feed' },
  facebook_reels: { platform: 'facebook', posField: 'facebook_positions', pos: 'facebook_reels' },
  facebook_marketplace: { platform: 'facebook', posField: 'facebook_positions', pos: 'marketplace' },
  instagram_feed: { platform: 'instagram', posField: 'instagram_positions', pos: 'stream' },
  instagram_reels: { platform: 'instagram', posField: 'instagram_positions', pos: 'reels' },
  instagram_stories: { platform: 'instagram', posField: 'instagram_positions', pos: 'story' },
  audience_network: { platform: 'audience_network', posField: 'audience_network_positions', pos: 'classic' },
  messenger_inbox: { platform: 'messenger', posField: 'messenger_positions', pos: 'messenger_home' },
};

function buildTargeting(p: LaunchPayload) {
  const targeting: Record<string, unknown> = {
    geo_locations: { countries: toCountryCodes(p.metaLocations) },
  };
  if (p.metaAgeMin) targeting.age_min = Number(p.metaAgeMin);
  if (p.metaAgeMax) targeting.age_max = Number(p.metaAgeMax);
  if (p.metaGender === 'men') targeting.genders = [1];
  else if (p.metaGender === 'women') targeting.genders = [2];

  const selected = (p.metaPlacements || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (selected.length) {
    const platforms = new Set<string>();
    const positions: Record<string, Set<string>> = {};
    for (const key of selected) {
      const m = PLACEMENT_MAP[key];
      if (!m) continue;
      platforms.add(m.platform);
      (positions[m.posField] ||= new Set()).add(m.pos);
    }
    if (platforms.size) {
      targeting.publisher_platforms = [...platforms];
      for (const [field, set] of Object.entries(positions)) targeting[field] = [...set];
    }
  }
  return targeting;
}

// ── orchestrator: Campaign → Ad Set → Ad Creative → Ad (all PAUSED) ─────────────

export interface LaunchResult {
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
}

export async function launchToMeta(cfg: MetaConfig, p: LaunchPayload): Promise<LaunchResult> {
  // 1. Campaign
  const campaign = await metaPost(cfg, `${cfg.adAccountId}/campaigns`, {
    name: p.metaCampaignName || `${p.adName} — Campaign`,
    objective: p.metaObjective || 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: [],
  });

  // 2. Ad Set
  const adSetBody: Record<string, unknown> = {
    name: `${p.adName} — Ad Set`,
    campaign_id: campaign.id,
    daily_budget: String(Math.round(Number(p.metaDailyBudget || '0') * 100)), // dollars → cents
    billing_event: 'IMPRESSIONS',
    optimization_goal: p.metaOptimizationGoal || 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: buildTargeting(p),
    status: 'PAUSED',
  };
  if (p.metaStartDate) adSetBody.start_time = `${p.metaStartDate}T00:00:00+0000`;
  if (p.metaEndDate) adSetBody.end_time = `${p.metaEndDate}T23:59:59+0000`;
  const adSet = await metaPost(cfg, `${cfg.adAccountId}/adsets`, adSetBody);

  // 3. Ad Creative (image ad via public URL — option A)
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

  // 4. Ad
  const ad = await metaPost(cfg, `${cfg.adAccountId}/ads`, {
    name: p.adName,
    adset_id: adSet.id,
    creative: { creative_id: creative.id },
    status: 'PAUSED',
  });

  return { campaignId: campaign.id, adSetId: adSet.id, creativeId: creative.id, adId: ad.id };
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
  const params = new URLSearchParams({
    fields: 'impressions,reach,clicks,spend,ctr,cpc',
    date_preset: 'last_30d',
    access_token: cfg.token,
  });
  const res = await fetch(`${graph(cfg, adId)}/insights?${params}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new Error(e.error_user_msg || e.message || `Meta API error (${res.status})`);
  }
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
