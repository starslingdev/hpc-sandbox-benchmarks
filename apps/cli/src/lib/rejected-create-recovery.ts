import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { providerIdSchema, suiteNameSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { readExperimentAttempt } from "./experiment-artifacts.ts";

/**
 * Legacy create-failure markers do not distinguish rejection from an ambiguous accepted request.
 * Keep this entry point to explain why old operator invocations can no longer clear ownership.
 * Empty inventory, even after workflow completion, cannot prove a POST was cancelled.
 * No provider or journal operation is permitted without authoritative rejection evidence.
 */
const rejectedMarker = type({
	provider: providerIdSchema,
	suite: suiteNameSchema,
	outcome: "'failed'",
	reason: "string >= 1",
	cause: { kind: "'sandbox-create-failed'", detail: "string >= 1" },
}).onUndeclaredKey("delete");

export async function recoverRejectedCreate(options: {
	directory: string;
	provider: typeof providerIdSchema.infer;
	suite: typeof suiteNameSchema.infer;
}): Promise<never> {
	const { evidence, execution, cleanup } = readExperimentAttempt(options.directory);
	if (
		evidence.outcome !== "failed" ||
		evidence.measurementStarted ||
		evidence.cleanup !== "unresolved" ||
		!evidence.rawDigest ||
		execution ||
		cleanup
	)
		throw new Error("attempt does not prove an unresolved create rejection");
	// A retained allocation means create RETURNED a sandbox and only the append failed. That is a
	// known resource with its own recovery, and clearing it here would abandon a live sandbox.
	if (existsSync(join(options.directory, "raw", "allocation.json")))
		throw new Error("attempt retains allocation.json; recover with recover-allocated-intent");
	const marker = rejectedMarker.assert(
		JSON.parse(
			readFileSync(
				join(
					options.directory,
					"raw",
					options.provider,
					options.suite,
					`sandbox-${options.provider}-${options.suite}--failed.json`,
				),
				"utf8",
			),
		),
	);
	if (
		marker.provider !== options.provider ||
		marker.suite !== options.suite ||
		!evidence.cellId.startsWith(`${marker.provider}-${marker.suite}-r`)
	)
		throw new Error("recovery marker identity mismatch");
	throw new Error(
		"original evidence does not prove a definitive create rejection; inventory cannot clear an ambiguous create. " +
			"Keep the intent unresolved pending identity-based recovery or vendor-confirmed rejection; do not append a not-allocated release from empty inventory.",
	);
}
