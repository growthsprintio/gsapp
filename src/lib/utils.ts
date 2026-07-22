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
    { key: '#', label: 'Index', source: 'custom', fallback: '001', values: [] },
  ],
};

export function applyNamingConvention(
  convention: NamingConvention,
  item: Partial<RoadmapItem>,
  extra?: { brand?: string; index?: number; customValues?: Record<string, string> }
): string {
  let result = convention.formula;
  result = result.replace(/\{sep\}/g, convention.separator);

  for (const v of convention.variables) {
    const placeholder = `{${v.key}}`;
    if (!result.includes(placeholder)) continue;

    if (v.key === '#') {
      result = result.replace(placeholder, String(extra?.index ?? 1).padStart(3, '0'));
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
    output = output.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
    if (v.maxLength) output = output.slice(0, v.maxLength);

    result = result.replace(placeholder, output);
  }

  return result;
}

export function getCustomVariables(convention: NamingConvention): NamingVariable[] {
  return convention.variables.filter(
    (v) => v.source === 'custom' && v.key !== '#' && v.key !== 'b' && (v.values?.length ?? 0) > 0
  );
}

