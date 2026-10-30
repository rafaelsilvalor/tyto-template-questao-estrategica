/**
 * `questao-estrategica` — one exam question as a carousel of 1080×1350 slides: a cover naming
 * the exam, the statement with its options, the answer with its explanation, and a sign-off.
 *
 * One `::lamina` is one slide in Tyto, and a template cannot add slides of its own, so the
 * brief marks the cover (`{capa}`), the answer (`{resposta}`) and the sign-off (`{fecho}`); an
 * unmarked slide is the statement.
 *
 * The logo and the signature are the brand kit's (Tyto ADR 0063), placeholders without one.
 */

import { colorValue, frame, lineBreak, run, solid, text } from '@tyto/core/template';
import { drawLogo, oneInk, signatureOf } from '@tyto/house-style';
import { at, lines, plain } from '@tyto/template-kit';

import type { TemplateBuild, TemplateContext } from '@tyto/core';
import type { NodeDraft } from '@tyto/core/template';

/** The cover's words over its rule, when the brief writes no `titulo`. */
export const DEFAULT_TITLE = 'Questão de fixação';

/** The sign-off's title and paragraph, when the brief writes no `fecho`. */
export const DEFAULT_SIGN_OFF =
  'Curtiu?\nSalve o post para revisar e envie a um amigo que também estuda para concurso.';

/** The colours a configuration may change, by declared value name (Tyto ADR 0153). */
export const COLOR_DEFAULTS = {
  /** The cover's colour where the brief gives it no picture. */
  deep: '#00153d',
  /** The paper of every slide but the cover. */
  paper: '#ffffff',
  /** The words on the paper. */
  ink: '#081c3d',
} as const;

type ColorName = keyof typeof COLOR_DEFAULTS;

/** The numbers a configuration may change, by declared value name (Tyto ADR 0153). */
export const NUMBER_DEFAULTS = {} as const;

const FACE = { family: 'CircularXX', source: 'system' } as const;
const REGULAR = 400;
const BOLD = 700;
const BLACK = 900;

const SLIDE_WIDTH = 1080;
const MARGIN = 80;

export type Role = 'capa' | 'enunciado' | 'resposta' | 'fecho';

/** Which slide this `::lamina` is: the brief marks every one but the statement. */
export function roleOf(context: TemplateContext): Role {
  if (context.adjustments['capa'] === true) return 'capa';
  if (context.adjustments['resposta'] === true) return 'resposta';
  if (context.adjustments['fecho'] === true) return 'fecho';
  return 'enunciado';
}

export const build: TemplateBuild = (context: TemplateContext) => {
  const color = (name: ColorName) => colorValue(context, name, COLOR_DEFAULTS[name]);
  const role = roleOf(context);
  const dark = role === 'capa';
  const ink = dark ? '#ffffff' : color('ink');
  const words =
    role === 'capa'
      ? `${slotText(context, 'titulo', DEFAULT_TITLE)}\n${slideLines(context).join('\n')}`
      : role === 'fecho'
        ? slotText(context, 'fecho', DEFAULT_SIGN_OFF)
        : slideLines(context).join('\n');

  const children: NodeDraft[] = [
    at(MARGIN, 48, drawLogo(context.brand, 79, oneInk(ink))),
    textAt('texto', words, {
      x: MARGIN,
      y: 200,
      size: 40,
      weight: role === 'capa' ? BLACK : BOLD,
      color: ink,
    }),
    textAt('assinatura', signatureOf(context.brand), {
      x: 0,
      y: 1276,
      size: 15,
      weight: REGULAR,
      color: ink,
      width: SLIDE_WIDTH,
    }),
  ];
  return frame({
    format: context.format,
    size: context.size,
    idPrefix: context.idPrefix,
    background: solid(dark ? color('deep') : color('paper')),
    children,
  });
};

interface Placed {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly weight: number;
  readonly color: string;
  readonly width?: number;
}

/** A plain text, one run per line, its box `width` wide (the slide less its margins by default). */
function textAt(name: string, words: string, placed: Placed): NodeDraft {
  const style = { font: FACE, size: placed.size, weight: placed.weight, color: placed.color };
  const [first = '', ...others] = words.split('\n');
  return text({
    name,
    runs: [run(first, style), ...others.flatMap((line) => [lineBreak(), run(line, style)])],
    box: { w: placed.width ?? SLIDE_WIDTH - 2 * MARGIN },
    lineHeight: 1.2,
    transform: { x: placed.x, y: placed.y },
  });
}

/** This slide's written lines, trimmed, the empty ones dropped. */
function slideLines(context: TemplateContext): string[] {
  const value = context.slots['lamina']?.value;
  if (value?.kind !== 'rich-text') return [];
  return lines(value.text)
    .map((line) => plain(line).trim())
    .filter((line) => line !== '');
}

/** A rich-text slot's words as plain text, or the template's default when the brief left it out. */
function slotText(context: TemplateContext, name: string, fallback: string): string {
  const value = context.slots[name]?.value;
  if (value?.kind !== 'rich-text') return fallback;
  const words = plain(value.text).trim();
  return words === '' ? fallback : words;
}
