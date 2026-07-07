/**
 * Resolve a CPU brand string into a microarchitecture/generation label — a pure helper, ported from
 * THEIRS `scripts/lib/analyze.py` (`resolve_cpu_gen`, the `cpu_generations` table, and
 * `_infer_amd_microarch_from_isa`). Used HOST-side only: the brand string always describes the
 * physical machine, so the label this returns is a host fingerprint and must never decorate an
 * effective (cgroup-quota) spec.
 *
 * Resolution order, most-authoritative first: (1) the static `cpu_family/cpu_model_id` table when ISA
 * hints disclose them, (2) the brand-string SKU table (handles the cloud-masked AWS/Azure SKUs whose
 * series digit is replaced by a letter), and (3) an AVX-512 fingerprint inference for AMD when only a
 * bare 'AMD EPYC' brand survives (hypervisors like Novita strip the model). Anything unresolved
 * returns `undefined`, mirroring `parseSystemHost`'s "leave it unset" tolerance.
 */

/** A resolved generation/microarch label, with the launch year and (when inferred) its provenance. */
export interface CpuFingerprint {
	name: string;
	year?: number;
	inferredFrom?: string;
}

/** Optional ISA hints a probe may disclose; absent under PTS, which only exposes the brand string. */
export interface CpuIsaHints {
	family?: number;
	model?: number;
	hasAvx512f?: boolean;
	hasAvx512Vp2intersect?: boolean;
}

/**
 * `cpu_family/cpu_model_id -> {name, year}`, ported verbatim from THEIRS runner_config.yaml. The
 * primary, most-reliable lookup when a probe discloses the raw family/model (cpuid leaf 1).
 */
const CPU_GENERATIONS: Record<string, CpuFingerprint> = {
	"6/85": { name: "Skylake-SP", year: 2017 },
	"6/106": { name: "Ice Lake-SP", year: 2021 },
	"25/1": { name: "Zen 3 (Milan)", year: 2021 },
	"25/97": { name: "Zen 3 (Milan)", year: 2021 },
	"25/17": { name: "Zen 4 (Genoa)", year: 2022 },
	"26/2": { name: "Zen 5 (Turin)", year: 2024 },
	"26/68": { name: "Zen 5 (Turin Dense)", year: 2024 },
	"23/49": { name: "Zen 2 (Rome)", year: 2019 },
	"6/143": { name: "Sapphire Rapids", year: 2023 },
	"6/173": { name: "Granite Rapids", year: 2024 },
	"6/79": { name: "Broadwell-EP", year: 2015 },
	"6/63": { name: "Haswell-EP", year: 2014 },
	"6/142": { name: "Kaby Lake", year: 2017 },
	"6/158": { name: "Coffee Lake", year: 2018 },
};

/** Map an AMD EPYC brand string to a generation, handling the cloud-masked SKUs first. */
function resolveEpyc(brand: string): CpuFingerprint | undefined {
	// Cloud-masked AWS/Azure SKUs carry a letter where the series digit would be, so the
	// general "final digit = generation" rule below can't read them — match them explicitly.
	if (/\b7(R13|763|B13)\b/.test(brand)) return { name: "Zen 3 (Milan)", year: 2021 };
	if (/\b7V73X\b/.test(brand)) return { name: "Zen 3 (Milan-X)", year: 2022 };
	// 7R32 is the AWS custom Rome (Zen 2) part (c5a/m5a/r5a/g4ad); 7R13 above is the Milan (Zen 3) part.
	if (/\b7(V12|R32)\b/.test(brand)) return { name: "Zen 2 (Rome)", year: 2019 };
	if (/\b9R45\b/.test(brand)) return { name: "Zen 5 (Turin)", year: 2024 };
	if (/\b9R14\b/.test(brand)) return { name: "Zen 4 (Genoa)", year: 2022 };
	// Standard 4-symbol EPYC numbering: the series digit and the final digit name the generation —
	// 9xx5 = Turin (Zen 5), 9xx4 = Genoa/Bergamo (Zen 4), 7xx3 = Milan (Zen 3), 7xx2 = Rome (Zen 2).
	// The second symbol may be a letter on high-frequency / dense parts (7F32, 7H12 → Rome), so match
	// a letter-or-digit there rather than requiring four digits.
	const m = brand.match(/EPYC\s+(\d)[A-Z\d]\d(\d)/);
	if (m) {
		const series = m[1];
		const gen = m[2];
		if (series === "9" && gen === "5") return { name: "Zen 5 (Turin)", year: 2024 };
		if (series === "9" && gen === "4") return { name: "Zen 4 (Genoa)", year: 2022 };
		if (series === "7" && gen === "3") return { name: "Zen 3 (Milan)", year: 2021 };
		if (series === "7" && gen === "2") return { name: "Zen 2 (Rome)", year: 2019 };
	}
	return undefined;
}

