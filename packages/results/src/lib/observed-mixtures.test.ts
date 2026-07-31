import { describe, expect, it } from "bun:test";
import type { HostMetadataRecord, ObservedSpecs } from "@sandbox-benchmarks/schema";
import {
	hostHardwareSpecsSchema,
	hostNetworkSpecsSchema,
	observedMixturesSchema,
	TARGET_SPEC,
} from "@sandbox-benchmarks/schema";
import {
	buildObservedMixtures,
	foldHostMetadata,
	observedMixtureIds,
	representativeSpecs,
} from "./observed-mixtures.ts";

const GENOA: ObservedSpecs = { cpuModel: "AMD EPYC 9R14", cpuMicroarch: "Zen 4 (Genoa)" };
const TURIN: ObservedSpecs = { cpuModel: "AMD EPYC 9R45", cpuMicroarch: "Zen 5 (Turin)" };
const ASHBURN: ObservedSpecs = { egressAsn: "AS14618", city: "Ashburn", country: "US" };
const FRANKFURT: ObservedSpecs = { egressAsn: "AS16509", city: "Frankfurt", country: "DE" };

describe("buildObservedMixtures", () => {
	it("returns undefined with no readings — a provider with no sandbox has no mixture to disclose", () => {
		expect(buildObservedMixtures([])).toBeUndefined();
	});

	it("collapses identical readings into one mixture carrying the sandbox count", () => {
		const mixtures = buildObservedMixtures([
			{ ...GENOA, ...ASHBURN },
			{ ...GENOA, ...ASHBURN },
			{ ...GENOA, ...ASHBURN },
		]);
		expect(mixtures?.sandboxes).toBe(3);
		expect(Object.values(mixtures?.hostHardware ?? {})).toEqual([{ count: 3, specs: GENOA }]);
		expect(Object.values(mixtures?.hostNetwork ?? {})).toEqual([{ count: 3, specs: ASHBURN }]);
	});

	it("separates the two categories — hardware heterogeneity does not fragment the network tally", () => {
		// Two machines behind ONE egress network. A single combined hash would report two mixtures for both
		// categories and imply the network moved when only the silicon did.
		const mixtures = buildObservedMixtures([
			{ ...GENOA, ...ASHBURN },
			{ ...TURIN, ...ASHBURN },
		]);
		expect(Object.keys(mixtures?.hostHardware ?? {})).toHaveLength(2);
		expect(Object.values(mixtures?.hostNetwork ?? {})).toEqual([{ count: 2, specs: ASHBURN }]);
	});

	it("orders mixtures by descending count so the fleet's typical machine leads", () => {
		const mixtures = buildObservedMixtures([GENOA, TURIN, TURIN]);
		expect(Object.values(mixtures?.hostHardware ?? {}).map((m) => m.count)).toEqual([2, 1]);
		expect(Object.values(mixtures?.hostHardware ?? {})[0]?.specs).toEqual(TURIN);
	});

	it("hashes independently of property insertion order", () => {
		// The same machine read by two probes that filled the fields in different orders must be ONE
		// mixture. Without the canonical key sort it would split in two and overstate heterogeneity.
		const forward: ObservedSpecs = { cpuModel: "AMD EPYC 9R45", cpuMicroarch: "Zen 5 (Turin)" };
		const backward: ObservedSpecs = { cpuMicroarch: "Zen 5 (Turin)", cpuModel: "AMD EPYC 9R45" };
		const mixtures = buildObservedMixtures([forward, backward]);
		expect(Object.values(mixtures?.hostHardware ?? {})).toEqual([{ count: 2, specs: forward }]);
	});

	it("gives one combination the same id in independent builds, so ids compare across runs", () => {
		const a = buildObservedMixtures([GENOA]);
		const b = buildObservedMixtures([GENOA, TURIN]);
		const idA = Object.keys(a?.hostHardware ?? {})[0];
		expect(idA).toBeDefined();
		expect(Object.keys(b?.hostHardware ?? {})).toContain(idA as string);
	});

	it("excludes per-sandbox identity fields from both hashes", () => {
		// publicIp/reverseDns/user identify the sandbox, not its machine or network. Hashing them would
		// mint one mixture per sandbox and report every count as 1 — the disclosure would be noise.
		const mixtures = buildObservedMixtures([
			{ ...GENOA, ...ASHBURN, publicIp: "203.0.113.1", reverseDns: "a.example", user: "root" },
			{ ...GENOA, ...ASHBURN, publicIp: "203.0.113.2", reverseDns: "b.example", user: "root" },
		]);
		expect(Object.values(mixtures?.hostHardware ?? {})).toEqual([{ count: 2, specs: GENOA }]);
		expect(Object.values(mixtures?.hostNetwork ?? {})).toEqual([{ count: 2, specs: ASHBURN }]);
	});

	it("omits a category entirely when no sandbox disclosed any of its fields", () => {
		// An empty object is not an observed mixture. Recording one would invent a machine shape nobody
		// saw; leaving it out keeps `sandboxes` visibly larger than the summed counts instead.
		const mixtures = buildObservedMixtures([GENOA, GENOA]);
		expect(mixtures?.sandboxes).toBe(2);
		expect(mixtures?.hostNetwork).toEqual({});
	});

	it("counts a blind sandbox in the denominator but in no mixture", () => {
		const mixtures = buildObservedMixtures([GENOA, {}, {}]);
		expect(mixtures?.sandboxes).toBe(3);
		expect(Object.values(mixtures?.hostHardware ?? {}).map((m) => m.count)).toEqual([1]);
	});

	it("keeps the two hash categories disjoint", () => {
		// The partition is structural — observedSpecsSchema is COMPOSED from the groups, and each mixture
		// kind is typed by its own group — so a key that is not a field of its group is now unspellable. The
		// one thing types cannot catch is a field spelled into BOTH groups: the object spread would accept
		// it silently and both categories would hash it.
		const hardware = new Set(hostHardwareSpecsSchema.props.map((prop) => String(prop.key)));
		const shared = hostNetworkSpecsSchema.props
			.map((prop) => String(prop.key))
			.filter((key) => hardware.has(key));
		expect(shared).toEqual([]);
	});

	it("emits ids that are keys of the map built from the same readings", () => {
		// This is what lets providerRunSchema demand every replicate id resolve: the id function and the
		// map builder share one projection and one hash, so agreement is structural, not coincidental.
		const readings = [
			{ ...GENOA, ...ASHBURN },
			{ ...TURIN, ...FRANKFURT },
			{ ...GENOA, ...FRANKFURT },
		];
		const mixtures = buildObservedMixtures(readings);
		for (const reading of readings) {
			const ids = observedMixtureIds(reading);
			expect(Object.keys(mixtures?.hostHardware ?? {})).toContain(ids.hostHardwareId as string);
			expect(Object.keys(mixtures?.hostNetwork ?? {})).toContain(ids.hostNetworkId as string);
		}
	});

	it("emits no id for a category the sandbox disclosed nothing for", () => {
		const ids = observedMixtureIds(GENOA);
		expect(ids.hostHardwareId).toBeDefined();
		expect(ids.hostNetworkId).toBeUndefined();
		expect(observedMixtureIds({})).toEqual({});
	});

	it("picks the dominant mixture's specs, not the first-seen one", () => {
		const mixtures = buildObservedMixtures([
			{ ...GENOA, ...FRANKFURT },
			{ ...TURIN, ...ASHBURN },
			{ ...TURIN, ...ASHBURN },
		]);
		expect(mixtures).toBeDefined();
		if (!mixtures) return;
		expect(representativeSpecs(mixtures)).toEqual({ ...TURIN, ...ASHBURN });
	});

	it("omits per-sandbox identity, so re-aggregating in another order emits the same document", () => {
		// publicIp/reverseDns/user used to be back-filled from whichever shard arrived first, which made a
		// re-aggregation of the SAME shards produce a different document — churn in a committed dataset that
		// a schema bump re-aggregates wholesale. One sandbox's IP was never a property of the provider, and
		// hostMetadata still carries every per-sandbox record.
		const forward = [
			{ ...GENOA, ...ASHBURN, publicIp: "203.0.113.1", reverseDns: "a.example", user: "root" },
			{ ...GENOA, ...ASHBURN, publicIp: "203.0.113.2", reverseDns: "b.example", user: "root" },
		];
		const specsOf = (readings: ObservedSpecs[]) => {
			const mixtures = buildObservedMixtures(readings);
			return mixtures ? representativeSpecs(mixtures) : undefined;
		};
		expect(specsOf(forward)).toEqual({ ...GENOA, ...ASHBURN });
		expect(specsOf([...forward].reverse())).toEqual(specsOf(forward));
	});

	it("breaks a dominance tie by id so the representative reading is deterministic", () => {
		const mixtures = buildObservedMixtures([GENOA, TURIN]);
		expect(mixtures).toBeDefined();
		if (!mixtures) return;
		// Both count 1; the pick must not depend on iteration luck, and must be one of the two observed
		// machines rather than a blend of them.
		const picked = representativeSpecs(mixtures);
		expect([GENOA, TURIN]).toContainEqual(picked);
		expect(representativeSpecs(mixtures)).toEqual(picked);
	});

	it("emits a document that validates against the schema", () => {
		const built = buildObservedMixtures([
			{ ...GENOA, ...ASHBURN },
			{ ...TURIN, ...FRANKFURT },
		]);
		expect(built).toBeDefined();
		if (!built) return;
		expect(observedMixturesSchema(built)).toEqual(built);
	});
});

