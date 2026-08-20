import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("microsandbox-local", {
	displayName: "Microsandbox (local)",
	vendor: "Microsandbox",
	website: "https://microsandbox.dev",
	sdkPackage: "microsandbox",
	artifact: { kind: "image" },
	// This is an explicit capability opt-in rather than a credential. Local runs require a host
	// with KVM on Linux or Hypervisor.framework on macOS and should skip everywhere else.
	inputs: [
		{
			name: "MICROSANDBOX_LOCAL_BENCH",
			source: { kind: "variable" },
			ciValue: "1",
		},
	],
	isolation: {
		class: "microVM",
		technology: "libkrun microVM (local)",
		notes:
			"Runs on the benchmark harness machine itself with no control-plane or network hop. Results measure that host's hardware and are identified separately from Microsandbox Cloud.",
	},
	pricing: {
		model: "unavailable",
		reason: "self_hosted",
		notes:
			"Self-hosted execution has no vendor compute rate; infrastructure cost depends on the machine running the harness.",
		sources: [
			{ label: "Microsandbox project", url: "https://microsandbox.dev", checkedAt: "2026-08-08" },
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Direct SDK adapter with exec, filesystem, lifecycle, list, and local snapshots. Opt-in until a comparable committed run exists.",
	},
	specPinning: "settable",
	transport: {
		// Streaming callbacks are not adapted, but background exec plus the agent filesystem provides
		// the durable detached+poll path. `syncCapMs` is a real number, not null, precisely so that
		// path is reachable: `selectTransport` short-circuits a null cap to "sync" REGARDLESS of
		// `detachedPoll`, which would leave every benchmark-length step as one synchronous exec whose
		// output exists only in the agent response — nothing to read back if that exec drops. Native
		// in-process control has no gateway timeout, so this cap is a durability policy rather than a
		// vendor limit; it matches the cloud variant so both backends detach at the same boundary.
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
	runner: {
		label: "starsling-ubuntu-24.04-2",
		noCache: true,
		lifetimeMinutes: 70,
	},
});
