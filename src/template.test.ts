import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build } from './template.js';

/**
 * The composition's rules, read on the `Scene` the example compiles to: the slides it declares,
 * which slide each `::lamina` is, and every text inside its slide.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(
  read('../templates/questao-estrategica/manifest.yaml'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });
const example = read('../templates/questao-estrategica/examples/questao.brief');

interface Node {
  readonly kind: string;
  readonly name?: string;
  readonly transform?: { readonly x: number; readonly y: number };
  readonly box?: { readonly w?: number };
  readonly runs?: readonly { readonly kind: string; readonly text?: string }[];
  readonly children?: readonly Node[];
}

async function slides(brief = example): Promise<Node[]> {
  const result = await compileTemplate({ brief, template, formats });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result.value.scene.artworks.flatMap((artwork) => artwork.frames) as unknown as Node[];
}

function texts(node: Node): Node[] {
  return [
    ...(node.kind === 'text' ? [node] : []),
    ...(node.children ?? []).flatMap((child) => texts(child)),
  ];
}

const words = (node: Node): string =>
  (node.runs ?? []).map((piece) => (piece.kind === 'text' ? (piece.text ?? '') : '\n')).join('');

describe('questao-estrategica', () => {
  it('declares the grid only, as the reference art', () => {
    expect(manifest.value.formats).toEqual(['grid']);
  });

  it('draws one 1080×1350 slide per ::lamina', async () => {
    const drawn = await slides();

    expect(drawn).toHaveLength(4);
  });

  it('starts every text inside its slide, and keeps its box inside it', async () => {
    for (const slide of await slides()) {
      for (const node of texts(slide)) {
        const x = node.transform?.x ?? 0;
        const y = node.transform?.y ?? 0;
        expect(x, node.name).toBeGreaterThanOrEqual(0);
        expect(y, node.name).toBeGreaterThanOrEqual(0);
        expect(y, node.name).toBeLessThan(1350);
        expect(x + (node.box?.w ?? 0), node.name).toBeLessThanOrEqual(1080);
      }
    }
  });

  it('draws the template’s cover title when the brief writes no titulo', async () => {
    const [cover] = await slides();

    expect(texts(cover!).map(words).join('\n')).toContain('Questão de fixação');
  });
});
