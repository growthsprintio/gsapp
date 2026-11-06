import type { CreatorBrief, OutreachBrief, Roadmap, RoadmapItem } from './types';
import { nanoid } from './utils';

/**
 * A creator brief lives on a roadmap creative, so the brief, its ad name and
 * its launch stay one record. These are the pure helpers around that.
 */

export function emptyCreatorBrief(): CreatorBrief {
  return { id: nanoid(), status: 'draft', deliverables: [{ id: nanoid(), label: '', size: '9:16' }] };
}

/** Every creator brief in the given roadmaps, with where it lives. */
export function creatorBriefsIn(roadmaps: Roadmap[]) {
  return roadmaps.flatMap((roadmap) => roadmap.items
    .filter((item): item is RoadmapItem & { creatorBrief: CreatorBrief } => item.maker === 'creator' && !!item.creatorBrief)
    .map((item) => ({ roadmap, item })));
}

type SharedFields = Pick<RoadmapItem, 'concept' | 'description' | 'product' | 'angle' | 'dueDate' | 'inspirationLink'>;

/**
 * The shape the share and send routes publish. Title, overview, product, angle,
 * due date and references come from the brief itself, so nothing is typed twice.
 */
export function toOutreach(fields: SharedFields, cb: CreatorBrief): OutreachBrief {
  return {
    ...cb,
    kind: 'creator',
    title: fields.concept || '',
    overview: fields.description,
    product: fields.product,
    angle: fields.angle,
    dueDate: fields.dueDate,
    references: (fields.inspirationLink || '').split(/[\n,]+/).map((l) => l.trim()).filter((l) => /^https?:\/\//.test(l)),
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * Whether a returned link is the file itself. Meta needs that to launch; a
 * Drive or Dropbox share link is a page about the file, not the file.
 */
export const isDirectAsset = (url: string) => /\.(png|jpe?g|webp|gif|mp4|mov)(\?|#|$)/i.test(url);
