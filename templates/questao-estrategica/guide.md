# How to write a `questao-estrategica` brief

`questao-estrategica` is one exam question, commented, as a 1080×1350 carousel: a **cover**
(the title and the exam: board – year, body), the **statement** with its options, the **answer**
(a large "Letra B" and the explanation) and a **sign-off**. The middle may take more slides when
the content needs them, and the statement and the answer may show pictures (a chart, a formula)
among the lines.

Recognise it by the request ("questão de fixação", "questão comentada") or by a statement
followed by options `A)` to `E)` and an answer key ("Gabarito: B", "Resposta: letra C").

## Slots

| Slot     | Where                                       | Rule                                                                                                                                          |
| -------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `lamina` | directive, repeated                         | 1 to 10 slides; see Normalisation.                                                                                                            |
| `titulo` | directive                                   | Optional, at most 40 characters: the words above the cover's rule. Without it, the template's default.                                        |
| `fecho`  | directive                                   | Optional, at most 160 characters: 1st line the sign-off's title, the rest its paragraph; `**…**` and `{cor:…}` kept. Without it, the default. |
| `fundo`  | frontmatter                                 | Optional image: the cover's photo, full bleed. Without it the cover is a plain dark colour.                                                   |
| `imagem` | directive `::imagem ./file.png`, in a slide | Pictures, as many as needed, each where its line stands; see Normalisation.                                                                   |
| `selo`   | frontmatter                                 | Optional, 1080×140, at the foot of the **last** slide; its number moves up 140. Only when the person has it.                                  |

Format: `formats: [grid]` only; there is no story.

## Normalisation

Each slide says what it is by its mark in braces:

1. **`::lamina {capa}`**, first: one line per line of the exam, as on the artwork —
   `BOARD – YEAR`, then the body on one or two lines (`Prefeitura de` / `Vale Alto/XY`). The
   type size adjusts by itself: a short title grows, a long one shrinks.
2. **`::lamina`** with no mark, the **statement**: its lines and then **one line per option**,
   starting with the letter and a bracket: `A) …`, `B) …`. After the first option, `B. …` also
   opens one, and a line that opens none continues the option above, on a line of its own.
3. **`::lamina {resposta}`**: 1st line the short answer, in large type (`Letra B`); the rest, the
   explanation.
4. **`::lamina {fecho}`**, empty, last. Its words, if they change, go in `::fecho`.

**Highlights:** `**word**` highlights in bold, and `{cor:azul}word{/}` (also `vermelho`, `verde`,
`ocre`) in bold and in that colour, in the statement, the options, the explanation and the
sign-off's paragraph. **On the cover and the sign-off's title** (`::titulo`, the lines of
`::lamina {capa}`, the 1st line of `::fecho`) only the colour shows: that text is already bold
or heavier, so `**word**` alone changes nothing; use `{cor:…}`. Highlight only where the
original text highlights something, never a whole sentence. A colour name outside those four
comes out with no colour and no bold.

**Formulas:** write the maths as Unicode text — `Δv = a·Δt`, `α ≤ 30°`, `x²`, `10⁻³`,
`∇·E = ρ/ε₀`. What the text face lacks comes out in Tyto's symbol face without overlapping, and
an operator (`=`, `+`, `·`) never starts a line. A Greek letter inside a highlight loses its
bold (the symbol face has one weight). A stacked fraction or a root with a bar stays a picture
(`::imagem ./formula.png`). A number and its unit never split at a line break (`3 s`,
`2 m/s²`, `R$ 9,8 mil`, `10 %`): write an ordinary space. To keep a whole formula on one line,
replace **its** spaces with no-break spaces (U+00A0); only for a short formula, or it will not
fit the line.

**Continuing on a new slide:** a statement or an explanation too long for one slide continues
on the next one marked `{continua}` (`::lamina {continua}` for the statement,
`::lamina {resposta, continua}` for the explanation). A continuation repeats neither the
statement's label nor the answer's heading.

