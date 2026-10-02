// Prototype: a CLI provider as pure data. The existing CLI kit already owns spawn, deadlines,
// redaction, reconciliation, and readiness; its remaining per-provider inputs are argv shapes,
// a row schema, and a status table. This compiler turns an inert manifest into that CliSpec, so
// a CLI-only vendor needs no package, no TypeScript, and no SDK dependency.

import type { DriverContext, ProviderId } from "@sandbox-benchmarks/driver";
import type {
	CliArgv,
	CliCreateRequestCoverage,
	CliReadinessStatus,
	CliSpec,
} from "@sandbox-benchmarks/driver/cli";
import { defineCliDriver, defineCliSpec } from "@sandbox-benchmarks/driver/cli";
import type { Type } from "arktype";
import { type } from "arktype";
import type { PhaseRules } from "./rules.ts";
import { phaseOf, pick, render } from "./rules.ts";

type Template = readonly string[];

export interface CliManifest {
	readonly kind: "cli";
	readonly label: string;
	readonly binary: { readonly default: string; readonly envOverride?: string };
	readonly secretFlags: readonly string[];
	/** arktype definition of one row of `list` JSON output. */
	readonly row: object;
	readonly id: { readonly field: string; readonly pattern: string };
	/** The row field that echoes the kit-generated `bench-<uuid>` create name. */
	readonly nameField: string;
	readonly timeouts: {
		readonly commandMs: number;
		readonly createCommandMs?: number;
		readonly createCeilingMs: number;
		readonly syncCapMs: number;
	};
	readonly spec: CliCreateRequestCoverage["spec"];
	readonly prepare?: {
		readonly authenticateFirst?: boolean;
		readonly probe: Template;
		readonly fallback: Template;
	};
	readonly argv: {
		readonly create: Template;
		readonly list: Template;
		readonly exec: Template;
		readonly remove: Template;
	};
	readonly phases: PhaseRules;
	/** Segments are dropped when any placeholder in them is absent. */
	readonly terminalDetail: Template;
	readonly notFound: { readonly pattern: string; readonly flags?: string };
	readonly absenceConfirmationMs: number;
}

const BENCH_NAME = /^bench-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const PLACEHOLDER = /\{\{([\w.]+)\}\}/g;

function argv(template: Template, scope: object): CliArgv {
	const rendered = template.map((part) => String(render(part, scope)));
	if (rendered.length === 0) throw new Error("CLI manifest argv must not be empty");
	return rendered as unknown as CliArgv;
}

function segments(template: Template, scope: object): string {
	return template
		.filter((part) => [...part.matchAll(PLACEHOLDER)].every((m) => pick(scope, m[1]) !== undefined))
		.map((part) => String(render(part, scope)))
		.join("");
}

/** Everything a module and its tests need, derived from one manifest. */
export function compileCliManifest<P extends ProviderId>(provider: P, manifest: CliManifest) {
	const rowSchema = (type as (def: unknown) => Type<unknown>)(manifest.row);
	const rows = type("string.json.parse").to(rowSchema.array()) as unknown as Parameters<
		typeof defineCliSpec<Record<string, unknown>>
	>[0];
	const sandboxId = type(new RegExp(manifest.id.pattern));
	const notFound = new RegExp(manifest.notFound.pattern, manifest.notFound.flags);
	const coverage = {
		spec: manifest.spec,
		artifact: "context",
		deadlineMs: "driver",
		gpu: { model: "unsupported", count: "unsupported" },
		env: "unsupported",
	} as const satisfies CliCreateRequestCoverage;
	const execution = { syncCapMs: manifest.timeouts.syncCapMs, durable: "shell-detach" } as const;
	const byName = (list: readonly Record<string, unknown>[], name: string) =>
		list.find((row) => row[manifest.nameField] === name) ?? null;

	function spec(context: DriverContext<P>): CliSpec<Record<string, unknown>> {
		const env = context.env as Readonly<Record<string, string | undefined>>;
		const resolved = context.resolvedArtifact as { kind: string; ref?: string };
		const override = manifest.binary.envOverride;
		return defineCliSpec(rows, {
			binary: (override && env[override]) || manifest.binary.default,
			secretFlags: manifest.secretFlags,
			inventoryOwned: (row) => BENCH_NAME.test(String(row[manifest.nameField])),
			commandTimeoutMs: manifest.timeouts.commandMs,
			...(manifest.timeouts.createCommandMs && {
				createCommandTimeoutMs: manifest.timeouts.createCommandMs,
			}),
			requestCoverage: coverage,
			...(manifest.prepare && {
				prepare: {
					authenticateFirst: manifest.prepare.authenticateFirst ?? false,
					probe: argv(manifest.prepare.probe, { env }),
					fallback: argv(manifest.prepare.fallback, { env }),
				},
			}),
			create: (request, name) => {
				const artifact = request.artifact as { kind: string; ref?: string };
				if (artifact.kind !== resolved.kind || artifact.ref !== resolved.ref)
					throw new Error(
						`the request artifact does not match the resolved ${manifest.label} image`,
					);
				const memoryMb = request.spec.memoryGb * 1024;
				return argv(manifest.argv.create, {
					env,
					name,
					artifact: resolved,
					spec: { ...request.spec, memoryMb },
				});
			},
			cleanupCreated: {
				kind: "lookup",
				select: byName,
				absenceConfirmationMs: manifest.absenceConfirmationMs,
			},
			ready: {
				poll: argv(manifest.argv.list, { env }),
				select: byName,
				classify: (row): CliReadinessStatus => {
					const phase = phaseOf(manifest.phases, row);
					if (phase === "ready") return "ready";
					if (phase === "pending") return "pending";
					return { retryable: false, terminal: segments(manifest.terminalDetail, row) };
				},
			},
			sandboxId: { fromRow: (row) => pick(row, manifest.id.field), parse: sandboxId },
			exec: (id, command) => argv(manifest.argv.exec, { env, id, command }),
			destroy: (id) => argv(manifest.argv.remove, { env, id }),
			notFound,
		});
	}

	return {
		rows,
		sandboxId,
		notFound,
		coverage,
		execution,
		spec,
		module: (provenance: { readonly packageName: string; readonly version: string }) =>
			defineCliDriver(provider, {
				provenance,
				execution,
				createAttemptCeilingMs: manifest.timeouts.createCeilingMs,
				spec,
			}),
	};
}
