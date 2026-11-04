import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseFormats, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { COLOR_DEFAULTS, NUMBER_DEFAULTS, build } from '../src/engenharia.js';
import { HIGHLIGHT_DEFAULTS } from '../src/template.js';

import type { SuppliedValues } from '@tyto/core';

/**
 * questao-engenharia's examples and values (TYTO-608), the checks the house template's
 * `examples` and `values` tests make on questao-estrategica: the HTML snapshots per slide (no
 * font measured, no brand kit), and each declared default pinned to the code's fallback (ADR
 * 0153). `faces.test.ts` checks both templates' faces.
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
