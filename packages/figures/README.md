# `@sandbox-benchmarks/figures`

Turns a committed Run document into share figures: `ingest/` derives the run, `domain/` holds
its shape and every derivation over it, and the renderer goes JSX → SVG (satori) → PNG (resvg),
entirely in memory.

**No build, no server, no browser, no CSS.** The only inputs are the two documents the caller
hands it and the fonts in `src/assets/`. That is the point of the package: the pipeline it
replaced screenshotted a rendered web page, and every part of that — a build, a static server,
a headless browser, a stylesheet — was a way for a published image to depend on something other
than the measurements.

## What it draws today

`apps/cli/src/bin/leaderboard.ts` renders the three realworld pipeline charts that lead
`LEADERBOARD.md`'s `realworld` section — `docs/figures/realworld-{mastra,better-auth,openclaw}.svg`.
One stacked bar per environment, one segment per task in execution order, all three charts on a
single shared time scale so a second is the same length in every one of them.

The package also carries the composite-table renderer and five more page figures
(`kpis`, `environments`, `all-metrics`, `repeatability`, `coverage`) that nothing in this repo
renders yet. They are not dead weight to be trimmed on sight: they are what makes `ingest/` a
whole pipeline rather than a chart function, and their guards are the ones that keep the width
solver and the parse honest.

## Nothing in here imports the repo

The Run document, the metric catalog and the per-suite note all arrive as **arguments** — there
is no module-level dataset, no default spec list, and no import of `@sandbox-benchmarks/schema`.
Two things follow, and both are load-bearing:

- every guard renders against a synthetic fixture instead of against whatever the committed run
  happens to contain, so a test cannot be quietly invalidated by a new run;
- `apps/cli` is the only place that knows both this package and the schema, which is what keeps
  the adapter (`apps/cli/src/lib/leaderboard-figures.ts`) small enough to read.

`tooling/repo-checks/src/boundary.test.ts` enforces the direction mechanically.

| `exports` | what it costs to import |
|---|---|
| `.` | the renderer — satori, its Yoga wasm, the bundled TTFs. |
| `./domain` | nothing. A leaf: shapes, the parse, every derivation. |
| `./ingest` | nothing. Raw documents → the derived run, satori-free. |
| `./plan` | nothing. The expected file set, without loading a renderer. |

## Layering

| Directory | Rule |
|---|---|
| `src/ingest/` | **The front door**: a Run document + a catalog document → the derived run every other layer reads. Pure — reads no file, writes none, consults no clock. Satori-free. Imports `domain/` for the return type and nothing else. |
| `src/domain/` | The shape of a run, the PARSE that admits a document into it, and every pure derivation, formatter and label over it. A leaf: no edge into `lib/` or `ingest/`. |
| `src/lib/view/` | Pure data. Solved widths, formatted cells, **every integrity decision**. No JSX, no satori. The bulk of the tests. |
| `src/lib/view/page/` | Each page figure as a BLOCK TREE — plain objects a unit test can assert on. |
| `src/lib/components/` | Dumb `.tsx`. Props in, elements out. Never sees a raw number. |
| `src/lib/render/` | The **only** place `satori` (`svg.tsx`) and the rasteriser (`png.ts`) are imported. |
| `src/plan.ts` | Separate, satori-free entry point, so a gate can compute the expected file set without loading a renderer and seven fonts. |

Asserting `columns[2].width === 130` is a unit test; asserting on an SVG string is not. That is
why `view/` exists and why the decisions live there rather than in the components.

## Things that will bite you

- **Satori has no table layout.** `display: table` and `display: grid` throw. A table is a
  column of flex rows with pre-solved fixed widths. `flexGrow` cannot size columns — each row is
  an independent flex container, so a grow-sized column resolves differently per row.
- **Satori does not clip and cannot measure.** A cell that does not fit *wraps* or *leaks*,
  silently, exit code 0. Widths are therefore solved up front (`view/columns.ts` by arithmetic
  for the monospace composites, `view/text.ts` from real font metrics for the page figures) and
  the canvas is sized to its content. `width-parity.test.ts` calibrates that arithmetic against
  satori itself; it is the test that fails if a bundled font is swapped or subset.
- **`height` is never passed.** It is a hard canvas, not a hint: one row too few and rows are
  sliced off the bottom with no error. Yoga computes it.
- **A missing glyph is not an error** — satori paints `.notdef` and exits 0.
  `assertGlyphCoverage` fails instead, naming the character.
- **WOFF2 is not usable.** Satori parses fonts with opentype.js, which cannot read brotli, so
  the faces here are TTFs.
- **Do not subset the bundled fonts.** The width solver is calibrated to these exact files, and
  the DejaVu licence permits modification only under a renamed family.
- **Style is a closed type.** `lib/style.tsx` defines the flexbox subset these figures use and
  one `Box` primitive that renders it, so `display: "grid"` is a compile error rather than a
  render-time throw. Compose `Box`; do not reach for a bare `<div>`.
- **`embedFont: true` is load-bearing, and so is resvg needing no font configuration.** The SVG
  is glyph outlines with no `<text>`, so it renders identically wherever it is viewed with no
  font installed, the rasteriser cannot substitute a face, and GitHub's Markdown sanitiser has
  nothing to strip — which is why the leaderboard can embed these SVGs directly. Turn
  `embedFont` off and the output silently starts depending on the viewer's installed fonts.
  The cost is that an SVG diff is outline data: **the review surface is the image, not the patch.**
- **The artifact is PARSED, not asserted.** `domain/parse.ts` is the only way a document becomes
  a `SandboxBenchmarkData`: it takes `unknown`, checks every field, and throws naming the one
  that is wrong. It also enforces that every provider id a bar, a flag, a coverage gap or a
  table column names is one of `providers[]` — which is what makes `providerIndexOf(…)[id]`
  genuinely total rather than a `Record` TypeScript merely believes is total. Do not replace it
  with a cast, and do not "make it tolerant" with `?? []`.
- **Fonts are held as `Uint8Array`, handed to satori as `ArrayBuffer`.** See
  `lib/assets/bytes.ts`: `readFileSync` returns a view into a pooled allocation, so `.buffer` is
  a different, larger file starting at a non-zero offset. The conversion copies.

## Differences from the upstream copy

This package was copied from the `starsling-website` repo, where it renders the same figures for
`/sandbox-benchmarks`. Adapted for this workspace:

- code moved under `src/` (the workspace's uniform member shape), assets with it;
- `vitest` → `bun:test`, and relative imports carry explicit `.ts` / `.tsx` extensions;
- `Buffer` → `Uint8Array` throughout, per the repo's cross-runtime lint rule;
- `noUncheckedIndexedAccess` is on here and was not there, which turned four unchecked index
  reads into explicit guards — the `median` of an empty set now throws instead of returning
  `NaN`, an unknown coverage outcome sorts last instead of making a comparator return `NaN`, and
  a chart row naming an unlisted provider throws with the provider's id in the message.

The website keeps a second pipeline that crops the real rendered page in a real browser and
diffs it against these figures at the pixel level. That calibration is why the numbers below
hold; it lives there because it needs the site.

**Pixel-identical to a browser is not attainable and is not claimed.** Yoga is not Blink, resvg
is not Skia, and every glyph edge is antialiased differently. Measured at a 16/255 threshold the
page figures differ from their browser crops by 3–9% of pixels, dominated by antialiasing, with
three structural causes: synthetic bold (satori cannot stroke a 400 face into a 600), collapsed
table borders (Yoga rounds every box to a whole pixel and cannot express Chromium's half), and
baseline placement within a line box.
