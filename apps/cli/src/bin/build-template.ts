#!/usr/bin/env bun
// `build-template` — build a provider's sandbox template (stub).
// Usage: build-template [provider] [tag]   (defaults: e2b latest)
//
// Routing comes from the package's own `templateBuilders`, never a local copy: a second map here
// went stale the moment a provider was added upstream, so the CLI rejected a provider the package
// advertised through `templateProviders`.
import { templateBuilders } from "@sandbox-benchmarks/templates";

if (import.meta.main) {
	const provider = process.argv[2] ?? "e2b";
	const tag = process.argv[3] ?? "latest";
	// Object.hasOwn, not `in`: `in` walks the prototype chain, so `__proto__` / `toString` /
	// `constructor` passed the guard and then blew up on the call with a stack trace instead of the
	// clean "Unknown provider" message below.
	if (!Object.hasOwn(templateBuilders, provider)) {
		console.error(
			`Unknown provider "${provider}". Expected one of: ${Object.keys(templateBuilders).join(", ")}`,
		);
		process.exit(1);
	}
	const spec = templateBuilders[provider as keyof typeof templateBuilders](tag);
	// Human-readable build context on stderr; the machine-readable spec stays on stdout.
	console.error(`provider:   ${spec.provider}`);
	console.error(`tag:        ${spec.tag}`);
	console.error(`dockerfile: ${spec.dockerfile}`);
	console.error(`base image: ${spec.baseImage}`);
	console.log(JSON.stringify(spec));
}
