import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build as buildEngineering } from './engenharia.js';
import { BLACK, MARK_COLORS, build as buildHouse } from './template.js';

import type { Frame, SceneNode, TemplateBuild, TextNode } from '@tyto/core';

/**
 * TYTO-618: `**…**` and the colour marks reach every text of both templates — the cover's
 * title and exam lines and the sign-off's title, which were plain — and every rich text keeps
 * the kit's pairs (a currency sign and its amount, a number and its percent) on one line.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

function templateOf(name: string, build: TemplateBuild) {
  const manifest = parseManifest(read(`../templates/${name}/manifest.yaml`), 'manifest.yaml');
  if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
  return defineTemplate(manifest.value, build);
}

const TEMPLATES = {
  'questao-estrategica': templateOf('questao-estrategica', buildHouse),
  'questao-engenharia': templateOf('questao-engenharia', buildEngineering),
} as const;

type Name = keyof typeof TEMPLATES;

async function slides(name: Name, header: string, body: string): Promise<Frame[]> {
  const result = await compileTemplate({
    brief: `---\ntemplate: ${name}\nformats: [grid]\n${header}---\n${body}`,
    template: TEMPLATES[name],
    formats,
  });
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

const textNamed = (slide: Frame | undefined, name: string): TextNode | undefined =>
  (slide === undefined ? [] : nodes(slide)).find(
    (node): node is TextNode => node.kind === 'text' && node.name === name,
  );

function hexOf(paint: unknown): string {
  const { r, g, b } = (paint as { color: { r: number; g: number; b: number } }).color;
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/** The run of a text holding `words`: its colour (`#rrggbb`) and weight. */
function runOf(node: TextNode | undefined, words: string) {
  const piece = (node?.runs ?? []).find(
    (item) => item.kind === 'text' && item.text.trim() === words,
  );
  return piece?.kind === 'text' ? { color: hexOf(piece.color), weight: piece.weight } : undefined;
}

const words = (node: TextNode | undefined): string =>
  (node?.runs ?? []).map((piece) => (piece.kind === 'text' ? piece.text : '\n')).join('');

const COVER = '::lamina {capa}\n  {cor:vermelho}QUINTEX{/} 2026\n  Vale Alto\n\n';

describe.each(Object.keys(TEMPLATES) as Name[])('%s', (name) => {
  it('reads **…** and {cor:…} in the cover’s title written in the frontmatter', async () => {
    const [cover] = await slides(
      name,
      'titulo: Questão **de** {cor:azul}fixação{/}\n',
      `${COVER}::lamina {fecho}`,
    );
    const title = textNamed(cover, 'titulo');

    expect(words(title)).toBe('Questão de fixação');
    expect(runOf(title, 'fixação')).toEqual({ color: MARK_COLORS.azul, weight: BLACK });
    // The title is Black: its `**…**` keeps that weight and never draws lighter.
    const weights = (title?.runs ?? []).flatMap((piece) =>
      piece.kind === 'text' ? [piece.weight] : [],
    );
    expect(new Set(weights)).toEqual(new Set([BLACK]));
  });

  it('reads {cor:…} in the exam’s lines', async () => {
    const [cover] = await slides(name, '', `${COVER}::lamina {fecho}`);
    const exam = textNamed(cover, 'prova');

    expect(words(exam)).toBe('QUINTEX 2026\nVale Alto');
    expect(runOf(exam, 'QUINTEX')?.color).toBe(MARK_COLORS.vermelho);
  });

  it('reads {cor:…} in the sign-off’s title', async () => {
    // The house reads its sign-off from `fecho`, the engineering frame from its slide's lines.
    const [, closing] =
      name === 'questao-estrategica'
        ? await slides(
            name,
            'fecho: |\n  {cor:verde}Valeu!{/}\n  Até a próxima.\n',
            `${COVER}::lamina {fecho}`,
          )
        : await slides(name, '', `${COVER}::lamina {fecho}\n  {cor:verde}Valeu!{/}`);

    expect(runOf(textNamed(closing, 'fecho-titulo'), 'Valeu!')?.color).toBe(MARK_COLORS.verde);
  });

  it('keeps a currency sign with its amount and a number with its percent', async () => {
    const [, statement, answer] = await slides(
      name,
      '',
      `${COVER}::lamina\n  Quanto rende R$ 9,8 mil a 10 % ao ano?\n  A) R$ 980.\n  B) Nada.\n\n` +
        '::lamina {resposta}\n  Letra A\n  Rende R$ 980, ou 10 % de R$ 9,8 mil.\n\n::lamina {fecho}',
    );
    const glued = (text: string) => text.includes('R$ 9,8 mil') && text.includes('10 %');

    expect(glued(words(textNamed(statement, 'enunciado')))).toBe(true);
    expect(words(textNamed(answer, 'explicacao'))).toContain('R$ 980');
    expect(glued(words(textNamed(answer, 'explicacao')))).toBe(true);
  });
});
