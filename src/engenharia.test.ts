import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { COLOR_DEFAULTS, DEFAULT_SIGN_OFF_TITLE, build } from './engenharia.js';
import { MARK_COLORS } from './template.js';

import type { Frame, SceneNode, TextNode } from '@tyto/core';

/**
 * questao-engenharia's frame, asserted on the scene (TYTO-608): what each slide draws and does
 * not, the highlights' colours and weights, and the house's brief drawing it unchanged. Never a
 * pixel size: CI has no CircularXX, and positions are checked against the reference art
 * outside this repository.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

const manifest = parseManifest(
  read('../templates/questao-engenharia/manifest.yaml'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });
const example = read('../templates/questao-engenharia/examples/questao.brief');

async function slides(brief = example): Promise<Frame[]> {
  const result = await compileTemplate({ brief, template, formats });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result.value.scene.artworks.flatMap((artwork) => artwork.frames);
}

function nodes(node: Frame | SceneNode): SceneNode[] {
  const children = 'children' in node ? node.children : [];
  return [
    ...('kind' in node && node.kind !== undefined ? [node as SceneNode] : []),
    ...children.flatMap(nodes),
  ];
}

const names = (slide: Frame): string[] => nodes(slide).map((node) => node.name ?? '');

const texts = (slide: Frame): TextNode[] =>
  nodes(slide).filter((node): node is TextNode => node.kind === 'text');

const textNamed = (slide: Frame, name: string): TextNode | undefined =>
  texts(slide).find((node) => node.name === name);

/** A solid paint's colour as `#rrggbb`. */
function hexOf(paint: unknown): string {
  const { r, g, b } = (paint as { color: { r: number; g: number; b: number } }).color;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** Each run of a text with its words, colour (`#rrggbb`) and weight. */
const runsOf = (node: TextNode | undefined) =>
  (node?.runs ?? []).flatMap((piece) =>
    piece.kind === 'text'
      ? [{ text: piece.text, color: hexOf(piece.color), weight: piece.weight }]
      : [],
  );

describe('questao-engenharia', () => {
  it('draws the button and the "+" on the cover, and no slide number anywhere', async () => {
    const [cover, ...rest] = await slides();

    expect(names(cover!)).toEqual(
      expect.arrayContaining(['titulo', 'regua', 'prova', 'botao', 'botao-texto', 'mais-1']),
    );
    for (const slide of [cover!, ...rest]) {
      expect(names(slide)).not.toContain('numero');
      expect(names(slide)).toContain('assinatura');
    }
  });

  it('draws no logo and no heading on the statement, its letters in their own ink', async () => {
    const [, statement] = await slides();

    expect(names(statement!)).not.toContain('rotulo');
    expect(names(statement!)).not.toContain('logo');
    expect(runsOf(textNamed(statement!, 'letra-1'))[0]?.color).toEqual(
      COLOR_DEFAULTS['letter-ink'],
    );
  });

  it('sets **x** in Bold and {cor:…} in Bold and its colour', async () => {
    const [, statement, answer] = await slides();
    const bold = runsOf(textNamed(statement!, 'enunciado')).find(
      (piece) => piece.text === 'diretamente',
    );
    const blue = runsOf(textNamed(answer!, 'explicacao')).find(
      (piece) => piece.text === 'longarina',
    );
    const red = runsOf(textNamed(answer!, 'explicacao')).find(
      (piece) => piece.text === 'transversina',
    );

    expect(bold?.weight).toBe(700);
    expect(blue).toEqual(
      expect.objectContaining({
        weight: 700,
        color: MARK_COLORS.azul,
      }),
    );
    expect(red?.color).toEqual(MARK_COLORS.vermelho);
  });

  it('draws "Gabarito", the answer and a rule under it', async () => {
    const [, , answer] = await slides();
    const label = textNamed(answer!, 'rotulo');
    const written = textNamed(answer!, 'resposta');
    const rule = nodes(answer!).find((node) => node.name === 'regua');

    expect(runsOf(label).map((piece) => piece.text)).toEqual(['Gabarito']);
    expect(runsOf(written).map((piece) => piece.text)).toEqual(['Alternativa A']);
    expect(rule?.transform.y).toBeGreaterThan(written!.transform.y);
  });

  it('draws the sign-off as four icon rows under its title, with no arrow', async () => {
    const [, , , signOff] = await slides();

    expect(runsOf(textNamed(signOff!, 'fecho-titulo')).map((piece) => piece.text)).toEqual([
      DEFAULT_SIGN_OFF_TITLE,
    ]);
    expect(names(signOff!)).toEqual(
      expect.arrayContaining(['curtir', 'marcar', 'salvar', 'compartilhar']),
    );
    expect(names(signOff!)).not.toContain('seta');
  });

  it("draws the house template's own example brief, changing only its template line", async () => {
    const house = read('../templates/questao-estrategica/examples/questao.brief').replace(
      'template: questao-estrategica',
      'template: questao-engenharia',
    );
    const drawn = await slides(house);

    expect(drawn).toHaveLength(4);
    for (const slide of drawn) {
      for (const node of texts(slide)) {
        expect(node.transform.x).toBeGreaterThanOrEqual(0);
        expect(node.transform.x).toBeLessThan(1080);
        expect(node.transform.y).toBeGreaterThanOrEqual(0);
        expect(node.transform.y).toBeLessThan(1350);
      }
    }
  });
});
