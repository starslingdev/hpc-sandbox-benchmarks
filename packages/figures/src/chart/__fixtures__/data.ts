/**
 * A synthetic figure model for the chart tests.
 *
 * Deliberately NOT derived from the committed run: it carries, on purpose, an off-spec
 * provider (the slower bar gets the dagger), an environment disclosed as incomplete, a disk
 * requirement — shapes the live dataset may not contain, which is exactly why guards tested
 * only against the committed run would be worth nothing.
 *
 * `satisfies` rather than a cast: the compiler holds the fixture to the real model contract,
 * which is the shape check the deleted runtime parse used to do.
 */
import type { RealworldFigureModel } from "../../model.ts";

export const FIXTURE = {
	providers: [
		{ id: "alpha", name: "Alpha", specMatched: true },
		{ id: "beta", name: "Beta", specMatched: false },
		{ id: "gamma", name: "Gamma", specMatched: true },
	],
	suites: [
		{
			id: "realworld-demo",
			name: "Demo",
			minDiskGb: 30,
			tasks: [
				{ id: "realworld_demo_task_clone", phase: "clone" },
				{ id: "realworld_demo_task_install", phase: "build" },
			],
			droppedTasks: [],
			bars: [
				{
					provider: "beta",
					totalS: 400,
					segments: [
						{ id: "realworld_demo_task_clone", phase: "clone", p50: 160, n: 3 },
						{ id: "realworld_demo_task_install", phase: "build", p50: 240, n: 3 },
					],
				},
				{
					provider: "alpha",
					totalS: 100,
					segments: [
						{ id: "realworld_demo_task_clone", phase: "clone", p50: 40, n: 3 },
						{ id: "realworld_demo_task_install", phase: "build", p50: 60, n: 3 },
					],
				},
			],
			incomplete: [{ provider: "gamma", outcome: "failed", reason: "install exceeded stop" }],
		},
	],
} satisfies RealworldFigureModel;
