/**
 * `questao-engenharia` — the same exam question as `questao-estrategica`, in the engineering
 * vertical's frame (TYTO-608).
 *
 * The brief is the house template's, word for word: `::lamina {capa}`, the statement's
 * `::lamina`, `::lamina {resposta}` and `::lamina {fecho}`. The statement, its options, the
 * answer, the explanation and the pictures among their lines are the house's code
 * (`template.ts`), set with this template's numbers (`LOOK`); only the frame is drawn here:
 *
 * | slide     | drawn                                                                     |
 * | --------- | ------------------------------------------------------------------------- |
 * | cover     | the title over a rule, the exam's lines, the "Confira" button, two "+"    |
 * | statement | no heading, no logo, no number: the words, two "+", the arrow             |
 * | answer    | "Gabarito", the answer over a rule, the explanation, two "+", the arrow   |
 * | sign-off  | the deep colour, its title and four rows of icon and words                |
 *
 * The signature stands at every slide's foot. Every position is the reference art's (the
 * maintainer's engineering PSD), in the slide's pixels, a text placed by its capitals' top.
 */

import { colorValue, imageValue, frame, image, rect, solid, vector } from '@tyto/core/template';
import { accentOf, drawLogo, oneInk, sealOf, signatureOf } from '@tyto/house-style';
import { at, sealed } from '@tyto/template-kit';

import {
  BLACK,
  BOLD,
  DEFAULT_TITLE,
  FRAME_GAP,
  HIGHLIGHTS,
  LIGHT,
  MEDIUM,
  NUMBER_DEFAULTS as HOUSE_NUMBERS,
  REGULAR,
  SLIDE_WIDTH,
  answer,
  arrow,
  deepMarkDefaults,
  examLines,
  richTextAt,
  roleOf,
  slideRichLines,
  slotRichLines,
  statement,
  textAt,
  trimmed,
} from './template.js';

import type { ArrowBox, ExamLook, Ink, Look, MarkColors } from './template.js';
import type { BrandKit, TemplateBuild, TemplateContext } from '@tyto/core';
import type { NodeDraft, TextDraft } from '@tyto/core/template';

/* -------------------------------------------------------------------------- the words -- */

/** The sign-off's title, when neither its slide nor `fecho` writes one. */
export const DEFAULT_SIGN_OFF_TITLE = 'Gostou do conteúdo?';

/** The cover button's word. */
const BUTTON_WORD = 'Confira';

/* ------------------------------------------------------------------------- the tokens -- */

/**
 * The colours a configuration may change, by declared value name. Each is the reference's
 * but the accent, which is the brand kit's when one is installed (Tyto ADR 0155): its default
 * here is a neutral stand-in.
 */
export const COLOR_DEFAULTS = {
  /** The cover's and the sign-off's colour, where no picture covers it. */
  deep: '#204e72',
  /** The cover's title, rule, button and "+", and the sign-off's title. */
  accent: '#1d9ad5',
  /** The words, logo, signature and icons on the deep colour. */
  'on-deep': '#ffffff',
  /** The paper of the statement and the answer. */
  paper: '#ffffff',
  /** "Gabarito", the answer, its rule, the arrows and a picture's frame. */
  'title-ink': '#204e72',
  /** The options' letters. */
  'letter-ink': '#004d74',
  /** The statement, the options' words, the explanation and the signature on paper. */
  'body-ink': '#4d4d4d',
  /** The "+" on paper. */
  'ornament-ink': '#cccccc',
} as const;

type ColorName = keyof typeof COLOR_DEFAULTS;

/**
 * The marks' colours on `deep`, the cover's and the sign-off's `#204e72` (TYTO-623). The
 * swatches were chosen for white paper, and on this blue azul all but vanished (1.35:1). Each
 * here keeps its swatch's hue and is the darkest lightness that reads at a WCAG contrast of
 * 4.5:1 or more on `deep` (`tests/contrast.test.ts` pins it): azul 1.35 → 4.53, vermelho
 * 1.05 → 4.50, verde 2.17 → 4.53, ocre 1.68 → 4.50. Declared as `deep-mark-cor-<name>`.
 */
