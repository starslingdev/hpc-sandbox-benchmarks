// The release lane's native-snapshot preparation, over a scripted session: a version build
// verifies its candidate's recorded recipe before anything else runs in the sandbox.

import { describe, expect, test } from "bun:test";
import type { ExecResult, SandboxSession } from "@sandbox-benchmarks/driver";
import { sandboxRef } from "@sandbox-benchmarks/driver";
import {
	nativeSnapshotPaths,
	nativeSnapshotPreparation,
	nativeSnapshotRecipe,
} from "./native-snapshot.ts";

function session(provenance: string | null) {
	const commands: string[] = [];
	const exited = (stdout: string, code = 0): ExecResult => ({
		stdout,
		stderr: "",
		exit: { kind: "exited", code },
		durationMs: 1,
		truncated: false,
	});
	const scripted: SandboxSession = {
		sandboxRef: sandboxRef("freestyle", "vm-test"),
		artifact: { kind: "baked", ref: "sh-candidate" },
		native: undefined,
		exec: async (command) => {
			commands.push(command);
			if (command.startsWith("cat "))
				return provenance === null ? exited("", 1) : exited(provenance);
			return exited("");
		},
		destroy: async () => {},
	};
	return { commands, scripted };
}

describe("native-snapshot preparation", () => {
	const options = { signal: new AbortController().signal, base: "sh-candidate" };
	const prepare = nativeSnapshotPreparation("freestyle", "version", "toolchain-v9");

	test("refuses a candidate built from a different recipe before running anything else", async () => {
		const { commands, scripted } = session(JSON.stringify({ recipeSha256: "0".repeat(64) }));
		await expect(prepare(scripted, options)).rejects.toThrow(
			"Freestyle candidate recipe differs from this source tree",
		);
		expect(commands.at(-1)).toBe(`cat '${nativeSnapshotPaths("freestyle").provenance}'`);
	});

	test("refuses a candidate without recorded provenance", async () => {
		const { scripted } = session(null);
		await expect(prepare(scripted, options)).rejects.toThrow("provenance is missing");
	});

	test("hashes the shared recipe it installs", () => {
		const { recipe, recipeSha256 } = nativeSnapshotRecipe("freestyle");
		expect(recipe.startsWith("#!/usr/bin/env bash")).toBe(true);
		expect(recipeSha256).toMatch(/^[a-f0-9]{64}$/);
	});
});
