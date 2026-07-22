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
import type { CreateSandboxOptions } from "computesdk";
import { blaxelWithVolumeAndKeepAlive } from "./blaxel-volume.ts";
import type { DaytonaConfig } from "./config.ts";
import { config } from "./config.ts";
import { daytonaClientTarget } from "./daytona-target.ts";
import { e2bCommandsAsRoot } from "./e2b-root.ts";
import { novitaCompute } from "./novita.ts";
import type { ProviderAdapter } from "./types.ts";

// This project's dedicated Modal app — the namespace all sandbox-benchmarks sandboxes boot under.
const MODAL_APP_NAME = "sandbox-benchmarks";

/**
 * The Daytona VM and container variants share one adapter shape — the same account API key and the
 * same create-time policy — and differ only in the account config the config gatekeeper resolved:
 * region target and which pre-baked snapshot to boot. The sandbox class (LINUX_VM vs CONTAINER) is
 * fixed inside each variant's snapshot at bake time, so nothing selects it here. The region CANNOT
 * ride createOptions: the native SDK's create() honors only the CLIENT-level target (constructor
 * config or the DAYTONA_TARGET env fallback), and the wrapper builds its client from the apiKey
 * alone — so daytonaClientTarget's env-pin around create is the only channel through this wrapper
 * (race-free: each CI job runs exactly one provider). autoStopInterval does ride the wrapper's
 * provider-options passthrough into Daytona's native createParams; the universal `timeout` is only
 * the create-call deadline, so disable native auto-stop and rely on the harness's guaranteed
 * teardown. Never read process.env here.
 */
function daytonaAdapter(cfg: DaytonaConfig): ProviderAdapter {
	return {
		createCompute: () => daytonaClientTarget(daytona({ apiKey: cfg.apiKey }), cfg.target),
		createOptions: {
			snapshotId: cfg.snapshot,
			autoStopInterval: 0,
		},
	};
}

/**
 * Shared Modal create-time options. Both Modal variants boot the SAME pushed toolchain image at the
 * target spec via `Image.fromRegistry`; the only difference is that `modal-vm` adds
 * `experimentalOptions {vm_runtime:true}` to select Modal's VM runtime (a gVisor-free microVM). The
 * `@computesdk/modal` wrapper spreads any option key it doesn't recognise straight through to
 * `experimentalCreate`, so `experimentalOptions` reaches the native Modal SDK unchanged.
 */
function modalCreateOptions(experimentalOptions?: Record<string, unknown>): CreateSandboxOptions {
	return {
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
		...(experimentalOptions ? { experimentalOptions } : {}),
	};
}

/** Boot sandboxes under this project's own Modal app (auto-created via apps.fromName on first
 *  create), not the wrapper's generic `computesdk-modal` default — so this project's sandboxes are
 *  namespaced/attributable in the Modal dashboard, separate from any other computesdk usage. The two
 *  variants differ in one client flag: modal-gvisor enables scalableSandboxes (the gVisor path);
 *  modal-vm omits it to match the VM-runtime config validated in #221 (VM sandboxes drop it). */
const modalGvisorCompute = () => modal({ scalableSandboxes: true, appName: MODAL_APP_NAME });
const modalVmCompute = () => modal({ appName: MODAL_APP_NAME });

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
	// Both Daytona variants share the account API key (the schema meta owns DAYTONA_API_KEY); they
	// differ only in region + the class-specific snapshot resolved by the config gatekeeper.
	"daytona-vm": daytonaAdapter(config.daytonaVm),
	"daytona-container": daytonaAdapter(config.daytonaContainer),
	blaxel: {
		// Credentials come from BL_API_KEY/BL_WORKSPACE (the factory's env fallback). Boot the Debian
		// ts-app image as root (the stock Alpine base-image has no apt — PTS uninstallable). Blaxel
		// couples CPU to RAM (measured: vCPU ≈ memory_MB / 2048) and exposes no cgroup cpu.max, so
		// memory=8192 yields the target's 8 GiB RAM and 4 vCPU — the target pins vCPU at 4 precisely so
		// Blaxel's coupled point matches on effective vCPU/memory (specMatched=true), no comparability
		// caveat. Disk is separate: blaxelWithVolumeAndKeepAlive mounts a 40 GiB volume at the PTS data
		// dir where the heavy suites write (see blaxel-volume.ts), so it clears the disk gate like the
		// other runners (not part of the specMatched check). It also holds one sleeping native process
		// with keepAlive=true: without an inbound request Blaxel enters standby after ~15s, which would
		// pause a synchronous benchmark. No pre-baked toolchain snapshot yet — setup steps run fallbacks.
		createCompute: () =>
			blaxelWithVolumeAndKeepAlive(
				blaxel({ image: "blaxel/ts-app:latest", memory: 8192, region: "us-was-1" }),
			),
		createOptions: {},
	},
	// Modal's default runtime = gVisor. Both variants boot the same pushed image; modal-vm adds the
	// vm_runtime experimental flag to select Modal's gVisor-free VM runtime and drops scalableSandboxes
	// to match the VM config validated in #221 (see modalGvisorCompute/modalVmCompute above).
	"modal-gvisor": {
		createCompute: modalGvisorCompute,
		createOptions: modalCreateOptions(),
	},
	"modal-vm": {
		createCompute: modalVmCompute,
		createOptions: modalCreateOptions({ vm_runtime: true }),
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
