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

/**
 * Field-path suffixes whose value changes on every sandbox even when nothing about the host does — a
 * wall-clock stamp of when that particular run happened.
 *
 * They are excluded from a host record's IDENTITY when the aggregate folds duplicates, because
 * including them defeated deduplication entirely: records were folded only when byte-identical, and the
 * timestamp never repeats, so one provider's 21 distinct source files landed as 82 near-identical
 * records. Host metadata was 54% of the committed dataset while describing a handful of machines.
 *
 * This lives beside the flattening that PRODUCES these paths, not in the Run schema. The schema
 * deliberately does not know either source's evolving key vocabulary (see the module note above), and a
 * `.timestamp` suffix heuristic is exactly that kind of source-specific knowledge — in the contract it
 * would also make any upstream field whose flattened path happens to end in `.timestamp` unpublishable
 * on a folded record.
 *
 * Matched by suffix rather than exact path because the path is prefixed by the PTS result identifier
 * (`ci.timestamp`), which is not fixed.
 */
export const VOLATILE_HOST_METADATA_PATH_SUFFIXES = [".timestamp"] as const;

/** Whether a host-metadata field path is a per-run stamp rather than a property of the host. */
export function isVolatileHostMetadataPath(path: string): boolean {
	return VOLATILE_HOST_METADATA_PATH_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

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
