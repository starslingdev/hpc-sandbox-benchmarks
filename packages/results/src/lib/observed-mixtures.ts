/**
 * Build the counted heterogeneity disclosure for one provider: the distinct host-hardware and
 * host-network combinations its sandboxes observed, keyed by a stable content hash, each with the
 * number of sandboxes that reported exactly that combination — plus the two derivations that read it
 * back, {@link representativeSpecs} and {@link foldHostMetadata}.
 *
 * This replaces inference with arithmetic. A single {@link ObservedSpecs} on an aggregated ProviderRun
 * is one sandbox's reading wearing the provider's name, so a fleet spread over three CPU generations
 * and two regions serialized identically to one that never moved — and the only hint was the
 * `hostCpuModels` array, which covered one field of one category. Here the count of keys in a category
 * IS the number of distinct mixtures, and each entry carries how many sandboxes landed on it.
 *
 * The hash is content-addressed and canonical (sorted keys, defined values only), so the same machine
 * shape or egress network yields the same id in every run and can be tracked across the dataset series
 * without diffing whole objects.
 *
 * SDK-free — schema + node:crypto only.
 */
import { createHash } from "node:crypto";
import type {
	HostHardwareSpecs,
	HostMetadataRecord,
	HostNetworkSpecs,
	ObservedHardwareMixture,
	ObservedMixture,
	ObservedMixtures,
	ObservedSpecs,
} from "@sandbox-benchmarks/schema";
import { hostHardwareSpecsSchema, hostNetworkSpecsSchema } from "@sandbox-benchmarks/schema";
import { isVolatileHostMetadataPath } from "./host-metadata.ts";
import { computeSpecMatched } from "./specs.ts";

/**
 * Hash id width in hex characters. 16 hex = 64 bits, which is enormous headroom against the handful of
 * mixtures a provider produces — and {@link buildObservedMixtures} still fails loudly on a collision
 * rather than trusting the arithmetic, because a silent collision would MERGE two distinct machine
 * shapes into one entry with a summed count: a wrong answer that looks exactly like a right one.
 *
 * Do not shrink below 10: at 9 or fewer characters an all-digit id becomes a canonical array index, and
 * JS reorders integer-like keys ahead of the rest — which would break the descending-count key order
 * the serialized document is written in.
 */
const HASH_ID_LENGTH = 16;

/**
 * Each category's field names, read off the category schema itself. Taken from arktype's own `props`
 * rather than a hand-kept list, so a field added to a group joins its hash automatically and a name that
 * is not a field of the group cannot be spelled at all.
 */
const HOST_HARDWARE_SPEC_KEYS = hostHardwareSpecsSchema.props.map((prop) => String(prop.key));
const HOST_NETWORK_SPEC_KEYS = hostNetworkSpecsSchema.props.map((prop) => String(prop.key));

/** One category's projection of a sandbox reading, with the content hash that identifies it. */
interface Category<S> {
	specs: S;
	/** The exact bytes hashed — retained so a truncation collision can be told from a true repeat. */
	canonical: string;
	id: string;
}

/**
 * Project a reading onto one category and hash it, or undefined when the sandbox disclosed nothing for
 * that category. The single place the projection and the hash are sequenced, so an id computed for a
 * lookup is by construction the same id the tally used — which is what lets `providerRunSchema` demand
 * every reference resolve.
 *
 * Keys are sorted before hashing so two readings that differ only in property insertion order hash
 * identically; without it the id would depend on which probe file happened to fill a field first, and
 * one machine would split across several "distinct" mixtures. The cast is the one unavoidable boundary
 * between a dynamic key list and a static category type, and the key lists come from the category
 * schemas' own `props`, so it cannot drift.
 */
function categoryOf<S>(specs: ObservedSpecs, keys: readonly string[]): Category<S> | undefined {
	const entries: [string, unknown][] = [];
	for (const key of keys) {
		const value = (specs as Record<string, unknown>)[key];
		if (value !== undefined) entries.push([key, value]);
	}
	if (entries.length === 0) return undefined;
	entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	const canonical = JSON.stringify(entries);
	return {
		specs: Object.fromEntries(entries) as S,
		canonical,
		id: createHash("sha256").update(canonical).digest("hex").slice(0, HASH_ID_LENGTH),
	};
}

/**
 * Dominance order: most-common mixture first (the fleet's typical machine leads), ties broken by id.
 *
 * Authored ONCE and used both to order the serialized map and to pick the representative reading. Two
 * copies of this rule could disagree, and then `representativeSpecs` would name a machine other than
 * the one the document leads with.
 */