**Pictures in the middle:** each picture is a line `::imagem ./file.png`, not indented, **after**
the `::lamina` and **where it appears**; the indented lines under it continue the slide's
text. A slide may have as many as it needs:

```
::lamina
  O gráfico mostra as matrículas de quatro escolas.
::imagem ./grafico.png
  Qual teve mais?
  A) A primeira.
  B) A segunda.

::lamina {resposta}
  Letra B
  A segunda barra é a mais alta.
::imagem ./tabela.png
```

The lines up to the first `A)` are the statement, and from the first option on everything is
an option, with a picture in between or not. In the answer, the 1st line (`Letra B`) is always
on top and the rest follows in the written order. Only the statement and the answer take
pictures; the cover and the sign-off do not.

**Picture without a frame:** `::imagem {sem-quadro} ./file.png` draws the picture alone, with no
border, bar or shadow, aligned to the words' left edge and as wide as they are. The mark comes
**before** the file, as in `::lamina {capa}`; written after it (`::imagem ./file.png
{sem-quadro}`) it is ignored without a warning and the picture is framed. Each `::imagem` has
its own: on one slide one picture may be framed and the other not.

Tyto measures the picture, and the frame takes the height its shape asks for, between a 3:1
band and a square. `{proporcao: 3x2}` on the slide only applies to a picture Tyto could not
measure: `3x1`, `5x2`, `7x3`, `2x1` (default), `16x9`, `3x2`, `4x3`, `1x1`.

The slide numbers and the arrows are drawn by themselves.

## How to split into slides

The statement (with its options) and the explanation **adjust their type size** between a floor
and a ceiling: statement 28 to 48 px (the options follow), explanation 32 to 76 px. Short text
stays large; long text shrinks until it fits above the arrow. Only when not even the floor fits
does Tyto warn `W_TEMPLATE_OVERFLOW` on that `::lamina`: then **split with `{continua}`** — put
the options on a `{continua}` slide of their own, or the picture on a separate `{continua}`
slide. Measured: a statement of about 340 characters with 5 options fits one slide at about
41 px, and as much text fits in the answer's explanation; with a 2x1 picture in the middle,
count on at least one more slide.

## Example

Copy (invented):

```
Questão de fixação — QUINTEX 2026, Prefeitura de Vale Alto/XY
Segundo o regulamento do município, qual documento organiza o apoio aos estudantes?
a) o calendário anual  b) o plano da escola  c) o caderno de chamada
Gabarito: B. O regulamento manda que o plano da escola organize o apoio.
```

Brief:

```brief
---
template: questao-estrategica
formats: [grid]
---
::lamina {capa}
  QUINTEX – 2026
  Prefeitura de
  Vale Alto/XY

::lamina
  Segundo o regulamento do município, qual documento organiza o apoio aos estudantes?
  A) O calendário anual.
  B) O plano da escola.
  C) O caderno de chamada.

::lamina {resposta}
  Letra B
  O regulamento manda que o plano da escola organize o apoio.

::lamina {fecho}
```

## Known traps

- **"Unknown template"**: the plugin is not installed, or the Tyto is older than the plugin API
  the manifest's `engine` asks for.
- **Symbols no face has**: subscript letters (`ₐ ₑ ₒ ₓ`…) and `℃` are neither in the text face
  nor in the symbol face; Tyto warns `W_GLYPH_MISSING`. Write `°C` and numeric subscripts
  (`x₁`), or put the formula in as a picture.
- **Options written in lower case `a)`**: they work, but write capitals, as the artwork does.
- **`::titulo` and `::fecho` as directives**: write them as directives, which work in every
  version; pictures go in the frontmatter. Newer versions also accept `titulo:` and `fecho:` in
  the frontmatter with highlights, but an older one refuses a title whose syntax passes 40
  characters and draws the default instead.
- **Never write the old picture form** (`imagem-1: ./grafico.png` in the frontmatter and
  `{imagem: 1}` on a slide): it is an error (`E_UNKNOWN_SLOT`, `E_BAD_ADJUSTMENT`) and the
  picture is not drawn.
