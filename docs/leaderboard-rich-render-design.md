# Rich leaderboard rendering: `@sandbox-benchmarks/figures`

Status: **Implemented.** `LEADERBOARD.md` embeds one generated figure per dimension; the figures are
committed under [`docs/leaderboard/`](./leaderboard/) and byte-gated the same way the Markdown is.

This document records the design and — more usefully — the constraints that shaped it. Most of them
are things that fail *silently*, which is why they are written down rather than left to be
rediscovered.

---

## 1. What this is

`LEADERBOARD.md` was 57 KB of pipe tables: 44 metrics × 6 providers, plus coverage gaps, p-values and
KS columns. Complete and correct, and nearly unreadable at a glance.

It now leads each dimension with a rendered figure of that dimension's headline metric, and keeps
every table underneath. The figures are produced by `@sandbox-benchmarks/figures` from the same
`Leaderboard` model the Markdown renders from, using [Satori](https://github.com/vercel/satori) (JSX →
SVG via Yoga) with components authored as `.tsx`.

The Markdown is **not** replaced. It is diffable, greppable, screen-reader-accessible and gated. The
figures are additive.

```sh
bun apps/cli/src/bin/figures.ts     data/dataset/runs/<id>.json docs/leaderboard
bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/<id>.json LEADERBOARD.md
bun apps/cli/src/bin/figures.ts     data/dataset/runs/<id>.json docs/leaderboard --check
```

---

## 2. Integrity comes first

This is the part that decides whether the feature is worth having.

`packages/results/src/lib/leaderboard.ts` is engineered to avoid claiming more than the statistics
support: it declines to print a ratio when the leader's margin is under 5% (`:675`), says "share the
top" rather than naming a winner when rank 1 is a cohort (`:667-671`), and labels a comparison the
trial count could never have decided as `n too small` rather than as a tie (`:75-77`). A figure is
read faster and trusted more than a table, so **a figure that looks more confident than the table
above it is a worse regression than no figure at all.**

Three rules follow, enforced in `src/lib/view/metric-table.ts` and asserted in its test:

1. **No bar encodes a median alone.** Every bar is the 95% bootstrap *interval*, drawn as a span with
   the median as a tick inside it. Two providers whose intervals overlap render as visibly
   overlapping bars — which is the actual finding.
2. **No lead highlight the statistics do not support.** Rank 1 is highlighted only when its rank is
   unique *and* the row below it is `separated`.
3. **A provider that was not measured gets an explicit row** — "not measured", never omitted, never a
   zero-length bar. "A gap is a missing result, never a tie or a zero" (`leaderboard.ts:700`).

Rule 2 is not hypothetical. On the committed run, the cpu headline has Blaxel at 19.8 (CI
18.51–20.56) and Daytona at 18.6 (CI 18.21–18.88), and **every** row below rank 1 is `underpowered`.
A median bar chart would draw Blaxel at 100% and Daytona at 94%, and a crown would name a winner over
a rival the test could not distinguish it from. The renderer highlights nothing on this board, and
the figure shows the two intervals overlapping.

The takeaway sentence and every value/interval string come from `metricTakeaway`, `formatValue` and
`formatInterval`, now exported from `@sandbox-benchmarks/results` — so the figure and the table cannot
drift into disagreeing about the same run.

---

## 3. Where it sits

```
schema ──▶ results ──▶ figures ──▶ cli
                          ▲
                    repo-checks (gates)
```

`figures` consumes the `Leaderboard` model and produces bytes. It never derives a ranking and never
re-formats a value.

Naming: **`figures`, not `report`.** `report` sits one letter from `results` and would leave a reader
unable to answer "where does the leaderboard get rendered?" from the path alone — which is the
property ADR-0002 exists to preserve. `figures` names the capability.

The Markdown renderer **stays in `results`**, and takes the figures as an argument:

```ts
renderLeaderboardMarkdown(board, { figures: figureRefs(board) })
```

That keeps `results` the sole author of `LEADERBOARD.md`, so the byte-diff gate's central assertion
survives with one extra parameter. A second package doing string surgery on a document `results`
owns would have put that gate out of reach.

The shared formatters were **not** moved down into `schema`. ADR-0002's "move a shared helper down"
rule presupposes two packages with no dependency between them; here `figures` depends on `results`,
so `results` already *is* the common ancestor. `schema` is the arktype parse boundary and contains no
presentation code; `format.ts` would have been the first module there with no schema in it.

