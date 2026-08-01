#!/usr/bin/env bun
// `release-validate` — the script behind the `release-validate-inputs` composite action: the
// credential-free fail-fast gate. Validates the toolchain pins and the dispatch inputs BEFORE any
// registry/provider credential is introduced, and reports failures as rich @actions/core annotations
// (a pin failure is annotated ON the pins source file, so the run's "Files changed" view links to it).
// Inputs arrive as env (the composite maps its `with:` inputs).
import * as core from "@actions/core";
import { validatedPins } from "@sandbox-benchmarks/templates/pins";
import { isPartialScope, selectProviders } from "../lib/matrix.ts";
import { BUILD_MODES, isBuildMode } from "../lib/release-inputs.ts";

// The arktype pin gatekeeper lives here; annotate failures on it so the run links straight to the pins.
const PINS_FILE = "packages/templates/src/lib/pins.ts";

/** A dispatch boolean reaches the release as an env var; reject anything but the two spellings (and
 *  unset) so a hand-typed value can't slip through as a surprise "truthy" string downstream. */
function validateBoolean(name: string, value: string): void {
	if (["true", "false", ""].includes(value)) return;
	core.error(`${name} must be true or false (got '${value}').`, {
		title: "Invalid dispatch input",
	});
	core.setFailed(`Invalid ${name} input.`);
}

const forceRepublish = process.env.FORCE_REPUBLISH?.trim() ?? "";
const promote = process.env.PROMOTE?.trim() ?? "";
const buildMode = process.env.BUILD_MODE?.trim() ?? "";
const providers = process.env.RELEASE_PROVIDERS?.trim() ?? "";

validateBoolean("force_republish", forceRepublish);
validateBoolean("promote", promote);

// `build` is a `type: choice` input, so the dispatch UI can only offer the three modes — but a
// re-dispatch via the API can send anything, and an unrecognized value would fall back to `full` in
// the plan and spend an hour rebuilding a base the operator asked us to leave alone.
if (buildMode !== "" && !isBuildMode(buildMode)) {
	core.error(`build must be one of ${BUILD_MODES.join(", ")} (got '${buildMode}').`, {
		title: "Invalid dispatch input",
	});
	core.setFailed("Invalid build input.");
}

// Resolve the provider scope against the registry here, before the release spends anything: a typo'd
// id would otherwise silently shrink the release (selectProviders throws, but only once `plan` runs —
// after the GHCR login, and with a stack trace instead of an annotation).
if (providers !== "") {
	try {
		const scope = selectProviders(providers);
		core.info(`Scoped release: ${scope.join(", ")}`);
		// A PARTIAL release backfills providers onto an already-published version and never rewrites the
		// base; force_republish regenerates the whole version in place, destructively for daytona (it
		// deletes each snapshot before recreating it). Refusing the combination is not pedantry: either
		// interpretation silently does something the operator did not ask for. Gated on the same
		// `isPartialScope` the promote transaction uses, so this gate can't reject a dispatch the
		// transaction would have accepted — a list naming every provider is just a full release.
		if (isPartialScope(scope) && forceRepublish === "true") {
			core.error(
				"force_republish cannot be combined with a scoped `providers` list — a scoped release " +
					"backfills onto the published version, while force_republish regenerates that whole version " +
					"in place (deleting and rebuilding every provider's artifact). Dispatch one or the other.",
				{ title: "Conflicting dispatch inputs" },
			);
			core.setFailed("force_republish is not valid for a scoped release.");
		}
	} catch (err) {
		core.error(err instanceof Error ? err.message : String(err), {
			title: "Invalid providers input",
		});
		core.setFailed("Invalid providers input.");
	}
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
