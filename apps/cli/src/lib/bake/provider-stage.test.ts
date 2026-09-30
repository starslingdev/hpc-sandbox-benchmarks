import { expect, test } from "bun:test";

// Module mocks run in a child so they cannot change the rest of the CLI suite's imports.
const program = `
import { mock } from "bun:test";
const events = [];
const base = "ghcr.io/example/base@sha256:" + "a".repeat(64);
let published = false;
let validation = "ok";
mock.module("./image.ts", () => ({
  imageExistsInRegistry: async () => published,
  resolveImageDigestRef: async () => base,
  releaseBaseTag: () => "base",
  imageDigest: () => "a".repeat(64),
  promoteImage: async () => events.push("commit-base"),
}));
mock.module("./validate-run.ts", () => ({ validateCandidates: async () => {
  events.push("validate"); return [{ provider: "e2b", status: validation }];
}}));
mock.module("../providers-run.ts", () => ({ forEachProviderWithCreds: async (body, options) => {
  if (options.only.join(",") !== "e2b") throw new Error("Foreign provider selected");
  await body({ id: "e2b", kind: "driver" });
  return [{ provider: "e2b", status: "ok" }];
}}));
mock.module("./provider-artifacts.ts", () => ({
  isBakedProviderId: () => true, isMirroredProviderId: () => false,
  buildBakedProviderArtifact: async () => events.push("provider-artifact"),
  nonBakedArtifactAction: () => "none", promoteMirroredProviderArtifact: async () => {},
}));
const { promoteAll } = await import("./promote.ts");
const outcomes = [];
for (const options of [
  { only: ["e2b"], stageProvider: { partial: false, baseImage: base } },
  { only: ["e2b"], stageProvider: { partial: true, baseImage: base } },
  {},
  { only: ["e2b"], stageProvider: { partial: false, baseImage: "drifted" } },
]) {
  events.length = 0;
  published = options.stageProvider?.partial ?? false;
  const result = await promoteAll(() => {}, options);
  outcomes.push({ ok: result.ok, events: [...events] });
}
events.length = 0; published = false; validation = "failed";
const failure = await promoteAll(() => {}, {
  only: ["e2b"], stageProvider: { partial: false, baseImage: base },
});
outcomes.push({ ok: failure.ok, events: [...events] });
console.log(JSON.stringify(outcomes));
`;

test("isolated provider stages never publish the base; ordinary full promotion commits last", () => {
	const result = Bun.spawnSync([process.execPath, "--eval", program], {
		cwd: import.meta.dir,
		env: { ...process.env, REQUIRE_PROVIDERS: "e2b" },
		stdout: "pipe",
		stderr: "pipe",
	});
	expect(Buffer.from(result.stderr).toString()).toBe("");
	expect(result.exitCode).toBe(0);
	expect(JSON.parse(Buffer.from(result.stdout).toString())).toEqual([
		{ ok: true, events: ["validate", "provider-artifact"] },
		{ ok: true, events: ["validate", "provider-artifact"] },
		{ ok: true, events: ["validate", "provider-artifact", "commit-base"] },
		{ ok: false, events: [] },
		{ ok: false, events: ["validate"] },
	]);
});
