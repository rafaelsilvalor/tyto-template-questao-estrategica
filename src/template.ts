/**
 * `questao-estrategica` — one exam question as a carousel of 1080×1350 slides.
 *
 * ## The four slides
 *
 * | slide     | the brief writes           | drawn                                                   |
 * | --------- | -------------------------- | ------------------------------------------------------- |
 * | cover     | `::lamina {capa}`          | the title over a rule, the exam's lines, "swipe" arrow  |
 * | statement | `::lamina` with its lines  | "Enunciado:", the statement, an image, the options      |
 * | answer    | `::lamina {resposta}`      | "Resposta", the answer in large, the explanation        |
 * | sign-off  | `::lamina {fecho}`, empty  | the sign-off's title and paragraph, the like bar        |
 *
 * One `::lamina` is one slide in Tyto, and a template cannot add slides of its own, so the
 * brief marks every slide but the statement. Each slide is numbered `01 I 04` from its place.
 *
 * Every position is the reference art's (the maintainer's PSD), in the slide's pixels: a text
 * is placed by the top of its capitals, as the reference's layer bounds give it. The logo and
 * the signature are the brand kit's (Tyto ADR 0063), placeholders without one; every colour is
 * a declared value (Tyto ADR 0153) whose default is the reference's.
 */

import {
  colorValue,
  numberValue,
  frame,
  image,
  lineBreak,
  rect,
  run,
  runsOf,
  solid,
  text,
  vector,
} from '@tyto/core/template';
import { drawLogo, oneInk, sealOf, signatureOf } from '@tyto/house-style';
import { at, imageHeight, lines, plain, reportOverflow, sealed } from '@tyto/template-kit';

import type { AssetRef, RichText, TemplateBuild, TemplateContext, TextRun } from '@tyto/core';
import type { NodeDraft } from '@tyto/core/template';

/* -------------------------------------------------------------------------- the words -- */

/** The cover's words over its rule, when the brief writes no `titulo`. */
export const DEFAULT_TITLE = 'Questão de fixação';

/** The sign-off's title, then its paragraph, when the brief writes no `fecho`. */
export const DEFAULT_SIGN_OFF_TITLE = 'Curtiu?';
export const DEFAULT_SIGN_OFF_BOLD = 'Salve o post para revisar';
export const DEFAULT_SIGN_OFF_REST = ' e envie a um amigo que também estuda para concurso.';

/** The fixed words over the statement and the answer, and the cover's call to swipe. */
const STATEMENT_LABEL = 'Enunciado:';
const ANSWER_LABEL = 'Resposta';
const SWIPE = 'Arraste para o lado';

/* ------------------------------------------------------------------------- the tokens -- */

/** The colours a configuration may change, by declared value name, each the reference's. */
export const COLOR_DEFAULTS = {
  /** The cover's colour where the brief gives it no picture. */
  deep: '#00153d',
  /** The cover's title, its rule and its slide number. */
  accent: '#1d9ad5',
  /** The cover's other words, its arrow and its logo. */
  'on-deep': '#ffffff',
  /** The paper of every slide but the cover. */
  paper: '#ffffff',
  /** The headings, the options' letters, the logo, the numbers, the arrows, the frame. */
  'title-ink': '#081c3d',
  /** The statement, the options and the explanation. */
  'body-ink': '#4d4d4d',
  /** The sign-off's paragraph. */
  'closing-ink': '#676767',
  /** The like bar under the sign-off, and its icons. */
  'bar-fill': '#e2e2e2',
  'bar-ink': '#4c4c4c',
} as const;

type ColorName = keyof typeof COLOR_DEFAULTS;
type Ink = (name: ColorName) => string;

/** The numbers a configuration may change, by declared value name (Tyto ADR 0153). */
export const NUMBER_DEFAULTS = {
  /** The smallest the cover's exam lines are set; a longer title overflows, reported. */
  'exam-floor': 56,
  /** The largest the cover's exam lines are set, for a short title. */
  'exam-ceiling': 112,
  /** The statement's size range; its options follow it, at the reference's 37.5 to 40. */
  'statement-floor': 28,
  'statement-ceiling': 48,
  /** The answer's explanation's size range. */
  'explanation-floor': 32,
  'explanation-ceiling': 76,
} as const;

const FACE = { family: 'CircularXX', source: 'system' } as const;
const LIGHT = 300;
const REGULAR = 400;
const MEDIUM = 500;
const BOLD = 700;
/** The reference sets "Curtiu?" in ExtraBlack, which Tyto has no face for: Black, the maintainer's call. */
const BLACK = 900;

