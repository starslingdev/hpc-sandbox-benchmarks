/**
 * The screenshotter, against whatever Chrome this machine has.
 *
 * SKIPPED when none is discoverable: PR CI runs on a runner that need not carry a browser, and
 * a test that fails for a missing system dependency would gate merges on machine shape rather
 * than on code. Where it does run it asserts geometry only — via the module's own
 * `webpDimensions` — never pixels, because pixel bytes are Chrome's (version, platform) and a
 * pixel assertion would be green on exactly one machine.
 */
import { afterAll, describe, expect, it } from "bun:test";
import { screenshotHtml, webpDimensions } from "./screenshot.ts";

const HTML =
	`<!doctype html><html><head><style>body{margin:0}</style></head>` +
	`<body><div style="width:64px;height:40px;background:#0990a6"></div></body></html>`;

/**
 * Probe by doing the actual thing: one tiny capture through `screenshotHtml` itself.
 *
 * A construct-only probe is a liar on exactly the machines this skip exists for — a CI runner
 * can carry a DISCOVERABLE Chrome binary that dies at launch (sandbox restrictions; "Chrome
 * exited"), so `new Bun.WebView()` succeeds at collection time and the capture tests then fail
 * on machine shape rather than on code. The only probe that cannot drift from the module is the
 * module: any failure — no binary, dead-on-launch binary, wedged renderer — reads as "no working
 * Chrome" and the capture suite skips. On machines where it works, the probe's Chrome persists
 * (one spawn per process) and the tests below reuse it.
 */
const chromeWorks = await screenshotHtml(HTML, { width: 64, timeoutMs: 15_000 }).then(
	() => true,
	() => false,
);

// Reclaim the shared Chrome once this file's tests are done — closing individual views never
// does (the subprocess persists to serve later views), and an idle browser must not ride along
// for the rest of the package's test run. Never call this BETWEEN tests: Chrome spawns once per
// process, and killing it mid-file races the next view into "Chrome process closed the pipe".
afterAll(() => {
	Bun.WebView.closeAll();
});

describe.skipIf(!chromeWorks)("screenshotHtml", () => {
	it("captures a content-sized WebP at the default 2× density", async () => {
		// deviceScaleFactor deliberately OMITTED: this is the one test of the default, and the
		// default is what the leaderboard pipeline relies on. 64×40 CSS px at 2× is 128×80.
		const bytes = await screenshotHtml(HTML, { width: 64 });
		expect(webpDimensions(bytes)).toEqual({ width: 128, height: 80 });
	}, 30_000);

	it("honours an explicit 1×", async () => {
		const bytes = await screenshotHtml(HTML, { width: 64, deviceScaleFactor: 1 });
		expect(webpDimensions(bytes)).toEqual({ width: 64, height: 40 });
	}, 30_000);
});

describe("screenshotHtml input validation", () => {
	// These throw before any browser is involved, so they run on Chrome-less machines too.
	it("rejects a fractional density instead of failing the geometry check later", () => {
		expect(screenshotHtml(HTML, { width: 64, deviceScaleFactor: 1.5 })).rejects.toThrow(
			/positive integer/,
		);
	});

	it("rejects a fractional width", () => {
		expect(screenshotHtml(HTML, { width: 64.5 })).rejects.toThrow(/positive integer/);
	});
});

describe("webpDimensions", () => {
	it("refuses bytes that are not a WebP", () => {
		expect(() => webpDimensions(new Uint8Array([1, 2, 3]))).toThrow(/not a WebP/);
	});
});
