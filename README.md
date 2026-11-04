# tyto-template-questao-estrategica

`questao-estrategica`, a [Tyto](https://github.com/rafaelsilvalor/tyto) code template in its own
repository: one exam question as a 1080×1350 carousel — a cover naming the exam, the statement
with its options, the answer with its explanation, and a sign-off, with any picture the
question needs framed on the middle slides.

**This repository holds the composition only.** The logo and the signature are not here: Tyto
hands them to the template from the brand kit installed on the machine, under the manifest's
brand `marinho`, and without one it draws placeholders (Tyto ADR 0063, ADR 0065). The cover's
picture, the seal and every image are the brief's. The example brief is invented copy.

## Two templates, one brief

The plugin draws two templates from the same code:

- **`questao-estrategica`**, the house's frame: "Enunciado:" over the statement, "Resposta /
  Letra B", a slide number and a like bar.
- **`questao-engenharia`** (TYTO-608), the engineering vertical's frame: a "Confira" button
  and two "+" on the cover, no heading, logo or number on the middle slides, "Gabarito" with
  a rule under the answer, the signature at every slide's foot, and a sign-off of four icon
  rows. Its statement and options are set Medium 40 and 32 px, its explanation Light 56 px.

Both read the same brief: change its `template:` line and nothing else. The statement, the
options, the answer, the explanation and the pictures are shared code (`src/template.ts`),
which each template sets with its own numbers (`Look`); only the frame differs
(`src/engenharia.ts`).

## Highlights and formulas

In both templates (TYTO-607), `**x**` sets words in Bold and `{cor:azul|vermelho|verde|ocre}x{/}`
in Bold and a colour, in the statement, the options and the explanation, and in the sign-off's
paragraph. They are the kit's highlights (Tyto TYTO-554), so a configuration changes them under
the value names every Tyto template shares: `highlight-weight` (700) and
`mark-cor-azul|vermelho|verde|ocre` (`#2f628a`, `#873131`, `#39902e`, `#8a662d`, the
engineering reference's swatches). A name the template does not list, `{cor:roxo}x{/}`, leaves
its words as they are.

Since TYTO-618 they reach every text: the cover's title (`titulo`, also in the frontmatter),
the exam's lines on the cover and the sign-off's title too. Those are Bold or Black already,
so there `**x**` keeps the text's own weight rather than drawing lighter, and a colour mark is
what shows. Every rich text also keeps the kit's pairs on one line (`keepTogether`): a currency
sign and its amount (`R$ 9,8`), an amount and its scale word (`9,8 mil`), a number and its
percent (`10 %`).

Math is written as plain Unicode: `Δv = a·Δt`, `α ≤ 30°`, `x²`, `10⁻³`. A glyph CircularXX
lacks is drawn in Tyto's bundled symbol face (Tyto ADR 0168, core 0.37 or later): Noto Sans
Math, or Source Sans 3 for what Noto Sans Math leaves to text faces. On the maintainer's
CircularXX that is `α`, `β` and `⁻` of the examples; `Δ`, `≤`, `²`, `·` and `°` stay in
CircularXX. Noto Sans Math has one weight, so a Greek letter inside a highlight is drawn at 400. `examples/formula.brief` in each template shows them.

**From v0.6:** questao-engenharia's `highlight-azul|vermelho|verde|ocre` values are now
`mark-cor-azul|vermelho|verde|ocre`: a plugin file that set the old names renames them.

## Install into Tyto

A plugin file pins the template to a release (Tyto ADR 0151). Save this as
`TYTO_HOME/plugin-files/questao-estrategica.yaml` (`~/.tyto` by default), or as
`.tyto/plugin-files/questao-estrategica.yaml` beside a project's briefs:

```yaml
version: 1
templates:
  questao-estrategica:
    source:
      git: https://github.com/rafaelsilvalor/tyto-template-questao-estrategica.git
      ref: v0.5.0
```

Tyto fetches the tag the next time it loads templates, or now with `tyto plugin sync`, and asks
once for the permission below (`--yes` approves it). To move to a later release, change `ref`.

Or install the default branch, as it is:

```
tyto plugin install git+https://github.com/rafaelsilvalor/tyto-template-questao-estrategica.git
```

Tyto never builds what it fetches, so `dist/index.js` is committed on `main` and every release is
a tag of it. A pack brings templates and no formats: copy `templates/formats.yaml` into the
project that renders `questao-estrategica`, or merge its `grid` line into the project's own.

## Writing a brief

One `::lamina` is one slide in Tyto and a template cannot add slides of its own, so the brief
marks what each slide is:

```
---
template: questao-estrategica
formats: [grid]
fundo: ./fundo.png
selo: ./selo.png
---

::lamina {capa}
  QUINTEX – 2026
  Prefeitura de
  Vale Alto/XY

::lamina
  O gráfico mostra as matrículas de quatro escolas.
::imagem ./grafico.png
  Qual teve mais?
  A) A primeira.
  B) A segunda.

::lamina {resposta}
  Letra B
  A segunda barra é a mais alta.

::lamina {fecho}
```

- **The cover**, `{capa}`: its lines name the exam, set at the largest size between
  `exam-floor` and `exam-ceiling` that keeps them in their room — a short title grows, a long
  one shrinks, and one that does not fit at the floor renders with `W_TEMPLATE_OVERFLOW`. The
  words over the rule are `Questão de fixação` unless the brief writes `::titulo`; `fundo:` is
  the picture under the cover, full bleed, and without it the cover is flat `deep`.
- **The statement**, an unmarked `::lamina`: its lines up to the first `A)` are the statement,
  and every `X) …` line one option, its letter on the statement's left edge: one to three
  letters, either case, before a `)`; after the first option, one letter and a full stop
  (`B. …`) starts one too. Any other line after the first option continues the option above
  on a line of its own, so a `\` or a new line inside an option breaks it where you wrote it
  (TYTO-520). The statement is sized to its room, as the cover is; the answer's explanation too.
- **The answer**, `{resposta}`: its first line in large (`Letra B`), the rest the explanation.
- **A slide that goes on** from the one before, `{continua}` beside the mark (an unmarked
  statement or `{resposta, continua}`): no label, its words start where the label would. A
  question may have as many middle slides as its content needs; every slide is numbered
  `01 I 06` from its place.
- **Pictures** on a statement or an answer: `::imagem ./figura.png` after the slide's
  `::lamina` shows the file where it is written among the slide's lines, and the indented lines
  under it go on with the slide (Tyto ADR 0160, amended 2026-10-31; Tyto core 0.36 or later).
  A slide may show any number of them. Lines up to the first `X)` are the statement and every
  line from it on is options, a picture between them or not; on the answer, the first line is
  the answer, drawn first, and the explanation and its pictures follow in the order written.
  Each frame is as tall as the picture's own shape makes it at the frame's width (Tyto reads
  the size off the file, ADR 0158), from a 3:1 band to a square: a wider picture gets a 3:1
  frame and a taller one a square, the picture fitted whole inside with paper beside it. The
  frame casts the reference's shadow itself (a `spread` of −20 px, Tyto TYTO-500 and TYTO-501).
- **A picture with no frame**, in both templates (TYTO-608): `::imagem {sem-quadro} ./figura.png`
  draws the picture alone, with no border, bar or shadow, at the words' left edge and width,
  as tall as its shape makes it between the same 3:1 and square. The mark goes before the
  path, as `::lamina {capa}`: written after it, the brief language does not read it as a
  mark, and the picture keeps its frame. Each `::imagem` takes its own.
- **`{proporcao: …}` is no longer needed.** Briefs that write it still render, without a
  warning: the file's size wins, and the proportion written — `3x1`, `5x2`, `7x3`, `2x1`
  (default), `16x9`, `3x2`, `4x3` or `1x1` — is used only for a picture on the slide Tyto could
  not measure.
- **The sign-off**, `{fecho}`, empty: `Curtiu?` and its paragraph, or the brief's `::fecho`, its
  first line the title and the rest the paragraph, `**bold**` and `{cor:…}` kept, written in
  the frontmatter or as a directive.
- **The seal**, `selo: ./selo.png`, 1080 × 140, glued to the foot of the last slide; that
  slide's number rises by the band.

## From v0.4 to v0.5

v0.5.0 replaces the four frontmatter pictures and the slide's `{imagem: N}` with pictures
written where they stand. A brief in the old form still renders, without its pictures, and
says why: `imagem-1:` in the frontmatter is `E_UNKNOWN_SLOT` and `{imagem: 1}` is
`E_BAD_ADJUSTMENT`. Move each picture's path from the frontmatter to an `::imagem` line after
the slide that showed it; v0.4 drew it after the statement and before the options, or after
the explanation:

v0.4:

```
---
template: questao-estrategica
imagem-1: ./grafico.png
---
::lamina {imagem: 1}
  Qual escola teve mais matrículas?
  A) A primeira.
  B) A segunda.
