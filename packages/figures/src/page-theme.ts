/**
 * The page's own light-theme design tokens, resolved to opaque hex.
 *
 * These figures reproduce eight regions of `/sandbox-benchmarks` as the browser draws
 * them, so the colours are not a palette anyone chose here — they are what the site's CSS
 * variables COMPUTE TO on that page, read out of `getComputedStyle` on the real rendered
 * document and composited onto the surface each token sits on.
 *
 * WHY RESOLVED AND OPAQUE, rather than the authored expressions. The page writes
 * `border-border/50`, `text-muted-foreground/70`, `bg-brand-teal/[0.08]` — alpha over a
 * backdrop. Satori has no CSS variables, no `color-mix`, no `oklab()` and no
 * alpha-compositing against an unknown parent, so an authored value cannot be handed to
 * it. Compositing once, here, is also the only form in which these are checkable: a hex
 * can be compared against a pixel of the crop, an `oklab(... / 0.7)` cannot.
 *
 * The consequence is that a token here is only correct ON ITS OWN BACKDROP. Every one of
 * these sits on white or on one of the two wash colours, which is why there is no dark
 * variant: the crops are cut from the light theme (see
 * scripts/snapshot-sandbox-benchmark-images.ts, which strips `class="dark"` before
 * capturing), so a dark page figure would have nothing to be compared against.
 *
 * If the site's palette changes, these go stale silently — the figures would keep
 * rendering, in last year's colours. `pnpm sandbox-benchmarks:figure-diff` is what
 * notices: it regenerates the crops from the current build and reports the drift as a
 * jump in mean absolute channel difference.
 */

/** Text, surface and line colours, named for the page role they play. */
export const pageColors = {
	/** The figure surface. `--background` in the light theme. */
	bg: "#ffffff",
	/** `text-foreground`. */
	fg: "#0a0a0a",
	/** `text-foreground/85` — the table cell default. */
	fg85: "#2f2f2f",
	/** `text-foreground/90` — provider labels on the charts. */
	fg90: "#222222",
	/** `text-foreground/75` — an indented task row's label. */
	fg75: "#474747",
	/** `text-muted-foreground`. */
	muted: "#737373",
	/** `text-muted-foreground/80`, `/70`, `/55`, `/50`, `/40` — the page uses all five. */
	muted80: "#8f8f8f",
	muted70: "#9d9d9d",
	muted55: "#b2b2b2",
	muted50: "#b9b9b9",
	muted40: "#c7c7c7",
	/** `text-brand-teal`, and the two tints the page draws it at. */
	teal: "#0990a6",
	teal90: "#219baf",
	teal70: "#52b1c1",
	/** `border-brand-teal/35` — the "fastest" badge outline. */
	tealBorder: "#a9d8e0",
	/** `bg-brand-teal/[0.08]` — the best cell's wash in the metrics table. */
	tealWash: "#ecf6f8",
	/** `bg-brand-teal/[0.12]`. */
	tealWashStrong: "#e6f4f6",
	/** `text-amber-600` — off-spec daggers and the `failed` outcome. */
	amber: "#e17100",
	/** `border-border/50`, `/40`, `/30` — the three rules the tables use. */
	border50: "#f2f2f2",
	border40: "#f5f5f5",
	border30: "#f7f7f7",
	/** `border-border` at full strength, used by the popover-free chrome. */
	border: "#efefef",
	/** `bg-foreground/[0.03]` (dimension band) and `/[0.02]` (a suite total row). */
	bandBg: "#f7f7f7",
	totalRowBg: "#fafafa",
	/** The four `ratioTint` washes, indexed by RatioTintStep. 0 draws nothing. */
	tint: ["#ffffff", "#fdf8f2", "#fcf0e5", "#fae8d6", "#f8ddc2"] as const,
	/** Environments-table flag washes: amber for comparability, rose for capacity. */
	flagAmber: "#fcf2e8",
	flagRose: "#ffe4eb",
} as const;

/**
 * The ordinal phase ramp, light theme (`--bench-ramp-N` in src/index.css).
 * Index = position in the dataset's own `phaseOrder`, so later phase = darker.
 */
export const phaseRamp = ["#34c9bc", "#16a8ac", "#0b8794", "#07687b", "#054a5f"] as const;

/** Per-provider hues, light theme (`--bench-provider-*`). Keyed by the dataset's provider
 *  ids, which name the ISOLATION VARIANT rather than the vendor. */
export const providerHues: Record<string, string> = {
	blaxel: "#4a66d6",
	"daytona-vm": "#0b8f7d",
	e2b: "#d96b2b",
	"modal-gvisor": "#7c4dd0",
	"modal-vm": "#a63fc4",
	novita: "#be3d63",
};

/** Fallback hue for a provider the palette has no entry for — `bg-brand-teal`, matching
 *  `providerSwatch()`. A new provider gets a visible colour rather than a hole. */
export const providerHueFallback = pageColors.teal;

/**
 * Padding the crops are cut with, per side, in CSS pixels.
 *
 * `PADDING` in scripts/snapshot-sandbox-benchmark-images.ts. A figure that reproduces a
 * crop has to reproduce its margin too, or every pixel in it is offset by 24 and the
 * comparison measures the offset rather than the content.
 */
export const CROP_PADDING = 24;

/** Width of the page's content column at the 1440px desktop layout the crops are cut at
 *  (`max-w-4xl` = 56rem). Every anchor is this wide; two of them have content that
 *  deliberately overflows it, which is why figures size their canvas to their content. */
export const CONTENT_WIDTH = 896;
