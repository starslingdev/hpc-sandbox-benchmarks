/**
 * THE PARSE BOUNDARY: `unknown` → `SandboxBenchmarkData`, or a throw that names the field.
 *
 * One seam, at the one place the derived artifact enters the program. Everything downstream —
 * the page, the markdown mirror, the composites, the eight page figures — may then read
 * `data.phaseOrder` or `provider.specs.diskGb` without asking whether it is there, because
 * this function has already established that it is.
 *
 * WHAT IT REPLACED, AND WHY THAT WAS WORSE. The site used to open the artifact with
 * `rawData as SandboxBenchmarkData` — an assertion, checked by nobody. A regenerated artifact
 * missing `phaseOrder` did not fail; `indexOf` on `undefined` threw three layers down inside a
 * chart. A provider that lost its `specs` did not fail either: the environments table rendered
 * a column of empty cells and the figure cropped from it published them. The failure mode of a
 * cast is always "somewhere else, later, in something that still renders".
 *
 * WHY HAND-WRITTEN AND NOT A SCHEMA LIBRARY. The repo has no validation library as a direct
 * dependency (zod is present only under velite), and adding one would land in the wrong place
 * twice over. `domain/` is the half of the package the SITE imports, so it is in the
 * /sandbox-benchmarks client chunk: a schema runtime would ship to every reader of the page to
 * check a document that was already checked in CI. And the package's whole claim is that its
 * only inputs are the data and the fonts — a dependency here is a dependency the figures cannot
 * be rendered without. The narrowing below is ~200 lines of `typeof`, it costs nothing at
 * runtime, and `parse.test.ts` fixture-tests it against malformed documents, which is the only
 * property that actually matters. Measured on the committed run (6 providers, 50 rows, 300
 * cells, 2,533 samples): ~4 ms cold, ~1 ms warm, once per module init.
 *
 * IT RETURNS A NEW VALUE, it does not bless the one it was given. That is the difference
 * between parsing and validating: the result is built field by field out of things that were
 * checked, so there is no path by which an unchecked value reaches a caller. Key insertion
 * order is reproduced exactly (see `metricCell`) so a parsed document still serialises to the
 * bytes it was read from.
 *
 * IT ALSO CLOSES ONE REFERENTIAL HOLE, deliberately, because it is a type-level lie and not a
 * content rule: every provider id referenced by a bar, a flag, a coverage gap, a backfilled
 * cell or a table column must be one of `providers[].id`. That is what makes
 * `providerIndexOf(data.providers)[bar.provider]` genuinely total, rather than a `Record`
 * TypeScript merely believes is total. Content rules — totals equal their segment sums, a
 * marked cell is disclosed — are NOT here; they are the integrity guards' job, and duplicating
 * them into the boundary would mean two places to update and one of them silently wrong.
 */
import type {
	BarSegment,
	MetricCell,
	MetricTableRow,
	PipelineBar,
	PipelineSuite,
	SandboxBenchmarkData,
	SandboxProvider,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Readers. Each takes the value and the path it was found at, so a failure deep
// in the document reports `providers[3].specs.diskGb` rather than "invalid data".
// ---------------------------------------------------------------------------

/** How the value is reported back in an error. Scalars are shown; containers are
 *  described, because a 2,500-element sample array in an error message is noise. */
function describe(value: unknown): string {
	if (value === undefined) return "undefined";
	if (value === null) return "null";
	if (Array.isArray(value)) return `an array of ${value.length}`;
	if (typeof value === "object") return "an object";
	return JSON.stringify(value) ?? typeof value;
}

/**
 * Colon rather than an em-dash on purpose: this message is a string literal under `src/`,
 * and `pnpm check:copy` forbids U+2014 there because that is where site copy lives. The
 * gate cannot tell a thrown message from rendered text, and the message reads the same.
 */
function fail(path: string, expected: string, value: unknown): never {
	throw new TypeError(
		`sandbox-benchmark data is malformed at ${path}: expected ${expected}, ` +
			`got ${describe(value)}. The artifact is derived; regenerate it with ` +
			"`pnpm sandbox-benchmarks:generate`.",
	);
}

function object(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		fail(path, "an object", value);
	}
	return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) fail(path, "an array", value);
	return value;
}

function string(value: unknown, path: string): string {
	if (typeof value !== "string") fail(path, "a string", value);
	return value;
}

/** Finite on purpose: NaN and Infinity are numbers that survive `typeof` and then
 *  render as "NaN" in a published table or size a bar to nothing. */
function number(value: unknown, path: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "a finite number", value);
	return value;
}

function boolean(value: unknown, path: string): boolean {
	if (typeof value !== "boolean") fail(path, "a boolean", value);
	return value;
}

function nullableString(value: unknown, path: string): string | null {
	return value === null ? null : string(value, path);
}