/**
 * CircularXX's vertical metrics, in em, from its `OS/2` table and the same in every weight: a
 * line of height `lineHeight` puts the content area in its middle, so the capitals start this
 * far below the line's top (measured on concursos-abertos against its reference art).
 */
const ASCENT = 0.75;
const DESCENT = 0.25;
const CAP_HEIGHT = 0.709;

function capOffset(size: number, lineHeight: number): number {
  return size * ((lineHeight - (ASCENT + DESCENT)) / 2 + (ASCENT - CAP_HEIGHT));
}

const SLIDE_WIDTH = 1080;
/** The top of the arrows and the numbers at every slide's foot. */
const FOOTER_TOP = 1259;
/** A glyph's advance, in em, for when nothing can be measured (a test, CI without the face). */
const ESTIMATED_ADVANCE = 0.5;

/* --------------------------------------------------------------------------- the build -- */

export type Role = 'capa' | 'enunciado' | 'resposta' | 'fecho';

/** Which slide this `::lamina` is: the brief marks every one but the statement. */
export function roleOf(context: TemplateContext): Role {
  if (context.adjustments['capa'] === true) return 'capa';
  if (context.adjustments['resposta'] === true) return 'resposta';
  if (context.adjustments['fecho'] === true) return 'fecho';
  return 'enunciado';
}

export const build: TemplateBuild = (context: TemplateContext) => {
  const ink: Ink = (name) => colorValue(context, name, COLOR_DEFAULTS[name]);
  const role = roleOf(context);
  const last = context.artwork.index === context.artwork.count - 1;
  // The house's seal, the brief's `selo`, glued to the last slide's foot (TYTO-201): the
  // numbers and the signature rise by its band and keep their distance to the foot.
  const page = sealed(context.size, sealOf(context));
  const lift = context.size.h - page.size.h;

  if (role === 'capa') {
    const picture = context.slots['fundo']?.value;
    return frame({
      format: context.format,
      size: context.size,
      idPrefix: context.idPrefix,
      background: solid(ink('deep')),
      children: [
        ...(picture?.kind === 'image'
          ? [image({ name: 'fundo', asset: picture.asset, size: context.size, fit: 'cover' })]
          : []),
        at(80, 72, drawLogo(context.brand, 62, oneInk(ink('on-deep')))),
        ...cover(context, ink, last, lift),
        ...page.seal,
      ],
    });
  }

  const body =
    role === 'resposta'
      ? answer(context, ink, lift)
      : role === 'fecho'
        ? signOff(context, ink)
        : statement(context, ink, lift);
  return frame({
    format: context.format,
    size: context.size,
    idPrefix: context.idPrefix,
    background: solid(ink('paper')),
    children: [
      at(80, 48, drawLogo(context.brand, 79, oneInk(ink('title-ink')))),
      ...body,
      slideNumber(context, {
        capTop: 1261 - lift,
        current: ink('title-ink'),
        total: ink('title-ink'),
      }),
      ...(last
        ? []
        : [arrow({ x: 877, y: FOOTER_TOP, w: 151, h: 28, shaft: 7.5 }, ink('title-ink'))]),
      ...page.seal,
    ],
  });
};

/* --------------------------------------------------------------------------- the cover -- */

function cover(context: TemplateContext, ink: Ink, last: boolean, lift: number): NodeDraft[] {
  return [
    textAt('titulo', slotText(context, 'titulo', DEFAULT_TITLE), {
      x: 82,
      capTop: 273,
      size: 86.17,
      weight: BLACK,
      color: ink('accent'),
      width: SLIDE_WIDTH - 85 - 40,
    }),
    rect({
      name: 'regua',
      size: { w: 919, h: 10 },
      fill: solid(ink('accent')),
      transform: { x: 81, y: 388 },
    }),
    examLines(context, ink('on-deep'), lift),
    slideNumber(context, { capTop: 1162 - lift, current: ink('accent'), total: ink('on-deep') }),
    ...(last
      ? []
      : [
          textAt('arraste', SWIPE, {
            x: 677,
            capTop: 1167,
            size: 25,
            weight: REGULAR,
            color: ink('on-deep'),
            letterSpacing: 0.5,
          }),
          arrow({ x: 912, y: 1164, w: 76, h: 26, shaft: 7 }, ink('on-deep')),
        ]),
    textAt('assinatura', signatureOf(context.brand), {
      x: 0,
      capTop: 1277 - lift,
      size: 14.58,
      weight: REGULAR,
      color: ink('on-deep'),
      width: SLIDE_WIDTH,
      align: 'center',
      letterSpacing: 6.42,
    }),
  ];
}

