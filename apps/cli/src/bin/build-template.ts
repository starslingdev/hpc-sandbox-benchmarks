#!/usr/bin/env bun
// `build-template` — build a provider's sandbox template (stub).
// Usage: build-template [provider] [tag]   (defaults: e2b latest)
import {
	buildDaytonaTemplate,
	buildE2bTemplate,
	buildModalTemplate,
} from "@sandbox-benchmarks/templates";

const builders = {
	e2b: buildE2bTemplate,
	daytona: buildDaytonaTemplate,
	modal: buildModalTemplate,
} as const;

if (import.meta.main) {
	const provider = process.argv[2] ?? "e2b";
	const tag = process.argv[3] ?? "latest";
	if (!(provider in builders)) {
		console.error(
			`Unknown provider "${provider}". Expected one of: ${Object.keys(builders).join(", ")}`,
		);
		process.exit(1);
	}
	const spec = builders[provider as keyof typeof builders](tag);
	console.log(JSON.stringify(spec));
}