### Layout

| Path | Rule |
|---|---|
| `src/lib/view/` | Pure data: widths, formatted cells, every integrity decision. Holds the bulk of the tests. |
| `src/lib/components/` | Dumb `.tsx`. Props in, elements out. |
| `src/lib/render/` | The **only** place `satori`/`@resvg/resvg-wasm` may be imported — enforced by `jsx-wiring.test.ts`. |
| `src/plan.ts` | Separate entry point so the Markdown path and the CI gate compute the figure set **without** loading satori. |

Asserting `columns[2].width === 130` is a unit test; asserting on an SVG string is not. That is why
`view/` exists and why it holds the decisions.

---

## 4. Constraints that bite silently

Everything here was measured, not assumed.

### Satori

- **No table layout.** `display: table` and `grid` throw; the allowlist is `flex | block | contents |
  none | -webkit-box`. A ranked table is flex rows of fixed-width cells.
- **No measurement API, and no clipping.** A cell that does not fit *wraps* (doubling row height,
  bleeding across the rule) or *leaks* horizontally. Exit code 0 either way. `onNodeDetected` reports
  the *clamped* box, so it cannot detect overflow after the fact.
- **`height` is a hard canvas, not a hint.** Pass one row too few and providers are sliced off the
  bottom silently. We never pass it; Yoga computes it.
- **A missing glyph is not an error.** Satori paints `.notdef` — `Novita·中文` publishes as
  `Novita·□□`, a ZWJ emoji becomes five boxes. `assertGlyphCoverage` fails the build instead.
- **`calc()` and `z-index` warn and continue**, silently producing a wrong width. The hand-written
  `Style` type excludes both, so they are compile errors.
- **`fontVariantNumeric`/`fontFeatureSettings` are ignored.** Tabular figures cannot be switched on
  later in CSS.
- **Font array order is an input to the output.** Same-name faces resolve first-wins and fallback
  walks the array, so `assets/fonts.ts` uses an explicit ordered list — never a glob or `readdir`,
  whose order differs between ext4, an overlayfs CI container and a laptop.
- **Output is one line** with no trailing newline. `render/svg.ts` splits it on element boundaries.

### The width solver

Widths are solved with **pure arithmetic and no font-parsing dependency**, which is possible only
because every glyph in DejaVu Sans Mono shares one advance:

```
width = ceil(chars × fontSize × 1233/2048) + 2·padX + 1
```

`width-parity.test.ts` validates this against satori itself across 5 font sizes × 12 real strings
(120 assertions): it never under-predicts, and never over-predicts by more than 1 px. The canvas is
then sized to fit the widest thing in the figure, which makes overflow *structurally impossible*
rather than merely tested for. Numeric columns are never truncated — `12345678…` reads as a real
number that is wrong by orders of magnitude.

### TypeScript and the JSX runtime

