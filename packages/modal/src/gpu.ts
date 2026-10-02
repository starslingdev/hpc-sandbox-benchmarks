// `@sandbox-benchmarks/modal/gpu` — the Modal side of the GPU benchmark. Modal is the only GPU
// vendor, so this is a named subpath the CLI imports directly rather than a generated join
// (ADR-0023 §2). It owns every Modal SDK call the GPU lane makes: the client, the named App, the CUDA
// runtime image, model and kernel-registry Volumes, prepared allocations, sandbox tags and filesystem
// snapshots. Workload staging, harness lifetime and reporting stay vendor-neutral in the CLI.
import type { SandboxSession } from "@sandbox-benchmarks/driver";
import type { App, Image, Sandbox, Volume } from "modal";
import { ModalClient } from "modal";
import type { ModalAllocationOptions } from "./allocation.ts";
import { createModalAllocation } from "./allocation.ts";

/** A built or restored Modal image. Opaque: only this module turns it back into an SDK image. */
export interface ModalGpuImage {
	readonly imageId: string;
}

/** A named Modal Volume, mountable read-write or read-only into a GPU allocation. */
export interface ModalGpuVolume {
	readonly name: string;
}

/** The native handle a GPU allocation's sessions carry. */
export type ModalGpuHandle = Sandbox;

/** One GPU allocation's resources: reservations, limits, lifetime and network isolation. */
export type ModalGpuResources = Omit<ModalAllocationOptions, "env" | "volumes">;

export interface ModalGpuAllocationRequest {
	readonly image: ModalGpuImage;
	readonly resources: ModalGpuResources;
	readonly env?: Readonly<Record<string, string>>;
	/** Mount path → volume. Read-only unless `writable` is set. */
	readonly mounts?: Readonly<
		Record<string, { readonly volume: ModalGpuVolume; readonly writable?: boolean }>
	>;
}

export interface ModalGpuPlatform {
	/** The CUDA runtime image built in the benchmark App. */
	readonly baseImage: ModalGpuImage;
	/** Resolve a named Volume, creating it only when `create` is set. */
	volume(name: string, options: { readonly create: boolean }): Promise<ModalGpuVolume>;
	/** Reattach a previously snapshotted image, or `undefined` when Modal no longer has it. */
	restoreImage(imageId: string): Promise<ModalGpuImage | undefined>;
	/** A prepared allocation for the harness to own: one canonical request and its driver. */
	allocation(request: ModalGpuAllocationRequest): ReturnType<typeof createModalAllocation>;
	close(): void;
}

export interface ModalGpuPlatformOptions {
	readonly appName: string;
	/** The registry image the runtime image builds from. */
	readonly registryImage: string;
	/** Dockerfile command layers applied in order; each entry is one SDK layer. */
	readonly layers: readonly (readonly string[])[];
	readonly env?: Readonly<Record<string, string | undefined>>;
}

const images = new WeakMap<ModalGpuImage, Image>();
const volumes = new WeakMap<ModalGpuVolume, Volume>();

function imageHandle(image: Image): ModalGpuImage {
	const handle = Object.freeze({ imageId: image.imageId });
	images.set(handle, image);
	return handle;
}

function sdkImage(handle: ModalGpuImage): Image {
	const image = images.get(handle);
	if (!image) throw new Error("Modal GPU image was not built or restored by this platform");
	return image;
}

function sdkVolume(handle: ModalGpuVolume): Volume {
	const volume = volumes.get(handle);
	if (!volume) throw new Error(`Modal GPU volume ${handle.name} was not resolved by this platform`);
	return volume;
}

/** Bind already-resolved SDK resources into a platform. Exported for offline tests. */
export function modalGpuPlatform(
	client: ModalClient,
	app: App,
	baseImage: Image,
): ModalGpuPlatform {
	return {
		baseImage: imageHandle(baseImage),
		async volume(name, options) {
			const volume = await client.volumes.fromName(name, { createIfMissing: options.create });
			const handle = Object.freeze({ name });
			volumes.set(handle, volume);
			return handle;
		},
		async restoreImage(imageId) {
			try {
				return imageHandle(await client.images.fromId(imageId));
			} catch {
				return undefined;
			}
		},
		allocation({ image, resources, env, mounts }) {
			return createModalAllocation({
				client,
				app,
				image: sdkImage(image),
				options: {
					...resources,
					...(env === undefined ? {} : { env: { ...env } }),
					...(mounts === undefined
						? {}
						: {
								volumes: Object.fromEntries(
									Object.entries(mounts).map(([path, mount]) => [
										path,
										mount.writable
											? sdkVolume(mount.volume)
											: sdkVolume(mount.volume).withMountOptions({ readOnly: true }),
									]),
								),
							}),
				},
			});
		},
		close: () => client.close(),
	};
}

/**
 * Connect to Modal and build the GPU runtime image in the named App. Credentials come from
 * `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET`; both are required up front so a missing secret fails
 * before any image build is attempted.
 */
export async function openModalGpuPlatform(
	options: ModalGpuPlatformOptions,
): Promise<ModalGpuPlatform> {
	const env = options.env ?? process.env;
	if (!env.MODAL_TOKEN_ID || !env.MODAL_TOKEN_SECRET) {
		throw new Error("MODAL_TOKEN_ID and MODAL_TOKEN_SECRET are required");
	}
	// The SDK resolves the same credentials (and any profile or environment override) itself.
	const client = new ModalClient();
	try {
		const app = await client.apps.fromName(options.appName, { createIfMissing: true });
		let image = client.images.fromRegistry(options.registryImage);
		for (const layer of options.layers) image = image.dockerfileCommands([...layer]);
		return modalGpuPlatform(client, app, await image.build(app));
	} catch (error) {
		client.close();
		throw error;
	}
}

/** Label a GPU sandbox so the Modal console and inventory show its benchmark role. */
export async function tagModalGpuSandbox(
	session: SandboxSession<ModalGpuHandle>,
	tags: Readonly<Record<string, string>>,
): Promise<void> {
	await session.native.setTags({ ...tags });
}

/** Snapshot a GPU sandbox's filesystem into an image that later allocations can boot. */
export async function snapshotModalGpuSandbox(
	session: SandboxSession<ModalGpuHandle>,
	options: { readonly timeoutMs: number; readonly ttlMs: number },
): Promise<ModalGpuImage> {
	return imageHandle(await session.native.snapshotFilesystem({ ...options }));
}
