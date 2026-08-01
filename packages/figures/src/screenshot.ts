/**
 * The package's ONLY impure module: a self-contained HTML document in, WebP bytes out, via
 * headless Chrome driven through `Bun.WebView`.
 *
 * Behind its own entry point (`@sandbox-benchmarks/figures/screenshot`) so that importing the
 * model or the template never spawns a browser. It returns BYTES AND NEVER WRITES — the caller
 * owns the filesystem, which is what lets a caller render into memory, compare two renders, or
 * write next to whatever document links the figure.
 *
 * WHAT IS DELIBERATELY NOT PROMISED: byte determinism across machines. Chrome's rasterisation
 * depends on its version and platform; the pinned-browser CI job is where pixels are authored,
 * and the same-machine stability the CLI relies on (render twice, compare) is Chrome's, not
 * this module's. What IS checked here is the geometry: the decoded image must be exactly
 * `width × deviceScaleFactor` device pixels, or the capture semantics drifted and the figure
 * would be silently the wrong size — that throws.
 *
 * The flow leans on Bun's own helpers: the document is installed with one `evaluate`
 * (`document.write`, which keeps the doctype and therefore standards mode), fonts settle and
 * the body height is measured in the same round-trip, and the capture is the native
 * `view.screenshot()`. The one raw CDP call left is `Emulation.setDeviceMetricsOverride` —
 * the 2× density and the content-sized viewport have no Bun-native spelling yet.
 */

export interface ScreenshotOptions {
	/** Viewport width in CSS px — the chart's own `FIGURE_WIDTH`. */
	readonly width: number;
	/** Raster density. 2 (the default) is what the leaderboard commits: crisp on hi-DPI
	 *  displays, displayed at logical size via the `<img width>` attribute. Must be a positive
	 *  integer — the geometry check compares against the image's integer pixel dimensions, and
	 *  a fractional density would fail it on a perfectly good capture. */
	readonly deviceScaleFactor?: number;
	/** WebP quality, 0–100. Defaults to 90: measured on the real charts, q90 is visually
	 *  transparent for flat-colour raster at half the equivalent PNG's bytes, while q100
	 *  INFLATES past PNG (near-lossless lossy spends bits on invisible precision). */
	readonly quality?: number;
	/**
	 * Chrome executable. Left unset, `Bun.WebView` discovers one (`BUN_CHROME_PATH`, then
	 * `$PATH`, then standard locations, then Playwright's cache) and throws if none exists.
	 *
	 * FIRST-SPAWN-ONLY, and this is Bun's semantics, not this module's: Chrome is spawned once
	 * per process, and the first `new Bun.WebView()`'s `path`/`argv` win — a later call with a
	 * different `chromePath` silently reuses the first browser. A caller that pins the browser
	 * must pin it for the process's first view; in practice, set `BUN_CHROME_PATH` in the
	 * environment before the process starts (as the release workflow does) rather than passing
	 * this per call in a process that may already have spawned a view.
	 */
	readonly chromePath?: string;
	/** Ceiling on the whole capture (navigate → fonts → measure → capture), default 30 s. A
	 *  wedged Chrome otherwise leaves the caller hanging until some outer job timeout kills
	 *  the process with no hint of where it stuck. */
	readonly timeoutMs?: number;
}

/**
 * Width and height, in device pixels, out of a WebP container (RIFF). Chrome emits the
 * extended (`VP8X`) chunk for its captures; the lossy (`VP8 `) and lossless (`VP8L`) headers
 * are parsed too so the check cannot start failing on an encoder-detail change. Exported so
 * the tests here and the artifact gate assert committed bytes through the SAME parse this
 * module verifies captures with.
 */
export function webpDimensions(bytes: Uint8Array): { width: number; height: number } {
	const ascii = (at: number, len: number) => String.fromCharCode(...bytes.subarray(at, at + len));
	if (bytes.length < 30 || ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WEBP") {
		throw new Error("not a WebP (bad RIFF/WEBP header or truncated)");
	}
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const chunk = ascii(12, 4);
	if (chunk === "VP8X") {
		// 24-bit little-endian canvas dimensions, stored minus one.
		const u24 = (at: number) =>
			(bytes[at] as number) | ((bytes[at + 1] as number) << 8) | ((bytes[at + 2] as number) << 16);
		return { width: 1 + u24(24), height: 1 + u24(27) };
	}
	if (chunk === "VP8 ") {
		// Lossy bitstream: 14-bit dimensions after the 3-byte frame tag + start code.
		return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
	}
	if (chunk === "VP8L") {
		// Lossless bitstream: 14-bit fields packed after the 0x2F signature byte.
		const b0 = bytes[21] as number;
		const b1 = bytes[22] as number;
		const b2 = bytes[23] as number;
		const b3 = bytes[24] as number;
		return {
			width: 1 + (b0 | ((b1 & 0x3f) << 8)),
			height: 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)),
		};
	}
	throw new Error(`unrecognised WebP chunk "${chunk}"`);
}

/**
 * Render `html` in headless Chrome and return the WebP.
 *
 * The document is taken to be self-contained: nothing is served, so a reference to anything
 * beyond `data:` URIs simply fails to load inside Chrome and the figure ships without it —
 * which is the template's contract, not this module's to re-check.
 *
 * The capture is content-sized: the view is constructed at the capture width, the document is
 * written and measured once fonts settle, and the emulation override sizes the viewport to
 * exactly the measured height — no cropped bottom row, no white strip below the chart. Two
 * things cannot survive this and are the document's contract to avoid: CSS whose HEIGHT
 * depends on the viewport's height (`100vh` — the override changes it after measurement) and
 * content WIDER than `width` (the capture would widen past the requested geometry). Chart
 * documents size themselves from their content, within their width.
 */
