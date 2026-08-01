import { describe, expect, it } from "bun:test";
import { SUITES } from "@sandbox-benchmarks/schema";
import { PHASE_RAMP, PHASES, phaseOf, phaseOfTask } from "./phases.ts";

describe("PHASES", () => {
	it("gives every phase its own label, and the ramp a distinct shade per vocabulary slot", () => {
		// The ramp is indexed by a phase's position in the suite being drawn, so it must carry
		// at least one shade per vocabulary entry (the index can never run off the end) and no
		// two shades may collide (two phases sharing a colour would draw the legend's
		// "color order = execution order" claim false).
		expect(PHASE_RAMP.length).toBeGreaterThanOrEqual(PHASES.length);
		expect(new Set(PHASE_RAMP).size).toBe(PHASE_RAMP.length);
		expect(new Set(PHASES.map((p) => p.label)).size).toBe(PHASES.length);
	});

	it("throws on an id outside the vocabulary", () => {
		expect(() => phaseOf("warp" as never)).toThrow(/"warp"/);
	});
});

describe("phaseOfTask", () => {
	it("maps the known task-key conventions", () => {
		expect(phaseOfTask("realworld_demo_task_git_clone")).toBe("clone");
		expect(phaseOfTask("realworld_demo_task_cold_install")).toBe("install");
		expect(phaseOfTask("realworld_demo_task_lint_oxlint")).toBe("lint");
		expect(phaseOfTask("realworld_demo_task_typecheck")).toBe("typecheck");
		expect(phaseOfTask("realworld_demo_task_build_core")).toBe("build");
		expect(phaseOfTask("realworld_demo_task_test_unit_fast")).toBe("test");
		expect(phaseOfTask("realworld_demo_task_shrinkwrap_check")).toBe("check");
	});

	it("classifies every realworld task id the real suite registry declares", () => {
		// The classifier is pinned against the REAL ids: a new upstream task key either
		// classifies or throws — it can never silently publish a miscoloured segment.
		const realworldTasks = Object.entries(SUITES)
			.filter(([name]) => name.startsWith("realworld-"))
			.flatMap(([, suite]) => suite.metrics);
		expect(realworldTasks.length).toBeGreaterThan(0);
		for (const id of realworldTasks) {
			expect(() => phaseOfTask(id)).not.toThrow();
		}
	});

	it("throws on a task key outside the vocabulary, naming it", () => {
		// The silent `check` fallthrough this replaced turned every unknown key into a
		// published chart segment in the wrong colour. Unknown must mean loud.
		expect(() => phaseOfTask("realworld_demo_task_docs_publish")).toThrow(/docs_publish/);
	});
});
