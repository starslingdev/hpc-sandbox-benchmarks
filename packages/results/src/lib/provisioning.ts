/**
 * Was this sandbox's machine already running when we asked for it?
 *
 * Several providers serve `create()` from a pool of pre-booted VMs. Nothing in a lifecycle timing can
 * tell that apart from a genuinely fast boot: `lifecycle_cold_start_ms` measures pool CHECKOUT on such
 * a provider and a real cold boot on one that boots per request, and publishes both under one label.
 * Two providers posting the same number can be doing entirely different things, and until this module
 * the dataset carried nothing that separated them.
 *
 * The evidence is collected in-sandbox by the harness spec probe (`observedSpecsScript`) and the
 * VERDICT is computed here, in TypeScript, over the committed raw tree — the same collect/classify
 * split `lib/probe/isolation` is built on, and for the same reason: the dataset is re-normalized
 * retroactively, so a sharper rule applies to every past run without re-running anything on hardware
 * that may no longer exist.
 *
 * SDK-free — schema only.
 */
import type {
	ObservedProvisioning,
	ObservedSpecs,
	ProvisioningVerdict,
} from "@sandbox-benchmarks/schema";
import { percentileOf } from "@sandbox-benchmarks/schema";

/**
 * Margin (seconds the machine predated our create call) at or above which it was pre-booted.
 *
 * Sized well clear of the measurement's own bias rather than at the theoretical zero. `elapsedSinceCreateS`
 * is stamped when the harness ISSUES the probe, while the age inside it is read when the sandbox RUNS
 * the probe, so every reading carries a small positive margin equal to that exec round-trip — sub-second
 * normally, a few seconds on a slow control plane. 30s is far above that and far below the residency of
 * any pool worth keeping, so the band between the two thresholds stays genuinely rare.
 */
export const PRE_BOOTED_MARGIN_S = 30;

/**
 * Margin below which the machine demonstrably booted for this request: its whole life fits inside the
 * time since we asked, give or take the same round-trip bias.
 *
 * The gap to {@link PRE_BOOTED_MARGIN_S} is not indecision, it is the honest width of the instrument.
 * A margin in between gets `indeterminate` rather than being rounded to whichever answer is nearer —
 * a wrong verdict here is worse than no verdict, because a reader would act on it.
 */
export const BOOT_ON_CREATE_MARGIN_S = 5;

/**
 * The classifier's output: the verdict and, when one could be computed, the margin behind it.
 *
 * Both are optional, and the empty result is the load-bearing case. A reading that carries NO
 * provisioning signal at all was produced by a probe that never looked — every Run published before
 * this evidence existed, and every provider row that is a registry placeholder rather than a measured
 * sandbox — and it must stay empty. Stamping those with `indeterminate` would claim we looked and
 * could not tell, and would additionally make `providerReportedNothing` (which asks whether
 * `observedSpecs` is empty) treat a never-dispatched provider as one that reported.
 */
export interface ProvisioningClassification {
	readonly provisioning?: ProvisioningVerdict;
	readonly preBootedByS?: number;
}

/**
 * The tightest defensible bound on how long THIS SANDBOX had existed, from two readings that fail in
 * opposite directions — their minimum.
 *
 * `uptimeAtProbeS` is the kernel's, which on a shared-kernel sandbox (a container, or anything whose
 * isolation the probe could not name) is the HOST's: large however freshly the sandbox was made. It is
 * therefore an upper bound on the sandbox's age, never an under-estimate. `pid1AgeAtProbeS` is the age
 * of the sandbox's own first process — the container's init, the VM's init, gVisor's entry process —
 * which tracks the sandbox's age directly, and under-estimates it only if the provider restarts pid 1
 * within a machine it is reusing.
 *
 * So the minimum is the age neither reading can justify exceeding. It also decides which way the
 * classifier errs: a long-lived host with a fresh container in it yields a small pid-1 age and reads as
 * `boot-on-create`, while a recycled machine that restarts pid 1 per allocation reads the same way.
 * Both are UNDER-claims. Nothing here can manufacture a `pre-booted` verdict out of shared
 * infrastructure, which is the failure that would actually mislead a reader.
 */
function sandboxAgeS(specs: ObservedSpecs): number | undefined {
	const ages = [specs.uptimeAtProbeS, specs.pid1AgeAtProbeS].filter(
		(age): age is number => age !== undefined && Number.isFinite(age) && age >= 0,
	);
	return ages.length === 0 ? undefined : Math.min(...ages);
}

