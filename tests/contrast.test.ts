import { readFileSync } from 'node:fs';

import { parseManifest } from '@tyto/core';
import { describe, expect, it } from 'vitest';

/**
 * TYTO-623: every colour mark reads on the deep colour it is drawn on. For each template, each
 * declared `deep-mark-cor-<name>` default has a WCAG contrast of at least 4.5:1 against the
 * declared `deep`, and keeps the hue of its paper swatch, `mark-cor-<name>`, within 10°: only
 * its lightness and saturation moved. `values.test.ts` holds the defaults equal to the code's.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const MARKS = ['azul', 'vermelho', 'verde', 'ocre'] as const;

function channels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** WCAG 2's relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG 2's contrast ratio between two colours, 1 to 21. */
export function contrast(one: string, other: string): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

/** The colour's hue, in degrees. */
function hue(hex: string): number {
  const [r, g, b] = channels(hex).map((channel) => channel / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  const sector =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (sector * 60 + 360) % 360;
}

function hueDistance(one: string, other: string): number {
  const distance = Math.abs(hue(one) - hue(other));
  return Math.min(distance, 360 - distance);
}

describe.each(['questao-estrategica', 'questao-engenharia'])('%s', (name) => {
  const manifest = parseManifest(read(`../templates/${name}/manifest.yaml`), 'manifest.yaml');
  if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
  const values = manifest.value.values ?? {};
  const color = (key: string): string => {
    const declared = values[key]?.default;
    if (typeof declared !== 'string') throw new Error(`${key} declares no colour`);
    return declared;
  };

  it.each(MARKS)('draws {cor:%s} at 4.5:1 or more on deep, in its paper hue', (mark) => {
    const deep = color('deep');
    const onDeep = color(`deep-mark-cor-${mark}`);

    expect(contrast(onDeep, deep)).toBeGreaterThanOrEqual(4.5);
    expect(hueDistance(onDeep, color(`mark-cor-${mark}`))).toBeLessThanOrEqual(10);
  });
});