```

v0.5:

```
---
template: questao-estrategica
---
::lamina
  Qual escola teve mais matrículas?
::imagem ./grafico.png
  A) A primeira.
  B) A segunda.
```

`{proporcao}` stays as it was.

## What it may reach

| Permission        | Why                                                               |
| ----------------- | ----------------------------------------------------------------- |
| `font:CircularXX` | Every word is set in CircularXX, a licensed face (Tyto ADR 0048). |

**The install asks for it once.** Faces Tyto ships cross to a plugin freely; a face installed
on the machine crosses only under this permission. The reference sets `Curtiu?` in ExtraBlack,
which Tyto has no face for: it is Black (900), the maintainer's call.

## What a configuration may change

`templates/questao-estrategica/manifest.yaml` declares nineteen `values` (Tyto ADR 0153): nine
colours — the cover's `deep`, `accent` and `on-deep`, the `paper`, the `title-ink`, `body-ink`
and `closing-ink`, and the like bar's `bar-fill` and `bar-ink` — and six lengths, three pairs of
floor and ceiling between which the words are sized to their room: `exam-floor`/`exam-ceiling`
(56/112) for the cover's exam lines, `statement-floor`/`statement-ceiling` (28/48) for the
statement, its options following it, and `explanation-floor`/`explanation-ceiling` (32/76) for
the answer's explanation. Each is the largest size whose words (and picture) end over the arrow,
so short words grow and long ones shrink. Each colour is the reference art's, the accent included
(the reference's `#1d9ad5`, not the brand kit's). A configuration changes a value, never which
pieces are drawn (Tyto ADR 0151).

