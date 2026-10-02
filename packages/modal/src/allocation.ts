// Prepared Modal resources for GPU work use the stable V1 gVisor backend. Neither the VM
// runtime nor the V2 service supports GPUs. Resource handles stay typed by the pinned SDK. The
// allocation is the kit's driver over Modal's adapter, created in the caller's App from its image.
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { nvidiaAccelerator } from "@sandbox-benchmarks/driver";
import type { Vendor } from "@sandbox-benchmarks/driver/vendor";
import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import type { App, Image, SandboxCreateParams } from "modal";
import { ModalClient, Sandbox } from "modal";
import type { ClientMiddleware } from "nice-grpc";
import { MODAL_PROVENANCE } from "./provenance.ts";
import {
	createModalControlRunner,
	MODAL_DESTROY_TIMEOUT_MS,
	MODAL_INVENTORY_TIMEOUT_MS,
	modalControlPlane,
	modalListingPages,
	modalSandboxId,
	modalVendor,
} from "./vendor.ts";

export type ModalAllocationOptions = Required<
	Pick<SandboxCreateParams, "cpu" | "cpuLimit" | "memoryMiB" | "memoryLimitMiB" | "timeoutMs">
> &
	Pick<SandboxCreateParams, "gpu" | "env" | "volumes" | "blockNetwork">;

export interface ModalAllocationConfiguration {
	readonly client: ModalClient;
	readonly app: App;
	/** A built or restored SDK image; its imageId is the truthful artifact identity. */
	readonly image: Image;
	readonly options: ModalAllocationOptions;
}

/**
 * GPU teardown evidence records a sandbox as terminated AND unlisted: an exited sandbox the
 * environment still lists is still being removed, so a terminate is only acknowledgement.
 */
export function removedOnceUnlisted<Raw, Native>(
	vendor: Vendor<Raw, Native>,
	listed: (id: string, signal: AbortSignal) => Promise<boolean>,
): Vendor<Raw, Native> {
	return {
		...vendor,
		control: {
			...vendor.control,
			remove: async (id, op) => {
				await vendor.control.remove(id, op);
				return "accepted";
			},
			get: async (id, op) => {
				const record = await vendor.control.get(id, op);
				if (record?.phase === "ready" || !(await listed(id, op.signal))) return record;
				return { id, phase: "deleting", raw: record?.raw as Raw };
			},
		},
	};
}

/** Resolve native configuration to one canonical request and a driver with ordinary sessions. */
export function createModalAllocation(configuration: ModalAllocationConfiguration) {
	const { app, image, client } = configuration;
	if (!app.name)
		throw new Error("Modal allocation requires a named app for failed-create recovery");
	const appName = app.name;
	const imageId = image.imageId;
	if (!imageId) throw new Error("Modal allocation requires a built image");
	const params = { ...configuration.options };
	if (params.env) params.env = { ...params.env };
	if (params.volumes) params.volumes = { ...params.volumes };
	const gpu = params.gpu?.match(/^([^:]+)(?::([1-9][0-9]*))?$/);
	if (params.gpu !== undefined && !gpu) throw new Error("Invalid Modal GPU reservation");
	const request = {
		spec: { vcpus: params.cpu, memoryGb: params.memoryMiB / 1024 },
		artifact: { kind: "built", ref: imageId },
		...(params.env === undefined ? {} : { env: params.env }),
		...(gpu === undefined || gpu === null
			? {}
			: { gpu: { model: gpu[1] ?? "", count: Number(gpu[2] ?? 1) } }),
	} satisfies Omit<CreateRequest, "deadlineMs">;
	const createClient = (middleware: ClientMiddleware) =>
		new ModalClient({
			tokenId: client.profile.tokenId,
			tokenSecret: client.profile.tokenSecret,
			endpoint: client.profile.serverUrl,
			environment: client.profile.environment,
			grpcMiddleware: [middleware],
		});
	const allocation = createModalControlRunner(createClient, 300_000);
	const base = modalVendor<Sandbox>({
		backend: "v1",
		appName,
		control: (middleware) => modalControlPlane(createClient(middleware)),
		allocate: ({ marker }, { signal }) =>
			allocation.run({ signal }, async (sdk) => {
				// Reattach the already-built image through this transaction's client so its RPCs share
				// cancellation. App and volume handles are resolved inputs, not guest-owned resources.
				const prepared = await sdk.images.fromId(imageId);
				const created = await sdk.sandboxes.create(app, prepared, { ...params, name: marker });
				// Allocation middleware belongs only to the create transaction. Native SDK work
				// uses the caller-owned client; driver operations attach their own deadlines.
				return new Sandbox(client, created.sandboxId, { isV2: false });
			}),
	});
	const listRunner = createModalControlRunner(
		(middleware) => modalControlPlane(createClient(middleware)),
		15_000,
	);
	// The environment's running V1 sandboxes, the listing the SDK's own iterator requests.
	const vendor = removedOnceUnlisted(base, (id, signal) =>
		listRunner.run({ signal }, async (control) => {
			const pages = modalListingPages((beforeTimestamp) =>
				control.sandboxes.list({ beforeTimestamp }),
			);
			for await (const page of pages) if (page.some((row) => row.id === id)) return true;
			return false;
		}),
	);
	const module = defineVendorDriver("modal-gvisor", {
		provenance: MODAL_PROVENANCE,
		sandboxId: modalSandboxId("v1"),
		coverage: coverage(
			{ vcpus: "mapped", memoryGb: "mapped", diskGb: "unsupported" },
			{ env: "mapped", gpu: "mapped" },
		),
		unsupported: (input) => {
			if (
				input.spec.vcpus !== request.spec.vcpus ||
				input.spec.memoryGb !== request.spec.memoryGb ||
				input.gpu?.model !== request.gpu?.model ||
				input.gpu?.count !== request.gpu?.count
			)
				return "request differs from the configured Modal allocation";
			const env = input.env ?? {};
			const configuredEnv = request.env ?? {};
			if (
				Object.keys(env).length !== Object.keys(configuredEnv).length ||
				Object.entries(env).some(([key, value]) => value !== configuredEnv[key])
			)
				return "request environment differs from the configured Modal allocation";
			return undefined;
		},
		createBudget: { owner: "harness", timeoutMs: 300_000 },
		execution: { syncCapMs: null, durable: "none" },
		...(request.gpu === undefined ? {} : { accelerator: nvidiaAccelerator }),
		markerKey: "name",
		timing: {
			controlTimeoutMs: MODAL_INVENTORY_TIMEOUT_MS,
			deleteTimeoutMs: MODAL_DESTROY_TIMEOUT_MS,
			deletePollMs: 1_000,
		},
		vendor: () => vendor,
	});
	// A prepared image is no registry artifact: the context carries it as the resolved artifact.
	const context = {
		env: { MODAL_TOKEN_ID: client.profile.tokenId, MODAL_TOKEN_SECRET: client.profile.tokenSecret },
		artifact: { kind: "image" },
		resolvedArtifact: request.artifact,
	} as unknown as DriverContext<"modal-gvisor">;
	const driver = module.driver(context);
	// The allocation owns its one driver; a GPU allocation records no cost evidence.
	const { specFor: _, costEvidence: __, ...policy } = module;
	return { module: { ...policy, driver: () => driver }, driver, request };
}
