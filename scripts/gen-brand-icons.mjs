// Extracts the brand marks we use into src/components/brand-marks.ts, so the
// app ships two inline SVGs instead of an icon framework or a CDN call.
//
//   node scripts/gen-brand-icons.mjs
//
// Only brands that exist in the SVG Logos collection are listed here. Frame.io
// and Motion are not in it (checked across all 2,227 icons), and Slack is
// absent from simple-icons entirely — see BRAND_NOTES in the component.
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('@iconify-json/logos/icons.json');

const WANTED = ['meta-icon', 'slack-icon'];

const lines = WANTED.map((name) => {
  const icon = data.icons[name];
  if (!icon) throw new Error(`${name} is not in @iconify-json/logos`);
  const w = icon.width ?? data.width;
  const h = icon.height ?? data.height;
  const body = JSON.stringify(icon.body);
  return `  '${name}': { viewBox: '0 0 ${w} ${h}', body: ${body} },`;
}).join('\n');

const out = `// GENERATED — do not edit by hand.
// Source: @iconify-json/logos (SVG Logos). Regenerate:
//   node scripts/gen-brand-icons.mjs
//
// Third-party trademarks, embedded to identify the integration each one points
// at. Keep them unmodified: no recolouring, no stretching, no cropping.

export interface BrandMark {
  viewBox: string;
  body: string;
}

export const BRAND_MARKS: Record<string, BrandMark> = {
${lines}
};
`;

mkdirSync('src/components', { recursive: true });
writeFileSync('src/components/brand-marks.ts', out);
console.log(`Wrote src/components/brand-marks.ts (${WANTED.length} marks, ${out.length} bytes)`);
