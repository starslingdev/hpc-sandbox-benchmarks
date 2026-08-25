import { appendFileSync } from "node:fs";
import { createOwnedSandbox, exitAfterSandboxCleanup } from "./sandbox-owner.ts";

const logFile = process.argv[2];
if (!logFile) throw new Error("missing signal fixture log path");
const mode = process.argv[3] ?? "signal";
let destroyAttempts = 0;

if (mode === "pending") {
	const pidFile = process.argv[4];
	const aliveMarker = process.argv[5];
	if (!pidFile || !aliveMarker) throw new Error("pending mode requires pid and marker paths");
	const creation = createOwnedSandbox(
		(signal) =>
			new Promise<never>((_resolve, reject) => {
				const child = Bun.spawn(
					[
						"/bin/sh",
						"-c",
						`echo $$ > ${JSON.stringify(pidFile)}; sleep 10; touch ${JSON.stringify(aliveMarker)}`,
					],
					{ stdout: "ignore", stderr: "ignore", detached: process.platform !== "win32" },
				);
				appendFileSync(logFile, "ready\n");
				signal.addEventListener(
					"abort",
					() => {
						void (async () => {
							if (process.platform === "win32") {
								child.kill("SIGKILL");
							} else {
								try {
									process.kill(-child.pid, "SIGKILL");
								} catch {
									child.kill("SIGKILL");
								}
							}
							await child.exited;
							appendFileSync(logFile, "abort\n");
							reject(
								Object.assign(new Error("create aborted"), {
									async [Symbol.asyncDispose]() {
										appendFileSync(logFile, "cleanup\n");
									},
								}),
							);
						})();
					},
					{ once: true },
				);
			}),
	);
	await creation.catch(() => {});
	setInterval(() => {}, 60_000);
	await new Promise<never>(() => {});
}

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
