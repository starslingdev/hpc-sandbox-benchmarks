// Shared test fixtures: one ExecResult stub and one minimal session, so the port's shapes have a
// single place to update when they grow a field. `.fixture.ts` (repo convention) so the test
// runner does not treat it as a suite.

import type { ExecResult, SandboxSession } from "./port.ts";
import { sandboxRef } from "./port.ts";

export const okExec: ExecResult = {
	exit: { kind: "exited", code: 0 },
	stdout: "",
	stderr: "",
	durationMs: 0,
	truncated: false,
};

/** A minimal session; override any member. `destroy` defaults to a no-op. */
export function stubSession(overrides: Partial<SandboxSession> = {}): SandboxSession {
	return {
		sandboxRef: sandboxRef("tama", "m-1"),
		artifact: { kind: "baked", ref: "im-1" },
		native: null,
		async exec() {
			return okExec;
		},
		async destroy() {},
		...overrides,
	};
}