export const DEEP_MARK_COLORS: MarkColors = {
  azul: '#99bfdc',
  vermelho: '#e1adad',
  verde: '#73cf67',
  ocre: '#d6b580',
};

/** The declared values of the marks on `deep`, each the default above. */
export const DEEP_MARK_DEFAULTS = deepMarkDefaults(DEEP_MARK_COLORS);

/**
 * The numbers a configuration may change. The ceilings are the reference's sizes, so its copy
 * is set as drawn and a longer text shrinks; the rest are the house's.
 */
export const NUMBER_DEFAULTS = {
  'exam-floor': 56,
  'exam-ceiling': 76,
  'statement-floor': 28,
  'statement-ceiling': 40,
  'explanation-floor': 32,
  'explanation-ceiling': 56,
  'gap-floor': HOUSE_NUMBERS['gap-floor'],
  'orphan-shrink': HOUSE_NUMBERS['orphan-shrink'],
  'orphan-tracking': HOUSE_NUMBERS['orphan-tracking'],
} as const;

/* ------------------------------------------------------------------- the middle slides -- */

/** The arrows' and the signature's top at the middle slides' foot. */
const FOOTER_TOP = 1222;

/**
 * The gaps' weights are the reference's gaps times this. Only their proportions place the
 * blocks, so the reference's copy lands where the art has it at any factor; the factor sets
 * how far a gap may close before the words shrink (`gap-floor`): a third, so the gap over the
 * statement may close to about the house's 70 px and a slide with a picture still fits.
 */
const SLACK = 1 / 3;
const gap = (pixels: number): number => pixels * SLACK;

/**
 * The middle slides, measured on the reference: the room runs from the "+" at the top's foot
 * to the arrow's top; in it the statement's capitals start 340 px down and the answer's
 * "Gabarito" 241 px down, at the reference's sizes.
 */
export const LOOK: Look = {
  room: { top: 134, bottom: FOOTER_TOP },
  numbers: NUMBER_DEFAULTS,
  highlights: HIGHLIGHTS,
  frameInk: 'title-ink',
  frameFill: 'paper',
  statement: {
    x: 125,
    bodySize: 40,
    bodyWeight: MEDIUM,
    bodyInk: 'body-ink',
    bodyLineHeight: 1.5,
    bodyWidth: 760,
    optionX: 125,
    optionTextX: 162,
    optionSize: 32,
    optionLineHeight: 1.5,
    optionWidth: 726,
    optionPitch: 78,
    optionWeight: LIGHT,
    letterWeight: MEDIUM,
    letterInk: 'letter-ink',
    gaps: {
      edge: gap(207),
      foot: gap(276.2),
      labelToBody: gap(60),
      bodyToOptions: gap(61.6),
      picture: gap(FRAME_GAP),
    },
    frameX: 117,
  },
  answer: {
    x: 75,
    bodyX: 85,
    label: { words: 'Gabarito', size: 63.8, weight: BOLD, ink: 'title-ink', tracking: 0.02 },
    labelToAnswer: 87.75,
    answerSize: 101.9,
    answerWeight: BOLD,
    answerInk: 'title-ink',
    answerTracking: 0.02,
    rule: { gap: 45, x: 80, w: 921, h: 2, ink: 'title-ink' },
    bodyWeight: LIGHT,
    bodyInk: 'body-ink',
    bodyLineHeight: 1.5,
    bodyWidth: 916,
    gaps: {
      edge: gap(107),
      foot: gap(447),
      headToBody: gap(120),
      picture: gap(FRAME_GAP),
    },
  },
};

/** The cover's exam lines: Medium, 90.5 px apart at the reference's 75.4, over the button. */
const EXAM: ExamLook = {
  x: 82,
  capTop: 494,
  lineHeight: 90 / 75.4,
  width: 903,
  bottom: 978 - 80,
  weight: MEDIUM,
  estimatedAdvance: 0.6,
  tracking: 0.04,
};

