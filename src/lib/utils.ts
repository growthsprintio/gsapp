import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nanoid() {
  return Math.random().toString(36).slice(2, 11);
}

export function generateAdName(opts: {
  brand?: string;
  format?: string;
  size?: string;
  angle?: string;
  concept?: string;
  product?: string;
  index?: number;
}): string {
  const brand = (opts.brand || 'BRD').toUpperCase().slice(0, 3);
  const format = (opts.format || 'GEN').toUpperCase().slice(0, 3);
  const size = (opts.size || '1X1').replace(':', 'X').replace('.', '');
  const angle = (opts.angle || 'GEN').toUpperCase().replace(/\s+/g, '').slice(0, 5);
  const idx = String(opts.index || 1).padStart(3, '0');
  return `${brand}_${format}_${size}_${angle}_${idx}`;
}

import type { NamingConvention, NamingVariable, RoadmapItem } from './types';

export const DEFAULT_NAMING_CONVENTION: NamingConvention = {
  formula: '{b}{sep}{f}{sep}{s}{sep}{a}{sep}{#}',
  separator: '_',
  variables: [
    { key: 'b', label: 'Brand', source: 'custom', fallback: 'BRD', maxLength: 5, values: [] },
    { key: 'f', label: 'Format', source: 'field', field: 'adFormat', fallback: 'GEN', maxLength: 5, values: [
      { match: 'static', output: 'STA' }, { match: 'video', output: 'VID' },
      { match: 'carousel', output: 'CAR' }, { match: 'ugc', output: 'UGC' },
      { match: 'motion', output: 'MOT' }, { match: 'collection', output: 'COL' },
    ]},
    { key: 's', label: 'Size', source: 'field', field: 'adSize', fallback: '1X1', maxLength: 5, values: [
      { match: '1:1', output: '1x1' }, { match: '4:5', output: '4x5' },
      { match: '9:16', output: '9x16' }, { match: '16:9', output: '16x9' },
      { match: '1.91:1', output: '191x1' },
    ]},
    { key: 'a', label: 'Angle', source: 'field', field: 'angle', fallback: 'GEN', maxLength: 8, values: [
      { match: 'Pain Point', output: 'PAIN' }, { match: 'Social Proof', output: 'SOCIAL' },
      { match: 'Hook', output: 'HOOK' }, { match: 'Curiosity', output: 'CURIOSITY' },
      { match: 'Urgency', output: 'URGENCY' }, { match: 'Before/After', output: 'BA' },
      { match: 'Lifestyle', output: 'LIFE' }, { match: 'Testimonial', output: 'TESTI' },
    ]},
    { key: 'c', label: 'Concept', source: 'field', field: 'concept', fallback: '', maxLength: 10, values: [] },
    { key: 'p', label: 'Product', source: 'field', field: 'product', fallback: '', maxLength: 8, values: [] },
    { key: 'pc', label: 'Product Category', source: 'field', field: 'productCategory', fallback: '', maxLength: 8, values: [] },
    { key: '#', label: 'Index', source: 'custom', fallback: '001', values: [] },
  ],
};

/**
 * The prefixed, human-readable scheme from the 9/29 review:
 *   af: Video | f: before and after | p: cat spray | a: softer fur
 * Offered as a preset rather than the default so existing ad names keep
 * resolving the way they always have.
 *
 * Note the prefixes are display labels, not storage keys — {f} stays "format"
 * internally and simply renders as "af:".
 */
export const READABLE_NAMING_CONVENTION: NamingConvention = {
  style: 'readable',
  separator: ' | ',
  formula: '{f}{sep}{c}{sep}{p}{sep}{a}',
  variables: DEFAULT_NAMING_CONVENTION.variables.map((v) => {
    const prefix: Record<string, string> = {
      f: 'af:', c: 'f:', p: 'p:', pc: 'pc:', a: 'a:', s: 's:', b: 'b:', '#': 'i:',
    };

    // Shortcode mappings are a compact-style device — keeping them here would
    // render "af: VID" instead of "af: Video". Formats still map, but to words.
    const values = v.key === 'f'
      ? [
        { match: 'static', output: 'Static' }, { match: 'video', output: 'Video' },
        { match: 'carousel', output: 'Carousel' }, { match: 'ugc', output: 'UGC' },
        { match: 'motion', output: 'Motion' }, { match: 'collection', output: 'Collection' },
      ]
      : [];

    return { ...v, prefix: prefix[v.key] ?? `${v.key}:`, values };
  }),
};

export function applyNamingConvention(
  convention: NamingConvention,
  item: Partial<RoadmapItem>,
  extra?: { brand?: string; index?: number; customValues?: Record<string, string> }
): string {
  const style = convention.style ?? 'compact';
  let result = convention.formula;
  result = result.replace(/\{sep\}/g, convention.separator);

  // "af:" + "Video" → "af: Video" in readable names, "af:VIDEO" in compact ones.
  const withPrefix = (v: NamingVariable, value: string) =>
    v.prefix ? `${v.prefix}${style === 'readable' ? ' ' : ''}${value}` : value;

  for (const v of convention.variables) {
    const placeholder = `{${v.key}}`;
    if (!result.includes(placeholder)) continue;

    if (v.key === '#') {
      const n = String(extra?.index ?? 1).padStart(3, '0');
      result = result.replace(placeholder, withPrefix(v, n));
      continue;
    }

    let raw = '';
    if (extra?.customValues?.[v.key]) {
      raw = extra.customValues[v.key];
    } else if (v.key === 'b') {
      raw = extra?.brand || v.fallback;
    } else if (v.source === 'field' && v.field) {
      // Multi-select fields store comma-joined values — name from the first selection.
      raw = ((item[v.field] as string) || '').split(',')[0].trim();
    }

    const mapping = v.values?.find((m) => m.match.toLowerCase() === raw.toLowerCase());
    let output = mapping ? mapping.output : raw;
    if (!output) output = v.fallback;

    if (style === 'readable') {
      // Keep the words. maxLength is a compact-style device — applying it here
      // would cut "before and after" to "before and".
      output = output.trim().replace(/\s+/g, ' ');
    } else {
      output = output.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
      if (v.maxLength) output = output.slice(0, v.maxLength);
    }

    result = result.replace(placeholder, withPrefix(v, output));
  }

  return result;
}

export function getCustomVariables(convention: NamingConvention): NamingVariable[] {
  return convention.variables.filter(
    (v) => v.source === 'custom' && v.key !== '#' && v.key !== 'b' && (v.values?.length ?? 0) > 0
  );
}

