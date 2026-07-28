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

let ready: Promise<void> | undefined;

/**
 * Resolve and load the wasm binary, once.
 *
 * The path is resolved INSIDE this function, not at module scope: the file is not in
 * `@resvg/resvg-wasm`'s `exports` map, so `resolveSync` throws if a release moves it — and at module
 * scope that throw would fire on import, taking down anything that merely loads the package's
 * barrel, before the explanatory error below could ever run.
 */
function wasmReady(): Promise<void> {
	ready ??= (async () => {
		let path: string;
		try {
			path = Bun.resolveSync("@resvg/resvg-wasm/index_bg.wasm", import.meta.dir);
		} catch (cause) {
			throw new Error(
				"@sandbox-benchmarks/figures: could not resolve @resvg/resvg-wasm/index_bg.wasm. It is not " +
					"in that package's exports map, so a release that moves it breaks this path — pin or update it.",
				{ cause },
			);
		}
		await initWasm(await Bun.file(path).arrayBuffer());
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
