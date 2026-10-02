import { describe, expect, test } from "bun:test";
import type { SandboxSession } from "@sandbox-benchmarks/driver";
import { App, Image, ModalClient, Volume } from "modal";
import type { ModalGpuHandle } from "./gpu.ts";
import {
	modalGpuPlatform,
	openModalGpuPlatform,
	snapshotModalGpuSandbox,
	tagModalGpuSandbox,
} from "./gpu.ts";

const RESOURCES = {
	gpu: "H100",
	cpu: 4,
	cpuLimit: 8,
	memoryMiB: 32_768,
	memoryLimitMiB: 65_536,
	timeoutMs: 60_000,
	blockNetwork: true,
};

/** A platform over offline SDK objects; Volume and image lookups are replaced, never sent. */
function platform() {
	const client = new ModalClient({ tokenId: "test-token", tokenSecret: "test-secret" });
	const mountOptions: Record<string, unknown>[] = [];
	class RecordingVolume extends Volume {
		override withMountOptions(params?: { readOnly?: boolean }): Volume {
			mountOptions.push({ name: this.name, ...params });
			return super.withMountOptions(params);
		}
	}
	Object.defineProperty(client, "volumes", {
		value: { fromName: async (name: string) => new RecordingVolume(`vo-${name}`, name) },
	});
	Object.defineProperty(client, "images", {
		value: {
			fromId: async (imageId: string) => {
				if (imageId === "im-expired") throw new Error("image not found");
				return new Image(client, imageId, "");
			},
		},
	});
	const gpu = modalGpuPlatform(
		client,
		new App("ap-gpu", "gpu-test"),
		new Image(client, "im-base", ""),
	);
	return { client, gpu, mountOptions };
}

describe("Modal GPU platform", () => {
	test("refuses to connect without both Modal tokens", async () => {
		for (const env of [
			{},
			{ MODAL_TOKEN_ID: "id" },
			{ MODAL_TOKEN_ID: "id", MODAL_TOKEN_SECRET: "" },
		]) {
			await expect(
				openModalGpuPlatform({ appName: "gpu", registryImage: "cuda", layers: [], env }),
			).rejects.toThrow("MODAL_TOKEN_ID and MODAL_TOKEN_SECRET are required");
		}
	});

	test("lowers a GPU allocation onto one canonical request booting the platform's image", () => {
		const { gpu } = platform();
		const allocation = gpu.allocation({
			image: gpu.baseImage,
			resources: RESOURCES,
			env: { WORKLOAD: "vllm" },
		});
		expect(gpu.baseImage.imageId).toBe("im-base");
		expect(allocation.request).toEqual({
			spec: { vcpus: 4, memoryGb: 32 },
			artifact: { kind: "built", ref: "im-base" },
			gpu: { model: "H100", count: 1 },
			env: { WORKLOAD: "vllm" },
		});
		expect(allocation.module.id).toBe("modal-gvisor");
		expect(allocation.module.accelerator).toBeDefined();
	});

	test("mounts volumes read-only unless the request marks them writable", async () => {
		const { gpu, mountOptions } = platform();
		const models = await gpu.volume("models", { create: false });
		const registry = await gpu.volume("registry", { create: true });
		gpu.allocation({
			image: gpu.baseImage,
			resources: RESOURCES,
			mounts: {
				"/models": { volume: models },
				"/registry": { volume: registry, writable: true },
			},
		});
		expect(models.name).toBe("models");
		expect(mountOptions).toEqual([{ name: "models", readOnly: true }]);
	});

	test("refuses image and volume handles it did not resolve", () => {
		const { gpu } = platform();
		expect(() => gpu.allocation({ image: { imageId: "im-forged" }, resources: RESOURCES })).toThrow(
			"not built or restored by this platform",
		);
		expect(() =>
			gpu.allocation({
				image: gpu.baseImage,
				resources: RESOURCES,
				mounts: { "/models": { volume: { name: "models" } } },
			}),
		).toThrow("volume models was not resolved by this platform");
	});

	test("restores a snapshotted image, and reports an expired one as absent", async () => {
		const { gpu } = platform();
		const restored = await gpu.restoreImage("im-kernels");
		expect(restored?.imageId).toBe("im-kernels");
		if (restored) {
			expect(gpu.allocation({ image: restored, resources: RESOURCES }).request.artifact).toEqual({
				kind: "built",
				ref: "im-kernels",
			});
		}
		expect(await gpu.restoreImage("im-expired")).toBeUndefined();
	});

	test("tags a sandbox and turns its filesystem snapshot into a bootable image", async () => {
		const { client, gpu } = platform();
		const calls: unknown[] = [];
		const session = {
			native: {
				setTags: async (tags: Record<string, string>) => {
					calls.push(tags);
				},
				snapshotFilesystem: async (params: unknown) => {
					calls.push(params);
					return new Image(client, "im-snapshot", "");
				},
			},
		} as unknown as SandboxSession<ModalGpuHandle>;
		await tagModalGpuSandbox(session, { role: "kernel-cache-seed" });
		const snapshot = await snapshotModalGpuSandbox(session, { timeoutMs: 1000, ttlMs: 2000 });
		expect(calls).toEqual([{ role: "kernel-cache-seed" }, { timeoutMs: 1000, ttlMs: 2000 }]);
		expect(gpu.allocation({ image: snapshot, resources: RESOURCES }).request.artifact).toEqual({
			kind: "built",
			ref: "im-snapshot",
		});
	});
});