/** The cover's exam lines: where they start, how wide they may run, where their room ends. */
const EXAM = {
  x: 85,
  capTop: 573,
  /** The reference's 93.28 px lines are 129 px apart: the pitch keeps that ratio at any size. */
  lineHeight: 129 / 93.28,
  /** The reference's widest exam line is 898 px: a few pixels past it, no more. */
  width: 903,
  /** 80 px over the slide's number. */
  bottom: 1162 - 80,
  /** A capital's advance, in em, for when nothing can be measured (a test, CI without the face). */
  estimatedAdvance: 0.6,
} as const;

/**
 * The exam's lines on the cover, at the largest size between `exam-floor` and `exam-ceiling`
 * that keeps them in their room: a short title grows to fill it and a long one shrinks, so the
 * cover keeps a balance of words and empty space (the maintainer, 2026-10-30). First the size
 * that keeps every line as the brief writes it; when none does, the size at which the lines may
 * wrap between words; when not even the floor fits, the floor, reported as an overflow.
 */
function examLines(context: TemplateContext, color: string, lift: number): NodeDraft {
  const written = slideLines(context);
  const floor = numberValue(context, 'exam-floor', NUMBER_DEFAULTS['exam-floor']);
  const ceiling = Math.max(
    floor,
    numberValue(context, 'exam-ceiling', NUMBER_DEFAULTS['exam-ceiling']),
  );
  const bottom = EXAM.bottom - lift;
  const draft = (size: number) =>
    textAt('prova', written.join('\n'), {
      x: EXAM.x,
      capTop: EXAM.capTop,
      size,
      weight: BOLD,
      color,
      lineHeight: EXAM.lineHeight,
      width: EXAM.width,
    });
  const layout = (size: number): { readonly lines: number; readonly width: number } => {
    const node = draft(size);
    const measured = node.kind === 'text' ? context.measure(node) : undefined;
    if (measured !== undefined) return measured;
    const widest = Math.max(0, ...written.map((line) => [...line].length));
    return { lines: written.length, width: widest * EXAM.estimatedAdvance * size };
  };
  const foot = (size: number, lines: number) =>
    EXAM.capTop + (lines - 1) * size * EXAM.lineHeight + size * CAP_HEIGHT;

  const sizes: number[] = [];
  for (let size = Math.floor(ceiling); size >= floor; size -= 1) sizes.push(size);
  const fits = (size: number, keepLines: boolean) => {
    const laid = layout(size);
    return (
      laid.width <= EXAM.width + 0.5 &&
      foot(size, laid.lines) <= bottom &&
      (!keepLines || laid.lines <= Math.max(1, written.length))
    );
  };
  const chosen = sizes.find((size) => fits(size, true)) ?? sizes.find((size) => fits(size, false));
  if (chosen !== undefined) return draft(chosen);
  reportOverflow(context.report, foot(floor, layout(floor).lines), bottom);
  return draft(floor);
}

/* ----------------------------------------------------------------------- the statement -- */

/** The statement slide's numbers, the reference's. */
const STATEMENT = {
  x: 131,
  labelTop: 197,
  labelSize: 45.83,
  /** From the label's capitals to the statement's. */
  labelToBody: 93,
  bodySize: 40,
  bodyLineHeight: 1.5,
  bodyWidth: 810,
  /** From the statement's last capitals to the first option's. */
  bodyToOptions: 99,
  /** An option's letter stands on the statement's left edge (the maintainer, 2026-10-30). */
  optionX: 131,
  /** Where an option's words start, after its letter. */
  optionTextX: 177,
  optionSize: 37.5,
  optionLineHeight: 1.2,
  optionWidth: 786,
  /** From one option's last line's capitals to the next option's first. */
  optionPitch: 74.25,
  /** The lowest an option may end: 40 px over the arrow. */
  limit: FOOTER_TOP - 40,
} as const;

/** An option line: `A) words`, the letter one to three characters before a `)`. */
const OPTION = /^\s*([A-Za-z]{1,3}\))\s*(.*)$/;

