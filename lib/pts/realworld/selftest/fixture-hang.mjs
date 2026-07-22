// Hang fixture (Task: Hang) — proves a wedged task is time-BOUNDED and fails alone. Appends one
// line to /tmp/counts/hang (the payload asserts exactly one execution: the warm-up; set -e aborts
// the runner before the measured pass), spawns a DETACHED grandchild that escapes timeout's
// process-group kill — mirroring openclaw's run-oxlint-shards detached:true shards — then blocks
// forever itself. The grandchild's argv deliberately contains NO workspace path: it inherits the
// workspace cwd and the bench cgroup without ever naming either, so the runner's argv-matching
// pkill alone cannot reap it — only the cgroup-membership / cwd sweep layers can, and the
// payload's leak assertion proves one of them did. selftest-payload.sh copies this into the
// fixture repo as scripts/hang.mjs before the fixture commit.
import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";

appendFileSync("/tmp/counts/hang", "x\n");
spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
	detached: true,
	stdio: "ignore",
}).unref();
setInterval(() => {}, 1000);
