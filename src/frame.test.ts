import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build as buildEngineering } from './engenharia.js';
import { build as buildHouse } from './template.js';

import type { AssetResolver, Frame, ImageNode, SceneNode, TemplateBuild } from '@tyto/core';

/**
 * A picture's frame, in both templates (TYTO-608): at a fractional y the border's and the
 * corner's antialiased edges met on one row, and a picture fitted `contain` into a frame
 * rounded to whole pixels left half a pixel of paper down each side; both showed as a light
 * seam in the rendered PNG. The frame stands on whole pixels, and a picture whose own shape
 * the frame takes covers it.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

/** Any image is found; a name `w x h` carries that pixel size, as the host reads it. */
const sized: AssetResolver = {
  base: '.',
  resolve: (reference) => {
    const [, w, h] = /(\d+)x(\d+)/.exec(reference) ?? [];
    return Promise.resolve({
      id: reference,
      source: 'file',
      path: reference,
      hash: reference,
      ...(w === undefined || h === undefined ? {} : { size: { w: Number(w), h: Number(h) } }),
    });
  },
};

function nodes(node: Frame | SceneNode): SceneNode[] {
  const children = 'children' in node ? node.children : [];
  return [
    ...('kind' in node && node.kind !== undefined ? [node as SceneNode] : []),
    ...children.flatMap(nodes),
  ];
}

const TEMPLATES: readonly [string, TemplateBuild][] = [
  ['questao-estrategica', buildHouse],
  ['questao-engenharia', buildEngineering],
];

describe.each(TEMPLATES)('%s: a picture in its frame', (name, build) => {
  const manifest = parseManifest(read(`../templates/${name}/manifest.yaml`), 'manifest.yaml');
  if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
  const template = defineTemplate(manifest.value, build);

  /** The statement slide with one picture, its frame and the image node. */
  async function framed(picture: string) {
    const brief = [
      '---',
      `template: ${name}`,
      'formats: [grid]',
      '---',
      '',
      '::lamina',
      '  O gráfico mostra as matrículas de quatro escolas.',
      `::imagem ./${picture}`,
      '  Qual teve mais?',
      '  A) A primeira.',
      '  B) A segunda.',
      '',
    ].join('\n');
    const result = await compileTemplate({ brief, template, formats, assets: sized });
    if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
    const slide = result.value.scene.artworks.flatMap((artwork) => artwork.frames)[0]!;
    const all = nodes(slide);
    const frame = all.find((node) => node.name === 'moldura');
    const image = all.find((node): node is ImageNode => node.kind === 'image');
    return { frame, image };
  }

  it('stands the frame on whole pixels', async () => {
    const { frame, image } = await framed('900x300.png');

    expect(Number.isInteger(frame?.transform.y)).toBe(true);
    expect(Number.isInteger(image?.transform.y)).toBe(true);
  });

  it('covers the frame with a picture of a shape it takes, and fits a taller one whole', async () => {
    expect((await framed('900x300.png')).image?.fit).toBe('cover');
    expect((await framed('300x900.png')).image?.fit).toBe('contain');
  });
});
