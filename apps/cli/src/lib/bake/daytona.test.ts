import { describe, expect, it } from "bun:test";
import { snapshotDestroyedMessage } from "./daytona.ts";

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