function byDominance<M extends { count: number }>(a: [string, M], b: [string, M]): number {
	return b[1].count - a[1].count || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
}

/**
 * Tally one category across a provider's per-sandbox readings, in dominance order. A reading that
 * disclosed nothing for the category contributes no entry at all — counting it as an "empty mixture"
 * would invent a machine shape nobody observed, and the shortfall stays visible because the counts then
 * sum to less than {@link ObservedMixtures.sandboxes}.
 *
 * Returns entries rather than a record so the caller can attach per-entry fields (the hardware
 * verdict) while building the single output record, instead of materialising it twice.
 */
function tallyCategory<S>(
	readings: readonly ObservedSpecs[],
	keys: readonly string[],
): [string, { count: number; specs: S }][] {
	const byId = new Map<string, { canonical: string; count: number; specs: S }>();
	for (const reading of readings) {
		const category = categoryOf<S>(reading, keys);
		if (!category) continue;
		const existing = byId.get(category.id);
		if (existing) {
			// Same id from different content is a truncation collision. Refuse rather than merge: the
			// merged entry would report one machine shape with both sandboxes' count, which is precisely
			// the "looks complete, quietly isn't" claim this whole structure exists to eliminate.
			if (existing.canonical !== category.canonical) {
				throw new Error(
					`observed-mixtures hash collision on id ${category.id}: ${existing.canonical} vs ${category.canonical}`,
				);
			}
			existing.count += 1;
			continue;
		}
		byId.set(category.id, { canonical: category.canonical, count: 1, specs: category.specs });
	}
	return [...byId.entries()]
		.map(([id, { count, specs }]): [string, { count: number; specs: S }] => [id, { count, specs }])
		.sort(byDominance);
}

/**
 * Build one provider's {@link ObservedMixtures} from the per-sandbox {@link ObservedSpecs} readings the
 * aggregate merged — ONE reading per sandbox, which is one per shard slice (a `(suite, replicate)`
 * cell). Passing a provider's merged/representative specs instead would report a single mixture of
 * count 1 and defeat the purpose, so callers must pass the unmerged readings.
 *
 * Returns undefined when there are no readings at all: `sandboxes` is a positive integer in the schema,
 * and a provider with nothing observed has no mixtures to disclose (it is the `pending` placeholder
 * row, which carries no spec evidence by definition).
 */
export function buildObservedMixtures(
	readings: readonly ObservedSpecs[],
): ObservedMixtures | undefined {
	if (readings.length === 0) return undefined;
	// Each machine gets its OWN spec verdict, attached while the record is built. The provider-level
	// `specMatched` is one boolean folded across every shard, which on a mixed fleet cannot say WHICH
	// machine missed the target — a provider honoring it on nine shapes and missing on the tenth reads
	// the same as one that honored it everywhere.
	const hostHardware: Record<string, ObservedHardwareMixture> = {};
	for (const [id, mixture] of tallyCategory<HostHardwareSpecs>(readings, HOST_HARDWARE_SPEC_KEYS)) {
		const specMatched = computeSpecMatched(mixture.specs);
		hostHardware[id] = { ...mixture, ...(specMatched !== undefined ? { specMatched } : {}) };
	}
	const hostNetwork: Record<string, ObservedMixture> = {};
	for (const [id, mixture] of tallyCategory<HostNetworkSpecs>(readings, HOST_NETWORK_SPEC_KEYS)) {
		hostNetwork[id] = mixture;
	}
	return { sandboxes: readings.length, hostHardware, hostNetwork };
}

/** The mixture ids ONE sandbox's reading falls under — the join key from a replicate to its machine. */
export interface ObservedMixtureIds {
	hostHardwareId?: string;
	hostNetworkId?: string;
}

/**
 * Which mixtures a single sandbox reading belongs to. Shares {@link categoryOf} with the tally, so an
 * id computed here is by construction a key of the map built from the same readings.
 *
 * A category the reading disclosed nothing for yields no id at all rather than a placeholder: the
 * schema narrow would reject a key that resolves to nothing, and "absent" is the honest statement.
 */
export function observedMixtureIds(specs: ObservedSpecs): ObservedMixtureIds {
	const hardware = categoryOf(specs, HOST_HARDWARE_SPEC_KEYS);
	const network = categoryOf(specs, HOST_NETWORK_SPEC_KEYS);
	return {
		...(hardware ? { hostHardwareId: hardware.id } : {}),
		...(network ? { hostNetworkId: network.id } : {}),
	};
}

