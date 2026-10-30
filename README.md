# tyto-template-questao-estrategica

`questao-estrategica`, a [Tyto](https://github.com/rafaelsilvalor/tyto) code template in its own
repository: one exam question as a 1080×1350 carousel — a cover naming the exam, the statement
with its options, the answer with its explanation, and a sign-off, with any picture the
question needs framed on the middle slides.

**This repository holds the composition only.** The logo and the signature are not here: Tyto
hands them to the template from the brand kit installed on the machine, under the manifest's
brand `marinho`, and without one it draws placeholders (Tyto ADR 0063, ADR 0065). The cover's
picture, the seal and every image are the brief's. The example brief is invented copy.

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
      ref: v0.2.0
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
imagem-1: ./grafico.png
selo: ./selo.png
---

::lamina {capa}
  QUINTEX – 2026
  Prefeitura de
  Vale Alto/XY

::lamina {imagem: 1, proporcao: 3x2}
  O gráfico mostra as matrículas de quatro escolas. Qual teve mais?
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
  and every `X) …` line one option, its letter on the statement's left edge. The statement is
  sized to its room, as the cover is; the answer's explanation too.
- **The answer**, `{resposta}`: its first line in large (`Letra B`), the rest the explanation.
- **A slide that goes on** from the one before, `{continua}` beside the mark (an unmarked
  statement or `{resposta, continua}`): no label, its words start where the label would. A
  question may have as many middle slides as its content needs; every slide is numbered
  `01 I 06` from its place.
- **A picture** on a statement or an answer: `{imagem: N}` shows the brief's `imagem-N` (1 to 4)
  under the slide's words, in the reference's frame, and `{proporcao: …}` says its shape —
  `3x1`, `5x2`, `7x3`, `2x1` (default), `16x9`, `3x2`, `4x3` or `1x1`. The frame is as tall as
  that proportion makes it at the frame's width, and the picture is fitted whole inside.
  **Tyto hands a template no image's size**, so the slide says it; a picture whose shape differs
  from the proportion written shows paper beside it.
- **The sign-off**, `{fecho}`, empty: `Curtiu?` and its paragraph, or the brief's `::fecho`, its
  first line the title and the rest the paragraph, `**bold**` kept.
- **The seal**, `selo: ./selo.png`, 1080 × 140, glued to the foot of the last slide; that
  slide's number rises by the band.

## What it may reach

| Permission        | Why                                                               |
| ----------------- | ----------------------------------------------------------------- |
| `font:CircularXX` | Every word is set in CircularXX, a licensed face (Tyto ADR 0048). |

**The install asks for it once.** Faces Tyto ships cross to a plugin freely; a face installed
on the machine crosses only under this permission. The reference sets `Curtiu?` in ExtraBlack,
which Tyto has no face for: it is Black (900), the maintainer's call.

## What a configuration may change

`templates/questao-estrategica/manifest.yaml` declares fifteen `values` (Tyto ADR 0153): nine
colours — the cover's `deep`, `accent` and `on-deep`, the `paper`, the `title-ink`, `body-ink`
and `closing-ink`, and the like bar's `bar-fill` and `bar-ink` — and six lengths, three pairs of
floor and ceiling between which the words are sized to their room: `exam-floor`/`exam-ceiling`
(56/112) for the cover's exam lines, `statement-floor`/`statement-ceiling` (28/48) for the
statement, its options following it, and `explanation-floor`/`explanation-ceiling` (40/76) for
the answer's explanation. Each is the largest size whose words (and picture) end over the arrow,
so short words grow and long ones shrink. Each colour is the reference art's, the accent included
(the reference's `#1d9ad5`, not the brand kit's). A configuration changes a value, never which
pieces are drawn (Tyto ADR 0151).

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
  first option, a picture framed as tall as its proportion on a statement and an answer, the
  continued slides without a label, the cover's exam lines sized between floor and ceiling,
  the overflow warning, the seal on the last slide and the number lifted by it.
- `tests/examples.test.ts`: the example brief compiled as Tyto compiles it, through
  `@tyto/template-kit/testing` (Tyto ADR 0152), against the HTML of each slide in
  `tests/__snapshots__/`. Nothing is measured and faces are placeholders, so the snapshots move
  when the composition does and not when a machine has another font.
- `tests/faces.test.ts`: the manifest's `faces` are exactly the faces the example draws — in a
  plugin's process a face left out measures as nothing.
- `tests/values.test.ts`: the declared values — each default pinned to the one the code falls
  back to, and a colour set in a test found in the HTML.
- `tests/plugin.test.ts`: the built `dist/index.js`, loaded through
  `@tyto/plugin-api/testing` (Tyto ADR 0150), drawing a slide across the isolation protocol.

The `contract` workflow runs every day against the newest published contract, past the ranges
`package.json` asks for, so a Tyto release that breaks this template turns it red before
somebody installs it.