function nullableNumber(value: unknown, path: string): number | null {
	return value === null ? null : number(value, path);
}

function nullableBoolean(value: unknown, path: string): boolean | null {
	return value === null ? null : boolean(value, path);
}

function numbers(value: unknown, path: string): number[] {
	return array(value, path).map((v, i) => number(v, `${path}[${i}]`));
}

function strings(value: unknown, path: string): string[] {
	return array(value, path).map((v, i) => string(v, `${path}[${i}]`));
}

/** An absent OPTIONAL field, distinguished from a present wrong one. `null` is not
 *  absent: a field declared `x?: number` and carrying `null` is a defect. */
function optional<T>(
	value: unknown,
	path: string,
	read: (v: unknown, p: string) => T,
): T | undefined {
	return value === undefined ? undefined : read(value, path);
}

function oneOf<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
	const s = string(value, path);
	if (!(allowed as readonly string[]).includes(s)) {
		fail(path, `one of ${allowed.map((a) => `"${a}"`).join(" | ")}`, s);
	}
	return s as T;
}

/** `true` or absent — the shape of `indent` and `backfilled`, which are markers
 *  rather than booleans. `false` is not how the generator writes "no". */
function trueOrAbsent(value: unknown, path: string): true | undefined {
	if (value === undefined) return undefined;
	if (value !== true) fail(path, "true or the field to be absent", value);
	return true;
}

function targetSpec(
	value: unknown,
	path: string,
): { vcpus: number; memoryGb: number; diskGb: number } {
	const o = object(value, path);
	return {
		vcpus: number(o.vcpus, `${path}.vcpus`),
		memoryGb: number(o.memoryGb, `${path}.memoryGb`),
		diskGb: number(o.diskGb, `${path}.diskGb`),
	};
}

// ---------------------------------------------------------------------------
// The document.
// ---------------------------------------------------------------------------

/**
 * One measured or derived cell.
 *
 * The conditional spreads reproduce the generator's own key order (p50, the aggregate
 * set, n, samples, the replicate pair, the backfill marker) so that a parsed document
 * re-serialises to the bytes it was read from — which is what lets the recompute guard
 * compare the two without caring whether the artifact went through here.
 */
function metricCell(value: unknown, path: string): MetricCell {
	const o = object(value, path);
	const p95 = optional(o.p95, `${path}.p95`, number);
	const mean = optional(o.mean, `${path}.mean`, number);
	const stdev = optional(o.stdev, `${path}.stdev`, number);
	const min = optional(o.min, `${path}.min`, number);
	const max = optional(o.max, `${path}.max`, number);
	const samples = optional(o.samples, `${path}.samples`, numbers);
	const r = optional(o.r, `${path}.r`, number);
	const rep = optional(o.rep, `${path}.rep`, numbers);
	const backfilled = trueOrAbsent(o.backfilled, `${path}.backfilled`);
	return {
		p50: number(o.p50, `${path}.p50`),
		...(p95 !== undefined ? { p95 } : {}),
		...(mean !== undefined ? { mean } : {}),
		...(stdev !== undefined ? { stdev } : {}),
		...(min !== undefined ? { min } : {}),
		...(max !== undefined ? { max } : {}),
		n: number(o.n, `${path}.n`),
		...(samples !== undefined ? { samples } : {}),
		...(r !== undefined ? { r } : {}),
		...(rep !== undefined ? { rep } : {}),
		...(backfilled !== undefined ? { backfilled } : {}),
	};
}

function metricRow(value: unknown, path: string): MetricTableRow {
	const o = object(value, path);
	const values: Record<string, MetricCell | null> = {};
	for (const [id, cell] of Object.entries(object(o.values, `${path}.values`))) {
		values[id] = cell === null ? null : metricCell(cell, `${path}.values.${id}`);
	}
	const indent = trueOrAbsent(o.indent, `${path}.indent`);
	return {
		id: string(o.id, `${path}.id`),
		label: string(o.label, `${path}.label`),
		unit: string(o.unit, `${path}.unit`),
		direction: oneOf(o.direction, `${path}.direction`, ["HIB", "LIB"] as const),
		headline: boolean(o.headline, `${path}.headline`),
		derived: boolean(o.derived, `${path}.derived`),
		values,
		...(indent !== undefined ? { indent } : {}),
	};
}

