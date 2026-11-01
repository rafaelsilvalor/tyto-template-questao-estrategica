import { readFileSync } from 'node:fs';

import { type FaceCache, defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build } from './template.js';

import type { Frame, SceneNode, SuppliedValues, TextNode } from '@tyto/core';

/**
 * The middle slides' rhythm (Tyto ADR 0167): blocks spaced by the reference's gaps in
 * proportion, centred between the logo and the footer, and no paragraph ending on one word.
 *
 * Measured against a face whose every character is half an em wide, standing in for CircularXX,
 * which CI does not have: the line breaks are then known, so the gaps can be read off the scene.
 * What CircularXX itself does is looked at in a render, outside this repository.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const manifest = parseManifest(
  read('../templates/questao-estrategica/manifest.yaml'),
  'manifest.yaml',
);
if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
const template = defineTemplate(manifest.value, build);
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

const faces: FaceCache = {
  get: (face) =>
    face.family === 'CircularXX'
      ? { advance: (characters: string) => characters.length * 0.5, contentHeight: 1 }
      : undefined,
};

/** The logo's foot and the footer's top: the room the middle blocks stand in. */
const ROOM = { top: 127, bottom: 1259 };
/** CircularXX's capitals and the room a line's content leaves over them, in em. */
const CAP_HEIGHT = 0.709;
const CAP_OFFSET = 0.75 - 0.709;

/** The explanation on the maintainer's screenshot, which ended on "princípio." alone. */
const EXPLANATION =
  'A gestão democrática pressupõe participação coletiva, diálogo, transparência e ' +
  'compartilhamento das decisões. Relações hierárquicas rígidas e decisões impostas ' +
  'verticalmente contrariam esse princípio.';

async function compiled(slides: string, values?: SuppliedValues) {
  const result = await compileTemplate({
    brief: `---\ntemplate: questao-estrategica\nformats: [grid]\n---\n${slides}`,
    template,
    formats,
    faces,
    ...(values === undefined ? {} : { values }),
  });
  if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));
  return result;
}

async function slide(slides: string, values?: SuppliedValues): Promise<Frame> {
  const result = await compiled(slides, values);
  const frame = result.value.scene.artworks[0]?.frames[0];
  if (frame === undefined) throw new Error('no frame');
  return frame;
}

function nodes(node: Frame | SceneNode): SceneNode[] {
  const children = 'children' in node ? node.children : [];
  return [
    ...('kind' in node && node.kind !== undefined ? [node as SceneNode] : []),
    ...children.flatMap(nodes),
  ];
}

function text(frame: Frame, name: string): TextNode {
  const found = nodes(frame).find((node) => node.name === name);
  if (found?.kind !== 'text') throw new Error(`no text ${name}`);
  return found;
}

function sizeOf(node: TextNode): number {
  const first = node.runs.find((run) => run.kind === 'text');
  return first?.kind === 'text' ? first.size : 0;
}

/** Where a text's capitals start, undoing the template's placement by the line's content. */
function capTop(node: TextNode): number {
  const size = sizeOf(node);
  return node.transform.y + size * ((node.lineHeight - 1) / 2 + CAP_OFFSET);
}

function lineCount(node: TextNode): number {
  return node.runs.filter((run) => run.kind === 'break').length + 1;
}

/** Where a text's last line stands: its baseline. */
function baseline(node: TextNode): number {
  const size = sizeOf(node);
  return capTop(node) + (lineCount(node) - 1) * size * node.lineHeight + size * CAP_HEIGHT;
}

function lastLineWords(node: TextNode): string[] {
  const lines: string[] = [''];
  for (const run of node.runs) {
    if (run.kind === 'break') lines.push('');
    else lines[lines.length - 1] += run.text;
  }
  return (lines.at(-1) ?? '').split(/\s+/u).filter((word) => word !== '');
}

describe('the answer slide’s rhythm', () => {
  const brief = `::lamina {resposta}\n  Letra D\n  ${EXPLANATION}\n`;

  it('keeps the reference’s gaps in proportion: 102 over the label, 165 under the answer', async () => {
    const frame = await slide(brief);
    const over = capTop(text(frame, 'rotulo')) - ROOM.top;
    const between = capTop(text(frame, 'explicacao')) - baseline(text(frame, 'resposta'));

    expect(between / over).toBeCloseTo(165 / 102, 6);
    // At the default gap floor, never closer than the reference.
    expect(over).toBeGreaterThanOrEqual(102 - 1e-6);
  });

  it('centres the heading and the explanation between the logo and the footer', async () => {
    const frame = await slide(brief);
    const over = capTop(text(frame, 'rotulo')) - ROOM.top;
    const under = ROOM.bottom - baseline(text(frame, 'explicacao'));

    expect(under).toBeCloseTo(over, 6);
  });

  it('grows the gaps together for a shorter explanation, the middle one still the largest', async () => {
    const long = await slide(brief);
    const short = await slide('::lamina {resposta}\n  Letra D\n  Uma frase curta e direta.\n');
    const overOf = (frame: Frame) => capTop(text(frame, 'rotulo')) - ROOM.top;

    expect(overOf(short)).toBeGreaterThan(overOf(long));
    const between = capTop(text(short, 'explicacao')) - baseline(text(short, 'resposta'));
    expect(between / overOf(short)).toBeCloseTo(165 / 102, 6);
  });

  it('centres an explanation that goes on from the slide before, which has no heading', async () => {
    const frame = await slide(`::lamina {resposta, continua}\n  ${EXPLANATION}\n`);
    const body = text(frame, 'explicacao');

    expect(ROOM.bottom - baseline(body)).toBeCloseTo(capTop(body) - ROOM.top, 6);
  });

  it('ends the screenshot’s explanation on more than one word, and reports nothing', async () => {
    const result = await compiled(brief);
    const frame = result.value.scene.artworks[0]!.frames[0]!;

    expect(lastLineWords(text(frame, 'explicacao')).length).toBeGreaterThan(1);
    expect(result.diagnostics.filter((item) => item.code === 'W_TEMPLATE_ORPHAN')).toEqual([]);
  });
});

