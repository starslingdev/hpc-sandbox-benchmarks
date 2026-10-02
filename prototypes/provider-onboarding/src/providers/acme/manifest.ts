// A complete, fully declarative API-only provider: metadata + driver in one inert object, with no
// TypeScript beyond this literal. "Acme" is a fixture vendor exercised against a fake API in
// manifest.test.ts; it is the shape a generic REST sandbox vendor would take.

export const ACME_META = {
	displayName: "Acme Sandboxes",
	vendor: "Acme",
	website: "https://acme.example",
	sdkPackage: "rest:v1",
	artifact: { kind: "image" },
	inputs: [
		"ACME_TOKEN",
		{ name: "ACME_URL", source: { kind: "variable" }, default: "https://api.acme.example" },
	],
	isolation: { class: "microVM", technology: "Firecracker microVM" },
	pricing: { model: "unavailable", reason: "unpublished" },
	maturity: { status: "beta", notes: "Declarative REST manifest." },
	specPinning: "settable",
	transport: { streaming: false, syncCapMs: 60_000, detachedPoll: true },
} as const;

export const ACME_MANIFEST = {
	kind: "http",
	transport: {
		baseUrl: "{{env.ACME_URL}}",
		headers: { Authorization: "Bearer {{env.ACME_TOKEN}}" },
	},
	spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: "runtime-verified" },
	row: { id: "string", status: "string", "label?": "string" },
	id: { field: "id", pattern: "^sb-[a-z0-9]+$" },
	create: {
		path: "/v1/sandboxes",
		marker: { field: "label" },
		body: {
			image: "{{request.artifact.ref}}",
			cpu: "{{request.spec.vcpus}}",
			memory_gb: "{{request.spec.memoryGb}}",
		},
	},
	get: { path: "/v1/sandboxes/{id}" },
	remove: { path: "/v1/sandboxes/{id}" },
	list: { path: "/v1/sandboxes", select: "items" },
	phases: {
		rules: [
			{ phase: "ready", where: { status: ["running"] } },
			{ phase: "gone", where: { status: ["terminated"] } },
			{ phase: "failed", where: { status: ["error"] } },
		],
		otherwise: "pending",
	},
	ownership: { account: "shared", markerField: "label" },
	errors: { definitive: [400, 401, 403, 422], retryable: [429, 503] },
	data: {
		kind: "json-exec",
		path: "/v1/sandboxes/{id}/exec",
		body: { cmd: ["bash", "-lc", "{{command}}"] },
		result: { exitCode: "exit_code", stdout: "stdout", stderr: "stderr" },
	},
} as const;
