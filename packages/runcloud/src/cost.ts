// run.cloud's cost evidence: the bill for exactly one benchmark sandbox, read after teardown from
// `GET /run-cloud/sandboxes/{id}/cost`. The endpoint returns the ledger's own nanodollar totals,
// the same amounts run.cloud reports to Stripe, split into cpu, memory and cpu_burst lines.
// `status` is `accruing` until the last usage is billed and `final` after that. The first read of
// a fully destroyed sandbox finalizes it. Only a `final` bill is recorded: an accruing figure
// can still grow, and a partial bill would read as a measured one.
//
// The SDK pinned here predates a typed `sandboxes.cost()`, so the route is read through the
// client's raw `request`, the same way `transport.ts` reads inventory pages.

import { RunCloudError } from "@run-cloud/sdk";
import type { ProviderCostEvidenceCapability } from "@sandbox-benchmarks/driver";
import type { ProviderCostEvidence } from "@sandbox-benchmarks/schema";
import {
	BILLED_WALL_SECONDS,
	canonicalJsonString,
	PROVIDER_RESPONSE_LIMITS,
} from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import { RUNCLOUD_PROVENANCE } from "./provenance.ts";
import { readRuncloudSandboxCost } from "./transport.ts";

const API_OPERATION = "GET /run-cloud/sandboxes/{id}/cost";
/** Poll cadence and the whole capture's bound, inside the harness's 30 s hook budget. */
const POLL_MS = 2_000;
const DEADLINE_MS = 26_000;

const whole = type(/^\d+$/);
const decimal = type(/^\d+(\.\d+)?$/);

/** The documented body of `GET /run-cloud/sandboxes/{id}/cost`; other keys are ignored. */
export const runcloudSandboxCost = type({
	sandboxId: "string",
	status: "'accruing' | 'final'",
	currency: "'USD'",
	totalNanodollars: whole,
	lines: type({
		meter: "string",
		nanodollars: whole,
		quantity: decimal,
		unit: "string",
	}).array(),
	startedAt: "string.date.iso",
	endedAt: "string.date.iso | null",
});
export type RuncloudSandboxCost = typeof runcloudSandboxCost.infer;

export interface RuncloudCostDeps {
	/** Reads the raw response body for one sandbox. Default: the real API. */
	readonly read?: (apiKey: string, sandboxId: string) => Promise<unknown>;
	readonly sleep?: (ms: number) => Promise<void>;
	readonly now?: () => number;
}

const NANODOLLARS_PER_USD = 1_000_000_000;

function price(cost: RuncloudSandboxCost) {
	const wallSeconds =
		cost.endedAt === null ? 0 : (Date.parse(cost.endedAt) - Date.parse(cost.startedAt)) / 1000;
	return {
		usage: [
			// Created to destroyed. run.cloud bills running time only, so this can exceed the billed
			// time by the boot; it is the lifetime the bill covers.
			{ ...BILLED_WALL_SECONDS, quantity: Math.max(0, wallSeconds) },
			...cost.lines.map((line) => ({
				resource: `billed_${line.meter}`,
				quantity: Number(line.quantity),
				unit: line.unit,
			})),
		],
		amount: Number(cost.totalNanodollars) / NANODOLLARS_PER_USD,
		source: "provider_reported" as const,
	};
}

/** The run.cloud cost hook. `deps` replaces the API and the clock in tests. */
export function runcloudCostEvidenceWith(
	deps: RuncloudCostDeps = {},
): ProviderCostEvidenceCapability<"runcloud"> {
	const read = deps.read ?? readRuncloudSandboxCost;
	const sleep = deps.sleep ?? ((ms: number) => Bun.sleep(ms));
	const now = deps.now ?? Date.now;
	return {
		sdk: RUNCLOUD_PROVENANCE,
		captureAfterTeardown: async (input, env): Promise<ProviderCostEvidence> => {
			const record = {
				cell: input.cell,
				subject: { kind: "sandbox" as const, sandboxId: input.sandboxId },
				capturedAt: new Date().toISOString(),
				sdk: RUNCLOUD_PROVENANCE,
			};
			// A bill for a sandbox that may still run is not final.
			if (!input.teardown.completed) {
				return {
					...record,
					kind: "missing",
					reason: "sandbox_teardown_unconfirmed",
					detail: "Sandbox teardown was not confirmed; no provider usage was considered.",
				};
			}
			const missing = (
				reason: "provider_api_error" | "invalid_provider_response",
				detail: string,
				body?: unknown,
			): ProviderCostEvidence => ({
				...record,
				kind: "missing",
				reason,
				detail: detail.slice(0, 512),
				apiOperation: API_OPERATION,
				...(body !== undefined && {
					responseJson: canonicalJsonString(body, PROVIDER_RESPONSE_LIMITS),
				}),
			});
			const deadline = now() + DEADLINE_MS;
			for (;;) {
				let body: unknown;
				try {
					body = await read(env.RUN_CLOUD_API_KEY, input.sandboxId);
				} catch (error) {
					const status = error instanceof RunCloudError ? ` (HTTP ${error.status})` : "";
					return missing(
						"provider_api_error",
						`The sandbox cost read failed${status}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
				const cost = runcloudSandboxCost(body);
				if (cost instanceof type.errors) {
					return missing(
						"invalid_provider_response",
						`The sandbox cost response did not match the documented shape: ${cost.summary}`,
					);
				}
				if (cost.sandboxId !== input.sandboxId) {
					return missing(
						"invalid_provider_response",
						"The sandbox cost response named a different sandbox.",
						cost,
					);
				}
				if (cost.status === "final") {
					return {
						...record,
						kind: "observed",
						apiOperation: API_OPERATION,
						currency: cost.currency,
						responseJson: canonicalJsonString(cost, PROVIDER_RESPONSE_LIMITS),
						...price(cost),
					};
				}
				if (now() + POLL_MS > deadline) {
					return missing(
						"provider_api_error",
						"The sandbox's bill was still accruing at the capture deadline.",
						cost,
					);
				}
				await sleep(POLL_MS);
			}
		},
	};
}

export const runcloudCostEvidence = runcloudCostEvidenceWith();
