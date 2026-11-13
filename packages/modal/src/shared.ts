// The Modal DriverModules: the kit's driver over Modal's adapter, bound to the real SDK here and
// nowhere else. Each isolation variant is the same module over its own sandbox generation.
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
	) => Pick<ModalClient, "apps" | "images" | "sandboxes" | "profile">,
) {
	const runner = createModalControlRunner(createClient, 300_000);
	return ({ request: { spec, env }, marker }: CreateAttempt, { signal }: Op) =>
		runner.run({ signal }, async (client) => {
			const app = await client.apps.fromName(MODAL_APP_NAME, { createIfMissing: true });
			const params = {
				name: marker,
				timeoutMs: LEAK_EXPIRY_MS,
				// Reserve CPU for the workload and let Modal provide burst capacity above it.
				cpu: spec.vcpus,
				// The SDK requires a request alongside a limit; use Modal's 128 MiB default.
				memoryMiB: 128,
				// Bound memory bursting by the benchmark's memory ceiling.
				memoryLimitMiB: spec.memoryGb * 1024,
				...(env !== undefined && { env }),
			};
			const registry = client.images.fromRegistry(image);
			if (provider === "modal-gvisor") {
				return client.sandboxes.experimentalCreate(app, registry, { ...params, runtime: "gvisor" });
			}
			// Keep VM allocations in the V1 inventory generation owned by this driver.
			client.profile.sandboxV2 = false;
			return client.sandboxes.create(app, registry, { ...params, runtime: "vm" });
		});
}

/** One provider literal selects both identity and backend; invalid cross-pairs are unrepresentable. */
export function defineModalDriver<P extends ModalProviderId>(provider: P) {
	const backend = provider === "modal-gvisor" ? "v2" : "v1";
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
		// One listing page drains a whole generation, and the whole listing shares the same minute;
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
				appName: MODAL_APP_NAME,
				control: (middleware) => modalControlPlane(client(middleware)),
				allocate: modalAllocate(provider, resolvedArtifact.ref, client),
			});
		},
	});
}