/** Map an Intel Xeon brand string to a microarch via the SKUs seen across the runner composites. */
function resolveXeon(brand: string): CpuFingerprint | undefined {
	if (/Platinum 8488C/.test(brand)) return { name: "Sapphire Rapids", year: 2023 };
	if (/Platinum 8375C/.test(brand)) return { name: "Ice Lake-SP", year: 2021 };
	if (/Platinum 8358/.test(brand) || /Platinum 8370C/.test(brand)) {
		return { name: "Ice Lake-SP", year: 2021 };
	}
	return undefined;
}

/**
 * Infer an AMD microarch from the family number + AVX-512 fingerprint, ported from THEIRS
 * `_infer_amd_microarch_from_isa`. The last resort when the SKU/brand is masked (e.g. a bare
 * 'AMD EPYC' with family=25/26 and a disclosed AVX-512 feature set).
 */
function inferAmdFromIsa(brand: string, isa: CpuIsaHints): CpuFingerprint | undefined {
	const upper = brand.toUpperCase();
	if (!["AMD", "EPYC", "RYZEN", "THREADRIPPER"].some((t) => upper.includes(t))) return undefined;
	const fam = isa.family;
	if (fam === 25) {
		// Family 0x19 = Zen 3 / Zen 4. AVX-512 was added in Zen 4.
		if (isa.hasAvx512f && !isa.hasAvx512Vp2intersect) {
			return {
				name: "Zen 4 (Genoa/Bergamo, SKU masked)",
				year: 2022,
				inferredFrom: "ISA fingerprint",
			};
		}
		// Only conclude Zen 3 when AVX-512 is explicitly absent — an unknown (undefined) flag must not
		// be read as "no AVX-512" and guess Milan.
		if (isa.hasAvx512f === false) {
			return { name: "Zen 3 (Milan, SKU masked)", year: 2021, inferredFrom: "ISA fingerprint" };
		}
	}
	if (fam === 26) {
		// Family 0x1A is unambiguously Zen 5 on AMD (unlike family 25, which spans Zen 3 and Zen 4), so
		// bare family 26 resolves even when a guest strips the AVX-512 VP2INTERSECT confirmation flag.
		return { name: "Zen 5 (Turin, SKU masked)", year: 2024, inferredFrom: "ISA fingerprint" };
	}
	return undefined;
}

/**
 * Resolve a CPU `cpuModel` brand string (and optional ISA hints) to a {@link CpuFingerprint}, or
 * `undefined` when nothing matches. See the file header for the resolution order and the host-only rule.
 */
export function resolveCpuMicroarch(
	cpuModel: string,
	isa?: CpuIsaHints,
): CpuFingerprint | undefined {
	// 1. Family/model table — the most reliable signal when a probe discloses them.
	if (isa?.family !== undefined && isa?.model !== undefined) {
		const hit = CPU_GENERATIONS[`${isa.family}/${isa.model}`];
		if (hit) return hit;
	}

	const brand = cpuModel ?? "";
	// 2. Brand-string SKU tables.
	if (brand.includes("EPYC")) {
		const hit = resolveEpyc(brand);
		if (hit) return hit;
	}
	if (brand.includes("Xeon")) {
		const hit = resolveXeon(brand);
		if (hit) return hit;
	}

	// 3. Last-resort AVX-512 fingerprint inference for a masked AMD SKU.
	if (isa) {
		const hit = inferAmdFromIsa(brand, isa);
		if (hit) return hit;
	}

	return undefined;
}
