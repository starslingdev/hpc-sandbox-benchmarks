// `@sandbox-benchmarks/templates/manifest` — the toolchain verification manifest, derived from the
// arktype-validated pins (the single source of truth) so `/toolchain-manifest.json` is generated +
// typed end-to-end rather than hand-assembled in-container. build.sh writes it into the base build
// context (like mise.toml / e2b.toml); the Dockerfile COPYs it to `/toolchain-manifest.json`; the
// 99-manifest.sh step confirms it landed. The in-sandbox smoke spec verifies the running toolchain
// actually matches these declared versions, so the manifest can't quietly diverge from reality.
//
// Run directly to emit the manifest JSON:
//   bun packages/templates/src/manifest.ts
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { Pins } from "./lib/pins.ts";
import { validatedPins } from "./pins.ts";

const nonEmpty = "string >= 1";

/** Runtime schema for `/toolchain-manifest.json` — the typed shape every producer/consumer shares. */
export const manifestSchema = type({
	image_name: nonEmpty,
	image_version: nonEmpty,
	// The mise-managed toolchain, keyed by tool → exact pinned version.
	tools: {
		node: nonEmpty,
		python: nonEmpty,
		pnpm: nonEmpty,
		hyperfine: nonEmpty,
		jc: nonEmpty,
		quarto: nonEmpty,
		warp: nonEmpty,
		mise: nonEmpty,
	},
	pts: {
		version: nonEmpty,
		// Profiles pre-installed into the image (sorted, so the manifest is stable across rebuilds).
		install_tests: "string[]",
	},
});

/** The validated toolchain manifest shape (single source of truth for producers + consumers). */
export type ToolchainManifest = typeof manifestSchema.infer;

/**
 * Build the toolchain manifest from the validated pins and validate it against {@link manifestSchema}.
 * Throws on any invalid pin or shape mismatch, so a drift fails before the image is built. `pins` is
 * injectable so the manifest can be unit-tested without the (placeholder-until-filled) real pins.
 */
export function buildManifest(pins: Pins = validatedPins()): ToolchainManifest {
	const manifest = {
		image_name: TOOLCHAIN_IMAGE_NAME,
		image_version: TOOLCHAIN_VERSION,
		tools: {
			node: pins.nodeVersion,
			python: pins.pythonVersion,
			pnpm: pins.pnpmVersion,
			hyperfine: pins.hyperfineVersion,
			jc: pins.jcVersion,
			quarto: pins.quartoVersion,
			warp: pins.warpVersion,
			mise: pins.miseVersion,
		},
		pts: {
			version: pins.ptsVersion,
			install_tests: pins.ptsInstallTests.split(/\s+/).filter(Boolean).sort(),
		},
	};
	const out = manifestSchema(manifest);
	if (out instanceof type.errors) {
		throw new Error(`Invalid toolchain manifest: ${out.summary}`);
	}
	return out;
}

if (import.meta.main) {
	process.stdout.write(`${JSON.stringify(buildManifest(), null, 2)}\n`);
}