/* --------------------------------------------------------------------------- the build -- */

export const build: TemplateBuild = (context: TemplateContext) => {
  const ink: Ink = (name) => colorValue(context, name, COLOR_DEFAULTS[name as ColorName]);
  const accent = accentOf(context.brand, ink('accent'));
  const role = roleOf(context);
  const last = context.artwork.index === context.artwork.count - 1;
  // The house's seal glued to the last slide's foot (TYTO-201): the foot rises by its band.
  const page = sealed(context.size, sealOf(context));
  const lift = context.size.h - page.size.h;
  const signature = (color: string) => footSignature(context.brand, SIGNATURE_TOP - lift, color);
  const onward = (color: string): NodeDraft[] =>
    last ? [] : [arrow({ ...BODY_ARROW, y: BODY_ARROW.y - lift }, color)];

  if (role === 'capa' || role === 'fecho') {
    const written = role === 'capa' ? context.slots['fundo']?.value : undefined;
    const picture =
      role !== 'capa'
        ? undefined
        : written?.kind === 'image'
          ? written.asset
          : imageValue(context, 'cover-background');
    const logo = role === 'capa' ? COVER_LOGO : SIGN_OFF_LOGO;
    return frame({
      format: context.format,
      size: context.size,
      idPrefix: context.idPrefix,
      background: solid(ink('deep')),
      children: [
        ...(picture === undefined
          ? []
          : [image({ name: 'fundo', asset: picture, size: context.size, fit: 'cover' })]),
        at(logo.x, logo.y, drawLogo(context.brand, LOGO_HEIGHT, oneInk(ink('on-deep')))),
        ...(role === 'capa'
          ? [
              ...cover(context, ink, accent, lift),
              ...(last ? [] : coverButton({ fill: accent, ink: ink('deep') })),
              ...ornaments(COVER_ORNAMENTS, accent),
            ]
          : [
              signOffTitle(context, accent),
              ...iconSignOff({ ink: ink('on-deep'), inside: ink('deep') }),
            ]),
        signature(ink('on-deep')),
        ...page.seal,
      ],
    });
  }

  const answerSlide = role === 'resposta';
  return frame({
    format: context.format,
    size: context.size,
    idPrefix: context.idPrefix,
    background: solid(ink('paper')),
    children: [
      ...(answerSlide ? answer(context, ink, lift, LOOK) : statement(context, ink, lift, LOOK)),
      ...ornaments(answerSlide ? ANSWER_ORNAMENTS : STATEMENT_ORNAMENTS, ink('ornament-ink')),
      signature(ink('body-ink')),
      ...onward(ink('title-ink')),
      ...page.seal,
    ],
  });
};

/* --------------------------------------------------------------------------- the cover -- */

/** The logo's height, and where it stands on the cover and on the sign-off. */
const LOGO_HEIGHT = 59;
const COVER_LOGO = { x: 51, y: 76 } as const;
const SIGN_OFF_LOGO = { x: 78, y: 78 } as const;

/** The cover's title and the rule under it. */
const COVER_TITLE = { x: 77, capTop: 263, size: 76.9 } as const;
const COVER_RULE = { x: 80, y: 380, w: 823, h: 2 } as const;

function cover(context: TemplateContext, ink: Ink, accent: string, lift: number): NodeDraft[] {
  return [
    // The reference sets it in CircularStd-Black, a family Tyto does not ship: CircularXX
    // Black, the maintainer's call (2026-11-04).
    richTextAt(
      context,
      'titulo',
      slotRichLines(context, 'titulo', DEFAULT_TITLE),
      {
        x: COVER_TITLE.x,
        capTop: COVER_TITLE.capTop,
        size: COVER_TITLE.size,
        weight: BLACK,
        color: accent,
        width: SLIDE_WIDTH - COVER_TITLE.x - 40,
      },
      DEEP_MARK_COLORS,
    ),
    rect({
      name: 'regua',
      size: { w: COVER_RULE.w, h: COVER_RULE.h },
      fill: solid(accent),
      transform: { x: COVER_RULE.x, y: COVER_RULE.y },
    }),
    examLines(context, ink('on-deep'), lift, EXAM, NUMBER_DEFAULTS, DEEP_MARK_COLORS),
  ];
}