function provider(value: unknown, path: string): SandboxProvider {
	const o = object(value, path);
	const s = object(o.specs, `${path}.specs`);
	const at = (field: string) => `${path}.specs.${field}`;
	return {
		id: string(o.id, `${path}.id`),
		name: string(o.name, `${path}.name`),
		specMatched: boolean(o.specMatched, `${path}.specMatched`),
		priceUsdHr: nullableNumber(o.priceUsdHr, `${path}.priceUsdHr`),
		specs: {
			vcpus: nullableNumber(s.vcpus, at("vcpus")),
			cpuModel: nullableString(s.cpuModel, at("cpuModel")),
			cpuModels: s.cpuModels === null ? null : strings(s.cpuModels, at("cpuModels")),
			cpuCacheSize: nullableString(s.cpuCacheSize, at("cpuCacheSize")),
			virtualization: nullableString(s.virtualization, at("virtualization")),
			isolation: nullableString(s.isolation, at("isolation")),
			memoryGb: nullableNumber(s.memoryGb, at("memoryGb")),
			diskGb: nullableNumber(s.diskGb, at("diskGb")),
			fileSystem: nullableString(s.fileSystem, at("fileSystem")),
			mountOptions: nullableString(s.mountOptions, at("mountOptions")),
			diskScheduler: nullableString(s.diskScheduler, at("diskScheduler")),
			diskBlockSize: nullableString(s.diskBlockSize, at("diskBlockSize")),
			kernel: nullableString(s.kernel, at("kernel")),
			os: nullableString(s.os, at("os")),
			egressFamily: nullableString(s.egressFamily, at("egressFamily")),
			asn: nullableString(s.asn, at("asn")),
			asnOrg: nullableString(s.asnOrg, at("asnOrg")),
			geo: nullableString(s.geo, at("geo")),
			egressFromShard: boolean(s.egressFromShard, at("egressFromShard")),
			region: nullableString(s.region, at("region")),
			regionPinned: nullableBoolean(s.regionPinned, at("regionPinned")),
		},
	};
}

function barSegment(value: unknown, path: string): BarSegment {
	const o = object(value, path);
	return {
		id: string(o.id, `${path}.id`),
		label: string(o.label, `${path}.label`),
		shortLabel: string(o.shortLabel, `${path}.shortLabel`),
		phase: string(o.phase, `${path}.phase`),
		p50: number(o.p50, `${path}.p50`),
		n: number(o.n, `${path}.n`),
	};
}

function pipelineBar(value: unknown, path: string): PipelineBar {
	const o = object(value, path);
	return {
		provider: string(o.provider, `${path}.provider`),
		totalS: number(o.totalS, `${path}.totalS`),
		costPerRunUsd: nullableNumber(o.costPerRunUsd, `${path}.costPerRunUsd`),
		segments: array(o.segments, `${path}.segments`).map((v, i) =>
			barSegment(v, `${path}.segments[${i}]`),
		),
	};
}

function pipelineSuite(value: unknown, path: string): PipelineSuite {
	const o = object(value, path);
	return {
		id: string(o.id, `${path}.id`),
		name: string(o.name, `${path}.name`),
		minDiskGb: nullableNumber(o.minDiskGb, `${path}.minDiskGb`),
		tasks: array(o.tasks, `${path}.tasks`).map((v, i) => {
			const t = object(v, `${path}.tasks[${i}]`);
			return {
				id: string(t.id, `${path}.tasks[${i}].id`),
				label: string(t.label, `${path}.tasks[${i}].label`),
				shortLabel: string(t.shortLabel, `${path}.tasks[${i}].shortLabel`),
				phase: string(t.phase, `${path}.tasks[${i}].phase`),
			};
		}),
		bars: array(o.bars, `${path}.bars`).map((v, i) => pipelineBar(v, `${path}.bars[${i}]`)),
		incomplete: array(o.incomplete, `${path}.incomplete`).map((v, i) => {
			const g = object(v, `${path}.incomplete[${i}]`);
			return {
				provider: string(g.provider, `${path}.incomplete[${i}].provider`),
				outcome: string(g.outcome, `${path}.incomplete[${i}].outcome`),
				reason: string(g.reason, `${path}.incomplete[${i}].reason`),
			};
		}),
	};
}

/**
 * Parse a derived sandbox-benchmark artifact.
 *
 * Throws `TypeError` naming the first field that is missing or the wrong shape. There is
 * no partial success and no "best effort": a document that does not parse cannot render a
 * report, and a report that renders from a half-read document is the failure this exists
 * to prevent.
 */
