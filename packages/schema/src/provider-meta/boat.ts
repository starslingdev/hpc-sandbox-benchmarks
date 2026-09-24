import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("boat", {
	displayName: "boat",
	vendor: "ASCII",
	website: "https://boat.dev",
	sdkPackage: "@boatdev/sdk",
	artifact: { kind: "none" },
	inputs: [
		"BOAT_API_KEY",
		{ name: "BOAT_BASE_URL", source: { kind: "variable" }, required: false },
	],
	isolation: {
		class: "vm",
		technology: "KVM virtual machine",
		notes:
			"Full Ubuntu VMs with SSH, Docker, and a dedicated public address. The default SKU is 4 vCPU / 8 GB / 50 GB user disk, which is the size this benchmark requests.",
	},
	pricing: {
		model: "published",
		components: [
			{
				id: "default-machine",
				resource: "cpu_memory",
				billingBasis: "provisioned",
				vendorUnit: "default sandbox",
				usdPerUnitHour: 0.036,
				quantityRule: { kind: "linear", dimension: "vcpus", unitsPerTargetUnit: 0.25 },
				notes:
					"The published default SKU (4 vCPU / 8 GB) is $0.036/hr of wall-clock VM time. small is 0.5x and large is 2x at the same CPU:RAM ratio; this target only uses default.",
			},
		],
		targetHourlyCost: { kind: "exact", componentIds: ["default-machine"] },
		notes:
			"Per-second billing while the sandbox is running; a stopped sandbox costs nothing. Boat snapshots a running sandbox about once a minute and the pricing page lists no storage charge; teardown deletes the sandbox with its snapshots, so a run leaves no stored data behind. $20/mo is a prepaid time allotment (555 hours of default), not a per-sandbox fee, and is recorded as plan metadata rather than a compute discount.",
		sources: [
			{ label: "boat pricing", url: "https://docs.boat.dev/pricing", checkedAt: "2026-09-21" },
		],
		adjustments: [
			{
				kind: "fee",
				plan: "base",
				resource: "plan",
				quantity: 20,
				unit: "USD/month",
				scope: "monthly",
				notes: "Minimum monthly plan that converts into included default-SKU VM-seconds.",
			},
		],
	},
	maturity: {
		status: "beta",
		notes:
			"Native @boatdev/sdk driver covering create (pinned to the baremetal machine provider), readiness (including outbound network), command exec, and delete teardown; opt-in until a committed validation run exists on this tree. Before promotion into the default matrix, the leaderboard must be able to declare two comparability caveats (it only computes CPU/RAM mismatch today): boat boots vendor stock Ubuntu 24.04 with a runtime-installed toolchain rather than the shared Debian 13 image, and boat snapshots running sandboxes every minute while 2/30 memory replicates ran at half speed in lockstep at 30 concurrent (possible host contention).",
	},
	specPinning: "fixed",
	transport: {
		streaming: false,
		syncCapMs: 60_000,
		detachedPoll: true,
	},
});