/** The cover's "Confira" button, the reference's: a pill, its word and an arrow. */
const BUTTON = {
  x: 80,
  y: 979,
  w: 280,
  h: 70,
  wordX: 113,
  wordCapTop: 999.5,
  wordSize: 38.9,
  arrow: { x: 269, y: 998, w: 57, h: 37, shaft: 10 },
} as const;

/** The cover's "Confira" button: the pill in `fill`, its word and arrow in `ink`. */
export function coverButton(inks: { readonly fill: string; readonly ink: string }): NodeDraft[] {
  return [
    rect({
      name: 'botao',
      size: { w: BUTTON.w, h: BUTTON.h },
      radius: BUTTON.h / 2,
      fill: solid(inks.fill),
      transform: { x: BUTTON.x, y: BUTTON.y },
    }),
    textAt('botao-texto', BUTTON_WORD, {
      x: BUTTON.wordX,
      capTop: BUTTON.wordCapTop,
      size: BUTTON.wordSize,
      weight: BOLD,
      color: inks.ink,
    }),
    arrow(BUTTON.arrow, inks.ink),
  ];
}

/* ------------------------------------------------------------------------- the frame -- */

/** The "+" on each slide, by its box's top left corner: 26 px square, bars 6 px thick. */
const COVER_ORNAMENTS = [
  { x: 974, y: 215 },
  { x: 974, y: 1109 },
] as const;
const STATEMENT_ORNAMENTS = [
  { x: 975, y: 108 },
  { x: 80, y: 1107 },
] as const;
const ANSWER_ORNAMENTS = [
  { x: 827, y: 223 },
  { x: 80, y: 1107 },
] as const;
const PLUS = { size: 26, bar: 6 } as const;

function ornaments(
  places: readonly { readonly x: number; readonly y: number }[],
  color: string,
): NodeDraft[] {
  const near = (PLUS.size - PLUS.bar) / 2;
  const far = near + PLUS.bar;
  const s = PLUS.size;
  const d = `M${near} 0H${far}V${near}H${s}V${far}H${far}V${s}H${near}V${far}H0V${near}H${near}Z`;
  return places.map((place, index) =>
    vector({
      name: `mais-${index + 1}`,
      geometry: { kind: 'path', d, fillRule: 'nonzero' },
      size: { w: s, h: s },
      fill: solid(color),
      transform: place,
    }),
  );
}

/** The arrow to the next slide at a middle slide's foot. */
const BODY_ARROW: ArrowBox = { x: 853, y: FOOTER_TOP, w: 148, h: 37, shaft: 10 };

/** The signature's capitals on every slide. */
const SIGNATURE_TOP = 1229.5;

/** The signature at the foot: Light 25.66 px, centred, letter spacing 0.2 em. */
export const SIGNATURE = { size: 25.66, letterSpacing: 25.66 * 0.2 } as const;

/** The brand kit's signature, centred on the slide with its capitals at `capTop`. */
export function footSignature(brand: BrandKit, capTop: number, color: string): TextDraft {
  return textAt('assinatura', signatureOf(brand), {
    x: 0,
    capTop,
    size: SIGNATURE.size,
    weight: LIGHT,
    color,
    width: SLIDE_WIDTH,
    align: 'center',
    letterSpacing: SIGNATURE.letterSpacing,
  });
}

/* ------------------------------------------------------------------------ the sign-off -- */

/** The sign-off's title, the reference's: Bold, centred, its capitals 343.5 px down. */
const SIGN_OFF_TITLE = { capTop: 343.5, size: 84.6 } as const;

