export type CreativeStatus =
  | 'idea'
  | 'briefed'
  | 'in_review'
  | 'revisions_needed'
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
  type: 'primary_text' | 'headline' | 'description' | 'hook';
  content: string;
  tags: string[];
  usageCount: number;
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
  briefed: { label: 'Brief', color: 'text-stone-700', bg: 'bg-stone-100' },
  in_review: { label: 'In Review', color: 'text-amber-700', bg: 'bg-amber-50' },
  revisions_needed: { label: 'Revisions', color: 'text-red-700', bg: 'bg-red-50' },
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
