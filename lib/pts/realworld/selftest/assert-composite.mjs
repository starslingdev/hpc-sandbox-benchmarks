// Composite assertions for the realworld selftest (invoked by selftest-payload.sh with the
// composite.xml path). Fails loudly with a FAIL: line and exit 1 on any contract violation.
import { readFileSync } from "node:fs";

const xml = readFileSync(process.argv[2], "utf8");
// Scope to <Result> blocks: the composite header carries its own <Description> which must not
// shift the pairing, and a failed task's <Value> is empty.
const results = [...xml.matchAll(/<Result>[\s\S]*?<\/Result>/g)].map(([block]) => {
	const desc = block.match(/<Description>([^<]*)<\/Description>/)?.[1];
	const value = block.match(/<Value>([^<]*)<\/Value>/)?.[1] ?? "";
	return [desc, Number(value)];
});
const byDesc = Object.fromEntries(results);
const fail = (msg) => {
	console.error("FAIL:", msg);
	process.exit(1);
};

const expected = [
	"Task: Git Clone",
	"Task: Cold Install",
	"Task: Build",
	"Task: Plain",
	"Task: Prepped",
];
for (const d of expected) {
	if (!(d in byDesc)) fail(`missing result for "${d}"`);
	if (!Number.isFinite(byDesc[d]) || byDesc[d] <= 0)
		fail(`non-numeric value for "${d}": ${byDesc[d]}`);
}
// Execution order == menu order (TEST_EXECUTION_SORT=none). The composite preserves run order.
const order = results.map(([d]) => d).filter((d) => expected.includes(d));
if (JSON.stringify(order) !== JSON.stringify(expected))
	fail(`execution order ${order} != menu order`);
// Timing windows. build sleeps 2s, lint 0.5s, test 1s. Lower bounds are hard (a too-fast sample
// means the command didn't really run); upper bounds are loose for loaded hosts — EXCEPT Prepped's,
// which must stay below the 3.0s leak floor (2s prep + 1s test) to keep the core assertion sound.
const inWindow = (d, lo, hi) => byDesc[d] >= lo && byDesc[d] <= hi;
if (!inWindow("Task: Build", 1.9, 6.0)) fail(`Build ${byDesc["Task: Build"]}s outside [1.9, 6.0]`);
if (!inWindow("Task: Plain", 0.4, 2.5)) fail(`Plain ${byDesc["Task: Plain"]}s outside [0.4, 2.5]`);
// THE core assertion: Prepped measures only its 1s test — the 2s prep must be excluded. A leak
// lands at >= 3.0s, so the ceiling stays strictly below that.
if (!inWindow("Task: Prepped", 0.9, 2.7))
	fail(
		`Prepped ${byDesc["Task: Prepped"]}s outside [0.9, 2.7] — prep time leaked into the measured window?`,
	);
console.log("composite assertions OK:", JSON.stringify(byDesc));
