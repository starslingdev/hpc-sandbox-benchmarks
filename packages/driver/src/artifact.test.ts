import { expect, test } from "bun:test";
import type { ArtifactBuildRequest } from "@sandbox-benchmarks/driver/artifact";
import { defineArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";

test("a builder is a frozen join of its provider id and its build", async () => {
	const seen: ArtifactBuildRequest<{ readonly DAYTONA_API_KEY: string }>[] = [];
	const builder = defineArtifactBuilder<"daytona-vm", { readonly DAYTONA_API_KEY: string }>(
		"daytona-vm",
		async (request) => {
			seen.push(request);
			return {
				ref: request.name,
				replaced: request.replace === "allowed" ? "destructive" : "none",
			};
		},
	);
	const request = {
		name: "benchmark-toolchain-v9",
		base: { digestRef: "ghcr.io/example/base@sha256:0123" },
		imagesDir: "/images",
		spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		env: { DAYTONA_API_KEY: "key" },
		replace: "allowed",
		log: () => {},
		signal: new AbortController().signal,
	} as const;
	expect(await builder.build(request)).toEqual({ ref: request.name, replaced: "destructive" });
	expect(seen).toEqual([request]);
	expect(builder.provider).toBe("daytona-vm");
	expect(Object.isFrozen(builder)).toBe(true);
});
