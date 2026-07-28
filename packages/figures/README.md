# @sandbox-benchmarks/figures

Renders a built `Leaderboard` into the figures `LEADERBOARD.md` embeds: one SVG per dimension, on
that dimension's headline metric.

```sh
bun apps/cli/src/bin/figures.ts data/dataset/runs/<id>.json docs/leaderboard
bun apps/cli/src/bin/figures.ts data/dataset/runs/<id>.json docs/leaderboard --check   # CI's check
bun apps/cli/src/bin/figures.ts data/dataset/runs/<id>.json /tmp/preview --png         # look at one
```

## Layering

| Directory | Rule |
|---|---|
| `src/lib/view/` | Pure data. Column widths, formatted cells, and **every integrity decision**. No JSX, no satori. The bulk of the tests live here. |
| `src/lib/components/` | Dumb `.tsx`. Props in, elements out. Never sees a `Leaderboard` or a raw number. |
| `src/lib/render/` | The **only** place `satori` and `@resvg/resvg-wasm` may be imported. Enforced by `jsx-wiring.test.ts`. |
| `src/plan.ts` | Separate entry point (`@sandbox-benchmarks/figures/plan`) so the Markdown renderer and the CI gate can compute the figure set **without** loading satori. |

## Things that will bite you

- **Satori has no table layout.** `display: table` and `display: grid` throw. A ranked table is a
  column of flex rows with fixed, pre-solved widths. `flexGrow` cannot size columns — each row is an
  independent flex container, so a grow-sized column resolves differently per row.
- **Satori does not clip.** A cell that does not fit *wraps* or *leaks*, silently, exit code 0. There
  is no measurement API to detect it afterwards. That is why widths are solved up front in `view/`
  and the canvas is sized to its content.
- **Everything is monospace on purpose.** Every DejaVu Sans Mono glyph shares one advance, so
  `textWidth()` is exact arithmetic with no font parsing (validated against satori in
  `width-parity.test.ts`). It also gets tabular figures — satori 0.29 silently ignores
  `fontVariantNumeric`/`fontFeatureSettings`, so a proportional face can never be fixed later.
- **A missing glyph is not an error to satori** — it paints `.notdef` and exits 0. `assertGlyphCoverage`
  fails the build instead, naming the character.
- **`jsx`/`jsxImportSource` must be declared INLINE** in every `tsconfig.json` Bun may resolve. Bun
  ignores both when they arrive through `extends`, so a shared preset silently does nothing and
  `.tsx` imports fail at runtime. `jsx-wiring.test.ts` pins this.
- **`height` is never passed to satori.** It is a hard canvas: one row too few and providers are
  sliced off the bottom with no error.
- **Fonts are bundled unmodified.** Do not subset them — the licence permits modification only under
  a renamed family, and the width solver is calibrated to these exact files.