describe('the statement slide’s rhythm', () => {
  const brief =
    '::lamina\n' +
    '  De acordo com o regulamento fictício do município de Vale Alto, qual documento ' +
    'organiza o atendimento aos estudantes que precisam de apoio na escola?\n' +
    '  A) O calendário anual.\n  B) O plano da escola.\n  C) O caderno de chamada.\n' +
    '  D) O mapa das salas de aula.\n' +
    '  E) O registro de visitas ao Sistema Municipal de Bibliotecas.\n';

  it('keeps the reference’s gaps in proportion: 70, 60 and 71', async () => {
    const frame = await slide(brief);
    const over = capTop(text(frame, 'rotulo')) - ROOM.top;
    const labelToBody = capTop(text(frame, 'enunciado')) - baseline(text(frame, 'rotulo'));
    const bodyToOptions = capTop(text(frame, 'alternativa-1')) - baseline(text(frame, 'enunciado'));

    expect(labelToBody / over).toBeCloseTo(60 / 70, 6);
    expect(bodyToOptions / over).toBeCloseTo(71 / 70, 6);
  });

  it('centres the label, the statement and the options between the logo and the footer', async () => {
    const frame = await slide(brief);
    const over = capTop(text(frame, 'rotulo')) - ROOM.top;
    const under = ROOM.bottom - baseline(text(frame, 'alternativa-5'));

    expect(under).toBeCloseTo(over, 6);
  });
});

describe('orphans past the limits', () => {
  // A paragraph whose fitted setting ends on one word, under the half-em face: found by
  // turning both limits off, which leaves the template nothing to move.
  const off = { 'orphan-shrink': { value: 0 }, 'orphan-tracking': { value: 0 } };

  it('draws the slide and names the word in W_TEMPLATE_ORPHAN when no limit is left', async () => {
    const result = await compiled(`::lamina {resposta}\n  Letra D\n  ${ORPHANED}\n`, off);
    const frame = result.value.scene.artworks[0]!.frames[0]!;

    expect(lastLineWords(text(frame, 'explicacao'))).toEqual(['princípio.']);
    expect(
      result.diagnostics
        .filter((item) => item.code === 'W_TEMPLATE_ORPHAN')
        .map((item) => item.message),
    ).toEqual([
      "Artwork 'lamina-1' ends a paragraph on the single word 'princípio.' in format 'grid': no size or letter spacing within the template's limits moved another word down to it.",
    ]);
  });

  it('clears the same paragraph with the default limits, which is the control', async () => {
    const result = await compiled(`::lamina {resposta}\n  Letra D\n  ${ORPHANED}\n`);
    const frame = result.value.scene.artworks[0]!.frames[0]!;

    expect(lastLineWords(text(frame, 'explicacao')).length).toBeGreaterThan(1);
    expect(result.diagnostics.map((item) => item.code)).not.toContain('W_TEMPLATE_ORPHAN');
  });
});

describe('an option’s orphan', () => {
  // An option that wraps and, at the statement's fitted size, leaves its last word alone; the
  // statement's own size is not the option's to change, so only its letter spacing moves.
  const option =
    'O registro de visitas ao Sistema Municipal de Bibliotecas Públicas e Escolares da região metropolitana';
  const brief = `::lamina
  Qual documento organiza o atendimento?
  A) O calendário anual.
  B) ${option}
`;
  const off = { 'orphan-shrink': { value: 0 }, 'orphan-tracking': { value: 0 } };
  const named = (diagnostics: readonly { code: string; message: string }[]) =>
    diagnostics.filter(
      (item) => item.code === 'W_TEMPLATE_ORPHAN' && item.message.includes("'metropolitana'"),
    );

  it('names the option’s last word when no limit is left', async () => {
    const result = await compiled(brief, off);

    expect(named(result.diagnostics)).toHaveLength(1);
  });

  it('clears it by letter spacing with the default limits', async () => {
    const result = await compiled(brief);
    const frame = result.value.scene.artworks[0]!.frames[0]!;

    expect(named(result.diagnostics)).toEqual([]);
    expect(lastLineWords(text(frame, 'alternativa-2')).length).toBeGreaterThan(1);
    expect(text(frame, 'alternativa-2').letterSpacing).not.toBe(0);
  });
});

/**
 * The screenshot's explanation: under the half-em face, its fitted setting ends on
 * "princípio." alone, and the default limits clear it. Found by compiling growing prefixes of a
 * longer paragraph both ways; 5 of 41 prefixes behave so, this one among them.
 */
const ORPHANED = EXPLANATION;
