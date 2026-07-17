// Shared runner for the Bench matrix axis planners (`plan-providers` / `plan-suites`).
// Both bins share one control flow: discovery → select → emitStepOutputs / stdout → fail.
// Keeping that here means Actions logging and $GITHUB_OUTPUT contracts can't drift per axis.
import * as core from "@actions/core";
import { fail, inActions, logInfo, withGroup } from "./actions-log.ts";
import { handleDiscovery } from "./discovery.ts";
import { emitStepOutputs } from "./gha-output.ts";

export interface AxisPlanConfig {
	/** Bin name for error titles / HELP identity (e.g. `plan-providers`). */
	binName: string;
	/** Env var holding the comma-separated selection (e.g. `BENCH_PROVIDERS`). */
	envKey: string;
	/** `$GITHUB_OUTPUT` key written in Actions (e.g. `providers`). */
	outputKey: string;
	/** Foldable group title in Actions. */
	groupTitle: string;
	/** Notice annotation title on success. */
	noticeTitle: string;
	/** Singular noun for log lines (`provider` / `suite`). */
	itemLabel: string;
	/** HELP text the bin exposes via `--help`. */
	help: string;
	/** Pure selector for the axis (registry-backed). */
	select: (raw: string | undefined) => string[];
}

/** Compact single-line JSON for an axis selection — the local / `$GITHUB_OUTPUT` contract. */
export function planAxisJson(
	select: (raw: string | undefined) => string[],
	raw?: string,
): string {
	return JSON.stringify(select(raw));
}

/**
 * Run an axis planner bin: discovery flags first, then emit the selected ids. In Actions writes
 * `$GITHUB_OUTPUT`; locally prints one JSON line on stdout. Never returns on failure.
 */
export async function runAxisPlan(config: AxisPlanConfig, argv: string[]): Promise<void> {
	const discovery = handleDiscovery(argv, config.help);
	if (discovery !== null) {
		if (discovery.ok) {
			process.stdout.write(`${discovery.text}\n`);
			process.exit(0);
		}
		fail(discovery.text, {
			properties: { title: `${config.binName} discovery` },
			exitCode: 2,
		});
	}

	// A bad selection must fail the step, not print a diagnostic onto stdout: stdout here IS the
	// axis value local callers capture, so an error message there would be parsed as the axis.
	try {
		const json = planAxisJson(config.select, process.env[config.envKey]);
		const items = JSON.parse(json) as string[];

		if (process.env.GITHUB_OUTPUT) {
			await withGroup(config.groupTitle, async () => {
				logInfo(`${items.length} ${config.itemLabel}(s)`);
				if (inActions()) core.debug(`${config.outputKey}=${json}`);
				for (const id of items) logInfo(`${config.itemLabel}: ${id}`);
			});
			emitStepOutputs(`${config.outputKey}=${json}`);
			if (inActions()) {
				core.notice(`Planned ${items.length} ${config.itemLabel}(s)`, {
					title: config.noticeTitle,
				});
			}
		} else {
			// Local / test capture: keep the single-line axis stdout contract pristine.
			process.stdout.write(`${json}\n`);
		}
	} catch (err) {
		fail(`${config.binName}: ${err instanceof Error ? err.message : String(err)}`, {
			properties: { title: config.binName },
			exitCode: 2,
		});
	}
}
