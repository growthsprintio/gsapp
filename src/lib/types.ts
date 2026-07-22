export type CreativeStatus =
  | 'idea'
  | 'briefed'
  | 'in_review'
  | 'ready_to_launch'
  | 'launched';

export type AccountType = 'brand' | 'agency' | 'personal';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  industry?: string;
  website?: string;
  createdAt: string;
}

export type AdFormat = 'static' | 'video' | 'carousel' | 'ugc' | 'motion' | 'collection';
export type AdPlatform = 'meta' | 'tiktok' | 'pinterest' | 'google';

export interface RoadmapItem {
  id: string;
  roadmapId: string;
  status: CreativeStatus;
  adName: string;
  adFormat: AdFormat;
  adSize?: string;
  angle?: string;
  concept?: string;
  description?: string;
  primaryText?: string;
  headline?: string;
  adDescription?: string;
  inspirationLink?: string;
  creativeLink?: string;
  frameioLink?: string;
  landingPage?: string;
  product?: string;
  dueDate?: string;
  adLength?: string;
  assignee?: string;
  launchedAt?: string;
  metaAdId?: string;
  // ── Meta launch config (Phase 1: captured now, pushed to Marketing API later) ──
  metaAdAccountId?: string;
  metaPageId?: string;
  metaInstagramId?: string;
  metaObjective?: string;
  metaCampaignName?: string;
  metaCampaignId?: string; // existing campaign the ad launches into
  metaAdSetId?: string;    // existing ad set the ad launches into
  metaDailyBudget?: string;
  metaOptimizationGoal?: string;
  metaCTA?: string;
  metaStartDate?: string;
  metaEndDate?: string;
  metaLocations?: string;
  metaAgeMin?: string;
  metaAgeMax?: string;
  metaGender?: string;
  metaInterests?: string;
  metaPlacements?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Roadmap {
  id: string;
  accountId: string;
  name: string;
  type: 'monthly' | 'quarterly' | 'campaign' | 'product' | 'client';
  status: 'active' | 'archived';
  period?: string;
  client?: string;
  description?: string;
  createdAt: string;
  items: RoadmapItem[];
}

export interface CopyBankEntry {
  id: string;
  type: 'primary_text' | 'headline' | 'description' | 'hook' | 'angle' | 'product';
  content: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
}

export interface CreativeBankEntry {
  id: string;
  title: string;
  url: string; // external link — Drive, Frame.io, CDN, direct image URL. Never hosted here.
  format: AdFormat;
  tags: string[];
  createdAt: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
}

export const STATUS_CONFIG: Record<CreativeStatus, { label: string; color: string; bg: string }> = {
  idea: { label: 'Idea', color: 'text-stone-600', bg: 'bg-stone-100' },
  briefed: { label: 'Briefed', color: 'text-stone-700', bg: 'bg-stone-200' },
  in_review: { label: 'Review', color: 'text-amber-700', bg: 'bg-amber-50' },
  ready_to_launch: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  launched: { label: 'Launched', color: 'text-white', bg: 'bg-primary' },
};

export const FORMAT_OPTIONS: AdFormat[] = ['static', 'video', 'carousel', 'ugc', 'motion', 'collection'];
export const SIZE_OPTIONS = ['1:1', '4:5', '9:16', '16:9', '1.91:1'];

export interface NamingVariable {
  key: string;
  label: string;
  source: 'field' | 'custom';
  field?: keyof RoadmapItem;
  values?: { match: string; output: string }[];
  fallback: string;
  maxLength?: number;
}

export interface NamingConvention {
  formula: string;
  separator: string;
  variables: NamingVariable[];
}

// ── Meta Marketing API option lists (values are the real API enum values) ──
export const META_OBJECTIVES: { value: string; label: string }[] = [
  { value: 'OUTCOME_SALES', label: 'Sales' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
];

export const META_OPTIMIZATION_GOALS: { value: string; label: string }[] = [
  { value: 'OFFSITE_CONVERSIONS', label: 'Conversions' },
  { value: 'LINK_CLICKS', label: 'Link Clicks' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Landing Page Views' },
  { value: 'THRUPLAY', label: 'Video ThruPlay' },
  { value: 'REACH', label: 'Reach' },
  { value: 'IMPRESSIONS', label: 'Impressions' },
];

export const META_CTAS: { value: string; label: string }[] = [
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'ORDER_NOW', label: 'Order Now' },
  { value: 'BOOK_TRAVEL', label: 'Book Now' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'CONTACT_US', label: 'Contact Us' },
];

export const META_PLACEMENTS: { value: string; label: string }[] = [
  { value: 'facebook_feed', label: 'Facebook Feed' },
  { value: 'instagram_feed', label: 'Instagram Feed' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'instagram_stories', label: 'Instagram Stories' },
  { value: 'facebook_reels', label: 'Facebook Reels' },
  { value: 'facebook_marketplace', label: 'Marketplace' },
  { value: 'audience_network', label: 'Audience Network' },
  { value: 'messenger_inbox', label: 'Messenger' },
];

export const META_GENDERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
];