export function parseSandboxBenchmarkData(value: unknown): SandboxBenchmarkData {
	const o = object(value, "(root)");

	const prov = object(o.provenance, "provenance");
	const run = object(o.run, "run");
	const providers = array(o.providers, "providers").map((v, i) => provider(v, `providers[${i}]`));

	const backfillValue = o.backfill;
	const backfill =
		backfillValue === null || backfillValue === undefined
			? null
			: (() => {
					const b = object(backfillValue, "backfill");
					return {
						runFile: string(b.runFile, "backfill.runFile"),
						runId: string(b.runId, "backfill.runId"),
						commit: string(b.commit, "backfill.commit"),
						date: string(b.date, "backfill.date"),
						targetSpec: targetSpec(b.targetSpec, "backfill.targetSpec"),
						cells: array(b.cells, "backfill.cells").map((v, i) => {
							const c = object(v, `backfill.cells[${i}]`);
							return {
								provider: string(c.provider, `backfill.cells[${i}].provider`),
								metricId: string(c.metricId, `backfill.cells[${i}].metricId`),
							};
						}),
					};
				})();

	const parsed: SandboxBenchmarkData = {
		provenance: {
			runFile: string(prov.runFile, "provenance.runFile"),
			catalogFile: string(prov.catalogFile, "provenance.catalogFile"),
			catalogSourceSha: string(prov.catalogSourceSha, "provenance.catalogSourceSha"),
			generator: string(prov.generator, "provenance.generator"),
		},
		run: {
			runId: string(run.runId, "run.runId"),
			commit: string(run.commit, "run.commit"),
			date: string(run.date, "run.date"),
			schemaVersion: string(run.schemaVersion, "run.schemaVersion"),
			targetSpec: targetSpec(run.targetSpec, "run.targetSpec"),
		},
		backfill,
		providers,
		excludedProviders: array(o.excludedProviders, "excludedProviders").map((v, i) => {
			const e = object(v, `excludedProviders[${i}]`);
			return {
				id: string(e.id, `excludedProviders[${i}].id`),
				name: string(e.name, `excludedProviders[${i}].name`),
				validationStatus: string(e.validationStatus, `excludedProviders[${i}].validationStatus`),
				metrics: number(e.metrics, `excludedProviders[${i}].metrics`),
			};
		}),
		environmentFlags: array(o.environmentFlags, "environmentFlags").map((v, i) => {
			const f = object(v, `environmentFlags[${i}]`);
			return {
				provider: string(f.provider, `environmentFlags[${i}].provider`),
				field: string(f.field, `environmentFlags[${i}].field`),
			};
		}),
		phaseOrder: strings(o.phaseOrder, "phaseOrder"),
		suites: array(o.suites, "suites").map((v, i) => pipelineSuite(v, `suites[${i}]`)),
		dimensionGroups: array(o.dimensionGroups, "dimensionGroups").map((v, i) => {
			const g = object(v, `dimensionGroups[${i}]`);
			return {
				dimension: string(g.dimension, `dimensionGroups[${i}].dimension`),
				rows: array(g.rows, `dimensionGroups[${i}].rows`).map((r, j) =>
					metricRow(r, `dimensionGroups[${i}].rows[${j}]`),
				),
			};
		}),
		coverageGaps: array(o.coverageGaps, "coverageGaps").map((v, i) => {
			const c = object(v, `coverageGaps[${i}]`);
			return {
				provider: string(c.provider, `coverageGaps[${i}].provider`),
				suite: string(c.suite, `coverageGaps[${i}].suite`),
				outcome: string(c.outcome, `coverageGaps[${i}].outcome`),
				reason: string(c.reason, `coverageGaps[${i}].reason`),
				disk: boolean(c.disk, `coverageGaps[${i}].disk`),
			};
		}),
	};

	assertProviderReferencesResolve(parsed);
	return parsed;
}

/**
 * Every provider id the document references must be one of `providers[].id`.
 *
 * This is the invariant that makes `providerIndexOf(data.providers)[bar.provider]` total.
 * Without it that index is a `Record<string, SandboxProvider>` TypeScript believes is
 * populated for every string — so a bar naming a provider the run never rendered reads as
 * `undefined.name` at render time, inside a chart, one property access after the point
 * where anything could say what went wrong.
 *
 * `excludedProviders` is deliberately exempt: its whole job is to name providers that are
 * NOT columns.
 */
function assertProviderReferencesResolve(data: SandboxBenchmarkData): void {
	const known = new Set(data.providers.map((p) => p.id));
	const check = (id: string, path: string) => {
		if (!known.has(id)) {
			fail(path, `a provider id in providers[] (${[...known].join(", ")})`, id);
		}
	};

	data.environmentFlags.forEach((f, i) => {
		check(f.provider, `environmentFlags[${i}].provider`);
	});
	data.coverageGaps.forEach((g, i) => {
		check(g.provider, `coverageGaps[${i}].provider`);
	});
	data.backfill?.cells.forEach((c, i) => {
		check(c.provider, `backfill.cells[${i}].provider`);
	});
	data.suites.forEach((suite, i) => {
		suite.bars.forEach((b, j) => {
			check(b.provider, `suites[${i}].bars[${j}].provider`);
		});
		suite.incomplete.forEach((r, j) => {
			check(r.provider, `suites[${i}].incomplete[${j}].provider`);
		});
	});
	data.dimensionGroups.forEach((group, i) => {
		group.rows.forEach((row, j) => {
			for (const id of Object.keys(row.values)) {
				check(id, `dimensionGroups[${i}].rows[${j}].values.${id}`);
			}
		});
	});
}
