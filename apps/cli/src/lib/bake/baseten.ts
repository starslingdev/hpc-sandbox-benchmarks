// Build a Baseten sandbox image from the same digest-pinned base used by the other providers,
// through the provider-owned builder in packages/baseten (the SDK's remote image push).
import { buildProviderArtifact } from "./build-provider-artifact.ts";
import { resolveImageDigestRef } from "./image.ts";
import type { Log } from "./types.ts";

export async function bakeBasetenImage(name: string, baseImage: string, log: Log): Promise<void> {
	const phase = name.endsWith("-candidate") ? "candidate" : "version";
	const base = await resolveImageDigestRef(baseImage);
	// A push adds a version under the name and moves `:latest` only once it is built.
	const result = await buildProviderArtifact("baseten", { phase, base, replace: "allowed", log });
	if (result.ref !== name)
		throw new Error(`Baseten built ${result.ref}, not the requested image ${name}`);
}