function statement(context: TemplateContext, ink: Ink, lift: number): NodeDraft[] {
  const all = slideRichLines(context);
  const firstOption = all.findIndex((line) => OPTION.test(plain(line)));
  const body = firstOption < 0 ? all : all.slice(0, firstOption);
  const options = firstOption < 0 ? [] : all.slice(firstOption);

  // A statement that goes on from the slide before (`{continua}`) draws no label: its words
  // start where the label would.
  const continued = context.adjustments['continua'] === true;
  const label: NodeDraft[] = continued
    ? []
    : [
        textAt('rotulo', STATEMENT_LABEL, {
          x: STATEMENT.x,
          capTop: STATEMENT.labelTop,
          size: STATEMENT.labelSize,
          weight: BLACK,
          color: ink('title-ink'),
        }),
      ];
  const bodyTop = continued ? STATEMENT.labelTop : STATEMENT.labelTop + STATEMENT.labelToBody;
  const picture = pictureOf(context);

  /** The statement, its image and its options with the statement set at `size`. */
  const layout = (size: number): Laid => {
    // The options, their letters and the gaps are the reference's, in proportion to its 40 px.
    const scale = size / STATEMENT.bodySize;
    const optionSize = STATEMENT.optionSize * scale;
    const nodes: NodeDraft[] = [];
    // A slide of options alone (a statement continued) starts them where the words would start.
    let foot = bodyTop - FRAME.gap;
    let optionTop = bodyTop;
    if (body.length > 0) {
      const style = { font: FACE, size, weight: LIGHT, color: ink('body-ink') };
      const draft = richAt('enunciado', body, style, {
        x: STATEMENT.x,
        capTop: bodyTop,
        lineHeight: STATEMENT.bodyLineHeight,
        width: STATEMENT.bodyWidth,
      });
      nodes.push(draft);
      const count = lineCount(context, draft, body, size, STATEMENT.bodyWidth);
      const lastTop = bodyTop + (count - 1) * size * STATEMENT.bodyLineHeight;
      foot = lastTop + size * CAP_HEIGHT;
      optionTop = lastTop + STATEMENT.bodyToOptions * scale;
    }

    if (picture !== undefined) {
      const framed = framedImage(picture, { x: FRAME_X, y: foot + FRAME.gap }, ink);
      nodes.push(...framed.nodes);
      foot = framed.foot;
      optionTop = foot + FRAME.gap;
    }

    const textX = STATEMENT.optionX + (STATEMENT.optionTextX - STATEMENT.optionX) * scale;
    const width = STATEMENT.optionWidth - (textX - STATEMENT.optionTextX);
    for (const [index, line] of options.entries()) {
      const [, letter = '', rest = ''] = OPTION.exec(plain(line)) ?? [];
      const words = textAt(`alternativa-${index + 1}`, rest, {
        x: textX,
        capTop: optionTop,
        size: optionSize,
        weight: LIGHT,
        color: ink('body-ink'),
        lineHeight: STATEMENT.optionLineHeight,
        width,
      });
      nodes.push(
        textAt(`letra-${index + 1}`, letter, {
          x: STATEMENT.optionX,
          capTop: optionTop,
          size: optionSize,
          weight: MEDIUM,
          color: ink('title-ink'),
          lineHeight: STATEMENT.optionLineHeight,
        }),
        words,
      );
      const count = lineCount(context, words, [rest], optionSize, width);
      const lastTop = optionTop + (count - 1) * optionSize * STATEMENT.optionLineHeight;
      foot = lastTop + optionSize * CAP_HEIGHT;
      optionTop = lastTop + STATEMENT.optionPitch * scale;
    }
    return { nodes, foot };
  };

  const laid = largestThatFits(context, 'statement', layout, STATEMENT.limit - lift);
  return [...label, ...laid.nodes];
}

/** What a slide's middle comes to at one size: its nodes, and where the lowest of them ends. */
interface Laid {
  readonly nodes: NodeDraft[];
  readonly foot: number;
}

/**
 * The layout at the largest size between the `<name>-floor` and `<name>-ceiling` values whose
 * foot stays over `limit`: short words grow to fill the slide and long ones shrink, as the
 * cover's exam lines do (the maintainer, 2026-10-30). When not even the floor fits, the floor,
 * reported as an overflow.
 */
function largestThatFits(
  context: TemplateContext,
  name: 'statement' | 'explanation',
  layout: (size: number) => Laid,
  limit: number,
): Laid {
  const floor = numberValue(context, `${name}-floor`, NUMBER_DEFAULTS[`${name}-floor`]);
  const ceiling = Math.max(
    floor,
    numberValue(context, `${name}-ceiling`, NUMBER_DEFAULTS[`${name}-ceiling`]),
  );
  for (let size = Math.floor(ceiling); size >= floor; size -= 1) {
    const laid = layout(size);
    if (laid.foot <= limit) return laid;
  }
  const laid = layout(floor);
  reportOverflow(context.report, laid.foot, limit);
  return laid;
}

