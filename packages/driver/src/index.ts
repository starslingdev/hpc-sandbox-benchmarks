// @sandbox-benchmarks/driver — the sandbox driver kit (ADR-0007).
//
// This root entry is the port and the kit: everything the harness consumes and everything a
// driver author implements. It is deliberately arktype-free — the kit is imported by every
// driver file, and parse machinery lives behind the subpaths that genuinely parse
// (`./env` for credential slices, `./cli` for CLI-vendor stdout). Import cost is an
// architectural property; it erodes silently unless a boundary owns it (ADR-0006).

export type {
	ControlPlaneProbes,
	CreateBudget,
	CreateRequest,
	ExecOptions,
	ExecResult,
	Exit,
	GpuSpec,
	SandboxDriver,
	SandboxFiles,
	SandboxId,
	SandboxSession,
	SnapshotCapability,
	TargetSpec,
} from "./lib/port.ts";
export { sandboxId, succeeded } from "./lib/port.ts";

export type { MethodTable } from "./lib/table.ts";
export { driverFromTable } from "./lib/table.ts";

export type { CredentialSpec, DriverContext, DriverModule, DriverSpec, EnvFromCreds, EnvOf } from "./lib/define.ts";
export { defineDriver, DRIVER_CREDENTIALS } from "./lib/define.ts";

export { launchDetached, readTextFile, shellQuote, writeTextFile } from "./lib/shell.ts";
export { withSessionTeardown } from "./lib/session.ts";
