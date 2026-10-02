// The Novita template builder at its interface: a build request becomes one masked template from
// the pinned base and one regional `Template.build`, over a stub SDK.

import { expect, test } from "bun:test";
import { NOVITA_PHOROMATIC_MASK, novitaArtifactBuilder } from "./artifact.ts";
import { NOVITA_DOMAIN } from "./vendor.ts";

const DIGEST = `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"c".repeat(64)}`;

function fixture() {
	const steps: unknown[][] = [];
	const builds: { name: string; options: Record<string, unknown> }[] = [];
	const template = {
		fromImage: (image: string) => {
			steps.push(["fromImage", image]);
			return template;
		},
		runCmd: (command: string, options: unknown) => {
			steps.push(["runCmd", command, options]);
			return template;
		},
	};
	const Template = Object.assign(() => template, {
		build: async (_template: unknown, name: string, options: Record<string, unknown>) => {
			builds.push({ name, options });
			(options.onBuildLogs as (entry: unknown) => void)("step 1/2");
			return { templateId: "tpl-1", buildId: "build-1" };
		},
	});
	const builder = novitaArtifactBuilder(() => ({ Template }) as never);
	const logs: string[] = [];
	const run = () =>
		builder.build({
			bakes: "oci",
			name: "toolchain-v9-candidate",
			base: { digestRef: DIGEST },
			spec: { vcpus: 4, memoryGb: 8 },
			env: { NOVITA_API_KEY: "nvta_unit-test-key" },
			replace: "allowed",
			imagesDir: "/unused",
			dockerConfig: "/unused",
			log: (line) => logs.push(line),
			signal: new AbortController().signal,
		});
	return { steps, builds, logs, run };
}

test("builds the masked template from the pinned base on the regional control plane", async () => {
	const { steps, builds, logs, run } = fixture();
	expect(await run()).toEqual({ ref: "toolchain-v9-candidate", replaced: "atomic" });
	expect(steps).toEqual([
		["fromImage", DIGEST],
		["runCmd", NOVITA_PHOROMATIC_MASK, { user: "root" }],
	]);
	expect(NOVITA_PHOROMATIC_MASK.startsWith("set -e;")).toBe(true);
	expect(builds).toHaveLength(1);
	expect(builds[0]?.name).toBe("toolchain-v9-candidate");
	expect(builds[0]?.options).toMatchObject({
		apiKey: "nvta_unit-test-key",
		domain: NOVITA_DOMAIN,
		cpuCount: 4,
		memoryMB: 8192,
	});
	expect(logs).toContain("step 1/2");
	expect(logs.at(-1)).toBe("novita template built: tpl-1 (build build-1)");
});

test("keeps the account key in the SDK's apiKey channel, never in connection headers", async () => {
	// SECURITY PIN: the SDK replays connection `headers` into the envd RPC transport, so a credential
	// riding `headers` is delivered to the daemon INSIDE the guest on every command/filesystem call.
	// `apiKey` becomes an X-API-KEY header inside the control-plane ApiClient only.
	const { builds, run } = fixture();
	await run();
	expect(builds[0]?.options).not.toHaveProperty("headers");
	expect(NOVITA_DOMAIN).toBe("us-phx-1.sandbox.novita.ai");
});
