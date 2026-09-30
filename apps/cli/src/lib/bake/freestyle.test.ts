import { describe, expect, test } from "bun:test";
import { Freestyle } from "freestyle";
import type { FreestyleBakeOptions } from "./freestyle.ts";
import { bakeFreestyleSnapshot } from "./freestyle.ts";

function fixture(existing?: string, failPublish = false) {
	const events: string[] = [];
	const fetchImpl = Object.assign(
		async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
			const path = new URL(String(input)).pathname;
			const method = init?.method ?? "GET";
			events.push(`${method} ${path}${init?.body ? ` ${init.body}` : ""}`);
			if (method === "GET") {
				if (path.endsWith("/sh-verified")) return Response.json({ id: "sh-verified" });
				return existing
					? Response.json({ id: existing })
					: Response.json({ code: "NOT_FOUND", message: "missing" }, { status: 404 });
			}
			if (failPublish && method === "PATCH" && path.endsWith("/sh-new"))
				return Response.json({ code: "CONFLICT", message: "conflict" }, { status: 409 });
			return Response.json({ id: path.split("/").at(-1) });
		},
		{ preconnect: fetch.preconnect },
	);
	const inputs: Parameters<NonNullable<FreestyleBakeOptions["build"]>>[0][] = [];
	const options: FreestyleBakeOptions = {
		api: new Freestyle({ apiKey: "test-sentinel", fetch: fetchImpl }),
		build: async (input) => {
			events.push("build-and-smoke");
			inputs.push(input);
			return "sh-new";
		},
	};
	return { options, events, inputs };
}

describe("Freestyle snapshot publication", () => {
	test("publishes only after native installation and smoke, and returns the immutable ID", async () => {
		const { options, events, inputs } = fixture();
		expect(
			await bakeFreestyleSnapshot("test-candidate", "unused-oci-image", () => {}, options),
		).toBe("sh-new");
		expect(inputs[0]?.baseSnapshotRef).toBe("freestyle/ubuntu");
		expect(events.slice(-2)).toEqual([
			"build-and-smoke",
			'PATCH /v5/snapshots/sh-new {"slug":"test-candidate"}',
		]);
	});

	test("a failed install or smoke leaves the existing candidate untouched", async () => {
		const { options, events } = fixture("sh-old");
		await expect(
			bakeFreestyleSnapshot("test-candidate", "unused", () => {}, {
				...options,
				build: async () => {
					throw new Error("smoke failed");
				},
			}),
		).rejects.toThrow("smoke failed");
		expect(events).toEqual(["GET /v5/snapshots/test-candidate"]);
	});

	test("advances an alias without deleting the previously pinned snapshot", async () => {
		const { options, events } = fixture("sh-old");
		await bakeFreestyleSnapshot("test-candidate", "unused", () => {}, options);
		expect(events.slice(-2)).toEqual([
			'PATCH /v5/snapshots/sh-old {"slug":""}',
			'PATCH /v5/snapshots/sh-new {"slug":"test-candidate"}',
		]);
		expect(events.some((event) => event.startsWith("DELETE"))).toBe(false);
	});

	test("restores the prior alias and deletes the new snapshot if publication fails", async () => {
		const { options, events } = fixture("sh-old", true);
		await expect(
			bakeFreestyleSnapshot("test-candidate", "unused", () => {}, options),
		).rejects.toThrow();
		expect(events.slice(-2)).toEqual([
			'PATCH /v5/snapshots/sh-old {"slug":"test-candidate"}',
			"DELETE /v5/snapshots/sh-new",
		]);
	});

	test("refuses to overwrite an immutable version before allocating", async () => {
		const { options, events } = fixture("sh-version");
		await expect(bakeFreestyleSnapshot("test-v8", "unused", () => {}, options)).rejects.toThrow(
			"already exists",
		);
		expect(events).toEqual(["GET /v5/snapshots/test-v8"]);
	});

	test("promotes the exact verified candidate ID without rebuilding the public base", async () => {
		const { options, inputs, events } = fixture();
		await bakeFreestyleSnapshot("test-v8", "sh-verified", () => {}, options);
		expect(inputs[0]).toMatchObject({ baseSnapshotRef: "sh-verified", candidate: false });
		expect(events).toContain("GET /v5/snapshots/sh-verified");
		expect(
			events.some((event) => event.includes("/sandbox-benchmarks-toolchain-v8-candidate")),
		).toBe(false);
	});
});