`cover-background`, an image with no default, is the cover's picture for every brief of a
configuration (TYTO-518): a brand's configuration names its file once instead of each brief
writing `fundo`. A brief's own `fundo` still wins over it, and without either the cover is the
flat `deep` colour.

The statement and the answer stack their blocks between the logo and the footer with the
reference's gaps, in proportion (Tyto ADR 0167, `spaceByWeight`): 70, 60 and 71 px on the
statement (logo to label, label to statement, statement to options), 102 and 165 on the answer
(logo to label, answer to explanation), and under the last block the same gap as over the first,
so the middle is centred. The words are set at the largest size that keeps every gap at least
`gap-floor` (1) times the reference's; a short text leaves them wider, all in proportion. A
paragraph that would end on a line of one word is set again (`settle`, Tyto kit 0.8): first the
line above breaks one word earlier, at the same size; then letter spacing within
`orphan-tracking` (0.01 em); then a size up to `orphan-shrink` (8%) smaller. An option, whose
size is the statement's, moves a word down or its letter spacing only, and so does a run of
statement or explanation written after a picture. A picture keeps the reference's 48 px over
and under its frame. Past those limits the slide is drawn and `W_TEMPLATE_ORPHAN` names the
word.

## Development

`pnpm check` runs Prettier, the type checker, ESLint and the tests; `pnpm build` writes
`dist/index.js`, one ES module with every `@tyto` import inlined, which is committed and which
CI rebuilds and compares.

The template depends on Tyto's published contract, held by GitHub Packages under the owner's
scope (Tyto ADR 0149) and aliased in `package.json`: `@tyto/house-style` draws the logo, the
signature and the seal, `@tyto/template-kit` and `@tyto/core` are what it is drawn with, and
`@tyto/plugin-api` is what loads it. The committed `.npmrc` names the scope only. GitHub asks
for a token with `read:packages` even for public packages; hand it to pnpm for the one command:

```sh
pnpm install "--//npm.pkg.github.com/:_authToken=$(gh auth token)"
```

The tests, all without Tyto:

- `src/template.test.ts`: the carousel's rules on the scene — which slide each mark makes, the
  numbering and the arrows, every text starting inside its slide, the statement split at its
  first option, a picture framed as tall as its file's shape on a statement and an answer, held
  between 3:1 and square, several pictures among a slide's lines in the order written, the
  frame casting its own shadow, the v0.4 picture syntax refused with a diagnostic,
  `{proporcao}` used only when the file has no size, the
  continued slides without a label, the cover's exam lines sized between floor and ceiling,
  the overflow warning, the seal on the last slide and the number lifted by it.
- `src/rhythm.test.ts`: the middle slides' gaps in the reference's proportions and centred, a
  continued explanation centred, and the orphan control — the screenshot's explanation cleared
  by the default limits and named by `W_TEMPLATE_ORPHAN` without them, an option the same by
  letter spacing — measured against a half-em face standing in for CircularXX.
- `tests/examples.test.ts`: the example briefs compiled as Tyto compiles them, through
  `@tyto/template-kit/testing` (Tyto ADR 0152), against the HTML of each slide in
  `tests/__snapshots__/`. Nothing is measured and faces are placeholders, so the snapshots move
  when the composition does and not when a machine has another font.
- `tests/faces.test.ts`: each manifest's `faces` are exactly the faces its examples draw,
  the symbol chain included — in a plugin's process a face left out measures as nothing. CI
  has no CircularXX, so the faces stand in with the glyphs each lacks, read from their `cmap`.
- `tests/values.test.ts`: the declared values — each default pinned to the one the code falls
  back to, and a colour set in a test found in the HTML.
- `tests/plugin.test.ts`: the built `dist/index.js`, loaded through
  `@tyto/plugin-api/testing` (Tyto ADR 0150), drawing a slide across the isolation protocol.

The `contract` workflow runs every day against the newest published contract, past the ranges
`package.json` asks for, so a Tyto release that breaks this template turns it red before
somebody installs it.
