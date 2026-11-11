# How to write a `questao-engenharia` brief

`questao-engenharia` is the same commented exam question as `questao-estrategica`, from the same
brief shape, in another frame: a **cover** with the title, the exam's lines and a "Confira"
button; the **statement** with no label, with its options; the **answer** ("Gabarito" and the
answer in large type over a rule, the explanation below); and a dark **sign-off** with four
fixed rows of icons.

Recognise it by the request: an engineering exam question (buildings, electrical, civil,
mechanical…), or the person naming this frame. Otherwise the question goes to
`questao-estrategica`. When unsure, ask.

## Slots

| Slot     | Where                                       | Rule                                                                                                                     |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `lamina` | directive, repeated                         | 1 to 10 slides; see Normalisation.                                                                                       |
| `titulo` | directive                                   | Optional, at most 40 characters: the cover's title. Without it, the template's default.                                  |
| `fecho`  | directive                                   | Optional: **only the 1st line counts**, the sign-off's title. Without it, the default. The four rows of icons are fixed. |
| `fundo`  | frontmatter                                 | Optional image: the cover's background, full bleed.                                                                      |
| `imagem` | directive `::imagem ./file.png`, in a slide | Pictures, as many as needed, each where its line stands; `{sem-quadro}` before the file drops the frame.                 |
| `selo`   | frontmatter                                 | Optional, 1080×140, at the foot of the **last** slide. Only when the person has it.                                      |

Format: `formats: [grid]` only.

## Normalisation

Each slide says what it is by its mark in braces:

1. **`::lamina {capa}`**, first: the exam's lines as on the artwork (board, body, area, year).
   The type size adjusts by itself.
2. **`::lamina`** with no mark, the **statement**: its lines, then **one line per option**. On
   the artwork the options are lower case (`a)`, `b)`…). A line that opens no option continues
   the option above.
3. **`::lamina {resposta}`**: 1st line the answer as the artwork shows it (`Alternativa E`); the
   rest, the explanation.
4. **`::lamina {fecho}`**, empty, last. Its title, if it changes, goes in `::fecho`.

**Continuing:** a statement or explanation too long for one slide continues on a slide marked
`{continua}` (`::lamina {continua}`, or `::lamina {resposta, continua}` for the explanation).

**Highlights:** `**word**` in bold; `{cor:azul}word{/}` (also `vermelho`, `verde`, `ocre`) in
bold and in that colour, in the statement, the options and the explanation. On the cover only
the colour shows. Highlight only where the original text highlights something, never a whole
sentence. A colour outside those four comes out plain.

**Formulas:** maths as Unicode text (`m²`, `≤`, `π`, `Δv = a·Δt`). What the text face lacks
comes out in Tyto's symbol face; an operator never starts a line. A number and its unit never
split (`3 s`, `2 m/s²`): write an ordinary space. To keep a short formula on one line, replace
its spaces with no-break spaces (U+00A0). A stacked fraction or a root with a bar goes in as a
picture.

**Pictures:** a line `::imagem ./file.png`, not indented, **after** the `::lamina` and **where
it appears**; indented lines under it continue the slide. Only the statement and the answer take
pictures. `::imagem {sem-quadro} ./file.png` draws one with no frame, as wide as the text; the
mark comes **before** the file, and written after it, it is ignored without a warning.

There is no slide number and no "statement" label; the signature and the arrows are drawn by
themselves.

## How to split into slides

The statement adjusts between 28 and 40 px (the options follow) and the explanation between 32
and 56 px: the ceilings are the artwork's sizes, so short text stays at the artwork's size and
long text shrinks. When not even the floor fits, Tyto warns `W_TEMPLATE_OVERFLOW`: split with
`{continua}`. Measured: a statement of 134 characters with 5 options and an explanation of 105
characters fit at full size.

## Example

Copy (invented):

```
Questão — QUINTEX, Prefeitura de Vale Alto, Obras, 2026
Numa ponte, a viga que recebe diretamente a carga das lajes e a leva aos pilares é:
a) longarina b) transversina c) travessa de apoio d) aparelho de apoio e) encontro
Gabarito: A. A longarina leva a carga aos pilares; a transversina só a distribui.
```

Brief:

```brief
---
template: questao-engenharia
formats: [grid]
---
::lamina {capa}
  (QUINTEX - Prefeitura de
  Vale Alto - Obras
  2026)

::lamina
  Numa ponte, a viga que recebe **diretamente** a carga das lajes e a leva aos pilares é:
  a) longarina.
  b) transversina.
  c) travessa de apoio.
  d) aparelho de apoio.
  e) encontro.

::lamina {resposta}
  Alternativa A
  A {cor:azul}longarina{/} leva a carga aos pilares; a {cor:vermelho}transversina{/} só a distribui.

::lamina {fecho}
```

## Known traps

- **"Unknown template"** while `questao-estrategica` works: the plugin file has no entry for
  `questao-engenharia`, or the installed plugin predates it.
- **`{cor:azul}` on the dark sign-off** nearly vanishes: there, prefer `{cor:verde}` or
  `{cor:ocre}`.
- **`{sem-quadro}` after the file** is ignored without a warning: write
  `::imagem {sem-quadro} ./x.png`.
- **Symbols no face has**: subscript letters (`ₐ ₑ ₒ ₓ`…) and `℃`; Tyto warns `W_GLYPH_MISSING`.
  Write `°C` and numeric subscripts (`x₁`), or use a picture.