/** The image's frame: where it stands, how wide, and its gap to the words over and under it. */
const FRAME = {
  w: 835,
  /** The border on the top, the right and the foot. */
  border: 4,
  /** The bar down the left side, border included. */
  side: 29,
  /** The radius of the white area's two left corners, where it meets the bar. */
  radius: 32,
  gap: 48,
} as const;

/** Where a statement's frame stands: its left bar 8 px left of the words, as the reference. */
const FRAME_X = 123;

/**
 * The shapes a frame may take, as width over height: from a 3:1 band to a square, the range the
 * hand-written `{proporcao}` of v0.2.0 offered. A taller picture is fitted whole into a square,
 * because a frame taller than wide leaves the statement no room on a 1080×1350 slide.
 */
export const FRAME_SHAPES = { widest: 3, tallest: 1 } as const;

/**
 * The proportions a slide may still write, `{proporcao: 2x1}`, as width over height. Since Tyto
 * 0.12 the host measures the file (ADR 0158) and its size wins; the proportion written is the
 * frame's shape only for a picture the host could not measure, 2:1 when the slide writes none.
 */
export const PROPORTIONS = {
  '3x1': 3,
  '5x2': 2.5,
  '7x3': 7 / 3,
  '2x1': 2,
  '16x9': 16 / 9,
  '3x2': 1.5,
  '4x3': 4 / 3,
  '1x1': 1,
} as const;
const DEFAULT_PROPORTION = '2x1';

interface Picture {
  readonly asset: AssetRef;
  /** The shape the slide writes, width over height: the frame's when the file has no size. */
  readonly written: number;
}

/**
 * The image a middle slide shows: `{imagem: 1}` picks the brief's `imagem-1`, and
 * `{proporcao: …}`, if written, is its shape for when the host could not measure it. Nothing
 * when the slide names no image or the brief left that slot out.
 */
function pictureOf(context: TemplateContext): Picture | undefined {
  const which = context.adjustments['imagem'];
  if (typeof which !== 'string') return undefined;
  const value = context.slots[`imagem-${which}`]?.value;
  if (value?.kind !== 'image') return undefined;
  const written = context.adjustments['proporcao'];
  const proportion = (
    typeof written === 'string' && written in PROPORTIONS ? written : DEFAULT_PROPORTION
  ) as keyof typeof PROPORTIONS;
  return { asset: value.asset, written: PROPORTIONS[proportion] };
}

/**
 * An image in the reference's frame, measured on it: a 4 px border in the title's ink on the
 * top, the right and the foot, a 29 px bar down the left, and the white area's two left corners
 * rounded where they meet the bar. The frame is as tall as the picture's own shape makes it at
 * the frame's width (Tyto ADR 0158), or as the slide's `{proporcao}` when the host could not
 * measure it, held between `FRAME_SHAPES`, and the image is fitted whole inside.
 *
 * The rounding is drawn over the image, as two corner pieces in the frame's ink, so a photo
 * that fills the area is cut to the same corners the white area has.
 */
function framedImage(
  picture: Picture,
  at: { readonly x: number; readonly y: number },
  ink: Ink,
): { readonly nodes: NodeDraft[]; readonly foot: number } {
  const width = FRAME.w - FRAME.side - FRAME.border;
  const natural = imageHeight(picture.asset, width, width / picture.written);
  const clamped = Math.min(
    width / FRAME_SHAPES.tallest,
    Math.max(width / FRAME_SHAPES.widest, natural),
  );
  const size = { w: width, h: Math.round(clamped) };
  const height = size.h + 2 * FRAME.border;
  const inside = { x: at.x + FRAME.side, y: at.y + FRAME.border };
  const r = FRAME.radius;
  const corner = (name: string, d: string, y: number): NodeDraft =>
    vector({
      name,
      geometry: { kind: 'path', d, fillRule: 'nonzero' },
      size: { w: r, h: r },
      fill: solid(ink('title-ink')),
      transform: { x: inside.x, y },
    });
  return {
    nodes: [
      // The reference's shadow is narrower than the frame. A spread draws that since Tyto 0.12,
      // but its HTML filter blurs half as wide as `drop-shadow()` (Tyto TYTO-500) and tints the
      // frame (TYTO-501): until both land, a smaller shape hidden behind the frame casts it.
      rect({
        name: 'sombra',
        size: { w: FRAME.w - 2 * SHADOW_INSET, h: height - 2 * SHADOW_INSET },
        fill: solid(ink('title-ink')),
        effects: [SHADOW],
        transform: { x: at.x + SHADOW_INSET, y: at.y + SHADOW_INSET },
      }),
      rect({
        name: 'moldura',
        size: { w: FRAME.w, h: height },
        fill: solid(ink('title-ink')),
        transform: { x: at.x, y: at.y },
      }),
      rect({ name: 'fundo-imagem', size, fill: solid(ink('paper')), transform: inside }),
      image({ name: 'imagem', asset: picture.asset, size, fit: 'contain', transform: inside }),
      corner('canto-superior', `M0 0H${r}A${r} ${r} 0 0 0 0 ${r}Z`, inside.y),
      corner('canto-inferior', `M0 0A${r} ${r} 0 0 0 ${r} ${r}H0Z`, inside.y + size.h - r),
    ],
    foot: at.y + height,
  };
}

