import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_SIGN_OFF_TITLE, DEFAULT_TITLE, NUMBER_DEFAULTS, build } from './template.js';

import type { AssetResolver, Frame, SceneNode, TextNode } from '@tyto/core';
import type { CompileTemplateOptions } from '@tyto/template-kit/testing';

/**
 * The carousel's rules, asserted on the scene: which slide the brief's marks make, what each
 * slide draws, the words the brief replaces, and that every text starts inside its slide.
 * Never a pixel size: CI has no CircularXX, and positions are the reference's, checked against
 * the reference art outside this repository.
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

/**
 * Any image the brief names is found; no file is read. A name `w x h` (`./900x300.png`) carries
 * that pixel size, as the host reads it off the header (Tyto ADR 0158); any other has none.
 */
const anyImage: AssetResolver = {
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

async function compiled(brief: string, options: Pick<CompileTemplateOptions, 'assets'> = {}) {
  const result = await compileTemplate({
    brief: brief.startsWith('---')
      ? brief
      : `---\ntemplate: questao-estrategica\nformats: [grid]\n---\n${brief}`,
    template,
    formats,
    ...options,
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result;
}

async function slides(
  brief = example,
  options: Pick<CompileTemplateOptions, 'assets'> = {},
): Promise<Frame[]> {
  const result = await compiled(brief, options);
  return result.value.scene.artworks.flatMap((artwork) => artwork.frames);
}

function nodes(node: Frame | SceneNode): SceneNode[] {
  const children = 'children' in node ? node.children : [];
  return [
    ...('kind' in node && node.kind !== undefined ? [node as SceneNode] : []),
    ...children.flatMap(nodes),
  ];
}

const named = (slide: Frame, name: string): SceneNode[] =>
  nodes(slide).filter((node) => node.name === name);

const texts = (slide: Frame): TextNode[] =>
  nodes(slide).filter((node): node is TextNode => node.kind === 'text');

const words = (node: TextNode): string =>
  node.runs.map((piece) => (piece.kind === 'text' ? piece.text : '\n')).join('');

/** How tall the slide's framed picture is drawn. */
const pictureHeight = (slide: Frame): number =>
  (named(slide, 'imagem')[0] as { size: { h: number } }).size.h;

const wordsOf = (slide: Frame, name: string): string =>
  texts(slide)
    .filter((node) => node.name === name)
    .map(words)
    .join('\n');

/** A statement showing the picture at `path`, written after its `::lamina`. */
const pictured = (path: string): string => `${OPTIONS}
::imagem ${path}`;

const OPTIONS = `::lamina
  Qual destas é a resposta?
  A) A primeira.
  B) A segunda.
  C) A terceira.`;

describe('questao-estrategica', () => {
  it('declares the grid only, as the reference art', () => {
    expect(manifest.value.formats).toEqual(['grid']);
  });

  it('draws one 1080×1350 slide per ::lamina, numbered from its place', async () => {
    const drawn = await slides();

    expect(drawn).toHaveLength(4);
    expect(drawn.map((slide) => slide.size)).toEqual(Array(4).fill({ w: 1080, h: 1350 }));
    expect(drawn.map((slide) => wordsOf(slide, 'numero'))).toEqual([
      '01 I 04',
      '02 I 04',
      '03 I 04',
      '04 I 04',
    ]);
  });

  it('points every slide but the last to the next one', async () => {
    const drawn = await slides();

    expect(drawn.map((slide) => named(slide, 'seta').length)).toEqual([1, 1, 1, 0]);
    expect(wordsOf(drawn[0]!, 'arraste')).toBe('Arraste para o lado');
  });

  it('starts every text inside its slide, and keeps its box inside it', async () => {
    for (const slide of await slides()) {
      for (const node of texts(slide)) {
        const { x, y } = node.transform;
        expect(x, node.name).toBeGreaterThanOrEqual(0);
        expect(y, node.name).toBeGreaterThanOrEqual(0);
        expect(y, node.name).toBeLessThan(1350);
        expect(x + (node.box.w ?? 0), node.name).toBeLessThanOrEqual(1080);
      }
    }
  });

  it('draws the cover: the template’s title over the exam’s lines, as the brief writes them', async () => {
    const [cover] = await slides();

    expect(wordsOf(cover!, 'titulo')).toBe(DEFAULT_TITLE);
    expect(wordsOf(cover!, 'prova')).toBe('QUINTEX – 2026\nPrefeitura de\nVale Alto/XY');
  });

  it('sets a short exam title larger than a long one, between the floor and the ceiling', async () => {
    const size = async (lines: string) => {
      const [cover] = await slides(`::lamina {capa}\n${lines}`);
      const [node] = texts(cover!).filter((item) => item.name === 'prova');
      const [first] = node!.runs;
      return first?.kind === 'text' ? first.size : 0;
    };
    const short = await size('  FGV – 2026\n  TCU');
    const long = await size(
      '  CEBRASPE – 2026\n  Tribunal Regional Federal da 1ª Região\n  Analista Judiciário',
    );

    expect(short).toBe(NUMBER_DEFAULTS['exam-ceiling']);
    expect(long).toBeLessThan(short);
    expect(long).toBeGreaterThanOrEqual(NUMBER_DEFAULTS['exam-floor']);
  });

  it('replaces the cover’s title with the brief’s titulo', async () => {
    const [cover] = await slides(
      `---\ntemplate: questao-estrategica\nformats: [grid]\ntitulo: Questão comentada\n---\n::lamina {capa}\n  Banca`,
    );

    expect(wordsOf(cover!, 'titulo')).toBe('Questão comentada');
  });

  it('splits a statement at its first `X)` line, one letter and one option per line', async () => {
    const [slide] = await slides(OPTIONS);

    expect(wordsOf(slide!, 'enunciado')).toBe('Qual destas é a resposta?');
    expect(['letra-1', 'letra-2', 'letra-3'].map((name) => wordsOf(slide!, name))).toEqual([
      'A)',
      'B)',
      'C)',
    ]);
    expect(wordsOf(slide!, 'alternativa-2')).toBe('A segunda.');
  });

  it('frames a slide’s image under its words, the frame as tall as the picture’s shape', async () => {
    const [wide] = await slides(pictured('./900x300.png'), { assets: anyImage });
    const [landscape] = await slides(pictured('./800x600.png'), { assets: anyImage });
    const [frame] = named(wide!, 'moldura');
    const [statement] = named(wide!, 'enunciado');
    const [first] = named(wide!, 'alternativa-1');

    expect(named(wide!, 'imagem')[0]?.kind).toBe('image');
    expect(frame!.transform.y).toBeGreaterThan(statement!.transform.y);
    expect(first!.transform.y).toBeGreaterThan(frame!.transform.y + pictureHeight(wide!));
    // The frame's inside is 802 px wide: 900×300 is 267.3 tall, 800×600 is 601.5.
    expect(pictureHeight(wide!)).toBe(267);
    expect(pictureHeight(landscape!)).toBe(602);
  });

  it('holds the frame between 3:1 and square, the picture fitted whole inside', async () => {
    const [band] = await slides(pictured('./1200x200.png'), { assets: anyImage });
    const [tall] = await slides(pictured('./500x700.png'), { assets: anyImage });

    expect(pictureHeight(band!)).toBe(267);
    expect(pictureHeight(tall!)).toBe(802);
    expect((named(tall!, 'imagem')[0] as { fit: string }).fit).toBe('contain');
  });

  it('frames a picture the host could not measure at 2:1', async () => {
    const [slide] = await slides(pictured('./figura.png'), { assets: anyImage });

    expect(pictureHeight(slide!)).toBe(401);
  });

  it('draws no frame when the slide has no picture, its own or another slide’s', async () => {
    const drawn = await slides(
      `${pictured('./900x300.png')}

${OPTIONS}`,
      {
        assets: anyImage,
      },
    );

    expect(drawn.map((slide) => named(slide, 'moldura').length)).toEqual([1, 0]);
  });

  it('frames an image on the answer too', async () => {
    const brief = `::lamina {resposta}
  Letra A
  Porque sim.
::imagem ./800x600.png`;
    const [slide] = await slides(brief, { assets: anyImage });

    expect(named(slide!, 'moldura')).toHaveLength(1);
    expect(pictureHeight(slide!)).toBe(602);
    expect(wordsOf(slide!, 'resposta')).toBe('Letra A');
  });

  it('draws no label on a slide that continues the one before', async () => {
    const drawn = await slides(
      `::lamina {continua}
  A) Uma.
  B) Outra.

::lamina {resposta, continua}
  Mais explicação.`,
    );

    expect(named(drawn[0]!, 'rotulo')).toEqual([]);
    expect(wordsOf(drawn[0]!, 'letra-2')).toBe('B)');
    expect(named(drawn[1]!, 'rotulo')).toEqual([]);
    expect(named(drawn[1]!, 'resposta')).toEqual([]);
    expect(wordsOf(drawn[1]!, 'explicacao')).toBe('Mais explicação.');
  });

  it('glues the seal to the last slide’s foot and lifts its number by the band', async () => {
    const brief = `---
template: questao-estrategica
formats: [grid]
selo: ./selo.png
---
::lamina
  Qual?

::lamina {fecho}`;
    const [first, last] = await slides(brief, { assets: anyImage });
    const numberY = (slide: Frame) => named(slide, 'numero')[0]!.transform.y;

    expect(nodes(last!).some((node) => node.name === 'seal')).toBe(true);
    expect(nodes(first!).some((node) => node.name === 'seal')).toBe(false);
    expect(numberY(first!) - numberY(last!)).toBe(140);
  });

  it('sets a short statement larger than a long one, its options following it', async () => {
    const sizes = async (brief: string) => {
      const [slide] = await slides(brief);
      const sizeOf = (name: string) => {
        const [node] = texts(slide!).filter((item) => item.name === name);
        const [first] = node!.runs;
        return first?.kind === 'text' ? first.size : 0;
      };
      return { statement: sizeOf('enunciado'), option: sizeOf('alternativa-1') };
    };
    const short = await sizes(OPTIONS);
    const long = await sizes(
      OPTIONS.replace('Qual destas é a resposta?', 'Uma frase longa do enunciado. '.repeat(14)),
    );

    expect(short.statement).toBe(NUMBER_DEFAULTS['statement-ceiling']);
    expect(long.statement).toBeLessThan(short.statement);
    expect(long.statement).toBeGreaterThanOrEqual(NUMBER_DEFAULTS['statement-floor']);
    expect(short.option / short.statement).toBeCloseTo(37.5 / 40);
  });

  it('sets a short explanation larger than a long one', async () => {
    const sizeOf = async (explanation: string) => {
      const [slide] = await slides(`::lamina {resposta}\n  Letra A\n  ${explanation}`);
      const [node] = texts(slide!).filter((item) => item.name === 'explicacao');
      const [first] = node!.runs;
      return first?.kind === 'text' ? first.size : 0;
    };
    const short = await sizeOf('Porque sim.');
    const long = await sizeOf('Uma explicação longa da resposta. '.repeat(10));

    expect(short).toBe(NUMBER_DEFAULTS['explanation-ceiling']);
    expect(long).toBeLessThan(short);
  });

  it('reports a statement whose options run past the arrow, and none for the example', async () => {
    const many = Array.from(
      { length: 26 },
      (_, index) => `  ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index]}) Uma opção.`,
    );
    const long = await compiled(`::lamina\n  Qual?\n${many.join('\n')}`);
    const fits = await compiled(example);
    const overflows = (result: Awaited<ReturnType<typeof compiled>>) =>
      result.diagnostics.filter((item) => item.code === 'W_TEMPLATE_OVERFLOW');

    expect(overflows(long)).toHaveLength(1);
    expect(overflows(fits)).toEqual([]);
  });

  it('draws the answer in large, and its explanation under it', async () => {
    const answer = (await slides())[2]!;

    expect(wordsOf(answer, 'rotulo')).toBe('Resposta');
    expect(wordsOf(answer, 'resposta')).toBe('Letra B');
    expect(wordsOf(answer, 'explicacao')).toContain('O regulamento fictício');
  });

  it('closes with the template’s sign-off and the like bar, or the brief’s fecho', async () => {
    const closing = (await slides())[3]!;
    const [written] = await slides(
      `---\ntemplate: questao-estrategica\nformats: [grid]\nfecho: |\n  Gostou?\n  **Compartilhe** com a turma.\n---\n::lamina {fecho}`,
    );

    expect(wordsOf(closing, 'fecho-titulo')).toBe(DEFAULT_SIGN_OFF_TITLE);
    expect(named(closing, 'barra')).toHaveLength(1);
    expect(wordsOf(written!, 'fecho-titulo')).toBe('Gostou?');
    expect(wordsOf(written!, 'fecho-texto')).toBe('Compartilhe com a turma.');
  });

  it('keeps the bold of a ::fecho directive, in the header or as a directive alike', async () => {
    const boldIn = async (brief: string) => {
      const [slide] = await slides(brief);
      const [node] = texts(slide!).filter((item) => item.name === 'fecho-texto');
      return node!.runs.flatMap((piece) =>
        piece.kind === 'text' && piece.weight === 700 ? [piece.text] : [],
      );
    };

    expect(
      await boldIn('::fecho\n  Gostou?\n  **Compartilhe** com a turma.\n\n::lamina {fecho}'),
    ).toEqual(['Compartilhe']);
    expect(
      await boldIn(
        `---\ntemplate: questao-estrategica\nformats: [grid]\nfecho: |\n  Gostou?\n  **Compartilhe** com a turma.\n---\n::lamina {fecho}`,
      ),
    ).toEqual(['Compartilhe']);
  });
});
