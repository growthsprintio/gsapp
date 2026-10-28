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
  referenceCreative?: string;
  finalDeliverable?: string;
  landingPage?: string;
  product?: string;
  productCategory?: string;
  /**
   * Values for naming variables that don't have a dedicated column — the
   * presets like persona and hook, plus anything a workspace invents. Keyed by
   * the variable's key, so adding a variable in Settings gives it somewhere to
   * live without a schema change.
   */
  variables?: Record<string, string>;
  /**
   * True once someone types their own ad name, which stops it rebuilding from
   * the convention. Without this the brief inferred "custom" from the name
   * merely existing, so an existing brief never updated its name again.
   */
  adNameCustom?: boolean;
  /** The {#} value, kept so a name doesn't change every time it's reopened. */
  nameIndex?: number;
  /**
   * One person per role. The stage decides whose turn it is — see
   * lib/ownership. Replaces the single `assignee`, which is read as the
   * maker for briefs saved before this existed.
   */
  owners?: { strategist?: string; maker?: string; mediaBuyer?: string };
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

export type CopyBankType =
  | 'primary_text' | 'headline' | 'description' | 'hook'
  | 'angle' | 'product' | 'landing_page';

export interface CopyBankEntry {
  id: string;
  type: CopyBankType;
  content: string;
  /** For product / landing page entries — the destination URL. */
  url?: string;
  tags: string[];
  /**
   * @deprecated Never incremented anywhere, so it always read 0. Usage is now
   * computed from the briefs themselves — see usageOf in lib/copy-bank.
   */
  usageCount: number;
  createdAt: string;
  updatedAt?: string;
  /** The angle this copy was written for — an entry in the Angle bank. */
  angle?: string;
  /** The product this copy is for — an entry in the Product bank. */
  product?: string;
  /** Proven performer: sorts first and can be filtered to. */
  winner?: boolean;
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
  /** Compact style only — readable names shouldn't be truncated mid-word. */
  maxLength?: number;
  /** Rendered before the value, e.g. "af:" → "af: Video". */
  prefix?: string;
}

/**
 * compact  — SHORTCODE_STYLE_001: uppercased, spaces and punctuation stripped,
 *            maxLength applied. The original behaviour.
 * readable — "af: Video | f: before and after": values kept as written, with
 *            per-variable prefixes doing the work of making the name scannable.
 */
export type NamingStyle = 'compact' | 'readable';

export interface NamingConvention {
  formula: string;
  separator: string;
  variables: NamingVariable[];
  style?: NamingStyle;
}

/** Separator choices, including spaced forms so what you pick is what you get. */
export const NAMING_SEPARATORS: { value: string; label: string }[] = [
  { value: '_', label: '_   underscore' },
  { value: '-', label: '-   dash' },
  { value: '|', label: '|   pipe' },
  { value: '/', label: '/   slash' },
  { value: '.', label: '.   dot' },
  { value: ' ', label: '␣   space' },
  { value: ' | ', label: '␣|␣  spaced pipe' },
  { value: ' - ', label: '␣-␣  spaced dash' },
];

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

/**
 * Call-to-action buttons for website link ads.
 *
 * Meta's full enum runs past 100 values, but most are for app installs,
 * Messenger, gaming or live video and are invalid on a link ad — offering them
 * would just produce rejected launches. This is the subset that applies to the
 * link_data creatives this app builds.
 *
 * Note BOOK_NOW, not BOOK_TRAVEL: the previous list labelled the travel-only
 * value "Book Now", which would have set the wrong button on non-travel ads.
 */
export const META_CTAS: { value: string; label: string }[] = [
  { value: 'SHOP_NOW', label: 'Shop Now' },
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'SUBSCRIBE', label: 'Subscribe' },
  { value: 'BUY_NOW', label: 'Buy Now' },
  { value: 'ORDER_NOW', label: 'Order Now' },
  { value: 'ADD_TO_CART', label: 'Add to Cart' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'GET_PROMOTIONS', label: 'Get Promotions' },
  { value: 'BOOK_NOW', label: 'Book Now' },
  { value: 'MAKE_AN_APPOINTMENT', label: 'Make an Appointment' },
  { value: 'BOOK_A_CONSULTATION', label: 'Book a Consultation' },
  { value: 'REQUEST_TIME', label: 'Request Time' },
  { value: 'APPLY_NOW', label: 'Apply Now' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
  { value: 'GET_STARTED', label: 'Get Started' },
  { value: 'TRY_DEMO', label: 'Try Demo' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'GET_IN_TOUCH', label: 'Get in Touch' },
  { value: 'INQUIRE_NOW', label: 'Inquire Now' },
  { value: 'SEE_MORE', label: 'See More' },
  { value: 'FIND_OUT_MORE', label: 'Find Out More' },
  { value: 'VISIT_WEBSITE', label: 'Visit Website' },
  { value: 'SEE_SHOP', label: 'See Shop' },
  { value: 'VIEW_PRODUCT', label: 'View Product' },
  { value: 'WATCH_MORE', label: 'Watch More' },
  { value: 'LISTEN_NOW', label: 'Listen Now' },
  { value: 'PLAY_GAME', label: 'Play Game' },
  { value: 'GET_DIRECTIONS', label: 'Get Directions' },
  { value: 'BUY_TICKETS', label: 'Buy Tickets' },
  { value: 'GET_SHOWTIMES', label: 'Get Showtimes' },
  { value: 'PURCHASE_GIFT_CARDS', label: 'Purchase Gift Cards' },
  { value: 'DONATE_NOW', label: 'Donate Now' },
  { value: 'NO_BUTTON', label: 'No Button' },
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