/**
 * The frame's shadow, measured on the reference: under the frame it holds 16 % dark for 10 px
 * and is gone 50 px down; beside it, it fades out within 18 px; it starts about 40 px in from
 * the left and casts nothing above. Cast by a shape `SHADOW_INSET` smaller on every side.
 */
const SHADOW_INSET = 20;
const SHADOW = {
  kind: 'shadow',
  x: 17,
  y: 47,
  blur: 12,
  spread: 0,
  color: { r: 0, g: 0, b: 0, a: 0.16 },
} as const;

/* -------------------------------------------------------------------------- the answer -- */

/** The answer slide's numbers, the reference's. */
const ANSWER = {
  x: 80,
  labelTop: 229,
  labelSize: 45.06,
  answerTop: 288,
  answerSize: 103,
  bodyTop: 526,
  bodySize: 68.09,
  bodyLineHeight: 1.5,
  bodyWidth: 840,
  limit: FOOTER_TOP - 40,
} as const;

function answer(context: TemplateContext, ink: Ink, lift: number): NodeDraft[] {
  // An explanation that goes on from the slide before (`{continua}`) draws no label and no
  // answer: every line is explanation, from where the label would stand.
  const continued = context.adjustments['continua'] === true;
  const written = slideRichLines(context);
  const first = continued ? undefined : written[0];
  const rest = continued ? written : written.slice(1);
  const bodyTop = continued ? ANSWER.labelTop : ANSWER.bodyTop;
  const picture = pictureOf(context);

  /** The explanation and its image with the explanation set at `size`. */
  const layout = (size: number): Laid => {
    const nodes: NodeDraft[] = [];
    let foot = bodyTop - FRAME.gap;
    if (rest.length > 0) {
      const style = { font: FACE, size, weight: LIGHT, color: ink('body-ink') };
      const body = richAt('explicacao', rest, style, {
        x: ANSWER.x,
        capTop: bodyTop,
        lineHeight: ANSWER.bodyLineHeight,
        width: ANSWER.bodyWidth,
      });
      nodes.push(body);
      const count = lineCount(context, body, rest, size, ANSWER.bodyWidth);
      const lastTop = bodyTop + (count - 1) * size * ANSWER.bodyLineHeight;
      foot = lastTop + size * CAP_HEIGHT;
    }
    if (picture !== undefined) {
      const framed = framedImage(picture, { x: ANSWER.x, y: foot + FRAME.gap }, ink);
      nodes.push(...framed.nodes);
      foot = framed.foot;
    }
    return { nodes, foot };
  };

  const laid = largestThatFits(context, 'explanation', layout, ANSWER.limit - lift);
  if (continued) return laid.nodes;
  return [
    textAt('rotulo', ANSWER_LABEL, {
      x: ANSWER.x,
      capTop: ANSWER.labelTop,
      size: ANSWER.labelSize,
      weight: BLACK,
      color: ink('title-ink'),
    }),
    textAt('resposta', first === undefined ? '' : plain(first).trim(), {
      x: ANSWER.x,
      capTop: ANSWER.answerTop,
      size: ANSWER.answerSize,
      weight: BLACK,
      color: ink('title-ink'),
    }),
    ...laid.nodes,
  ];
}

/* ------------------------------------------------------------------------ the sign-off -- */

/** The sign-off slide's numbers, the reference's. */
const SIGN_OFF = {
  titleTop: 375,
  titleSize: 107.66,
  paragraphX: 190,
  paragraphTop: 561,
  paragraphSize: 51.94,
  paragraphLineHeight: 1.6,
  paragraphWidth: 700,
} as const;

