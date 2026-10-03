import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { DriverContext, EnvOf, ProviderId, SandboxDriver } from "@sandbox-benchmarks/driver";
import type { OciArtifactBuildRequest } from "@sandbox-benchmarks/driver/artifact";
import { parseDriverEnv } from "@sandbox-benchmarks/driver/env";
import { normalizeProviderInput } from "@sandbox-benchmarks/schema/provider-meta";
import { REGISTRY } from "@sandbox-benchmarks/schema/providers";
import { defineComputeSdkDriver } from "./lib/computesdk.ts";
import { kitPort } from "./lib/vendor-port.ts";
import type {
	Vendor,
	VendorDriverModule,
	VendorHandle,
	VendorOverrides,
	VendorRecord,
	VendorTraits,
} from "./vendor.ts";
import { drainPages, MARKER_PREFIX } from "./vendor.ts";

export type { MemoryRow, MemoryVendorOptions } from "./lib/vendor-memory.fixture.ts";
export { MemoryNotFound, memoryVendor } from "./lib/vendor-memory.fixture.ts";
export { kitPort };
/**
 * A provider's own module lowered over another vendor or timing (its adapter over a stubbed
 * transport) into the driver its `driver(context)` would build, credentials redacted the same way.
 */
export function vendorDriver<P extends ProviderId, Raw, Native>(
	module: VendorDriverModule<P, Raw, Native>,
	context: DriverContext<P>,
	overrides: VendorOverrides<Raw, Native> = {},
): SandboxDriver<VendorHandle<Raw, Native>> {
	type Compute = ReturnType<typeof module.specFor>["compute"];
	return defineComputeSdkDriver<P, Compute>(module.id, {
		...module,
		createBudget: module.createBudget?.owner === "harness" ? module.createBudget : undefined,
		spec: (bound) => module.specFor(bound, overrides),
	}).driver(context);
}

/**
 * A provider's driver context for its tests, derived from its registry entry: every required input
 * set to a sentinel (`<name>-test`), defaults applied, and the declared artifact resolved to a test
 * ref. A test built on it keeps compiling and parsing as the provider's metadata changes.
 */
export function testContext<P extends ProviderId>(id: P): DriverContext<P> {
	const ambient: Record<string, string> = {};
	for (const raw of REGISTRY[id].inputs) {
		const input = normalizeProviderInput(raw);
		if (input.required && input.default === undefined)
			ambient[input.name] = `${input.name.toLowerCase()}-test`;
	}
	const artifact = REGISTRY[id].artifact;
	const resolvedArtifact =
		artifact.kind === "none"
			? artifact
			: { kind: artifact.kind, ref: `${id}-test-${artifact.kind}` };
	// The registry entry is the same one `DriverContext<P>` maps statically; the cast records it.
	return { env: parseDriverEnv(id, ambient), artifact, resolvedArtifact } as DriverContext<P>;
}

/**
 * An OCI build request for provider `id`'s artifact builder in a test: its {@link testContext}
 * credentials, a digest-pinned base and a 4 vCPU / 8 GiB target, with `overrides` applied.
 */
export function ociBuildRequest<P extends ProviderId>(
	id: P,
	overrides: Partial<OciArtifactBuildRequest<EnvOf<P>>> = {},
): OciArtifactBuildRequest<EnvOf<P>> {
	return {
		bakes: "oci",
		name: `${id}-toolchain-test`,
		base: {
			digestRef: `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"c".repeat(64)}`,
		},
		spec: { vcpus: 4, memoryGb: 8 },
		env: testContext(id).env,
		replace: "allowed",
		imagesDir: "/unused",
		dockerConfig: "/unused",
		log: () => {},
		signal: new AbortController().signal,
		...overrides,
	};
}

/** One full allocation lifecycle through a provider's translated port and stubbed transport. */
export function vendorContract<Raw, Native>(
	name: string,
	module: { readonly traits: Pick<VendorTraits, "account" | "recovery" | "timing"> },
	make: () => Vendor<Raw, Native>,
) {
	test(`${name}: allocation is attributable, executable and convergently removed`, async () => {
		const vendor = kitPort(make(), {
			provider: name,
			...module.traits.recovery,
			...module.traits.timing,
		});
		const op = { signal: new AbortController().signal };
		const mint = () => `${MARKER_PREFIX}${randomUUID()}`;
		const marker = mint();
		const request = {
			spec: { vcpus: 4, memoryGb: 8 },
			artifact: { kind: "none" },
			deadlineMs: 1,
		} as const;
		const drain = (
			fetch: (
				cursor: string | undefined,
			) => Promise<{ records: readonly VendorRecord<Raw>[]; next?: string }>,
		) => drainPages(name as ProviderId, fetch, op);
		expect(await vendor.control.get("does-not-exist", op)).toBeNull();
		expect(await vendor.control.remove("does-not-exist", op)).toBe("removed");
		const created = await vendor.control.create({ request, marker }, op);
		const native = await vendor.data.attach(created, op);
		let current = await vendor.control.get(created.id, op);
		expect(current?.id).toBe(created.id);
		const listed = (await drain((cursor) => vendor.control.page(cursor, op))).filter(
			(row) => row.id === created.id,
		);
		expect(listed).toHaveLength(1);
		if ((module.traits.account ?? "shared") === "shared")
			for (const row of [created, current, ...listed]) expect(row?.marker).toBe(marker);
		const find = vendor.control.find;
		if (find) {
			const other = await vendor.control.create({ request, marker: mint() }, op);
			const found = await drain((cursor) => find(marker, cursor, op));
			expect(found.map((row) => row.id)).toContain(created.id);
			expect(found.map((row) => row.id)).not.toContain(other.id);
			await vendor.control.remove(other.id, op);
		} else expect(module.traits.account ?? "shared").toBe("shared");
		if (vendor.control.settle) {
			expect(await vendor.control.settle("does-not-exist", op)).toBeNull();
			current = await vendor.control.settle(created.id, op);
		}
		for (let polls = 0; current?.phase === "pending" && polls < 20; polls++)
			current = await vendor.control.get(created.id, op);
		expect(current?.phase).toBe("ready");
		expect((await vendor.data.exec(native, "sh -c 'exit 7'")).exitCode).toBe(7);
		const files = vendor.data.files;
		if (files) {
			await files.write(native, "/tmp/vendor-contract", "round trip");
			expect(await files.read(native, "/tmp/vendor-contract")).toBe("round trip");
			if (files.exists) expect(await files.exists(native, "/tmp/vendor-contract")).toBe(true);
		}
		let outcome = await vendor.control.remove(created.id, op);
		for (let polls = 0; outcome !== "removed" && polls < 20; polls++) {
			const observed = await vendor.control.get(created.id, op);
			if (observed === null || observed.phase === "gone") outcome = "removed";
		}
		expect(outcome).toBe("removed");
		const after = await vendor.control.get(created.id, op);
		expect(after === null || after.phase === "gone").toBe(true);
		expect(await vendor.control.remove(created.id, op)).toBe("removed");
	});
}

export type {
	RestRequest,
	RestRoute,
	RestStubOptions,
	SdkAccount,
	SdkStubOptions,
} from "./lib/vendor-transport.fixture.ts";
export { restStub, sdkStub } from "./lib/vendor-transport.fixture.ts";