React is not used. Satori calls each component once — no reconciler, no state, no effects — so React
would be inert weight, and its `CSSProperties` (like satori's own shipped `satori/jsx` runtime) is an
index signature that accepts `display: "grid"` happily. A local runtime lets `Style` be the closed
flexbox subset, so the bad cases are compile errors.

What that costs, all of which is required rather than optional:

- **A full `JSX` namespace.** Without `IntrinsicElements` every host tag is `TS7026`; without
  `IntrinsicAttributes` + a `key` on the props type, `key` is `TS2322`; without
  `ElementChildrenAttribute`, nested JSX is not bound to `children`. `JSX.ElementType` must be a
  **type alias** — as an empty interface it crashes tsc 6.0.3 inside `getJsxElementTypeTypeAt`
  rather than producing a diagnostic.
- **A 6-arity `jsxDEV`.** Bun emits dev-runtime calls under `bun test` regardless of
  `jsx: "react-jsx"`, so the module tsc checks is not the module Bun runs. Both must exist.
- **`jsx`/`jsxImportSource` declared INLINE in every tsconfig Bun may resolve.** Bun ignores both when
  they arrive through `extends` — package-level or nested. A shared `@repo/tsconfig` preset silently
  does nothing and `.tsx` imports then fail *at runtime* with `Cannot find module
  'react/jsx-dev-runtime'`. Four tsconfigs carry them, and `jsx-wiring.test.ts` asserts it, because
  the obvious "DRY this into a preset" refactor is exactly what breaks it.
- **One cast at one site.** satori's types open with `import { ReactNode } from 'react'`, which is not
  installed; under `skipLibCheck` that degenerates to `any`, so `satori("hello")` would compile. It
  is confined to `render/svg.ts` so a future `@types/react` appearing transitively breaks one file.
- **Font bytes are `ArrayBuffer`.** satori's `FontOptions["data"]` is `Buffer | ArrayBuffer`;
  `Uint8Array` is *not* assignable, and `Buffer` is banned in `packages/**` by biome.
  `Bun.file().arrayBuffer()` threads it. `@resvg/resvg-wasm` is `Uint8Array` throughout —
  `@resvg/resvg-js` is `Buffer`-typed, which is a second reason the wasm build is the one used.
- **`initWasm()` is single-shot** and `bun test` shares one process, so it is memoized. Two test files
  rasterize deliberately: that is the only configuration in which the un-memoized bug reproduces.

---

## 5. What is committed, and how it is gated

**Committed:** 7 SVGs (one per emitted dimension) + `manifest.json`, ~1.3 MB working tree. SVG rather
than PNG, `embedFont: true` rather than `<text>`, for three independent reasons:

- git packs SVG far better — measured over 20 successive versions of one figure: **211 KB** packed as
  SVG versus **1.54 MB** as PNG.
- A `<text>` SVG renders in whatever font the viewer has, and the layout was computed with the pinned
  font's metrics, so it misrenders anywhere the font is absent — including on GitHub.
- GitHub's Markdown sanitiser strips `dominant-baseline` from `<text>`
  ([github/markup#1160](https://github.com/github/markup/issues/1160)). `embedFont: true` emits no
  `<text>` at all — only `clipPath, defs, g, mask, path, rect, svg` — so nothing it touches is present.

The cost is that an embedded-font SVG is **glyph outline data and is not human-reviewable**. That is
accepted explicitly rather than papered over:

- `.gitattributes` marks the figures `-diff linguist-generated=true`, so PRs collapse them instead of
  rendering 200 KB of unreadable path data.
- The review surface is the *image* plus the gate, not the diff. `render/svg.ts` still pretty-prints
  one element per line, so `git` has lines to work with and a corrupt file is visibly not 400 lines.

**Gated** by `tooling/repo-checks/src/figures-artifact-sync.test.ts`:

- **set equality** against `planReport(board)` — a per-file diff cannot detect an *orphan* left behind
  when a dimension stops being emitted;
- **per-file byte equality** against a fresh render;
- **provenance**: `manifest.json`'s `runId` must match the run id in `LEADERBOARD.md`'s header, which
  catches figures from run A sitting beside a Markdown surface describing run B;
- **font digests**: a font swap reflows every figure, and the manifest makes that attributable;
- the Markdown embeds exactly the planned figures, each with non-trivial alt text.

The gate builds the board **once** (~8 s of seeded bootstrap) and reuses it; rendering all 7 figures
is ~0.3 s. The whole file runs in ~9 s.

**Not committed:** PNGs. `ci.yml` runs on the self-hosted `starsling-ubuntu-24.04-2` while
`update-leaderboard.yml` publishes on GitHub-hosted `ubuntu-24.04`, so a PNG byte-hash asserted in
`bun run test` would be validated on a different machine from the one producing it — and CONTRIBUTING
promises a maintainer's local `bun run test` matches CI. `--png` exists for previews.

---

## 6. Deliberately out of scope

**Provider logos.** The repo's `LICENSE` is MIT and covers the whole tree, granting everyone the right
to *sell* copies — a grant that cannot be made over a third party's trademark. And the proposed use
was the highest-risk configuration available: competitors' marks, inside a ranking, published by a
commercial vendor. Nominative fair use lets you *name* a product; the tables already carry
`displayName`, so the mark is unnecessary to identify it. Figures identify providers by name only.
Revisit only with written per-vendor permission recorded in `docs/`.

**OFL fonts.** DejaVu Sans Mono is used instead, under the Bitstream Vera licence, which explicitly
permits sale and so sits cleanly inside an MIT tree — where OFL clause 2 (no selling the font
software) would not. The committed SVGs embed glyph outlines, so this is a real distribution question
rather than a theoretical one. The licence travels with the fonts in
`packages/figures/assets/fonts/LICENSE-DejaVu.txt`, and they are bundled **unmodified**: the licence
permits modification only under a renamed family, and the width solver is calibrated to these exact
files.

---

## 7. Supply chain

`satori` + `@resvg/resvg-wasm` add **23 packages** into a repo whose external set was arktype, an XML
parser and provider SDKs. That is the real cost of this feature, and it is worth stating plainly:

- Several transitives are dormant — `css-background-parser` (2015), `css-box-shadow` (a prerelease as
  `latest`, 2017), `base64-js@0.0.8` and `pako@0.2.9` (two–three majors behind). The font parser,
  `@shuding/opentype.js`, is a personal fork pinned to a beta ahead of its own `latest` tag.
- `satori`, `yoga-layout`, `fflate` and `camelize` declare `prepare`/`prepack`. None executes under
  the repo's empty `trustedDependencies` + `--ignore-scripts` posture. **None may ever be added to
  `trustedDependencies`.**
- `minimumReleaseAge` is commented out in `bunfig.toml`, so no quarantine applies — do not cite it as
  a mitigation. `satori` must **not** go in `minimumReleaseAgeExcludes`; that list is for trusted
  first-party toolchain packages.
- Both are **MPL-2.0**, the first non-permissive licences in the graph. Consuming them unmodified is
  fine; **vendoring or patching either is not**, without MPL §3 source disclosure.
- `satori` is 0.x, so every minor may break. It is pinned exactly in `catalogs.render`. A bump
  reflows every figure — regenerate in a **standalone PR** so a reviewer can attribute the change.

The alternative — a dependency-free `<rect>`/`<text>` emitter — was weighed. It would be smaller,
reviewable as text, and selectable/accessible, and since widths are already solved in `view/`, Yoga
is only stacking pre-measured boxes. It was not taken because Satori was the explicit brief and
because JSX components are a materially better authoring surface for what will grow into more figure
types. If the dependency cost ever stops being worth it, `view/` is untouched by that decision and
only `render/svg.ts` changes — which is exactly why the layering is what it is.

---

## 8. Invariants added

| Where | Invariant |
|---|---|
| `workspace.ts:86` | `memberSourceFiles` globs `**/*.{ts,tsx}`. It was `**/*.ts`, which does not match `.tsx` — every component would have been **invisible to the import-boundary check**. |
| `jsx-wiring.test.ts` | Every `.tsx` on disk belongs to a scanned member; all four tsconfigs declare `jsx`/`jsxImportSource` inline; satori and the rasterizer are imported only from `lib/render/`, and that directory really does import them (the invariant is not vacuous). |
| `figures-artifact-sync.test.ts` | Set equality, byte equality, provenance, font digests, alt text, pretty-printing, no `<text>`. |
| `figures.test.ts` | Argv parsing — `--theme light run.json out` must not bind `outDir = "light"`. |
| `.gitattributes` | Figures are `-diff linguist-generated=true`. |
| `typos.toml` | `docs/leaderboard/**` and the font binaries excluded — generated output, and `bun run spell` scans the whole repo on every commit. |
| `update-leaderboard.yml` | Stages `docs/leaderboard` as well as `LEADERBOARD.md` (staging only the Markdown made a figure-only change exit 0 reporting success while publishing nothing), and pre-flights `figures --check`. |

---

## 9. Known limitations

- **An embedded-font SVG is not reviewable as a diff.** Mitigated by `.gitattributes` and the gate;
  not solved. The reviewer's real surface is the rendered image.
- **The publish job's blast radius grew.** `update-leaderboard.yml` now executes satori and a ~2.5 MB
  wasm rasterizer inside the job holding `privileged` secrets and a persisted write token. Reviewed
  and accepted for rendering committed data; if that step grows, split the render into an
  unprivileged job that hands figures over as an artifact.
- **Dark theme only** in the committed output. A `light` theme exists and is selectable; committing
  both doubles the bytes, and `prefers-color-scheme` in `<picture>` follows the **OS** theme, not
  GitHub's — so "dual theme" would be less correct than it sounds. GitHub's
  `#gh-dark-mode-only` fragment hack is the theme-aware alternative if this is ever wanted.
- **Figures cover headline metrics only** — 7 of 44. The other 37 remain table-only.
- **An image is not readable by a screen reader.** Alt text is generated and gated for length; the
  tables remain the accessible surface, which is the main reason they stay.