/**
 * The single representative reading an aggregated ProviderRun publishes beside its mixtures: the specs
 * of the mixture the MOST sandboxes reported in each category, over a first-wins backfill of everything
 * a mixture cannot speak for (per-sandbox identity, and any hashed field the dominant sandbox happened
 * not to disclose).
 *
 * One derivation rather than three resolved by mutation order. What it replaces was "first defined
 * value per key wins", which resolves to whichever shard arrived first and on a mixed fleet publishes a
 * machine most sandboxes never ran on: in run 30510718771 that gave modal-vm a headline `cpuModel` of
 * "AMD EPYC 9J45 128-Core Processor" while its sandboxes were spread over ten CPU models, Intel and AMD
 * alike. A modal value can still under-describe a fleet — that is what the mixtures are for — but it
 * cannot be a machine the fleet mostly did not use, and it does not change with shard arrival order.
 */
export function representativeSpecs(
	readings: readonly ObservedSpecs[],
	mixtures: ObservedMixtures,
): ObservedSpecs {
	const backfill: Record<string, unknown> = {};
	for (const reading of readings) {
		for (const key in reading) {
			const value = (reading as Record<string, unknown>)[key];
			if (value !== undefined && !(key in backfill)) backfill[key] = value;
		}
	}
	// Dominance order is the map's own key order (tallyCategory sorted it), so the leading entry is the
	// dominant one — but selected with the shared comparator rather than by reading the first key, so
	// the result never depends on JS property-order rules.
	const dominant = <M extends { count: number }>(category: Readonly<Record<string, M>>) =>
		Object.entries(category).sort(byDominance)[0]?.[1];
	return {
		...backfill,
		...dominant(mixtures.hostHardware)?.specs,
		...dominant(mixtures.hostNetwork)?.specs,
	};
}

/** One shard's host record together with the mixture ids of the sandbox that produced it. */
export interface HostMetadataRecordInput {
	record: HostMetadataRecord;
	ids: ObservedMixtureIds;
}

/**
 * Fold one provider's host-metadata records so a record is the set of fields a machine reported, with a
 * count of the sandboxes that reported it — rather than one near-duplicate entry per sandbox.
 *
 * The old fold was "drop byte-identical duplicates", which never fired: every PTS record carries a
 * wall-clock `ci.timestamp` that differs on every sandbox, so one provider's 21 distinct source files
 * landed as 82 records, each re-serializing multi-hundred-character fields (the security-mitigations
 * list, the compiler configuration). Host metadata was 54% of the committed dataset while describing a
 * handful of machines.
 *
 * Volatile fields are dropped from a FOLDED record rather than kept from an arbitrary member: keeping
 * one sandbox's stamp on a record that speaks for several would publish a specific claim from a general
 * one. A record seen exactly once keeps its fields verbatim — nothing was folded away, so no
 * information is lost where there was no duplication to exploit.
 */
export function foldHostMetadata(
	records: readonly HostMetadataRecordInput[],
): HostMetadataRecord[] {
	const byKey = new Map<string, HostMetadataRecord>();
	for (const { record, ids } of records) {
		const stable = record.fields.filter((field) => !isVolatileHostMetadataPath(field.path));
		// Identity is source + file + the machine it was read on + the non-volatile fields, HASHED rather
		// than retained: the raw key averages 1.7 KB per record (a security-mitigations list and a
		// compiler configuration are single fields of several hundred characters), so keeping ~500 of them
		// alive to dedupe ~200 records costs about a megabyte for nothing. The mixture ids belong in the
		// key because the same source file read on two machines is two facts — folding them would
		// attribute one machine's record to the other's sandboxes.
		const key = createHash("sha256")
			.update(
				JSON.stringify([
					record.source,
					record.sourceFile,
					ids.hostHardwareId ?? null,
					ids.hostNetworkId ?? null,
					stable.map((field) => [field.path, field.value]),
				]),
			)
			.digest("hex");
		const existing = byKey.get(key);
		if (existing) {
			existing.sandboxes = (existing.sandboxes ?? 1) + 1;
			// Now that it speaks for more than one sandbox, the per-run stamp it inherited from the first
			// member stops being true of the record and is dropped.
			existing.fields = stable;
			continue;
		}
		byKey.set(key, { ...record, sandboxes: 1, ...ids });
	}
	return [...byKey.values()];
}
