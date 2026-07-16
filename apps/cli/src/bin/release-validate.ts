#!/usr/bin/env bun
// `release-validate` — the script behind the `release-validate-inputs` composite action: the
// credential-free fail-fast gate. Validates the toolchain pins and the dispatch inputs BEFORE any
// registry/provider credential is introduced, and reports failures as rich @actions/core annotations
// (a pin failure is annotated ON the pins source file, so the run's "Files changed" view links to it).
// Inputs arrive as env (the composite maps its `with:` inputs).
import * as core from "@actions/core";
import { validatedPins } from "@sandbox-benchmarks/templates/pins";

// The arktype pin gatekeeper lives here; annotate failures on it so the run links straight to the pins.
const PINS_FILE = "packages/templates/src/lib/pins.ts";

// A dispatch input reaches the release as an env var; still, reject anything but the two booleans so a
// hand-typed dispatch value can't slip through as a surprise "truthy" string downstream.
const forceRepublish = process.env.FORCE_REPUBLISH ?? "";
if (!["true", "false", ""].includes(forceRepublish)) {
	core.error(`force_republish must be true or false (got '${forceRepublish}').`, {
		title: "Invalid dispatch input",
	});
	core.setFailed("Invalid force_republish input.");
}

// Re-run the arktype pin gatekeeper (hex sha256s, non-empty versions); an unfilled/invalid pin fails the
// release here, before it spends a build. On failure, annotate the exact source file.
await core.group("Validate toolchain pins", async () => {
	try {
		validatedPins();
		core.info("Toolchain pins valid.");
	} catch (err) {
		core.error(err instanceof Error ? err.message : String(err), {
			title: "Toolchain pin validation failed",
			file: PINS_FILE,
		});
		core.setFailed("Toolchain pin validation failed — see the annotation on the pins file.");
	}
});
