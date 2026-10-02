// The artifact seam at its interface: an OCI baker is a frozen join of id and build, and a
// native-snapshot baker is derived from a driver's snapshot capability, here a module built with
// defineVendorDriver over the in-memory vendor.

import { describe, expect, test } from "bun:test";
import type { SandboxSession } from "@sandbox-benchmarks/driver";
import type {
	OciArtifactBuildRequest,
	SnapshotArtifactBuildRequest,
} from "@sandbox-benchmarks/driver/artifact";
import {
	defineArtifactBuilder,
	snapshotArtifactBuilder,
} from "@sandbox-benchmarks/driver/artifact";
import type { Vendor } from "@sandbox-benchmarks/driver/vendor";
import { defineVendorDriver, mapped } from "@sandbox-benchmarks/driver/vendor";
import type { MemoryRow } from "@sandbox-benchmarks/driver/vendor/testing";
import { memoryVendor } from "@sandbox-benchmarks/driver/vendor/testing";
import { type } from "arktype";

const common = {
	name: "benchmark-toolchain-v9",
	spec: { vcpus: 4, memoryGb: 8 },
	replace: "allowed",
	log: () => {},
	signal: new AbortController().signal,
} as const;

test("an OCI baker is a frozen join of its provider id and its build", async () => {
	type Env = { readonly E2B_API_KEY: string };
	const seen: OciArtifactBuildRequest<Env>[] = [];
	const builder = defineArtifactBuilder<"e2b", Env>("e2b", async (request) => {
		seen.push(request);
		return { ref: request.name, replaced: "atomic" };
	});
	const request: OciArtifactBuildRequest<Env> = {
		...common,
		bakes: "oci",
		base: { digestRef: "ghcr.io/example/base@sha256:0123" },
		imagesDir: "/images",
		env: { E2B_API_KEY: "key" },
	};
	expect(await builder.build(request)).toEqual({ ref: request.name, replaced: "atomic" });
	expect(seen).toEqual([request]);
	expect(builder).toMatchObject({ provider: "e2b", bakes: "oci" });
	expect(Object.isFrozen(builder)).toBe(true);
});

describe("a native-snapshot baker derived from the driver's snapshot capability", () => {
	function bake(options: { withSnapshots?: boolean; removeFails?: boolean } = {}) {
		const world = memoryVendor();
		const booted: string[] = [];
		const captured: string[] = [];
		const deleted: string[] = [];
		const vendor: Vendor<MemoryRow, MemoryRow> = {
			...world.vendor,
			control: {
				...world.vendor.control,
				create: (attempt, op) => {
					if (attempt.request.artifact.kind !== "none") booted.push(attempt.request.artifact.ref);
					return world.vendor.control.create(attempt, op);
				},
				...(options.removeFails && {
					remove: async () => {
						throw new Error("delete refused");
					},
				}),
			},
			...(options.withSnapshots !== false && {
				snapshots: {
					create: async (handle) => {
						captured.push(handle.record.id);
						return { snapshotId: `sh-${handle.record.id}` };
					},
					delete: async (snapshotId) => {
						deleted.push(snapshotId);
					},
				},
			}),
		};
		const module = defineVendorDriver("freestyle", {
			provenance: { packageName: "memory-vendor", version: "0.0.0" },
			sandboxId: type(/^mem-\d+$/),
			coverage: mapped(),
			timing: { pollMs: 0 },
			vendor: () => vendor,
		});
		const builder = snapshotArtifactBuilder(module, { stockBase: () => "freestyle/ubuntu" });
		const request = (
			overrides: Partial<SnapshotArtifactBuildRequest<"freestyle">> = {},
		): SnapshotArtifactBuildRequest<"freestyle"> => ({
			...common,
			bakes: "native-snapshot",
			artifact: { kind: "baked", source: "native-snapshot" },
			env: { FREESTYLE_API_KEY: "key" } as never,
			prepare: async (session: SandboxSession) => {
				await session.exec("sh -c 'echo prepared > /etc/prepared'");
			},
			...overrides,
		});
		return { world, builder, request, booted, captured, deleted };
	}

	test("a candidate build boots the stock base, prepares, captures, and destroys", async () => {
		const { world, builder, request, booted, captured } = bake();
		const prepared: string[] = [];
		const result = await builder.build(
			request({
				prepare: async (session) => {
					prepared.push(session.sandboxRef.id);
				},
			}),
		);
		expect(builder).toMatchObject({ provider: "freestyle", bakes: "native-snapshot" });
		expect(booted).toEqual(["freestyle/ubuntu"]);
		expect(prepared).toEqual(captured);
		expect(result).toEqual({ ref: `sh-${captured[0]}`, replaced: "none" });
		expect(world.allocations()).toBe(0);
	});

	test("a version build boots the revalidated candidate instead of rebuilding", async () => {
		const { builder, request, booted } = bake();
		await builder.build(request({ candidate: { ref: "sh-candidate" } }));
		expect(booted).toEqual(["sh-candidate"]);
	});

	test("a failed preparation captures nothing and still destroys the build sandbox", async () => {
		const { world, builder, request, captured } = bake();
		const failure = new Error("smoke failed");
		await expect(
			builder.build(
				request({
					prepare: async () => {
						throw failure;
					},
				}),
			),
		).rejects.toBe(failure);
		expect(captured).toEqual([]);
		expect(world.allocations()).toBe(0);
	});

	test("a snapshot captured by a build whose teardown fails is deleted", async () => {
		const { builder, request, captured, deleted } = bake({ removeFails: true });
		await expect(builder.build(request())).rejects.toMatchObject({ code: "destroy-failed" });
		expect(captured).toHaveLength(1);
		expect(deleted).toEqual(captured.map((id) => `sh-${id}`));
	});

	test("a driver without a snapshot capability is refused before any allocation", async () => {
		const { world, builder, request } = bake({ withSnapshots: false });
		await expect(builder.build(request())).rejects.toThrow(/no snapshot capability/);
		expect(world.calls).toEqual([]);
	});
});
