// The Novita template builder at its interface: a build request becomes one masked template from
// the pinned base and one regional `Template.build`, over the shared E2B-protocol stand-in.

import { expect, test } from "bun:test";
import { e2bProtocolStub, ociBuildRequest } from "@sandbox-benchmarks/driver/vendor/testing";
import type { NovitaTemplateSdk } from "./artifact.ts";
import { NOVITA_PHOROMATIC_MASK, novitaArtifactBuilder } from "./artifact.ts";
import { NOVITA_DOMAIN } from "./vendor.ts";

function fixture() {
	const stub = e2bProtocolStub<NovitaTemplateSdk>();
	const logs: string[] = [];
	const request = ociBuildRequest("novita", {
		name: "toolchain-v9-candidate",
		log: (line) => logs.push(line),
	});
	const run = () => novitaArtifactBuilder(() => stub.sdk).build(request);
	const builds = () => stub.calls.filter((call) => call.name === "Template.build");
	return { request, builds, logs, run };
}

test("builds the masked template from the pinned base on the regional control plane", async () => {
	const { request, builds, logs, run } = fixture();
	expect(await run()).toEqual({ ref: "toolchain-v9-candidate", replaced: "atomic" });
	expect(NOVITA_PHOROMATIC_MASK.startsWith("set -e;")).toBe(true);
	expect(builds()).toHaveLength(1);
	expect(builds()[0]?.options).toMatchObject({
		name: "toolchain-v9-candidate",
		steps: [
			["fromImage", request.base.digestRef],
			["runCmd", NOVITA_PHOROMATIC_MASK, { user: "root" }],
		],
		apiKey: request.env.NOVITA_API_KEY,
		domain: NOVITA_DOMAIN,
		cpuCount: 4,
		memoryMB: 8192,
	});
	expect(logs).toEqual([
		`novita Template.build toolchain-v9-candidate via ${NOVITA_DOMAIN} (base ${request.base.digestRef})`,
		"building toolchain-v9-candidate",
		"novita template built: tpl-toolchain-v9-candidate (build build-1)",
	]);
});

test("keeps the account key in the SDK's apiKey channel, never in connection headers", async () => {
	// SECURITY PIN: the SDK replays connection `headers` into the envd RPC transport, so a credential
	// riding `headers` is delivered to the daemon INSIDE the guest on every command/filesystem call.
	// `apiKey` becomes an X-API-KEY header inside the control-plane ApiClient only.
	const { builds, run } = fixture();
	await run();
	expect(builds()[0]?.options).not.toHaveProperty("headers");
	expect(NOVITA_DOMAIN).toBe("us-phx-1.sandbox.novita.ai");
});
