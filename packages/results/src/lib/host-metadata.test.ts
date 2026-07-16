import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { flattenHostMetadata, readHostMetadata } from "./host-metadata.ts";

let dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
	dirs = [];
});

describe("host metadata", () => {
	it("flattens nested objects and arrays deterministically without dropping null/false/zero", () => {
		expect(flattenHostMetadata({ z: null, a: { list: [0, false, "x"] } })).toEqual([
			{ path: "a.list.0", value: "0" },
			{ path: "a.list.1", value: "false" },
			{ path: "a.list.2", value: "x" },
			{ path: "z", value: "null" },
		]);
	});

	it("retains the full mise provider record and only PTS's structured systems block", () => {
		const dir = mkdtempSync(join(tmpdir(), "host-metadata-"));
		dirs.push(dir);
		writeFileSync(
			join(dir, "system-provider.json"),
			JSON.stringify({ asn: "AS64500", manufacturer: "Amazon EC2" }),
		);
		writeFileSync(
			join(dir, "pts_git--metadata.json"),
			JSON.stringify({
				systems: {
					sandbox: {
						hardware: { Processor: "AMD EPYC", Motherboard: "Amazon EC2" },
						data: { "cpu-smt": "2" },
					},
				},
				results: { huge: "metric payload is owned elsewhere" },
			}),
		);

		const records = readHostMetadata(dir);
		expect(records).toHaveLength(2);
		expect(records[0]).toEqual({
			source: "phoronix/result-file-to-json",
			sourceFile: "pts_git--metadata.json",
			fields: [
				{ path: "sandbox.data.cpu-smt", value: "2" },
				{ path: "sandbox.hardware.Motherboard", value: "Amazon EC2" },
				{ path: "sandbox.hardware.Processor", value: "AMD EPYC" },
			],
		});
		expect(records[1]).toEqual({
			source: "mise/system-provider",
			sourceFile: "system-provider.json",
			fields: [
				{ path: "asn", value: "AS64500" },
				{ path: "manufacturer", value: "Amazon EC2" },
			],
		});
		expect(records.flatMap((r) => r.fields).some((f) => f.path.startsWith("results"))).toBe(false);
	});
});