export async function screenshotHtml(
	html: string,
	options: ScreenshotOptions,
): Promise<Uint8Array> {
	const deviceScaleFactor = options.deviceScaleFactor ?? 2;
	if (!Number.isInteger(deviceScaleFactor) || deviceScaleFactor < 1) {
		throw new Error(
			`deviceScaleFactor must be a positive integer, got ${deviceScaleFactor}: the capture is ` +
				`verified against the image's integer pixel dimensions, and a fractional density ` +
				`would fail that check on a correct capture`,
		);
	}
	if (!Number.isInteger(options.width) || options.width < 1) {
		throw new Error(`width must be a positive integer of CSS px, got ${options.width}`);
	}
	const timeoutMs = options.timeoutMs ?? 30_000;

	await using view = new Bun.WebView({
		width: options.width,
		height: 600,
		backend: {
			// Never attach to a running debug session: an inherited tab's zoom, emulation or
			// extensions would leak into the figure. See ScreenshotOptions.chromePath for the
			// one-Chrome-per-process caveat on how fresh this actually is.
			type: "chrome",
			url: false,
			...(options.chromePath === undefined ? {} : { path: options.chromePath }),
		},
	});

	// One deadline over the whole capture. `await using` disposes the view on every exit path,
	// which also rejects Bun.WebView's own in-flight promises — the race exists so the caller
	// gets a named, actionable error instead of waiting on a wedged renderer forever.
	let expired: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		expired = setTimeout(
			() => reject(new Error(`screenshot timed out after ${timeoutMs} ms — wedged Chrome?`)),
			timeoutMs,
		);
	});

	const capture = async (): Promise<Uint8Array> => {
		await view.navigate("about:blank");
		// One round-trip installs AND measures the document: `document.write` (not an
		// innerHTML assignment — write preserves the doctype, and losing it would flip the
		// page into quirks mode and change layout), then the height once fonts have decoded.
		// `evaluate` awaits the trailing promise; the fonts are data: URIs but decoding is
		// still async, and capturing early would draw fallback glyphs. The BODY's height, not
		// the document element's: headless Chrome pads `documentElement.scrollHeight` with
		// viewport-derived slack (~65 CSS px observed) that would ship as a white strip.
		const height = Number(
			await view.evaluate(
				`(document.open(), document.write(${JSON.stringify(html)}), document.close(), ` +
					`document.fonts.ready.then(() => document.body.scrollHeight))`,
			),
		);
		if (!Number.isInteger(height) || height <= 0) {
			throw new Error(`document measured a nonsensical height: ${height}`);
		}

		// The one raw CDP call: density and a content-sized viewport in a single override
		// (`resize()` cannot set deviceScaleFactor). With the viewport exactly the content's
		// size, the native screenshot captures the whole chart — nothing beyond the viewport
		// to reach for.
		await view.cdp("Emulation.setDeviceMetricsOverride", {
			width: options.width,
			height,
			deviceScaleFactor,
			mobile: false,
		});
		// A Buffer IS a Uint8Array — no copy; its mmap-backed pages release on GC.
		const bytes: Uint8Array = await view.screenshot({
			format: "webp",
			quality: options.quality ?? 90,
			encoding: "buffer",
		});

		const size = webpDimensions(bytes);
		const expected = {
			width: options.width * deviceScaleFactor,
			height: height * deviceScaleFactor,
		};
		if (size.width !== expected.width || size.height !== expected.height) {
			throw new Error(
				`captured ${size.width}×${size.height} device px, expected ${expected.width}×` +
					`${expected.height} (${options.width}×${height} CSS px at ${deviceScaleFactor}×) — ` +
					`Chrome's capture semantics drifted; the figure would be the wrong size`,
			);
		}
		return bytes;
	};

	try {
		return await Promise.race([capture(), deadline]);
	} catch (error) {
		throw diagnoseLaunch(error);
	} finally {
		clearTimeout(expired);
	}
}

/**
 * A Chrome that dies DURING LAUNCH reaches the caller as Bun's "Chrome process closed the pipe" —
 * true, and silent about the cause: the browser's own explanation went to a stderr the spawn
 * discards. The one cause worth naming is the one that bites every Linux CI runner: Chrome builds
 * its sandbox out of an unprivileged user namespace, Ubuntu 23.10+ forbids that by default
 * (`kernel.apparmor_restrict_unprivileged_userns=1`), and the browser aborts with "No usable
 * sandbox!" before the pipe ever opens. Anything else is passed through untouched.
 */
function diagnoseLaunch(error: unknown): unknown {
	const message = error instanceof Error ? error.message : String(error);
	if (!/closed the pipe|chrome exited/i.test(message)) return error;
	return new Error(
		`${message} — Chrome died at launch, before the DevTools pipe opened. On Linux the usual ` +
			`cause is a host that forbids unprivileged user namespaces ` +
			`(kernel.apparmor_restrict_unprivileged_userns=1), which Chrome's sandbox needs: it aborts ` +
			`with "No usable sandbox!". Run the binary by hand to see its stderr — ` +
			`\`"$BUN_CHROME_PATH" --headless --dump-dom about:blank\`. In CI, .github/actions/` +
			`setup-pinned-chrome restores the namespace and verifies the launch.`,
		{ cause: error },
	);
}
