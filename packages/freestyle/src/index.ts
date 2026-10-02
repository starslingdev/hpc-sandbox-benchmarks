// The Freestyle DriverModule: the kit's driver over Freestyle's adapter, bound to the real SDK
// here and nowhere else, plus the options its native-snapshot artifact builder is derived with.
// Tests lower the same module over a fake transport through `vendorDriver`.

import type { SandboxSession } from "@sandbox-benchmarks/driver";
import type { SnapshotBuildOptions } from "@sandbox-benchmarks/driver/artifact";
import type { VendorHandle } from "@sandbox-benchmarks/driver/vendor";
import { coverage, defineVendorDriver } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";
import type { Vm } from "freestyle";
import { FREESTYLE_PROVENANCE } from "./provenance.ts";
import {
	FREESTYLE_BASE_SNAPSHOT,
	FREESTYLE_OWNER_KEY,
	FREESTYLE_SANDBOX_ID,
	FREESTYLE_SLUG,
	freestyleVendor,
	IMMUTABLE_SNAPSHOT_ID,
} from "./vendor.ts";

export { FREESTYLE_PROVENANCE };

/** The session handle a Freestyle driver exposes as `SandboxSession.native`. */
type FreestyleHandle = VendorHandle<{ readonly id: string }, Vm>;

const freestyle = defineVendorDriver("freestyle", {
	provenance: FREESTYLE_PROVENANCE,
	sandboxId: FREESTYLE_SANDBOX_ID,
	// The create grows the snapshot's VM to the requested shape; its record reports every axis.
	coverage: coverage({
		vcpus: "runtime-verified",
		memoryGb: "runtime-verified",
		diskGb: "runtime-verified",
	}),
	diskProof: "reported",
	unsupported: ({ artifact, spec }) => {
		if (artifact.kind !== "baked") return "Freestyle requires a native baked snapshot";
		if (!IMMUTABLE_SNAPSHOT_ID.test(artifact.ref) && artifact.ref !== FREESTYLE_BASE_SNAPSHOT)
			return "Freestyle requires an immutable snapshot ID rather than a mutable slug";
		if (spec.vcpus < 4 || spec.memoryGb < 8 || (spec.diskGb !== undefined && spec.diskGb < 32))
			return "freestyle/ubuntu starts at 4 vCPU / 8 GiB / 32 GiB; resizing is grow-only";
		return undefined;
	},
	markerKey: FREESTYLE_OWNER_KEY,
	// A lost create response stays uncertain: repeated 404s alone do not prove allocation failed.
	// It is looked up by its slug; the kit refuses a VM whose metadata names another attempt.
	recovery: { provesAbsence: false, lookup: FREESTYLE_SLUG },
	timing: { deletePollMs: 500 },
	// 100-VM pages; the account cap is the earlier 100,000-VM scan.
	pageCap: 1_000,
	vendor: (context) => freestyleVendor(context),
});

export default freestyle;

const bootedSnapshot = type({ "snapshotId?": "string | null" });

/**
 * What the native-snapshot builder derived from this driver needs to know about Freestyle: a
 * candidate boots `FREESTYLE_BASE_SNAPSHOT_ID` when an operator pinned one, else the stock alias,
 * and the immutable ID a build booted is the VM record's own `snapshotId`.
 */
export const snapshotBuild: SnapshotBuildOptions<"freestyle", FreestyleHandle> = {
	stockBase: (env) => env.FREESTYLE_BASE_SNAPSHOT_ID ?? FREESTYLE_BASE_SNAPSHOT,
	bootedBase: async (session: SandboxSession<FreestyleHandle>) => {
		const { snapshotId } = bootedSnapshot.assert(await session.native.native.data());
		if (!snapshotId || !IMMUTABLE_SNAPSHOT_ID.test(snapshotId))
			throw new Error("Freestyle did not report the immutable base snapshot ID");
		return snapshotId;
	},
};
