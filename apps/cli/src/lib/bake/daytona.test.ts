import { describe, expect, it } from "bun:test";
import {
	daytonaTransientPushCommands,
	daytonaTransientRef,
	describeDaytonaError,
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

describe("describeDaytonaError", () => {
	it("surfaces status code, error code, and response body from the opaque SDK error", () => {
		const out = describeDaytonaError({
			name: "DaytonaError",
			statusCode: 500,
			code: "INTERNAL",
			response: { data: { message: "failed to inspect in registry" } },
		});
		expect(out).toContain("name=DaytonaError");
		expect(out).toContain("status=500");
		expect(out).toContain("code=INTERNAL");
		expect(out).toContain("failed to inspect in registry");
	});

	// `JSON.stringify` returns undefined (not a string) for a function/symbol response body, so the
	// formatter must fall back to String() rather than call `.slice` on undefined — it runs on the
	// error path and must never throw over a non-serializable SDK payload.
	it("does not throw when the response body is a non-serializable value", () => {
		const out = describeDaytonaError({ statusCode: 500, response: { data: () => "boom" } });
		expect(out).toContain("status=500");
		expect(out).toContain("response=");
	});

	it("includes the cause chain when present", () => {
		expect(
			describeDaytonaError({ message: "boom", cause: new Error("registry unreachable") }),
		).toContain("cause=registry unreachable");
	});

	it("never throws on a non-object error, and says so", () => {
		expect(describeDaytonaError("plain string")).toContain("plain string");
		expect(describeDaytonaError(undefined)).toContain("non-object");
	});

	// The function is exported, so it has to be useful on its own — a caller that doesn't separately log
	// `.message` must not be left with just `name=Error` and no diagnostic.
	it("keeps the error's own message for a plain Error (no SDK shape to mine)", () => {
		const out = describeDaytonaError(new Error("failed to inspect registry for image"));
		expect(out).toContain("name=Error");
		expect(out).toContain("message=failed to inspect registry for image");
	});
});
