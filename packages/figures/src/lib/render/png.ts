/**
 * The ONLY module in this package that imports a rasterizer.
 *
 * `initWasm()` is SINGLE-SHOT — a second call throws `Already initialized`. `bun test` runs every
 * test file in one process, so an un-memoized init turns "two test files that both rasterize" into a
 * failure that reproduces under `bun run test` and vanishes under `bun test path/to/one.test.ts`.
 * The memo below is the fix, and png.test.ts + bundle.test.ts both rasterize specifically so the
 * regression has somewhere to reproduce.
 *
 * PNG is deliberately NOT a committed artifact. `ci.yml` runs on the self-hosted
 * `starsling-ubuntu-24.04-2` while `update-leaderboard.yml` publishes on GitHub-hosted `ubuntu-24.04`,
 * so a PNG byte-hash asserted in `bun run test` would be validated on a different machine from the
 * one that produces it — and CONTRIBUTING promises a maintainer's local `bun run test` matches CI.
 * SVG is the gated artifact; PNG exists for surfaces that cannot display SVG (the Actions job
 * summary) and is produced on demand.
 */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import type { Svg } from "./svg.ts";

/** Resolved path to the wasm binary. It is NOT in the package's `exports` map, so it is reached by
 *  path; the explicit existence check turns a silent upstream layout change into a named failure. */
const WASM_PATH = Bun.resolveSync("@resvg/resvg-wasm/index_bg.wasm", import.meta.dir);

let ready: Promise<void> | undefined;

function wasmReady(): Promise<void> {
	ready ??= (async () => {
		const file = Bun.file(WASM_PATH);
		if (!(await file.exists())) {
			throw new Error(
				`@sandbox-benchmarks/figures: resvg wasm not found at ${WASM_PATH}. The file is not in ` +
					`@resvg/resvg-wasm's exports map, so a release that moves it breaks this path — pin or update it.`,
			);
		}
		await initWasm(await file.arrayBuffer());
	})();
	return ready;
}

export interface PngOptions {
	/** Target pixel width. Omit to rasterize at the SVG's own CSS width (1×). */
	readonly width?: number;
}

export async function toPng(svg: Svg, options: PngOptions = {}): Promise<Uint8Array> {
	await wasmReady();
	const resvg = new Resvg(
		svg,
		options.width === undefined ? {} : { fitTo: { mode: "width", value: options.width } },
	);
	return resvg.render().asPng();
}
