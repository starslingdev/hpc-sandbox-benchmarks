// A native-snapshot build under the release lane's process ownership, run as its own process so
// provider-artifacts.test.ts can signal it. The driver module is a recording stand-in; the
// ownership binding and the builder are the real ones.

import { appendFileSync } from "node:fs";
import type { DriverModule, SandboxSession } from "@sandbox-benchmarks/driver";
import { snapshotArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";
import { releaseBuildOwnership } from "./provider-artifacts.ts";

const [logFile, mode] = process.argv.slice(2);
if (logFile === undefined || (mode !== "prepare" && mode !== "late"))
	throw new Error("usage: <log> prepare|late");
const log = (line: string) => appendFileSync(logFile, `${line}\n`);

const session = {
	sandboxRef: { provider: "freestyle", id: "sb-build" },
	async destroy() {
		log("destroy");
	},
} as unknown as SandboxSession;

const module = {
	id: "freestyle",
	driver: () => ({
		// `late`: the vendor accepts the create and answers after the drain began, ignoring its signal.
		create: async () => {
			log("create");
			if (mode === "late") await Bun.sleep(300);
			return session;
		},
		snapshots: {
			create: async () => ({ snapshotId: "sh-build" }),
			delete: async () => {},
		},
	}),
} as unknown as DriverModule<"freestyle">;

await snapshotArtifactBuilder(module, { stockBase: () => "freestyle/ubuntu" }).build({
	name: "benchmark-toolchain-candidate",
	spec: { vcpus: 4, memoryGb: 8 },
	replace: "allowed",
	log: () => {},
	signal: releaseBuildOwnership.signal,
	bakes: "native-snapshot",
	artifact: { kind: "baked", source: "native-snapshot" },
	env: {} as never,
	own: releaseBuildOwnership.own,
	prepare: (_session, { signal }) => {
		log("prepare");
		signal.addEventListener("abort", () => log("aborted"), { once: true });
		return new Promise(() => {});
	},
});
