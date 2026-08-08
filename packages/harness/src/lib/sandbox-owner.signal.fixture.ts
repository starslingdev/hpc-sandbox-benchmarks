import { appendFileSync } from "node:fs";
import { createOwnedSandbox, exitAfterSandboxCleanup } from "./sandbox-owner.ts";

const logFile = process.argv[2];
if (!logFile) throw new Error("missing signal fixture log path");
const mode = process.argv[3] ?? "signal";
let destroyAttempts = 0;

const sandbox = await createOwnedSandbox(async () => ({
	sandboxId: "sb-signal",
	async destroy() {
		appendFileSync(logFile, "destroy\n");
		destroyAttempts++;
		if (destroyAttempts === 1 && mode !== "exit") throw new Error("transient destroy failure");
	},
}));
appendFileSync(logFile, "ready\n");

if (mode === "exit") await exitAfterSandboxCleanup(7);
if (mode === "natural") {
	await sandbox.destroy().catch(() => {});
	appendFileSync(logFile, "end\n");
} else {
	// Keep the fixture alive until the test sends SIGTERM. The ownership handler performs teardown and
	// exits; this timer must never get a chance to decide the fixture's lifetime itself.
	setInterval(() => {}, 60_000);
}