function signOff(context: TemplateContext, ink: Ink): NodeDraft[] {
  // The first line is the title, the rest the paragraph. A `::fecho` directive arrives parsed,
  // its lines and its bold already marked; the frontmatter hands its words over as written, so
  // there the lines and the `**bold**` are read here.
  const value = context.slots['fecho']?.value;
  const parsed =
    value?.kind === 'rich-text'
      ? lines(value.text).filter((line) => plain(line).trim() !== '')
      : [];
  const written = slotText(context, 'fecho', '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  const [title = DEFAULT_SIGN_OFF_TITLE, ...paragraph] = written;
  const style = {
    font: FACE,
    size: SIGN_OFF.paragraphSize,
    weight: LIGHT,
    color: ink('closing-ink'),
  };
  const words =
    written.length === 0
      ? `**${DEFAULT_SIGN_OFF_BOLD}**${DEFAULT_SIGN_OFF_REST}`
      : paragraph.join('\n');
  const box = {
    x: SIGN_OFF.paragraphX,
    capTop: SIGN_OFF.paragraphTop,
    lineHeight: SIGN_OFF.paragraphLineHeight,
    width: SIGN_OFF.paragraphWidth,
    align: 'center' as const,
  };
  return [
    textAt('fecho-titulo', title, {
      x: 0,
      capTop: SIGN_OFF.titleTop,
      size: SIGN_OFF.titleSize,
      weight: BLACK,
      color: ink('title-ink'),
      width: SLIDE_WIDTH,
      align: 'center',
    }),
    parsed.length > 1
      ? richAt('fecho-texto', parsed.slice(1), style, box)
      : textRuns('fecho-texto', boldRuns(words, style), { ...box, size: style.size }),
    ...likeBar(ink),
  ];
}

/** Plain words into runs: `**…**` set Bold, a line break kept as one. */
function boldRuns(words: string, style: RunStyle): TextRun[] {
  return words.split('\n').flatMap((line, index) => [
    ...(index > 0 ? [lineBreak()] : []),
    ...line
      .split(/\*\*/)
      .map((piece, part) => ({ piece, bold: part % 2 === 1 }))
      .filter(({ piece }) => piece !== '')
      .map(({ piece, bold }) => run(piece, bold ? { ...style, weight: BOLD } : style)),
  ]);
}

/** The bar of like, comment, share and save under the sign-off, the reference's. */
function likeBar(ink: Ink): NodeDraft[] {
  const icon = (name: string, x: number, d: string, filled: boolean, w: number): NodeDraft =>
    vector({
      name,
      geometry: { kind: 'path', d, fillRule: 'nonzero' },
      size: { w, h: 35 },
      ...(filled
        ? { fill: solid(ink('bar-ink')) }
        : {
            // An outline: without a fill the exporter paints the inside black.
            fill: solid(ink('bar-fill')),
            stroke: { paint: solid(ink('bar-ink')), width: 3, align: 'center' },
          }),
      transform: { x, y: 919 },
    });
  return [
    rect({
      name: 'barra',
      size: { w: 546, h: 95 },
      radius: 47.5,
      fill: solid(ink('bar-fill')),
      transform: { x: 269, y: 886 },
    }),
    icon('curtir', 342, HEART, true, 40),
    icon('comentar', 469, BUBBLE, false, 39),
    icon('enviar', 596, PLANE, false, 35),
    icon('salvar', 718, BOOKMARK, false, 24),
  ];
}

const HEART =
  'M20 34C20 34 1 22.5 1 11C1 5 5.5 1 11 1C15 1 18.5 3.5 20 7C21.5 3.5 25 1 29 1C34.5 1 39 5 39 11C39 22.5 20 34 20 34Z';
const BUBBLE =
  'M19.5 2C29.5 2 37 8.5 37 16.5C37 24.5 29.5 31 19.5 31C17 31 14.5 30.6 12.3 29.8L5 33L7 26.5C3.9 23.9 2 20.4 2 16.5C2 8.5 9.5 2 19.5 2Z';
const PLANE = 'M33 2L2 14L15 19L20 33L33 2Z M15 19L33 2';
const BOOKMARK = 'M2 2H22V33L12 24L2 33Z';

/* -------------------------------------------------------------------------- the shared -- */

/** `01 I 04` from the slide's place in the carousel: the current number bold. */
function slideNumber(
  context: TemplateContext,
  placed: { readonly capTop: number; readonly current: string; readonly total: string },
): NodeDraft {
  const pad = (value: number) => String(value).padStart(2, '0');
  const size = 29.34;
  const style = { font: FACE, size, weight: REGULAR };
  return textRuns(
    'numero',
    [
      run(pad(context.artwork.index + 1), { ...style, weight: BOLD, color: placed.current }),
      run(' I ', { ...style, color: placed.current }),
      run(pad(context.artwork.count), { ...style, color: placed.total }),
    ],
    { x: 82, capTop: placed.capTop, size, lineHeight: 1, letterSpacing: -1.17 },
  );
}

interface ArrowBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  /** The head's height; the shaft is centred on it. */
  readonly h: number;
  readonly shaft: number;
}

