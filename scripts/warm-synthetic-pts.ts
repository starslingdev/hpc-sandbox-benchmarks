#!/usr/bin/env bun
/**
 * Backward-compatible entrypoint: warm the synthetic suite preset.
 * Prefer `bun scripts/warm-pts.ts --suite synthetic` (or `bun run warm:pts -- --suite synthetic`).
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const warmPts = fileURLToPath(new URL("./warm-pts.ts", import.meta.url));
const child = spawn(process.execPath, [warmPts, "--suite", "synthetic", ...process.argv.slice(2)], {
	stdio: "inherit",
	env: process.env,
});
child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 1);
});