/** Did the probe record any provisioning evidence at all — the "did anyone look" question. */
function probed(specs: ObservedSpecs): boolean {
	return (
		specs.uptimeAtProbeS !== undefined ||
		specs.pid1AgeAtProbeS !== undefined ||
		specs.elapsedSinceCreateS !== undefined ||
		specs.bootId !== undefined
	);
}

/**
 * Classify one sandbox's reading. Pure: same reading in, same verdict out, on any machine at any time.
 *
 * Three outcomes, and the distinction between the last two is the point:
 *
 *  - a verdict with its margin, when both the machine's age and our own t0 are known;
 *  - `indeterminate` with NO margin, when the probe recorded SOMETHING but not enough to compare — an
 *    absent `elapsedSinceCreateS` means the harness could not vouch for when the sandbox was asked
 *    for, an absent age means neither `/proc` reading came back. A margin against an assumed t0 would
 *    be a measurement nobody made;
 *  - nothing at all, when the probe recorded no provisioning signal whatsoever. That is not a failed
 *    classification, it is the absence of an attempt, and it must not be published as one.
 */
export function classifyProvisioning(specs: ObservedSpecs): ProvisioningClassification {
	if (!probed(specs)) return {};
	const age = sandboxAgeS(specs);
	const elapsed = specs.elapsedSinceCreateS;
	if (age === undefined || elapsed === undefined || !Number.isFinite(elapsed)) {
		return { provisioning: "indeterminate" };
	}
	// Rounded to the probe's own precision (it prints hundredths); an exact binary difference of two
	// two-decimal values would otherwise put a long tail of digits into every committed Run.
	const preBootedByS = Math.round((age - elapsed) * 100) / 100;
	const provisioning: ProvisioningVerdict =
		preBootedByS >= PRE_BOOTED_MARGIN_S
			? "pre-booted"
			: preBootedByS < BOOT_ON_CREATE_MARGIN_S
				? "boot-on-create"
				: "indeterminate";
	return { provisioning, preBootedByS };
}

/**
 * Tally one provider's per-sandbox verdicts into the counted disclosure an AGGREGATED Run publishes.
 *
 * Aggregation drops identity fields (one sandbox's boot id was never a property of the provider), so
 * without this the whole signal would exist only on unmerged shards and vanish from the dataset. Takes
 * the same unmerged readings `buildObservedMixtures` does, one per sandbox.
 *
 * Returns undefined when no reading carried a verdict at all — a provider nothing was probed on
 * discloses nothing, rather than a tally of zeros that would read as "checked, found nothing pooled".
 */
export function buildObservedProvisioning(
	readings: readonly ObservedSpecs[],
): ObservedProvisioning | undefined {
	let preBooted = 0;
	let bootOnCreate = 0;
	let indeterminate = 0;
	const margins: number[] = [];
	const bootIds = new Set<string>();
	let bootIdSandboxes = 0;
	for (const reading of readings) {
		// Trust the reading's own verdict when it carries one (a shard classified at normalize time) and
		// classify on the spot otherwise, so a reading assembled by some other path is still counted.
		const { provisioning, preBootedByS } =
			reading.provisioning === undefined
				? classifyProvisioning(reading)
				: { provisioning: reading.provisioning, preBootedByS: reading.preBootedByS };
		// A sandbox nobody probed contributes NO count — the same rule the mixture categories follow, so
		// the shortfall against `ObservedMixtures.sandboxes` stays visible instead of being laundered into
		// `indeterminate`. The two are different facts: "probed, could not tell" and "never probed".
		if (provisioning === undefined) continue;
		if (provisioning === "pre-booted") preBooted += 1;
		else if (provisioning === "boot-on-create") bootOnCreate += 1;
		else indeterminate += 1;
		if (preBootedByS !== undefined && Number.isFinite(preBootedByS)) margins.push(preBootedByS);
		if (reading.bootId !== undefined) {
			bootIdSandboxes += 1;
			bootIds.add(reading.bootId);
		}
	}
	if (preBooted + bootOnCreate + indeterminate === 0) return undefined;
	return {
		preBooted,
		bootOnCreate,
		indeterminate,
		// The median, not the mean: one sandbox recycled from a long-lived pool member would otherwise
		// drag a fleet of fresh boots into looking pooled.
		...(margins.length > 0
			? { medianPreBootedByS: Math.round(percentileOf(margins, 0.5) * 100) / 100 }
			: {}),
		...(bootIdSandboxes > 0 ? { bootIdSandboxes, distinctBootIds: bootIds.size } : {}),
	};
}
