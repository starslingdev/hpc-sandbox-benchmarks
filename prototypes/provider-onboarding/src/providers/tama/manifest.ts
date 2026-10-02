// Tama as inert data: the entire provider integration. Tier-1 safe (no imports, no functions).

import type { CliManifest } from "../../kit/cli.ts";

export const TAMA_MANIFEST = {
	kind: "cli",
	label: "Tama",
	binary: { default: "tama", envOverride: "TAMA_CLI" },
	secretFlags: ["--token"],
	row: {
		id: "string >= 1",
		name: "string >= 1",
		status: "string >= 1",
		"status_detail?": "string",
	},
	id: { field: "id", pattern: "^machine-[a-z0-9]{12}$" },
	nameField: "name",
	// `tama new` includes the cold image pull and owns failed-create reconciliation.
	timeouts: {
		commandMs: 60_000,
		createCommandMs: 20 * 60_000,
		createCeilingMs: 25 * 60_000,
		syncCapMs: 60_000,
	},
	spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: { capacityAtLeast: 40 } },
	prepare: {
		authenticateFirst: true,
		probe: ["list", "--all", "--json"],
		fallback: ["login", "--token", "{{env.TAMA_TOKEN}}"],
	},
	argv: {
		create: [
			"new",
			"{{name}}",
			"--ttl",
			"0",
			"--json",
			"--image",
			"{{artifact.ref}}",
			"--cpu",
			"{{spec.vcpus}}",
			"--memory",
			"{{spec.memoryMb}}",
		],
		list: ["list", "--all", "--json"],
		exec: ["exec", "{{id}}", "--", "bash", "-lc", "{{command}}"],
		remove: ["rm", "-y", "{{id}}"],
	},
	phases: {
		ignoreCase: true,
		rules: [
			{ phase: "ready", where: { status: ["ready"] } },
			{
				phase: "failed",
				where: { status: ["failed", "error", "stopped", "terminated", "deleted", "gone"] },
			},
		],
		otherwise: "pending",
	},
	terminalDetail: ["status={{status}}", " ({{status_detail}})"],
	notFound: {
		pattern:
			"^(?:error:\\s*)?(?:machine(?:\\s+machine-[a-z0-9]{12})?\\s+not found|no such machine|unknown machine)[.!]?\\s*$",
		flags: "i",
	},
	absenceConfirmationMs: 2_000,
} as const satisfies CliManifest;
