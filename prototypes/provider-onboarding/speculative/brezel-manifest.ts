// Brezel's control plane as inert data (Tier-1 safe: no imports, no functions). In the target
// architecture this object sits next to the provider's metadata in schema/provider-meta/brezel.ts
// and is validated by the generator's arktype scope, not at import time.

export const BREZEL_CONTROL_PLANE = {
	kind: "http",
	transport: {
		baseUrl: "{{env.BREZEL_API_URL}}",
		headers: {
			Authorization: "Bearer {{env.BREZEL_API_KEY}}",
			"X-Project-ID": "{{env.BREZEL_PROJECT_ID}}",
		},
	},
	spec: { vcpus: { artifact: 4 }, memoryGb: { artifact: 8 }, diskGb: "runtime-verified" },
	row: {
		id: "/^sbx_[A-Za-z0-9_-]+$/",
		state:
			"'requested' | 'preparing' | 'running' | 'pausing' | 'standby' | 'resuming' | 'deleting' | 'deleted' | 'expired' | 'failed' | 'unknown'",
		environment_revision: "string >= 1",
		"failure?": { code: "string" },
	},
	id: { field: "id", pattern: "^sbx_[A-Za-z0-9_-]+$" },
	create: {
		path: "/v1/sandboxes",
		select: "resource",
		marker: { header: "Idempotency-Key" },
		body: {
			environment_revision: "{{env.BREZEL_ENVIRONMENT_REVISION}}",
			lifecycle: { expires_after_seconds: 7200 },
			network: { allow_internet: true },
		},
	},
	get: { path: "/v1/sandboxes/{id}" },
	remove: { path: "/v1/sandboxes/{id}", idempotencyHeader: "Idempotency-Key" },
	list: { path: "/v1/sandboxes?include_terminal=true", select: "sandboxes" },
	phases: {
		rules: [
			{ phase: "gone", where: { state: ["deleted", "expired"] } },
			// Reconciliation can retain a failed record after confirming the backend is absent.
			{
				phase: "gone",
				where: {
					state: ["failed"],
					"failure.code": ["backend_resource_missing", "backend_capacity_unavailable"],
				},
			},
			{ phase: "failed", where: { state: ["failed"] } },
			{ phase: "deleting", where: { state: ["deleting"] } },
			{ phase: "ready", where: { state: ["running"] } },
		],
		otherwise: "pending",
	},
	ownership: { account: "dedicated", recover: "replay" },
	errors: { definitive: [400, 401, 403, 404, 429], retryable: [429, 502, 503, 504] },
} as const;