/** The sign-off's title: its slide's first line, else `fecho`'s, else the default. */
function signOffTitle(context: TemplateContext, color: string): TextDraft {
  const [written] = slideRichLines(context);
  const [title] = slotRichLines(context, 'fecho', DEFAULT_SIGN_OFF_TITLE);
  const words = written === undefined ? title : trimmed(written);
  return richTextAt(
    context,
    'fecho-titulo',
    words === undefined ? [] : [words],
    {
      x: 0,
      capTop: SIGN_OFF_TITLE.capTop,
      size: SIGN_OFF_TITLE.size,
      weight: BOLD,
      color,
      width: SLIDE_WIDTH,
      align: 'center',
    },
    DEEP_MARK_COLORS,
  );
}

/** One row of the sign-off: an outlined icon, then its words, as the reference places them. */
interface IconRow {
  readonly name: string;
  readonly icon: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
  readonly d: string;
  readonly words: string;
  readonly weight: number;
  /** The top of the first line's capitals. */
  readonly capTop: number;
}

/**
 * The sign-off's rows, measured on the reference: icon boxes, words and their capitals. The
 * same rows as voce-conhece's (TYTO-606), kept apart until the kit holds them.
 */
export const ICON_ROWS: readonly IconRow[] = [
  {
    name: 'curtir',
    icon: { x: 299, y: 553, w: 69, h: 60 },
    d: 'M34.5 56.5L7 30C0 23 1.5 8 13 4.5C22 2 30 6 34.5 13C39 6 47 2 56 4.5C67.5 8 69 23 62 30Z',
    words: 'Deixe um like',
    weight: REGULAR,
    capTop: 573.7,
  },
  {
    name: 'marcar',
    icon: { x: 302, y: 667, w: 66, h: 61 },
    d: 'M45 49.5C41.5 51 37.5 51.5 33 51.5C16 51.5 2.5 41 2.5 27C2.5 13 16 2.5 33 2.5C50 2.5 63.5 13 63.5 27C63.5 35.5 58.5 42.5 51 46.5L55.5 58.5Z',
    words: 'Marque alguém que\npossa gostar do conteúdo.',
    weight: REGULAR,
    capTop: 663.7,
  },
  {
    name: 'salvar',
    icon: { x: 313, y: 798, w: 47, h: 63 },
    d: 'M2.5 2.5H44.5V60.5L23.5 43.5L2.5 60.5Z',
    words: 'Salve para fixar\no conteúdo',
    weight: BOLD,
    capTop: 797.7,
  },
  {
    name: 'compartilhar',
    icon: { x: 308, y: 927, w: 54, h: 54 },
    d: 'M51.5 2.5L2.5 21L24 30L33 51.5Z M24 30L51.5 2.5',
    words: 'Compartilhe com\nos amigos.',
    weight: REGULAR,
    capTop: 919.7,
  },
];

/** The rows' words: Regular 30 px, 38.68 px apart, letter spacing 0.02 em, from x = 443. */
const ROW_TEXT = { x: 443, size: 29.98, lineHeight: 38.68 / 29.98, letterSpacing: 0.6 } as const;
/** The icons' outline. */
const ICON_STROKE = 4.5;

/**
 * The sign-off's four rows: like, tag, save and share, each an outlined icon in `ink` (filled
 * with `inside`, the colour under it, since a shape with no fill paints its inside black) and
 * its words.
 */
export function iconSignOff(inks: { readonly ink: string; readonly inside: string }): NodeDraft[] {
  return ICON_ROWS.flatMap((row) => [
    vector({
      name: row.name,
      geometry: { kind: 'path', d: row.d, fillRule: 'nonzero' },
      size: { w: row.icon.w, h: row.icon.h },
      fill: solid(inks.inside),
      stroke: { paint: solid(inks.ink), width: ICON_STROKE, align: 'center' },
      transform: { x: row.icon.x, y: row.icon.y },
    }),
    textAt(`${row.name}-texto`, row.words, {
      x: ROW_TEXT.x,
      capTop: row.capTop,
      size: ROW_TEXT.size,
      weight: row.weight,
      color: inks.ink,
      lineHeight: ROW_TEXT.lineHeight,
      letterSpacing: ROW_TEXT.letterSpacing,
    }),
  ]);
}
