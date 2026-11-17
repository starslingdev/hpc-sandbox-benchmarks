// The Modal DriverModules: the kit's driver over Modal's adapter, bound to the real SDK here and
// nowhere else. Each isolation variant uses V2 in its own benchmark App.
// Tests lower the same module over a stub control plane through `vendorDriver`.

import type { CreateAttempt, Op } from "@sandbox-benchmarks/driver/vendor";
import { coverage, defineVendorDriver, LEAK_EXPIRY_MS } from "@sandbox-benchmarks/driver/vendor";
import { ModalClient } from "modal";
import type { ClientMiddleware } from "nice-grpc";
import { MODAL_MARKER_TAG, modalCostEvidence } from "./cost.ts";
import { MODAL_PROVENANCE } from "./provenance.ts";
import type { ModalProviderId } from "./vendor.ts";
import {
	createModalControlRunner,
	MODAL_DESTROY_TIMEOUT_MS,
	MODAL_INVENTORY_TIMEOUT_MS,
	modalAppName,
	modalControlPlane,
	modalSandboxId,
	modalVendor,
} from "./vendor.ts";

/**
 * `sandbox.exec([...])` waits for the result with no separate per-exec timeout and no hard gateway
 * cap, but its stdio stream is not reliable over benchmark-length execs: a ~66-minute better-auth
 * run completed in-sandbox (manifest exit_code 0) while the harness-side stream died with gRPC
 * INTERNAL "Failed to read exec stdio stream" (ZEHA3277, 2026-07-10), losing the step result.
 * Suite-length steps therefore detach past 30 minutes, which survives a dropped stream; short setup
 * steps keep the cheaper direct exec.
 */
export const MODAL_EXECUTION = Object.freeze({
	syncCapMs: 30 * 60_000,
	durable: "shell-detach" as const,
});

/** The largest memory limit Modal's burst eviction SLO covers. */
const MODAL_MEMORY_BURST_MAX_LIMIT_MIB = 8 * 1024;

/**
 * Thread-count hints Modal sets to the rounded-up CPU request for JS SDKs before 0.11.2. GNU
 * `nproc` and OpenMP follow them, so a 0.125-core request would size the workload to one thread.
 */
const MODAL_THREAD_COUNT_ENV_VARS = [
	"OMP_NUM_THREADS",
	"MKL_NUM_THREADS",
	"OPENBLAS_NUM_THREADS",
	"BLIS_NUM_THREADS",
	"ORT_INTRA_OP_NUM_THREADS",
	"ORT_INTER_OP_NUM_THREADS",
] as const;

/** The create transaction: App and image resolution and allocation, cancellable as one. */
export function modalAllocate(
	provider: ModalProviderId,
	image: string,
	createClient: (
		middleware: ClientMiddleware,
	) => Pick<ModalClient, "apps" | "images" | "sandboxes">,
) {
	const runner = createModalControlRunner(createClient, 300_000);
	return ({ request: { spec, env }, marker }: CreateAttempt, { signal }: Op) =>
		runner.run({ signal }, async (client) => {
			const app = await client.apps.fromName(modalAppName(provider), { createIfMissing: true });
			const memoryBytes = spec.memoryGb * 1024 ** 3;
			const taskMemoryBytes =
				memoryBytes >= 2 * 1024 ** 3 ? memoryBytes - 1024 ** 3 : memoryBytes / 2;
			const memoryLimitMiB = spec.memoryGb * 1024;
			const params = {
				name: marker,
				timeoutMs: LEAK_EXPIRY_MS,
				// Modal bills max(request, usage) and bursts above the request
				// (https://modal.com/docs/guide/sandbox-resources), so request the 0.125-core minimum.
				cpu: 0.125,
				// Burst from Modal's 128 MiB minimum when the limit is within Modal's 8 GiB burst
				// eviction SLO; reserve larger limits in full.
				memoryMiB: memoryLimitMiB <= MODAL_MEMORY_BURST_MAX_LIMIT_MIB ? 128 : memoryLimitMiB,
				// Bound memory bursting by the benchmark's memory ceiling.
				memoryLimitMiB,
				env: {
					// Size thread pools from the target vCPUs; sandbox env overrides Modal's hints.
					...Object.fromEntries(
						MODAL_THREAD_COUNT_ENV_VARS.map((name) => [name, String(spec.vcpus)]),
					),
					// Size the runner's guard from the configured ceiling.
					REALWORLD_TASK_MEM_MAX_BYTES: String(Math.floor(taskMemoryBytes)),
					...env,
				},
				// Pin CPU placement to Modal's low-variance instance pool
				// (https://modal.com/docs/guide/performance-sensitive-sandboxes). GPU creates
				// must not set this; Modal documents the option as CPU-only.
				experimentalOptions: { performance_sensitive: true },
				// The cost hook isolates this sandbox's billed usage by filtering stats on the
				// marker tag. perf_sensitive is a console/inventory label only.
				tags: { [MODAL_MARKER_TAG]: marker, perf_sensitive: "true" },
			};
			const registry = client.images.fromRegistry(image);
			return client.sandboxes.create(app, registry, {
				...params,
				runtime: provider === "modal-vm" ? "vm" : "gvisor",
			});
		});
}

export function defineModalDriver<P extends ModalProviderId>(provider: P) {
	const backend = "v2";
	return defineVendorDriver(provider, {
		provenance: MODAL_PROVENANCE,
		sandboxId: modalSandboxId(backend),
		coverage: coverage(
			{ vcpus: "mapped", memoryGb: "mapped", diskGb: "runtime-verified" },
			{ env: "mapped" },
		),
		execution: MODAL_EXECUTION,
		costEvidence: modalCostEvidence(provider),
		markerKey: "name",
		recovery: { provesAbsence: false },
		// One listing page drains the App, and the whole listing shares the same minute;
		// a delete waits for the sandbox to exit.
		timing: {
			controlTimeoutMs: MODAL_INVENTORY_TIMEOUT_MS,
			inventoryTimeoutMs: MODAL_INVENTORY_TIMEOUT_MS,
			deleteTimeoutMs: MODAL_DESTROY_TIMEOUT_MS,
		},
		vendor: ({ env, resolvedArtifact }) => {
			const client = (middleware: ClientMiddleware) =>
				new ModalClient({
					tokenId: env.MODAL_TOKEN_ID,
					tokenSecret: env.MODAL_TOKEN_SECRET,
					grpcMiddleware: [middleware],
				});
			return modalVendor({
				backend,
				appName: modalAppName(provider),
				control: (middleware) => modalControlPlane(client(middleware)),
				allocate: modalAllocate(provider, resolvedArtifact.ref, client),
			});
		},
	});
}
