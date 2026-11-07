import { readFileSync } from 'node:fs';

import { defineTemplate, formatCatalogue, parseManifest } from '@tyto/core';
import { compileTemplate } from '@tyto/template-kit/testing';
import { describe, expect, it } from 'vitest';

import { build as engenharia } from '../src/engenharia.js';
import { build } from '../src/template.js';

/**
 * Marks written in the frontmatter (TYTO-633). Both templates draw `**…**` and `{cor:…}…{/}`
 * in `titulo` and `fecho`, and their manifests say so with `frontmatterMarks` (Tyto TYTO-622):
 * the host then raises no `W_MARKUP_IN_FRONTMATTER` for them, and `titulo`'s `max: 40` counts
 * the 18 characters drawn rather than the 48 written (Tyto TYTO-634). Without the key the
 * title was refused with `E_BAD_SLOT_VALUE` and the cover silently drew its default title.
 */

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
const formats = formatCatalogue({ grid: { w: 1080, h: 1350, kind: 'grid' } });

/** 48 characters written, 18 drawn: over `titulo`'s `max: 40` only when the marks count. */
const TITLE = 'Questão {cor:azul}de{/} {cor:vermelho}fixação{/}';

const brief = (name: string): string =>
  [
    '---',
    `template: ${name}`,
    'formats: [grid]',
    `titulo: ${TITLE}`,
    'fecho: Bons **estudos**',
    '---',
    '',
    '::lamina {capa}',
    '  QUINTEX – 2026',
    '',
    '::lamina',
    '  Qual documento organiza o atendimento?',
    '  A) O calendário anual.',
    '  B) O plano da escola.',
    '',
    '::lamina {resposta}',
    '  Letra B',
    '  O plano da escola organiza o atendimento.',
    '',
    '::lamina {fecho}',
    '',
  ].join('\n');

describe.each([
  ['questao-estrategica', build],
  ['questao-engenharia', engenharia],
] as const)('marks in the frontmatter of %s', (name, draw) => {
  const manifest = parseManifest(read(`../templates/${name}/manifest.yaml`), 'manifest.yaml');
  if (!manifest.ok) throw new Error(manifest.error.map((item) => item.message).join('\n'));
  const declared = manifest.value.values ?? {};
  const colour = (value: string): string => String(declared[value]?.default);

  it('draws the coloured title, with neither warning nor refusal', async () => {
    const result = await compileTemplate({
      brief: brief(name),
      template: defineTemplate(manifest.value, draw),
      formats,
    });
    if (!result.ok) throw new Error(result.error.map((item) => item.message).join('\n'));

    const codes = result.diagnostics.map((item) => item.code);
    expect(codes).not.toContain('W_MARKUP_IN_FRONTMATTER');
    expect(codes).not.toContain('E_BAD_SLOT_VALUE');

    // The cover: the marks drawn in the deep colour's swatches, and none of their syntax.
    const cover = result.value.frames[0]?.html ?? '';
    expect(cover).toMatch(new RegExp(`${colour('deep-mark-cor-azul')}[^<]*>de<`, 'i'));
    expect(cover).toMatch(new RegExp(`${colour('deep-mark-cor-vermelho')}[^<]*>fixação<`, 'i'));
    expect(cover).not.toContain('{cor:');
    expect(result.value.frames.map((slide) => slide.html).join('\n')).not.toContain('**');
  });
});
