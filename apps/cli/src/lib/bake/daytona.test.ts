import { describe, expect, it } from "bun:test";
import {
	daytonaTransientPushCommands,
	daytonaTransientRef,
	snapshotDestroyedMessage,
	withCleanupPreservingPrimaryError,
} from "./daytona.ts";

// The published snapshot name a `promote --force` regenerates in place — the case where a create that
// fails after the delete leaves a *public* artifact absent rather than stale.
const PUBLISHED = "sandbox-benchmarks-toolchain-v1";

describe("snapshotDestroyedMessage", () => {
	it("names the snapshot that no longer exists, so a report reader can't mistake it for untouched", () => {
		const message = snapshotDestroyedMessage(PUBLISHED, 1, "runner out of capacity");

		// The whole point of the annotation: the name is gone, not merely un-updated. A reader of the
		// promote report sees the destroyed artifact without knowing daytona deletes before it creates.
		expect(message).toContain(`no snapshot named ${PUBLISHED} now exists`);
		expect(message).toContain("rerun the bake to recreate it");
	});

	it("preserves the underlying create failure, so the root cause survives the annotation", () => {
		const message = snapshotDestroyedMessage(PUBLISHED, 1, "runner out of capacity");

		expect(message).toContain("runner out of capacity");
	});

	it("reports how many snapshots the delete swept, since a stuck bake can leave several of one name", () => {
		// listSnapshotsByName sweeps every snapshot of the name in any state (a failed mid-create leaves
		// one `get` won't return), so the count is genuinely unbounded above 1 — don't hardcode "1".
		expect(snapshotDestroyedMessage(PUBLISHED, 3, "boom")).toContain("deleting 3 pre-existing");
	});
});

describe("daytonaTransientRef", () => {
	it("preserves the source repository and replaces its tag under Daytona's transient project", () => {
		expect(
			daytonaTransientRef(
				{ registryUrl: "https://cr.app.daytona.io/", project: "/sbox-transient/" },
				"ghcr.io/starslingdev/toolchain:v1-candidate",
				"20260714041422",
			),
		).toBe("cr.app.daytona.io/sbox-transient/ghcr.io/starslingdev/toolchain:20260714041422");
	});

	it("does not mistake a registry port for an image tag", () => {
		expect(
			daytonaTransientRef(
				{ registryUrl: "registry.example:5000", project: "transient" },
				"registry.example:5000/org/image",
				"upload",
			),
		).toBe("registry.example:5000/transient/registry.example:5000/org/image:upload");
	});

	it("replaces an immutable source digest with the transient upload tag", () => {
		expect(
			daytonaTransientRef(
				{ registryUrl: "https://cr.app.daytona.io", project: "sbox-transient" },
				"ghcr.io/starslingdev/toolchain@sha256:c70601f8c3c93bf6",
				"20260714060245",
			),
		).toBe("cr.app.daytona.io/sbox-transient/ghcr.io/starslingdev/toolchain:20260714060245");
	});

	it("rejects incomplete registry credentials before invoking Docker", () => {
		expect(() =>
			daytonaTransientRef(
				{ registryUrl: "cr.app.daytona.io", project: "" },
				"ghcr.io/o/image:v1",
				"upload",
			),
		).toThrow("incomplete upload destination");
	});
});

describe("daytonaTransientPushCommands", () => {
	it("pulls a buildx-pushed digest before tagging and pushing it", () => {
		const source = "ghcr.io/starslingdev/toolchain@sha256:c70601f8c3c93bf6";
		const destination = "cr.app.daytona.io/sbox-transient/ghcr.io/starslingdev/toolchain:upload";

		expect(daytonaTransientPushCommands(source, destination)).toEqual([
			["docker", "pull", source],
			["docker", "tag", source, destination],
			["docker", "push", destination],
		]);
	});
});

describe("withCleanupPreservingPrimaryError", () => {
	it("runs cleanup and preserves the operation error when both fail", async () => {
		const primary = new Error("push failed");
		const cleanup = new Error("logout failed");
		const suppressed: unknown[] = [];

		await expect(
			withCleanupPreservingPrimaryError(
				async () => {
					throw primary;
				},
				async () => {
					throw cleanup;
				},
				(error) => suppressed.push(error),
			),
		).rejects.toBe(primary);
		expect(suppressed).toEqual([cleanup]);
	});

	it("surfaces a cleanup error when the operation succeeded", async () => {
		const cleanup = new Error("logout failed");

		await expect(
			withCleanupPreservingPrimaryError(
				async () => "uploaded",
				async () => {
					throw cleanup;
				},
				() => {
					throw new Error("cleanup error must not be suppressed after success");
				},
			),
		).rejects.toBe(cleanup);
	});
});
