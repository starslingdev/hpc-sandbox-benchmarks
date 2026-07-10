// The whole adapter layer: each schema provider id mapped to its computesdk factory plus the
// benchmark's create-time policy. The @computesdk/* wrappers already adapt each raw vendor SDK to
// computesdk's universal sandbox (runCommand with daemon-backed streaming, filesystem, destroy), so
// nothing here re-wraps an SDK — these are pure config. Credentials are read from each provider's
// env vars by its factory.
import { blaxel } from "@computesdk/blaxel";
import { cloudRun } from "@computesdk/cloud-run";
import { daytona } from "@computesdk/daytona";
import { e2b } from "@computesdk/e2b";
import { modal } from "@computesdk/modal";
import { vercel } from "@computesdk/vercel";
import type { DirectProvider, ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { novitaAdapter } from "@sandbox-benchmarks/provider-novita";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { TARGET_SPEC, VCPUS_PER_PHYSICAL_CORE } from "@sandbox-benchmarks/schema";
import { config } from "./config.ts";

// The daytona account/target (key/target/snapshot), resolved by the config gatekeeper. Named
// `daytonaCfg` to avoid shadowing the `daytona` factory imported above. Never read process.env here.
const daytonaCfg = config.daytona;

// This project's dedicated Modal app — the namespace all sandbox-benchmarks sandboxes boot under.
const MODAL_APP_NAME = "sandbox-benchmarks";

// Vercel provisions sandbox RAM at a fixed 2 GB per vCPU (vercel.com/docs/sandbox: "RAM is
// provisioned at 2 GB per vCPU"), so memory is bought BY choosing vCPUs — the one source of that
// coupling factor, mirroring VCPUS_PER_PHYSICAL_CORE for Modal.
const VERCEL_GB_PER_VCPU = 2;

/**
 * Harness adapters, keyed by the schema {@link ProviderId}. The `Record<ProviderId, …>` type is what
 * keeps the two registries honest: it forces exactly one adapter per schema provider, so a provider
 * added to the schema without an adapter here — or an adapter with a typo'd / unknown id — is a
 * compile error, no runtime reconciliation required.
 */
export const adapters: Record<ProviderId, ProviderAdapter> = {
	// Boot the e2b template built from the toolchain image (computesdk maps snapshotId → the e2b
	// template id/name). cpu/memory are pinned in the template's e2b.toml, not per-create.
	e2b: {
		createCompute: () => e2b({}),
		createOptions: { snapshotId: config.e2bTemplate },
	},
	daytona: {
		// The account API key; the toolchain snapshot and runner target are pinned per-create. `target`
		// rides the wrapper's create-options passthrough into Daytona's createParams. No requiredEnvVars
		// override needed — it falls back to the schema meta's static ["DAYTONA_API_KEY"], so a missing
		// credential skips (not errors).
		createCompute: () => daytona({ apiKey: daytonaCfg.apiKey }),
		createOptions: {
			snapshotId: daytonaCfg.snapshot,
			...(daytonaCfg.target ? { target: daytonaCfg.target } : {}),
		},
	},
	blaxel: {
		// Credentials come from BL_API_KEY/BL_WORKSPACE (the factory's env fallback). The stock
		// base-image is Alpine (no apt — PTS uninstallable) and disk is a tmpfs overlay carved from VM
		// RAM (~78%), so boot the Debian ts-app image and buy disk with memory: 16384 MB ≈ 12.5 GiB
		// disk. No pre-baked toolchain snapshot yet — setup steps run their fallback paths.
		createCompute: () =>
			blaxel({ image: "blaxel/ts-app:latest", memory: 16384, region: "us-pdx-1" }),
		createOptions: {},
	},
	modal: {
		// Boot sandboxes under this project's own Modal app (auto-created via apps.fromName on first
		// create), not the wrapper's generic `computesdk-modal` default — so this project's sandboxes
		// are namespaced/attributable in the Modal dashboard, separate from any other computesdk usage.
		createCompute: () => modal({ scalableSandboxes: true, appName: MODAL_APP_NAME }),
		createOptions: {
			templateId: config.toolchainImage,
			// Modal's `cpu`/`cpuLimit` are physical cores, not vCPUs ("Note that this value corresponds to
			// physical cores, not vCPUs" — modal.com/docs/guide/resources; 1 core = 2 vCPUs), so convert
			// from the pinned vCPU spec. Passing TARGET_SPEC.vcpus straight through would reserve 2
			// physical cores = 4 vCPUs — double every other provider, not parity with them.
			cpu: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			cpuLimit: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			// `memoryMiB` is only a RESERVATION — on its own the guest still sees the host's RAM (a live
			// sandbox reported 464 GB), and PTS sizes STREAM's arrays from that, so the memory suite never
			// converged. `memoryLimitMiB` is the hard cap that makes /proc/meminfo report the target spec.
			memoryMiB: TARGET_SPEC.memoryGb * 1024,
			memoryLimitMiB: TARGET_SPEC.memoryGb * 1024,
		},
	},
	vercel: {
		// Credentials come from VERCEL_TOKEN/VERCEL_TEAM_ID/VERCEL_PROJECT_ID (the factory's env
		// fallback). No custom base images — sandboxes boot Amazon Linux 2023 (dnf) and the setup
		// steps run their fallback paths; no pre-baked toolchain snapshot yet. The cast bridges an
		// upstream declaration gap: the wrapper's snapshot manager returns the raw @vercel/sandbox
		// Snapshot (no id/provider fields), which fails computesdk's snapshot contract — a surface
		// the harness never touches.
		createCompute: () => vercel({}) as unknown as DirectProvider,
		createOptions: {
			// RAM rides vCPUs at a fixed 2 GB/vCPU, so the 2 vCPU / 8 GiB target spec is inexpressible.
			// Buy memory parity (8 GB) and run the CPU oversized (4 vCPU) — the blaxel precedent — with
			// the mismatch disclosed downstream via observed-specs (specMatched=false). `resources` rides
			// the wrapper's create-options passthrough into `Sandbox.create`.
			resources: { vcpus: TARGET_SPEC.memoryGb / VERCEL_GB_PER_VCPU },
		},
	},
	cloudrun: {
		// The gateway URL/secret must be passed as config — the @computesdk/cloud-run factory doesn't
		// read its own env vars (the config gatekeeper does, like every other credential). Sandboxes
		// execute inside the pre-deployed gateway service (remote mode), so there are no create-time
		// spec knobs to pin here: CPU/memory are the gateway's deploy-time flags.
		createCompute: () =>
			cloudRun({
				sandboxUrl: config.cloudRun.sandboxUrl,
				sandboxSecret: config.cloudRun.sandboxSecret,
			}),
		createOptions: {},
	},
	// The e2b wrapper re-pointed at Novita's E2B-compatible control plane; owns its own env slice
	// (NOVITA_API_KEY) and vendor deps — see @sandbox-benchmarks/provider-novita.
	novita: novitaAdapter,
};
