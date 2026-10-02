// The shared E2B-protocol template builder at its interface, over the shared stand-in: what a
// provider that states only its credential gets (the novita package tests a regional domain and a
// build step), and that a stopped release lane starts no build.

import { expect, test } from "bun:test";
import type { E2bProtocolTemplateSdk } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import { e2bProtocolArtifactBuilder } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import { e2bProtocolStub, ociBuildRequest } from "@sandbox-benchmarks/driver/vendor/testing";

const stand = () => e2bProtocolStub<E2bProtocolTemplateSdk<unknown>>();
const builder = ({ sdk }: ReturnType<typeof stand>) =>
	e2bProtocolArtifactBuilder("e2b", () => sdk, { apiKey: (env) => env.E2B_API_KEY });

test("builds the base as the named template on the SDK's own domain", async () => {
	const stub = stand();
	const logs: string[] = [];
	const request = ociBuildRequest("e2b", { log: (line) => logs.push(line) });
	expect(await builder(stub).build(request)).toEqual({ ref: request.name, replaced: "atomic" });
	const [build, ...more] = stub.calls.filter((call) => call.name === "Template.build");
	expect(more).toEqual([]);
	expect(build?.options).toEqual({
		name: request.name,
		steps: [["fromImage", request.base.digestRef]],
		apiKey: request.env.E2B_API_KEY,
		cpuCount: 4,
		memoryMB: 8192,
		onBuildLogs: expect.any(Function),
	});
	expect(logs[0]).toBe(`e2b Template.build ${request.name} (base ${request.base.digestRef})`);
});

test("starts no build once the release lane has stopped", async () => {
	const stub = stand();
	const stopped = new AbortController();
	stopped.abort(new Error("drain"));
	const request = ociBuildRequest("e2b", { signal: stopped.signal });
	await expect(builder(stub).build(request)).rejects.toThrow("drain");
	expect(stub.count("Template.build")).toBe(0);
});
