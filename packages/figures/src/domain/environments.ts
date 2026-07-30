// ---------------------------------------------------------------------------
// Observed environments — the SINGLE spec-row schema consumed by the HTML table
// (EnvironmentsTable), the markdown mirror and the `environments` share figure
// through thin presenters.
//
// baseValue is FORMAT-NEUTRAL: it returns the cell's text, or null for a
// missing value so each format supplies its own placeholder dash (– on the
// page, — in the ASCII mirror). It carries NO presentation: the ⚠ fleet mark,
// the § shard mark, the amber/rose flag tint, the spelled-out "(below target)"
// / "(recovered from shards)" suffixes, and the trailing "Spec vs target"
// verdict are each added by one format's presenter.
//
// The CPU-model base value discloses a heterogeneous fleet as the fact of the
// mix ("N models across replicates"), NOT one replicate's machine, so both
// surfaces show it and neither can silently regress to a single reading; the
// full model list stays in fleetHeterogeneityNoteOf.
// ---------------------------------------------------------------------------
import type { SandboxBenchmarkData, SandboxProvider } from "./types.ts";

export interface EnvSpecRow {
	label: string;
	/** Matches an environmentFlags[].field (the shared flag lookup keys on it). */
	field: string;
	/** Draws a stronger rule above the row, splitting compute | platform | network. */
	groupStart?: boolean;
	/** Egress-identity row: carries the shard-recovered provenance mark on the
	 *  providers whose value came from the run's shard artifacts. */
	shardMarked?: boolean;
	/** CPU row: carries the heterogeneous-fleet mark on providers whose replicate
	 *  sandboxes saw more than one host CPU model. */
	fleetMarked?: boolean;
	/** Format-neutral cell value; null means "no value — render the format's
	 *  placeholder dash". */
	baseValue: (p: SandboxProvider) => string | null;
}

export const envSpecRows: EnvSpecRow[] = [
	{
		label: "vCPUs",
		field: "vcpus",
		baseValue: (p) => (p.specs.vcpus === null ? null : String(p.specs.vcpus)),
	},
	{
		label: "CPU model",
		field: "cpuModel",
		fleetMarked: true,
		baseValue: (p) =>
			p.specs.cpuModels !== null
				? `${p.specs.cpuModels.length} models across replicates`
				: p.specs.cpuModel,
	},
	{ label: "CPU cache", field: "cpuCacheSize", baseValue: (p) => p.specs.cpuCacheSize },
	{ label: "Isolation", field: "isolation", groupStart: true, baseValue: (p) => p.specs.isolation },
	{ label: "Virtualization", field: "virtualization", baseValue: (p) => p.specs.virtualization },
	{
		label: "Memory (GB)",
		field: "memoryGb",
		baseValue: (p) => (p.specs.memoryGb === null ? null : String(p.specs.memoryGb)),
	},
	{
		label: "Disk (GB)",
		field: "diskGb",
		baseValue: (p) => (p.specs.diskGb === null ? null : String(p.specs.diskGb)),
	},
	{ label: "File system", field: "fileSystem", baseValue: (p) => p.specs.fileSystem },
	{ label: "Mount options", field: "mountOptions", baseValue: (p) => p.specs.mountOptions },
	{ label: "I/O scheduler", field: "diskScheduler", baseValue: (p) => p.specs.diskScheduler },
	{ label: "Block size", field: "diskBlockSize", baseValue: (p) => p.specs.diskBlockSize },
	{ label: "Kernel", field: "kernel", baseValue: (p) => p.specs.kernel },
	{ label: "OS", field: "os", baseValue: (p) => p.specs.os },
	{
		label: "Region",
		field: "region",
		groupStart: true,
		baseValue: (p) => (p.specs.regionPinned === false ? "default" : p.specs.region),
	},
	{ label: "Egress family", field: "egressFamily", baseValue: (p) => p.specs.egressFamily },
	{ label: "Egress ASN", field: "asn", shardMarked: true, baseValue: (p) => p.specs.asn },
	{ label: "ASN name", field: "asnOrg", shardMarked: true, baseValue: (p) => p.specs.asnOrg },
	{ label: "Geo location", field: "geo", shardMarked: true, baseValue: (p) => p.specs.geo },
];

/** A predicate over one run's `environmentFlags`: true when this provider's cell for
 *  `field` carries a flag (off-target/comparability or the disk-capacity flag). Built
 *  once from the list so the page (which tints), the mirror (which spells the disk case
 *  out) and the figure (which washes the cell) detect the SAME cells from the SAME list. */
export function environmentFlagLookup(
	flags: SandboxBenchmarkData["environmentFlags"],
): (providerId: string, field: string) => boolean {
	const keys = new Set(flags.map((f) => `${f.provider}:${f.field}`));
	return (providerId, field) => keys.has(`${providerId}:${field}`);
}

/** True when this egress cell was recovered from the run's shard artifacts. */
export function envCellShardMarked(row: EnvSpecRow, p: SandboxProvider): boolean {
	return row.shardMarked === true && p.specs.egressFromShard;
}

/** True when this CPU cell reflects a heterogeneous replicate fleet. */
export function envCellFleetMarked(row: EnvSpecRow, p: SandboxProvider): boolean {
	return row.fleetMarked === true && p.specs.cpuModels !== null;
}

/**
 * Egress-provenance disclosure for the environments table — DERIVED from the
 * data's own `egressFromShard` flags, so it cannot claim a recovery that did
 * not happen (or stay silent about one that did). Null when every environment's
 * own probe answered.
 */
export function egressShardNoteOf(providers: readonly SandboxProvider[]): string | null {
	const recovered = providers.filter((p) => p.specs.egressFromShard);
	if (recovered.length === 0) return null;
	const names = recovered.map((p) => p.name).join(", ");
	return `§ ${names}: egress identity recovered from the run's shard artifacts, not reported by the sandbox. The harness's own probe pins IPv4 on every leg it uses to discover the sandbox's public address, so an IPv6-only sandbox reports none; these cells resolve the address curl actually used (recorded by the network suite) against the same sources the probe would have used: Team Cymru BGP origin for the ASN, ipinfo for the city.`;
}

/**
 * Fleet-heterogeneity disclosure for the environments table — DERIVED from the
 * data's own `cpuModels` disclosures (the run's distinct-host-CPU aggregate),
 * so it cannot claim a fleet the run didn't observe or stay silent about one it
 * did. Null when every environment's replicate sandboxes agreed on a CPU model.
 */
export function fleetHeterogeneityNoteOf(providers: readonly SandboxProvider[]): string | null {
	const mixed = providers.filter((p) => p.specs.cpuModels !== null);
	if (mixed.length === 0) return null;
	const detail = mixed
		.map(
			(p) =>
				`${p.name} saw ${p.specs.cpuModels?.length} host CPU models across its replicate sandboxes: ${p.specs.cpuModels?.join("; ")}`,
		)
		.join(". ");
	return `⚠ Heterogeneous fleet: ${detail}. Every median for this environment pools across those machines, so read its cells as the fleet's typical draw, not one machine's speed; the CPU cache row lists each distinct reading the replicates reported.`;
}
