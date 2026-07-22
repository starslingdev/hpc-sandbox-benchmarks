// Composite assertions for the realworld selftest (invoked by selftest-payload.sh with the
// composite.xml path). Fails loudly with a FAIL: line and exit 1 on any contract violation.
import { readFileSync } from "node:fs";

const xml = readFileSync(process.argv[2], "utf8");
// Scope to <Result> blocks: the composite header carries its own <Description> which must not
// shift the pairing. Values stay RAW STRINGS here — a failed task's block IS PRESENT with an
// EMPTY <Value> (production-verified shape, blaxel openclaw composite run 29799034615), and
// Number("") === 0 would let an empty value slip through a numeric check.
const results = [...xml.matchAll(/<Result>[\s\S]*?<\/Result>/g)].map(([block]) => {
	const desc = block.match(/<Description>([^<]*)<\/Description>/)?.[1];
	const raw = block.match(/<Value>([^<]*)<\/Value>/)?.[1] ?? "";
	return [desc, raw];
});
const byDesc = Object.fromEntries(results);
const fail = (msg) => {
	console.error("FAIL:", msg);
	process.exit(1);
};

// Full Task-menu order, including the two deliberately-failing containment fixtures.
const menu = [
	"Task: Git Clone",
	"Task: Cold Install",
	"Task: Build",
	"Task: Hang",
	"Task: Plain",
	"Task: OOM Probe",
	"Task: Prepped",
];
const passing = menu.filter((d) => d !== "Task: Hang" && d !== "Task: OOM Probe");
const num = (d) => Number(byDesc[d]);
for (const d of passing) {
	if (!(d in byDesc)) fail(`missing result for "${d}"`);
	if (byDesc[d] === "" || !Number.isFinite(num(d)) || num(d) <= 0)
		fail(`non-numeric value for "${d}": ${JSON.stringify(byDesc[d])}`);
}
// Containment contract: Hang (per-command timeout + pkill sweep) and OOM Probe (cgroup memory
// cap) must fail ALONE — Result block present with an empty <Value> — while every passing task,
// including the two ordered after them, still carries its numeric sample (the batch survived).
for (const d of ["Task: Hang", "Task: OOM Probe"]) {
	if (!(d in byDesc)) fail(`missing result block for failed task "${d}"`);
	if (byDesc[d] !== "") fail(`failed task "${d}" produced a value: ${JSON.stringify(byDesc[d])}`);
}
// Execution order == menu order (TEST_EXECUTION_SORT=none). The composite preserves run order;
// the failed fixtures keep their mid-menu slots, proving the batch continued past them.
const order = results.map(([d]) => d).filter((d) => menu.includes(d));
if (JSON.stringify(order) !== JSON.stringify(menu)) fail(`execution order ${order} != menu order`);
// Timing windows. build sleeps 2s, lint 0.5s, test 1s. Lower bounds are hard (a too-fast sample
// means the command didn't really run); upper bounds are loose for loaded hosts — EXCEPT Prepped's,
// which must stay below the 3.0s leak floor (2s prep + 1s test) to keep the core assertion sound.
const inWindow = (d, lo, hi) => num(d) >= lo && num(d) <= hi;
if (!inWindow("Task: Build", 1.9, 6.0)) fail(`Build ${byDesc["Task: Build"]}s outside [1.9, 6.0]`);
if (!inWindow("Task: Plain", 0.4, 2.5)) fail(`Plain ${byDesc["Task: Plain"]}s outside [0.4, 2.5]`);
// THE core assertion: Prepped measures only its 1s test — the 2s prep must be excluded. A leak
// lands at >= 3.0s, so the ceiling stays strictly below that. Holding this window AFTER the two
// failed fixtures upstream is also the no-semantics-drift proof for run_task/run_bounded.
if (!inWindow("Task: Prepped", 0.9, 2.7))
	fail(
		`Prepped ${byDesc["Task: Prepped"]}s outside [0.9, 2.7] — prep time leaked into the measured window?`,
	);
console.log("composite assertions OK:", JSON.stringify(byDesc));
