import { describe, expect, it } from "bun:test";
import { CANDIDATE_SUFFIX } from "@sandbox-benchmarks/provider-core";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import {
	daytonaAdapter,
	daytonaConfig,
	daytonaSnapshotCandidate,
	daytonaSnapshotDefault,
} from "./index.ts";

describe("@sandbox-benchmarks/provider-daytona", () => {
	it("version-scopes the canonical snapshot name from the shared toolchain identity", () => {
		expect(daytonaSnapshotDefault).toBe(`${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`);
	});

	it("derives the candidate name from the canonical one via the shared candidate convention", () => {
		expect(daytonaSnapshotCandidate).toBe(`${daytonaSnapshotDefault}${CANDIDATE_SUFFIX}`);
	});

	it("boots the DAYTONA_SNAPSHOT override when set, else the canonical snapshot", () => {
		expect(daytonaConfig.snapshot).toBe(process.env.DAYTONA_SNAPSHOT ?? daytonaSnapshotDefault);
	});

	it("pins the snapshot as the adapter's create-time policy, with the target riding along iff set", () => {
		expect(typeof daytonaAdapter.createCompute).toBe("function");
		expect(daytonaAdapter.createOptions).toEqual({
			snapshotId: daytonaConfig.snapshot,
			...(daytonaConfig.target ? { target: daytonaConfig.target } : {}),
		});
	});
});
