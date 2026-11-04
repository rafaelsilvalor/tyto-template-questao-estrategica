import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build as buildEngineering } from './engenharia.js';
import { build as buildHouse } from './template.js';

import type {
  AssetResolver,
  Frame,
  ImageNode,
  SceneNode,
  TemplateBuild,
  TextNode,
} from '@tyto/core';

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
  async function framed(picture: string, marks = '') {
    const brief = [
      '---',
      `template: ${name}`,
      'formats: [grid]',
      '---',
      '',
      '::lamina',
      '  O gráfico mostra as matrículas de quatro escolas.',
      `::imagem ${marks}./${picture}`,
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
    const words = all.find((node): node is TextNode => node.name === 'enunciado');
    return { frame, image, words };
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

  it("draws a {sem-quadro} picture alone, at the words' left edge and width", async () => {
    const { frame, image, words } = await framed('900x300.png', '{sem-quadro} ');

    expect(frame).toBeUndefined();
    expect(image?.transform.x).toBe(words?.transform.x);
    expect(image?.size.w).toBe(words?.box.w);
    expect(Number.isInteger(image?.transform.y)).toBe(true);
  });

  it('reads {sem-quadro} on each ::imagem apart, and not when written after the path', async () => {
    const brief = (pictures: readonly string[]) =>
      [
        '---',
        `template: ${name}`,
        'formats: [grid]',
        '---',
        '',
        '::lamina',
        '  O gráfico mostra as matrículas de quatro escolas.',
        ...pictures,
        '  A) A primeira.',
        '',
      ].join('\n');
    const drawn = async (pictures: readonly string[]) => {
      const result = await compileTemplate({
        brief: brief(pictures),
        template,
        formats,
        assets: sized,
      });
      if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
      const all = nodes(result.value.scene.artworks.flatMap((artwork) => artwork.frames)[0]!);
      return {
        frames: all.filter((node) => node.name === 'moldura').length,
        images: all.filter((node) => node.kind === 'image').length,
      };
    };

    expect(await drawn(['::imagem {sem-quadro} ./900x300.png', '::imagem ./600x300.png'])).toEqual({
      frames: 1,
      images: 2,
    });
    // The brief language reads the first `{…}` after the directive's name; after the path it
    // is not a mark, and the picture keeps its frame.
    expect(await drawn(['::imagem ./900x300.png {sem-quadro}'])).toEqual({ frames: 1, images: 1 });
  });
});
