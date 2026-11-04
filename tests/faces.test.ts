import { readFileSync, readdirSync } from 'node:fs';

import { defineTemplate, parseFormats, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build as engenharia } from '../src/engenharia.js';
import { build as house } from '../src/template.js';

import type { FaceCache, TemplateBuild } from '@tyto/core';

/**
 * The faces each manifest declares are the ones its examples draw (Tyto ADR 0048).
 *
 * In a plugin's process `context.measure` answers only from the faces the manifest lists, and
 * a face left out measures as nothing. So every (family, weight) a frame of an example draws
 * must be declared, and a declared face no example draws is a stale line. That includes the
 * symbol chain (Tyto ADR 0168): a glyph CircularXX lacks is drawn in Noto Sans Math 400, or
 * failing that in Source Sans 3 at 400 or 700, whichever is nearer the run's weight.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const parsedFormats = parseFormats(read('../templates/formats.yaml'), 'formats.yaml');
if (!parsedFormats.ok) throw new Error(parsedFormats.error.map((item) => item.message).join('\n'));
const formats = parsedFormats.value;

/**
 * Of the examples' characters, the ones each face lacks, read from the faces' `cmap` on
 * 2026-11-04: CircularXX as installed on the maintainer's machine (all five weights alike),
 * Noto Sans Math 3.000 and Source Sans 3 as Tyto bundles them. CI has no CircularXX, so the
 * test stands in for the faces with these answers instead of reading the files.
 */
const LACKS: Readonly<Record<string, string>> = {
  CircularXX: 'αβ⁻',
  'Noto Sans Math': '²³·°⁻',
  'Source Sans 3': '',
};

const faces: FaceCache = {
  get: (face) => {
    const lacks = LACKS[face.family];
    if (lacks === undefined) return undefined;
    return {
      advance: (characters: string) => characters.length * 0.5,
      contentHeight: 1,
      has: (codePoint: number) => !lacks.includes(String.fromCodePoint(codePoint)),
    };
  },
};

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

const TEMPLATES: readonly (readonly [string, TemplateBuild])[] = [
  ['questao-estrategica', house],
  ['questao-engenharia', engenharia],
];

describe.each(TEMPLATES)('the faces %s declares', (name, build) => {
  const manifest = parseManifest(read(`../templates/${name}/manifest.yaml`), 'manifest.yaml');
  if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
  const template = defineTemplate(manifest.value, build);
  const examples = readdirSync(new URL(`../templates/${name}/examples/`, import.meta.url)).filter(
    (file) => file.endsWith('.brief'),
  );

  it('are exactly the faces its examples draw, on every slide', async () => {
    const drawn = new Set<string>();
    for (const example of examples) {
      const result = await compileTemplate({
        brief: read(`../templates/${name}/examples/${example}`),
        template,
        formats,
        faces,
      });
      if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
      facesIn(result.value.scene, drawn);
    }
    const declared = (manifest.value.faces ?? []).map(
      (face) => `${face.family} ${String(face.weight)}`,
    );

    expect(examples).toContain('formula.brief');
    expect([...drawn].sort()).toEqual([...declared].sort());
  });
});
