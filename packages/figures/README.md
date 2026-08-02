# `@sandbox-benchmarks/figures`

Turns a Run document into chart figures: `model.ts` derives the realworld figure model —
exactly the three fields the charts consume (suites, providers, phase order) — and `chart/`
builds a view-model per suite and marks it up as one self-contained HTML document, the input a
headless-browser screenshot turns into a published PNG.

**The document is the whole input.** Inline styles, `data:`-URI fonts, no script, no server,
no external reference of any kind: whatever a browser draws is a function of one string. That
is the deterministic half of the pipeline — model and HTML — and it is what the tests and
gates hold onto; rasterising it (`./screenshot`, headless Chrome via `Bun.WebView`) is the one
impure step, behind its own entry point so importing anything else never spawns a browser.

## What it draws

One chart per chartable realworld suite: a stacked bar per environment, one segment per task in
execution order, every chart from the same run on a single shared time scale so a second is the
same length in every one of them. These are the figures that lead `LEADERBOARD.md`'s `realworld`
section.

## Seams

Inputs are typed by `@sandbox-benchmarks/schema` — the workspace's one Run contract and registry
shapes — so this package re-describes nothing the workspace already owns. The registries still
arrive as **arguments** (`buildRealworldFigureModel({ run, metrics, providers, suites })`);
there is no module-level dataset, which is what lets every guard here run against a synthetic
run instead of whatever the committed dataset contains. `packages/results` owns the seam that
passes the real registries, the caption text, and the figure-file naming; every non-chart
derivation over a Run (tables, coverage, economics) is its jurisdiction, not this package's.

| `exports` | what it costs to import |
|---|---|
| `.` | nothing but string building — the model derivation, the view-model, the HTML template, the inlined fonts. |
| `./screenshot` | a browser. Constructing a `Bun.WebView` spawns headless Chrome; import this only where a PNG is actually wanted. |

## Layering

| Path | Rule |
|---|---|
| `src/phases.ts` | The pipeline phase vocabulary: id, printed label and ramp colour defined ONCE per phase, ordered by execution. Colour order = execution order holds by construction. |
| `src/model.ts` | Run + registries → `RealworldFigureModel`. Which suites are chartable is decided here (≥2 environments completing every exercised task), and nowhere else. |
| `src/chart/model.ts` | The view-model. **Every decision the picture makes** — sort order, badge, shared scale, disclosure rows — as plain data a unit test can assert on. The bulk of the tests. |
| `src/chart/html.ts` | The template. Dumb on purpose: it knows widths and styles, and the one piece of arithmetic in it is `scaleFraction × TRACK_WIDTH`. |
| `src/chart/wordmark.ts` | The StarSling artwork, inline SVG, painted from `currentColor` — the one brand asset in the document. Exports the ratios (`ASPECT`, `CAP_RATIO`, `BASELINE_RATIO`) the template sizes and aligns it by, so the header is arithmetic over the artwork rather than numbers somebody eyeballed. |
| `src/chart/fonts.ts` | The faces, read from pinned npm packages (`@fontsource/*`) and inlined as `data:` URIs — the lockfile pins the glyphs like it pins code. Brand faces only: `assertCovered` fails the render on a character none of them can draw, rather than shipping a full Unicode fallback to hide it. |
| `src/screenshot.ts` | The **only** impure module: `Bun.WebView` → CDP → PNG bytes. Returns bytes, never writes a file. |

Asserting `bars[0].fastest === true` is a unit test; asserting on a PNG is not. That is why
`chart/model.ts` exists and why the decisions live there rather than in the template.

## Things that will bite you

- **The raster is not deterministic across machines; the HTML is, everywhere.** A browser's
  rasterisation depends on its version and platform (Skia, font hinting, antialiasing), so two
  machines produce different pixels from identical HTML. Any gate that wants exactness must
  compare the HTML, not the pixels — which is why every decision lives in the model and the
  document, and nothing meaningful is decided at paint time.
- **Chrome is discovered, not downloaded — and spawned ONCE per process.** `Bun.WebView`
  searches `backend.path`, then `BUN_CHROME_PATH`, then `$PATH` and the standard install
  locations, then Playwright's cache, and throws if none is found. The process's FIRST view's
  spawn options win; a later `chromePath` is silently ignored. Pin via `BUN_CHROME_PATH` in the
  environment (as the release workflow does); a laptop's installed Chrome is fine for previews.
- **A discoverable Chrome is not a launchable one.** Chrome builds its sandbox out of an
  unprivileged user namespace, and Ubuntu 23.10+ forbids that by default
  (`kernel.apparmor_restrict_unprivileged_userns=1`): the browser aborts with "No usable sandbox!"
  before the DevTools pipe opens, and every capture fails with `Chrome process closed the pipe`.
  `.github/actions/setup-pinned-chrome` restores the namespace on the runner and then proves the
  browser starts — the fix is deliberately NOT `--no-sandbox`, which would rasterise run documents
  in an unconfined renderer on every machine.
- **Escape everything interpolated.** The template pipes every model string through
  `escapeHtml` before any markdown replacement, colours through a hex-only guard, and the one
  bare number in a `style` attribute (`flex-grow`) through a finite-number guard. A provider
  name or a failure reason is data from a run document, and a document must not be able to
  inject markup — or a `url(…)` — into the figure.
- **Brand faces only; refuse what they can't draw.** Geist Mono and Afacad lack `†` and `→`, but
  the embedded Geist Sans subset has both, so every font stack ends on Geist and the fallback
  glyph is still a brand glyph. Nothing carries a full Unicode face — `assertCovered` throws on
  a character no embedded face can draw, because the alternative is Chrome silently reaching for
  an installed font and the figure quietly becoming a function of the machine that rendered it.
- **`TRACK_WIDTH` is the shared scale.** A bar's drawn length is its total over the run's
  slowest charted total, times one constant. Scale a chart to its own maximum and the figures
  stop being one comparison.
