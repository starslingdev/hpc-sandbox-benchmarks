// Prototype: Tier-3 validation of driver manifests (ADR-0006). Manifests are inert data authored
// next to provider metadata, so they are never parsed at import time; the generator and the drift
// gate run this arktype scope over every manifest, then cross-check it against the provider's
// declared inputs and its own row schema. A malformed manifest fails `generate-providers`, not a
// benchmark run.

import { scope, type } from "arktype";
import { placeholders } from "./rules.ts";

const $ = scope({
	phase: "'pending' | 'ready' | 'failed' | 'deleting' | 'gone'",
	phaseRule: { phase: "phase", where: { "[string]": "string[] > 0" } },
	phaseRules: {
		rules: "phaseRule[] > 0",
		otherwise: "phase",
		"ignoreCase?": "boolean",
	},
	endpoint: { path: "string > 0", "select?": "string" },
	httpControlPlane: {
		kind: "'http'",
		row: "object",
		id: { field: "string > 0", pattern: "string > 0" },
		create: {
			path: "string > 0",
			"select?": "string",
			body: "unknown",
			marker: type({ header: "string > 0" }).or({ field: "string > 0" }),
		},
		get: "endpoint",
		remove: { path: "string > 0", "select?": "string", "idempotencyHeader?": "string > 0" },
		list: "endpoint",
		phases: "phaseRules",
		ownership: type({ account: "'dedicated'", recover: "'replay'" }).or({
			account: "'shared'",
			markerField: "string > 0",
		}),
		"errors?": {
			"notFound?": "number.integer[]",
			"definitive?": "number.integer[]",
			"retryable?": "number.integer[]",
		},
		"data?": {
			kind: "'json-exec'",
			path: "string > 0",
			body: "unknown",
			result: { exitCode: "string", stdout: "string", stderr: "string" },
		},
	},
	cliManifest: {
		kind: "'cli'",
		label: "string > 0",
		binary: { default: "string > 0", "envOverride?": "string > 0" },
		secretFlags: "string[]",
		row: "object",
		id: { field: "string > 0", pattern: "string > 0" },
		nameField: "string > 0",
		timeouts: {
			commandMs: "number.integer > 0",
			"createCommandMs?": "number.integer > 0",
			createCeilingMs: "number.integer > 0",
			syncCapMs: "number.integer > 0",
		},
		spec: "object",
		"prepare?": {
			"authenticateFirst?": "boolean",
			probe: "string[] > 0",
			fallback: "string[] > 0",
		},
		argv: {
			create: "string[] > 0",
			list: "string[] > 0",
			exec: "string[] > 0",
			remove: "string[] > 0",
		},
		phases: "phaseRules",
		terminalDetail: "string[] > 0",
		notFound: { pattern: "string > 0", "flags?": "string" },
		absenceConfirmationMs: "number.integer > 0",
	},
	driverManifest: "httpControlPlane | cliManifest",
}).export();

export const driverManifestSchema = $.driverManifest;

/**
 * Cross-field invariants a structural schema cannot express. Returns human-readable failures so
 * the generator can report every problem in one pass.
 */
export function manifestFailures(
	manifest: unknown,
	declaredInputs: readonly string[],
): readonly string[] {
	const parsed = driverManifestSchema(manifest);
	if (parsed instanceof type.errors) return [parsed.summary];
	const failures: string[] = [];
	const rowFields = Object.keys(parsed.row).map((key) => key.replace(/\?$/, ""));

	// Every env placeholder must name a declared input, so a typo is not an empty string at runtime.
	for (const path of placeholders(parsed)) {
		const [root, name] = path.split(".");
		if (root === "env" && name && !declaredInputs.includes(name))
			failures.push(`{{${path}}} references an undeclared input`);
	}
	// The row schema must compile, and must declare every field the manifest reads from a row.
	const compiled = type.raw(parsed.row);
	if (compiled instanceof type.errors) failures.push(`row schema: ${compiled.summary}`);
	const readFields = [
		parsed.id.field,
		...parsed.phases.rules.flatMap((rule) => Object.keys(rule.where)),
		...(parsed.kind === "cli" ? [parsed.nameField] : []),
		...(parsed.kind === "http" && parsed.ownership.account === "shared"
			? [parsed.ownership.markerField]
			: []),
	];
	for (const field of readFields) {
		if (!rowFields.includes(field.split(".")[0] ?? field))
			failures.push(`field ${field} is read but not declared in the row schema`);
	}
	try {
		new RegExp(parsed.id.pattern);
		if (parsed.kind === "cli") new RegExp(parsed.notFound.pattern, parsed.notFound.flags);
	} catch (error) {
		failures.push(`invalid pattern: ${(error as Error).message}`);
	}
	// Replay recovery resends the original body; it must not depend on per-request values that a
	// recovery-time caller could not reproduce (the kit replays the stored body, but keep it honest).
	if (parsed.kind === "http" && parsed.ownership.account === "dedicated") {
		if (!("header" in parsed.create.marker))
			failures.push("replay recovery requires an idempotency header marker");
	}
	if (parsed.kind === "http" && parsed.ownership.account === "shared") {
		if (!("field" in parsed.create.marker))
			failures.push("shared accounts need a marker field readable back from list rows");
	}
	return failures;
}
