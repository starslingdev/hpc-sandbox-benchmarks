// Preserve OpenClaw's type-aware lint selection while bounding each compiler invocation.
// The pinned Oxlint itself resolves nested configs, generated inputs and ignore patterns;
// sorting its --debug=files output changes only execution grouping, never the file union.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const MAX_FILES_PER_BATCH = 1000;

export function batchesForFiles(output, limit = MAX_FILES_PER_BATCH) {
	const files = output.trim().split("\n").filter(Boolean).sort();
	if (files.length === 0) throw new Error("Oxlint selected no files; refusing an empty workload");
	if (new Set(files).size !== files.length) throw new Error("Oxlint selected duplicate files");
	if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("invalid lint batch size");
	return Array.from({ length: Math.ceil(files.length / limit) }, (_, i) =>
		files.slice(i * limit, (i + 1) * limit),
	);
}

function checked(command, args, options = {}) {
	const result = spawnSync(command, args, {
		stdio: "inherit",
		env: process.env,
		...options,
	});
	if (result.error) throw result.error;
	if (result.status !== 0) throw new Error(`${command} exited ${result.status ?? result.signal}`);
	return result;
}

export async function main(scope) {
	if (scope !== "all" && scope !== "extensions") throw new Error("expected all or extensions");
	// Upstream's local mode runs declaration preparation serially and applies its Go memory
	// policy. Keep those artifacts, rules and type-aware configs; only lint file grouping changes.
	process.env.OPENCLAW_LOCAL_CHECK = "1";
	const { createOxlintShards } = await import(
		pathToFileURL(`${process.cwd()}/scripts/run-oxlint-shards.mjs`).href
	);
	const { applyLocalOxlintPolicy } = await import(
		pathToFileURL(`${process.cwd()}/scripts/lib/local-heavy-check-runtime.mjs`).href
	);
	const shards = createOxlintShards({ platform: "linux" }).filter(
		(shard) => scope === "all" || shard.name === "extensions",
	);
	if (shards.length === 0) throw new Error(`no upstream lint shards for ${scope}`);
	checked(process.execPath, ["scripts/prepare-extension-package-boundary-artifacts.mjs"]);
	for (const shard of shards) {
		const [configFlag, config, ...roots] = shard.args;
		// At this upstream pin each shard contains exactly one --tsconfig pair and input
		// roots. Reject a changed argument contract instead of silently dropping future flags.
		if (
			configFlag !== "--tsconfig" ||
			!config ||
			roots.length === 0 ||
			roots.some((root) => root.startsWith("-"))
		) {
			throw new Error(`unsupported upstream lint arguments for ${shard.name}`);
		}
		const { args, env } = applyLocalOxlintPolicy([...shard.args, "--threads=4"], process.env);
		// These are the pinned upstream shard's explicit tsconfig and input roots. Keep the
		// config flags for each batch, replacing only the roots with Oxlint's selected files.
		const selected = checked(
			process.execPath,
			["node_modules/oxlint/bin/oxlint", ...args, "--debug=files"],
			{
				env,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "inherit"],
				maxBuffer: 16 * 1024 * 1024,
			},
		);
		const batches = batchesForFiles(selected.stdout);
		console.log(
			`openclaw-lint: ${shard.name}: ${batches.flat().length} files in ${batches.length} batches`,
		);
		for (const [index, files] of batches.entries()) {
			console.log(
				`openclaw-lint: ${shard.name} batch ${index + 1}/${batches.length}: ${files.length} files`,
			);
			const batch = applyLocalOxlintPolicy(
				["--tsconfig", config, "--threads=4", ...files],
				process.env,
			);
			checked(process.execPath, ["node_modules/oxlint/bin/oxlint", ...batch.args], {
				env: batch.env,
			});
		}
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main(process.argv[2]);
}
