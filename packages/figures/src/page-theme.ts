/**
 * The page's own light-theme design tokens, resolved to opaque hex.
 *
 * These figures reproduce the charts of `/sandbox-benchmarks` as the browser draws them, so
 * the colours are not a palette anyone chose here — they are what the site's CSS variables
 * COMPUTE TO on that page, read out of `getComputedStyle` on the real rendered document and
 * composited onto the surface each token sits on.
 *
 * WHY RESOLVED AND OPAQUE, rather than the authored expressions. The page writes
 * `border-border/50`, `text-muted-foreground/70`, `bg-brand-teal/[0.08]` — alpha over a
 * backdrop. An alpha token is only correct against the backdrop it was authored over, and
 * the chart template sets no site chrome behind its boxes; compositing once, here, is also
 * the only form in which these are checkable, because a hex can be compared against a pixel
 * of a crop and an `oklab(... / 0.7)` cannot.
 *
 * The consequence is that a token here is only correct ON ITS OWN BACKDROP. Every one of
 * these sits on white, which is why there is no dark variant: the published figures are cut
 * from the light theme, and a dark chart would have nothing to be compared against.
 *
 * If the site's palette changes, these go stale silently — the figures would keep rendering,
 * in last year's colours. The upstream repo's figure-diff pipeline (which crops the real
 * rendered page) is what notices; it lives there because it needs the site.
 */

/** Text, surface and line colours, named for the page role they play. */
export const pageColors = {
	/** The figure surface. `--background` in the light theme. */
	bg: "#ffffff",
	/** `text-foreground`. */
	fg: "#0a0a0a",
	/** `text-foreground/90` — provider labels on the charts. */
	fg90: "#222222",
	/** `text-muted-foreground`. */
	muted: "#737373",
	/** `text-muted-foreground/70`, `/50`, `/40` — the tints the charts use. */
	muted70: "#9d9d9d",
	muted50: "#b9b9b9",
	muted40: "#c7c7c7",
	/** `text-brand-teal` — the "fastest" badge. */
	teal: "#0990a6",
	/** `border-brand-teal/35` — the "fastest" badge outline. */
	tealBorder: "#a9d8e0",
} as const;
