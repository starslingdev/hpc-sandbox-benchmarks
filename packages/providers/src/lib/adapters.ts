// The whole adapter layer: each schema provider id mapped to its computesdk factory plus the
// benchmark's create-time policy. The @computesdk/* wrappers already adapt each raw vendor SDK to
// computesdk's universal sandbox (runCommand with daemon-backed streaming, filesystem, destroy), so
// nothing here re-wraps an SDK — these are pure config. Credentials are read from each provider's
// env vars by its factory.
import { blaxel } from "@computesdk/blaxel";
import { daytona } from "@computesdk/daytona";
import { e2b } from "@computesdk/e2b";
import { modal } from "@computesdk/modal";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { blaxelWithVolume } from "./blaxel-volume.ts";
import { config } from "./config.ts";
import { e2bCommandsAsRoot } from "./e2b-root.ts";
import { novitaCompute } from "./novita.ts";
import type { ProviderAdapter } from "./types.ts";

// The daytona account/target (key/target/snapshot), resolved by the config gatekeeper. Named
// `daytonaCfg` to avoid shadowing the `daytona` factory imported above. Never read process.env here.
const daytonaCfg = config.daytona;

// This project's dedicated Modal app — the namespace all sandbox-benchmarks sandboxes boot under.
const MODAL_APP_NAME = "sandbox-benchmarks";

/**
 * Harness adapters, keyed by the schema {@link ProviderId}. The `Record<ProviderId, …>` type is what
 * keeps the two registries honest: it forces exactly one adapter per schema provider, so a provider
 * added to the schema without an adapter here — or an adapter with a typo'd / unknown id — is a
 * compile error, no runtime reconciliation required.
 */
export const adapters: Record<ProviderId, ProviderAdapter> = {
	// Boot the e2b template built from the toolchain image (computesdk maps snapshotId → the e2b
	// template id/name). cpu/memory are pinned in the template's e2b.toml, not per-create. The raw
	// E2B SDK's root user keeps apt fallbacks, PTS config, and the root-baked registry on one runtime
	// identity; ComputeSDK does not expose that native command option, so patch this instance.
	e2b: {
		createCompute: () => e2bCommandsAsRoot(e2b({})),
		createOptions: { snapshotId: config.e2bTemplate },
	},
	daytona: {
		// The account API key; the toolchain snapshot and runner target are pinned per-create. `target`
		// and autoStopInterval ride the wrapper's provider-options passthrough into Daytona's native
		// createParams. The universal `timeout` is only the Daytona SDK create-call deadline — it does
		// not extend sandbox lifetime — so disable native auto-stop and rely on the harness's guaranteed
		// teardown. No requiredEnvVars override needed: the schema meta owns DAYTONA_API_KEY.
		createCompute: () => daytona({ apiKey: daytonaCfg.apiKey }),
		createOptions: {
			snapshotId: daytonaCfg.snapshot,
			autoStopInterval: 0,
			...(daytonaCfg.target ? { target: daytonaCfg.target } : {}),
		},
	},
	blaxel: {
		// Credentials come from BL_API_KEY/BL_WORKSPACE (the factory's env fallback). Boot the Debian
		// ts-app image as root (the stock Alpine base-image has no apt — PTS uninstallable). Blaxel
		// couples CPU to RAM (measured: vCPU ≈ memory_MB / 2048) and exposes no cgroup cpu.max, so
		// memory=8192 yields the target's 8 GiB RAM and 4 vCPU — the target pins vCPU at 4 precisely so
		// Blaxel's coupled point matches on effective vCPU/memory (specMatched=true), no comparability
		// caveat. Disk is separate: blaxelWithVolume mounts a 40 GiB volume at
		// the PTS data dir where the heavy suites write (see blaxel-volume.ts), so it clears the disk
		// gate like the other runners (not part of the specMatched check). No pre-baked toolchain
		// snapshot yet — setup steps run fallbacks.
		createCompute: () =>
			blaxelWithVolume(blaxel({ image: "blaxel/ts-app:latest", memory: 8192, region: "us-was-1" })),
		createOptions: {},
	},
	modal: {
		// Boot sandboxes under this project's own Modal app (auto-created via apps.fromName on first
		// create), not the wrapper's generic `computesdk-modal` default — so this project's sandboxes
		// are namespaced/attributable in the Modal dashboard, separate from any other computesdk usage.
		createCompute: () => modal({ scalableSandboxes: true, appName: MODAL_APP_NAME }),
		createOptions: {
			templateId: config.toolchainImage,
			// Modal's docs call `cpu` physical cores ("this value corresponds to physical cores, not
			// vCPUs" — modal.com/docs/guide/resources), but measured behavior contradicts that reading:
			// cpu=1/cpuLimit=1 exposes nproc=1 and delivers exactly half the dual-worker throughput of
			// cpu=2/cpuLimit=2 (probed 2026-07-10: 264 vs 512 MB hashed/worker/8s). In practice `cpu` is
			// the schedulable-CPU count the guest sees, so halving TARGET_SPEC.vcpus benchmarked Modal on
			// half the CPU of every other provider (which all expose nproc=2). Pass the vCPU spec through.
			cpu: TARGET_SPEC.vcpus,
			cpuLimit: TARGET_SPEC.vcpus,
			// `memoryMiB` is only a RESERVATION — on its own the guest still sees the host's RAM (a live
			// sandbox reported 464 GB), and PTS sizes STREAM's arrays from that, so the memory suite never
			// converged. `memoryLimitMiB` is the hard cap that makes /proc/meminfo report the target spec.
			memoryMiB: TARGET_SPEC.memoryGb * 1024,
			memoryLimitMiB: TARGET_SPEC.memoryGb * 1024,
		},
	},
	novita: {
		// The e2b wrapper re-pointed at Novita's E2B-compatible control plane (sandbox.novita.ai) —
		// see novita.ts for exactly what is swapped and why. Boots the pre-baked toolchain template
		// the bake pipeline creates on Novita via the same e2b CLI (computesdk maps snapshotId → the
		// template name); cpu/memory are pinned at template create, not per-sandbox.
		createCompute: () => novitaCompute(config.novita.apiKey),
		createOptions: { snapshotId: config.novitaTemplate },
	},
};
