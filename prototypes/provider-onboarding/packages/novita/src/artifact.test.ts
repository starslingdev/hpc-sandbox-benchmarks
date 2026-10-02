import { describe, expect, test } from "bun:test";
import { MASK_PHOROMATIC, novitaArtifactBuilder } from "./artifact.ts";
import type { NovitaSdk } from "./sdk.ts";

function fakeTemplateSdk() {
	const calls: {
		fromImage?: string;
		runCmd?: [string, unknown];
		build?: [string, Record<string, unknown>];
	} = {};
	const builder = {
		fromImage(image: string) {
			calls.fromImage = image;
			return builder;
		},
		runCmd(command: string, options: unknown) {
			calls.runCmd = [command, options];
			return builder;
		},
	};
	const Template = Object.assign(() => builder, {
		build: async (_template: unknown, name: string, options: Record<string, unknown>) => {
			calls.build = [name, options];
			return { templateId: "tpl_1", buildId: "b_1" };
		},
	});
	return { calls, sdk: { Template } as unknown as Pick<NovitaSdk, "Template"> };
}

describe("novita artifact builder (moved out of apps/cli)", () => {
	test("builds the pinned base under the given name with the target shape and regional credentials", async () => {
		const { calls, sdk } = fakeTemplateSdk();
		const lines: string[] = [];
		const result = await novitaArtifactBuilder(() => sdk).build({
			name: "toolchain-v1-candidate",
			base: { digestRef: "ghcr.io/x/toolchain@sha256:abc" },
			spec: { vcpus: 4, memoryGb: 8 },
			env: { NOVITA_API_KEY: "nvta_test" },
			replace: "allowed",
			log: (line) => lines.push(line),
			signal: new AbortController().signal,
		});
		expect(result).toEqual({ ref: "toolchain-v1-candidate", replaced: "atomic" });
		expect(calls.fromImage).toBe("ghcr.io/x/toolchain@sha256:abc");
		expect(calls.runCmd).toEqual([MASK_PHOROMATIC, { user: "root" }]);
		expect(calls.build?.[0]).toBe("toolchain-v1-candidate");
		expect(calls.build?.[1]).toMatchObject({
			apiKey: "nvta_test",
			domain: "us-phx-1.sandbox.novita.ai",
			cpuCount: 4,
			memoryMB: 8192,
		});
		// Credentials ride only the SDK's own channel, never custom headers replayed to the guest.
		expect(calls.build?.[1]).not.toHaveProperty("headers");
		expect(lines.at(-1)).toContain("tpl_1");
	});
});