/** The arrow pointing to the next slide: a shaft and a triangular head 0.64 of its height long. */
function arrow(box: ArrowBox, color: string): NodeDraft {
  const head = Math.round(box.h * 0.64);
  const top = (box.h - box.shaft) / 2;
  const neck = box.w - head;
  const d = `M0 ${top}H${neck}V0L${box.w} ${box.h / 2}L${neck} ${box.h}V${top + box.shaft}H0Z`;
  return vector({
    name: 'seta',
    geometry: { kind: 'path', d, fillRule: 'nonzero' },
    size: { w: box.w, h: box.h },
    fill: solid(color),
    transform: { x: box.x, y: box.y },
  });
}

type RunStyle = Parameters<typeof runsOf>[1];

interface Box {
  readonly x: number;
  /** Where the capitals start, in the slide's pixels. */
  readonly capTop: number;
  readonly lineHeight?: number;
  readonly width?: number;
  readonly align?: 'left' | 'center';
  readonly letterSpacing?: number;
}

interface Placed extends Box {
  readonly size: number;
  readonly weight: number;
  readonly color: string;
}

/** A plain text, one run per line, placed by the top of its capitals. */
function textAt(name: string, words: string, placed: Placed): NodeDraft {
  const style = { font: FACE, size: placed.size, weight: placed.weight, color: placed.color };
  const [first = '', ...others] = words.split('\n');
  return textRuns(
    name,
    [run(first, style), ...others.flatMap((line) => [lineBreak(), run(line, style)])],
    placed,
  );
}

/** Rich lines (bold kept as Bold), one after the other, placed by the top of their capitals. */
function richAt(name: string, written: readonly RichText[], style: RunStyle, box: Box): NodeDraft {
  const runs = written.flatMap((line, index) => [
    ...(index > 0 ? [lineBreak()] : []),
    ...runsOf(line, style, { bold: BOLD }),
  ]);
  return textRuns(name, runs.length === 0 ? [run('', style)] : runs, { ...box, size: style.size });
}

function textRuns(
  name: string,
  runs: readonly TextRun[],
  placed: Box & { readonly size: number },
): NodeDraft {
  const lineHeight = placed.lineHeight ?? 1;
  const [head, ...tail] = runs;
  const empty = run('', { font: FACE, size: placed.size, weight: REGULAR, color: '#000000' });
  return text({
    name,
    runs: [head ?? empty, ...tail],
    ...(placed.width === undefined ? {} : { box: { w: placed.width } }),
    align: placed.align ?? 'left',
    lineHeight,
    letterSpacing: placed.letterSpacing ?? 0,
    transform: { x: placed.x, y: placed.capTop - capOffset(placed.size, lineHeight) },
  });
}

/**
 * How many lines a text wraps to: measured when the context can, estimated otherwise from the
 * characters a line of `width` holds, each line written counted apart.
 */
function lineCount(
  context: TemplateContext,
  node: NodeDraft,
  written: readonly (RichText | string)[],
  size: number,
  width: number,
): number {
  const measured = node.kind === 'text' ? context.measure(node) : undefined;
  if (measured !== undefined) return Math.max(1, measured.lines);
  const perLine = Math.max(1, Math.floor(width / (size * ESTIMATED_ADVANCE)));
  const count = written.reduce<number>((sum, line) => {
    const characters = [...(typeof line === 'string' ? line : plain(line))].length;
    return sum + Math.max(1, Math.ceil(characters / perLine));
  }, 0);
  return Math.max(1, count);
}

/** This slide's written lines as rich text, the empty ones dropped. */
function slideRichLines(context: TemplateContext): RichText[] {
  const value = context.slots['lamina']?.value;
  if (value?.kind !== 'rich-text') return [];
  return lines(value.text).filter((line) => plain(line).trim() !== '');
}

/** This slide's written lines, trimmed, the empty ones dropped. */
function slideLines(context: TemplateContext): string[] {
  return slideRichLines(context).map((line) => plain(line).trim());
}

/** A rich-text slot's words as plain text, or the template's default when the brief left it out. */
function slotText(context: TemplateContext, name: string, fallback: string): string {
  const value = context.slots[name]?.value;
  if (value?.kind !== 'rich-text') return fallback;
  const words = plain(value.text).trim();
  return words === '' ? fallback : words;
}
