import type { CreativeStatus, RoadmapItem } from './types';

/** What someone does — separate from their permission level (admin/member/viewer). */
export type JobRole = 'strategist' | 'designer' | 'creator' | 'media_buyer' | 'copywriter' | 'other';

export const JOB_ROLES: { value: JobRole; label: string }[] = [
  { value: 'strategist', label: 'Creative strategist' },
  { value: 'designer', label: 'Designer' },
  { value: 'creator', label: 'Creator' },
  { value: 'media_buyer', label: 'Media buyer' },
  { value: 'copywriter', label: 'Copywriter' },
  { value: 'other', label: 'Other' },
];

export const jobRoleLabel = (r?: string | null) => JOB_ROLES.find((j) => j.value === r)?.label;

/**
 * An ad passes through three people. Rather than one owner per ad, each brief
 * names one person per slot, and the stage decides whose turn it is.
 */
export type OwnerSlot = 'strategist' | 'maker' | 'mediaBuyer';
export type Owners = Partial<Record<OwnerSlot, string>>;

export const SLOTS: OwnerSlot[] = ['strategist', 'maker', 'mediaBuyer'];

export const SLOT_LABEL: Record<OwnerSlot, string> = {
  strategist: 'Strategist',
  maker: 'Designer',
  mediaBuyer: 'Media buyer',
};

/** Which job roles naturally fill a slot — used to suggest and prefill. */
export const SLOT_ROLES: Record<OwnerSlot, JobRole[]> = {
  strategist: ['strategist'],
  maker: ['designer', 'creator'],
  mediaBuyer: ['media_buyer'],
};

/**
 * Whose turn it is at each stage. The strategist writes and approves, the
 * designer makes, the media buyer launches and runs. This is what makes
 * "who owns this?" answerable — whoever holds the ball now — and what
 * notifications route on when the status changes.
 */
export const STAGE_SLOT: Record<CreativeStatus, OwnerSlot> = {
  idea: 'strategist',
  briefed: 'maker',
  in_review: 'strategist',
  ready_to_launch: 'mediaBuyer',
  launched: 'mediaBuyer',
};

export const STAGE_ACTION: Record<CreativeStatus, string> = {
  idea: 'writing the brief',
  briefed: 'making the creative',
  in_review: 'reviewing',
  ready_to_launch: 'launching',
  launched: 'running it',
};

/**
 * The brief's owners. Briefs made before slots existed had a single
 * `assignee`, entered under "Who's making this?" — so it belongs in the
 * maker slot.
 */
export function ownersOf(item: Pick<RoadmapItem, 'owners' | 'assignee'>): Owners {
  const o: Owners = { ...(item.owners ?? {}) };
  if (!o.maker && item.assignee?.trim()) o.maker = item.assignee.trim();
  return o;
}

export interface CurrentOwner {
  slot: OwnerSlot;
  /** Undefined when nobody's been assigned to the slot whose turn it is. */
  name?: string;
  role: string;
  action: string;
}

/** Who has the ball right now, given the stage. */
export function currentOwner(item: Pick<RoadmapItem, 'status' | 'owners' | 'assignee'>): CurrentOwner {
  const slot = STAGE_SLOT[item.status] ?? 'strategist';
  const name = ownersOf(item)[slot]?.trim() || undefined;
  return { slot, name, role: SLOT_LABEL[slot], action: STAGE_ACTION[item.status] ?? '' };
}

export interface TeamMember {
  name: string;
  jobRole?: JobRole | null;
}

/**
 * A new brief's owners, filled from the team where there's no ambiguity:
 * if exactly one person does a job, they're the obvious choice. With two
 * designers we leave it blank rather than guess.
 */
export function prefillOwners(members: TeamMember[]): Owners {
  const out: Owners = {};
  for (const slot of SLOTS) {
    const fits = members.filter((m) => m.jobRole && SLOT_ROLES[slot].includes(m.jobRole));
    if (fits.length === 1) out[slot] = fits[0].name;
  }
  return out;
}

/** "randy@growthsprint.io" → "Randy" when no display name is set. */
export function memberName(m: { displayName?: string | null; email?: string | null }): string {
  if (m.displayName?.trim()) return m.displayName.trim();
  const local = (m.email ?? '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Unknown';
}
