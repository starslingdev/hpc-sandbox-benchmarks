import type { AcceleratorObservation, AcceleratorStrategy } from "./policy.ts";

/** Canonical spelling used for NVIDIA request/observation matching. */
export function normalizeNvidiaModel(model: string): string {
	return model
		.trim()
		.replace(/^nvidia\s+/i, "")
		.replaceAll(/[^a-z0-9]+/gi, " ")
		.trim()
		.replaceAll(/\s+/g, " ")
		.toUpperCase();
}

/** Parse one `nvidia-smi --query-gpu=name` row per visible device. */
export function parseNvidiaSmi(stdout: string): AcceleratorObservation {
	const models = stdout
		.split(/\r?\n/)
		.map(normalizeNvidiaModel)
		.filter((model) => model.length > 0);
	if (models.length === 0) throw new Error("nvidia-smi reported no visible GPUs");
	const model = models[0] as string;
	if (models.some((candidate) => candidate !== model)) {
		throw new Error("nvidia-smi reported a heterogeneous GPU set");
	}
	return Object.freeze({ model, count: models.length });
}

function modelContains(haystack: string, needle: string): boolean {
	return ` ${haystack} `.includes(` ${needle} `);
}

export function matchesNvidiaGpu(
	requested: { readonly model: string; readonly count: number },
	observed: AcceleratorObservation,
): boolean {
	if (requested.count !== observed.count) return false;
	const requestedModel = normalizeNvidiaModel(requested.model);
	const observedModel = normalizeNvidiaModel(observed.model);
	return requestedModel.length > 0 && modelContains(observedModel, requestedModel);
}

/** Shared NVIDIA guest-observation strategy; the conformance gate remains vendor-neutral. */
export const nvidiaAccelerator = Object.freeze({
	family: "nvidia",
	command: "nvidia-smi --query-gpu=name --format=csv,noheader,nounits",
	parse: parseNvidiaSmi,
	matches: matchesNvidiaGpu,
}) satisfies AcceleratorStrategy;
