/**
 * Preserve rich host metadata emitted by the producer without baking either source's evolving key
 * vocabulary into the Run schema. Values are flattened to stable path/string pairs: this keeps the
 * output queryable and byte-stable while retaining every scalar from the original structured JSON.
 */
import type { Dirent } from "node:fs";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HostMetadataField, HostMetadataRecord } from "@sandbox-benchmarks/schema";

const PTS_METADATA_FILE = /^pts_.+--metadata\.json$/;

function parseJson(path: string): unknown {
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined;
	}
}

/** Flatten every JSON scalar, including null and array positions, in lexical object-key order. */
export function flattenHostMetadata(value: unknown, prefix = ""): HostMetadataField[] {
	if (Array.isArray(value)) {
		return value.flatMap((item, index) =>
			flattenHostMetadata(item, prefix ? `${prefix}.${index}` : String(index)),
		);
	}
	if (value !== null && typeof value === "object") {
		return Object.entries(value as Record<string, unknown>)
			.sort(([a], [b]) => a.localeCompare(b, "en"))
			.flatMap(([key, child]) => flattenHostMetadata(child, prefix ? `${prefix}.${key}` : key));
	}
	if (!prefix) return [];
	return [{ path: prefix, value: value === null ? "null" : String(value) }];
}

/** Read the repo's provider probe and PTS native System JSON siblings from one result directory. */
export function readHostMetadata(dir: string): HostMetadataRecord[] {
	let entries: Dirent[];
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return [];
	}

	const records: HostMetadataRecord[] = [];
	for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
		if (!entry.isFile()) continue;
		let source: HostMetadataRecord["source"] | undefined;
		if (entry.name === "system-provider.json") source = "mise/system-provider";
		else if (PTS_METADATA_FILE.test(entry.name)) source = "phoronix/result-file-to-json";
		if (!source) continue;

		const parsed = parseJson(join(dir, entry.name));
		if (parsed === undefined) continue;
		// PTS's export also contains every benchmark result. Retain only its native `systems` block:
		// metrics already have a typed owner, while systems is the rich host provenance this path owns.
		const metadata =
			source === "phoronix/result-file-to-json" &&
			parsed !== null &&
			typeof parsed === "object" &&
			!Array.isArray(parsed)
				? (parsed as Record<string, unknown>).systems
				: parsed;
		const fields = flattenHostMetadata(metadata);
		if (fields.length > 0) records.push({ source, sourceFile: entry.name, fields });
	}
	return records;
}
