// Brezel on the HTTP kit: the control plane is the data in ./manifest.ts; the only code is the
// data-plane hook, because Brezel streams command output as base64 NDJSON (its SDK decodes it).

import type { Sandbox as BrezelSandbox } from "@infercrane/brezel";
import { BrezelClient } from "@infercrane/brezel";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import { type } from "arktype";
import { BREZEL_PROVENANCE } from "../../../../../packages/brezel/src/provenance.ts";
import { httpOps } from "../../kit/http.ts";
import type { OpsTiming } from "../../kit/ops.ts";
import { defineOpsDriver, opsSpec } from "../../kit/ops.ts";
import { BREZEL_CONTROL_PLANE } from "./manifest.ts";

export interface BrezelSpecOptions extends Partial<Omit<OpsTiming, "pollMs">> {
	readonly fetch?: typeof globalThis.fetch;
	readonly pollMs?: number;
}

function brezelOps({ env }: DriverContext<"brezel">, seams: BrezelSpecOptions = {}) {
	const client = new BrezelClient({
		token: env.BREZEL_API_KEY,
		baseUrl: env.BREZEL_API_URL,
		project: env.BREZEL_PROJECT_ID,
		...(seams.fetch && { fetch: seams.fetch }),
	});
	return httpOps<typeof BREZEL_CONTROL_PLANE.row, BrezelSandbox>(BREZEL_CONTROL_PLANE, {
		env,
		...(seams.fetch && { fetch: seams.fetch }),
		timing: seams,
		recovery: { absenceConfirmationMs: 1000, maxAttempts: 3 },
		verify: (row) => {
			if (row.environment_revision !== env.BREZEL_ENVIRONMENT_REVISION)
				throw new Error("Brezel created a sandbox from a different environment revision");
		},
		hook: {
			kind: "hook",
			connect: (row) => client.sandbox(row.id),
			exec: async (native, command, options) => {
				options?.signal?.throwIfAborted();
				// The pinned workload preamble needs Bash (`source`, `pipefail`), not Ubuntu's dash.
				const result = await native.run(["/bin/bash", "-lc", command], { timeoutSeconds: 60 });
				options?.signal?.throwIfAborted();
				return { exitCode: result.exitCode, stdout: result.stdoutText, stderr: result.stderrText };
			},
			files: {
				read: async (native, path) => new TextDecoder().decode(await native.readFile(path)),
				write: async (native, path, text) => {
					await native.writeFile(path, text);
				},
			},
		},
	});
}

export const BREZEL_SANDBOX_ID = type(new RegExp(BREZEL_CONTROL_PLANE.id.pattern));

export const brezelSpec = (context: DriverContext<"brezel">, seams?: BrezelSpecOptions) =>
	opsSpec("brezel", context, brezelOps(context, seams));

export default defineOpsDriver("brezel", { provenance: BREZEL_PROVENANCE, ops: brezelOps });
