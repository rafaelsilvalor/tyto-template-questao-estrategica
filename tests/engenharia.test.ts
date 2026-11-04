import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseFormats, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { COLOR_DEFAULTS, NUMBER_DEFAULTS, build } from '../src/engenharia.js';
import { HIGHLIGHT_DEFAULTS } from '../src/template.js';

import type { SuppliedValues } from '@tyto/core';

/**
 * questao-engenharia's example, faces and values (TYTO-608), the three checks the house
 * template's `examples`, `faces` and `values` tests make on questao-estrategica: the HTML
 * snapshots per slide (no font measured, no brand kit), the declared faces equal to the drawn
 * ones (Tyto ADR 0048), and each declared default pinned to the code's fallback (ADR 0153).
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(
  read('../templates/questao-engenharia/manifest.yaml'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const parsedFormats = parseFormats(read('../templates/formats.yaml'), 'formats.yaml');
if (!parsedFormats.ok) throw new Error(parsedFormats.error.map((item) => item.message).join('\n'));
const brief = read('../templates/questao-engenharia/examples/questao.brief');

const compiled = async (values?: SuppliedValues, formats = parsedFormats.value) => {
  const result = await compileTemplate({
    brief,
    template,
    formats,
    ...(values === undefined ? {} : { values }),
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result.value;
};
const html = async (values?: SuppliedValues): Promise<string> =>
  (await compiled(values)).frames.map((slide) => slide.html).join('\n');

/** Every `family weight` a scene's text runs draw, found wherever a run carries a font. */
function facesIn(node: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) facesIn(item, found);
  } else if (typeof node === 'object' && node !== null) {
    const record = node as Record<string, unknown>;
    const font = record['font'] as { family?: unknown } | undefined;
    if (typeof font?.family === 'string' && typeof record['weight'] === 'number') {
      found.add(`${font.family} ${String(record['weight'])}`);
    }
    for (const value of Object.values(record)) facesIn(value, found);
  }
  return found;
}

describe('the example questao-engenharia', () => {
  it('compiles to four grid slides, the HTML the template drew last time', async () => {
    const result = await compiled(
      undefined,
      formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } }),
    );

    expect(result.frames).toHaveLength(4);
    for (const [index, slide] of result.frames.entries()) {
      await expect(slide.html).toMatchFileSnapshot(`./__snapshots__/engenharia-${index + 1}.html`);
    }
  });

  it('declares exactly the faces it draws, on every slide', async () => {
    const drawn = facesIn((await compiled()).scene);
    const declared = (manifest.value.faces ?? []).map(
      (face) => `${face.family} ${String(face.weight)}`,
    );

    expect(drawn.size).toBeGreaterThan(0);
    expect([...drawn].sort()).toEqual([...declared].sort());
  });
});

describe('questao-engenharia declared values', () => {
  const declared = manifest.value.values ?? {};
  const fallbacks: Record<string, unknown> = {
    ...COLOR_DEFAULTS,
    ...NUMBER_DEFAULTS,
    ...HIGHLIGHT_DEFAULTS,
  };

  it('declares each default equal to the one the code falls back to, and no other', () => {
    const defaults = Object.fromEntries(
      Object.entries(declared)
        .filter(([, value]) => value.default !== undefined)
        .map(([name, value]) => [name, value.default]),
    );
    expect(defaults).toEqual(fallbacks);
  });

  it('draws the same HTML with every default supplied as with no values at all', async () => {
    const supplied = Object.fromEntries(
      Object.entries(fallbacks).map(([name, value]) => [name, { value }]),
    ) as SuppliedValues;
    expect(await html(supplied)).toBe(await html());
  });

  it('paints a highlight a configured colour, found in the HTML', async () => {
    const painted = await html({ 'mark-cor-azul': { value: '#123456' } });

    expect(painted).toContain('#123456');
    expect(await html()).not.toContain('#123456');
  });
});