describe("foldHostMetadata", () => {
	const record = (sourceFile: string, cpu: string, timestamp: string): HostMetadataRecord => ({
		source: "phoronix/result-file-to-json",
		sourceFile,
		fields: [
			{ path: "ci.hardware.Processor", value: cpu },
			{ path: "ci.timestamp", value: timestamp },
		],
	});
	const ids = (cpu: string) => observedMixtureIds({ cpuModel: cpu });

	it("folds records that differ only by a per-run stamp, counting the sandboxes", () => {
		// The old fold was "drop byte-identical duplicates", which never fired because ci.timestamp
		// differs on every sandbox — the reason host metadata grew to 54% of the committed dataset.
		const folded = foldHostMetadata([
			{ record: record("a.json", "EPYC", "2026-07-30 03:17:44"), ids: ids("EPYC") },
			{ record: record("a.json", "EPYC", "2026-07-30 03:20:41"), ids: ids("EPYC") },
			{ record: record("a.json", "EPYC", "2026-07-30 03:27:00"), ids: ids("EPYC") },
		]);
		expect(folded).toHaveLength(1);
		expect(folded[0]?.sandboxes).toBe(3);
		// The stamp is dropped rather than kept from an arbitrary member: one sandbox's clock reading
		// must not be published as though all three shared it.
		expect(folded[0]?.fields.map((f) => f.path)).toEqual(["ci.hardware.Processor"]);
	});

	it("keeps a singleton record verbatim, per-run stamp included", () => {
		// Nothing was folded away, so nothing is dropped: the volatile field is still true of the one
		// sandbox this record describes.
		const folded = foldHostMetadata([
			{ record: record("a.json", "EPYC", "2026-07-30 03:17:44"), ids: ids("EPYC") },
		]);
		expect(folded[0]?.sandboxes).toBe(1);
		expect(folded[0]?.fields.map((f) => f.path)).toEqual(["ci.hardware.Processor", "ci.timestamp"]);
	});

	it("never folds records read on different machines", () => {
		// Same source file, two machines. Folding them would attribute one machine's record to the
		// other's sandboxes — the attribution would be confidently wrong rather than merely absent.
		const folded = foldHostMetadata([
			{ record: record("a.json", "EPYC", "t1"), ids: ids("EPYC") },
			{ record: record("a.json", "Xeon", "t2"), ids: ids("Xeon") },
		]);
		expect(folded).toHaveLength(2);
		expect(new Set(folded.map((r) => r.hostHardwareId)).size).toBe(2);
	});

	it("attributes every record to the machine it was read on", () => {
		const folded = foldHostMetadata([{ record: record("a.json", "EPYC", "t1"), ids: ids("EPYC") }]);
		expect(folded[0]?.hostHardwareId).toBe(ids("EPYC").hostHardwareId as string);
	});
});

describe("per-machine spec verdicts", () => {
	it("judges each machine against the target, not just the provider as a whole", () => {
		// One boolean for a ten-machine fleet cannot say WHICH machine missed. Per mixture it can.
		const onSpec = { vcpus: TARGET_SPEC.vcpus, memoryGb: TARGET_SPEC.memoryGb, cpuModel: "A" };
		const offSpec = { vcpus: TARGET_SPEC.vcpus - 1, memoryGb: TARGET_SPEC.memoryGb, cpuModel: "B" };
		const mixtures = buildObservedMixtures([onSpec, onSpec, offSpec]);
		const verdicts = Object.values(mixtures?.hostHardware ?? {}).map((m) => [
			m.specs.cpuModel,
			m.specMatched,
		]);
		expect(verdicts).toEqual([
			["A", true],
			["B", false],
		]);
	});

	it("leaves a machine unjudged when its probes saw too little", () => {
		const mixtures = buildObservedMixtures([{ cpuModel: "A" }]);
		expect(Object.values(mixtures?.hostHardware ?? {})[0]?.specMatched).toBeUndefined();
	});
});
