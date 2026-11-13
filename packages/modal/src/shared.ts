// The Modal DriverModules: the kit's driver over Modal's adapter, bound to the real SDK here and
// nowhere else. Each isolation variant uses V2 in its own benchmark App.
// Tests lower the same module over a stub control plane through `vendorDriver`.

import type { CreateAttempt, Op } from "@sandbox-benchmarks/driver/vendor";
import { coverage, defineVendorDriver, LEAK_EXPIRY_MS } from "@sandbox-benchmarks/driver/vendor";
import { ModalClient } from "modal";
import type { ClientMiddleware } from "nice-grpc";
import { modalCostEvidence } from "./cost.ts";
import { MODAL_PROVENANCE } from "./provenance.ts";
import {
	createModalControlRunner,
	MODAL_APP_NAME,
	MODAL_DESTROY_TIMEOUT_MS,
	MODAL_INVENTORY_TIMEOUT_MS,
	MODAL_VM_APP_NAME,
	modalControlPlane,
	modalSandboxId,
	modalVendor,
} from "./vendor.ts";

type ModalProviderId = "modal-gvisor" | "modal-vm";

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
			const params = {
				name: marker,
				timeoutMs: LEAK_EXPIRY_MS,
				// Reserve CPU for the workload and let Modal provide burst capacity above it.
				cpu: spec.vcpus,
				// The SDK requires a request alongside a limit; use Modal's 128 MiB default.
				memoryMiB: 128,
				// Bound memory bursting by the benchmark's memory ceiling.
				memoryLimitMiB: spec.memoryGb * 1024,
				// VM MemTotal grows with demand; size the runner's guard from the configured ceiling.
				env: { REALWORLD_TASK_MEM_MAX_BYTES: String(Math.floor(taskMemoryBytes)), ...env },
			};
			const registry = client.images.fromRegistry(image);
			return client.sandboxes.create(app, registry, {
				...params,
				runtime: provider === "modal-vm" ? "vm" : "gvisor",
			});
		});
}

function modalAppName(provider: ModalProviderId) {
	return provider === "modal-vm" ? MODAL_VM_APP_NAME : MODAL_APP_NAME;
}

/** Separate Apps keep each runtime's inventory and cleanup ownership disjoint. */
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
		costEvidence: modalCostEvidence,
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
