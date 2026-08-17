// @sandbox-benchmarks/driver — the sandbox driver kit (ADR-0007).
//
// This root entry is the port and the kit: everything the harness consumes and everything a
// driver author implements. lib/port.ts is the SINGLE SOURCE OF TRUTH for the port's data
// shapes — arktype schemas whose static types are inferred, so the validator, the type, and
// the error message are one declaration. Behavioral contracts stay plain TypeScript. The
// subpaths (`./env`, `./cli`, `./computesdk`) organize the parsing surfaces; every kit
// consumer already evaluates the schema package's arktype graph in-process, so the port's
// schemas add no new import-cost class (ADR-0006's discipline still holds at the boundary
// that matters: the registry identity leaf).

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
	SandboxRef,
	SandboxSession,
	SnapshotCapability,
	TargetSpec,
} from "./lib/port.ts";
export {
	createRequestSchema,
	execResultSchema,
	exitSchema,
	gpuSpecSchema,
	parseCreateRequest,
	sandboxRef,
	sandboxRefSchema,
	succeeded,
} from "./lib/port.ts";

export type { MethodTable } from "./lib/table.ts";
export { driverFromTable } from "./lib/table.ts";

export type { CredentialSpec, DriverContext, DriverModule, DriverSpec, EnvFromCreds, EnvOf } from "./lib/define.ts";
export { defineDriver, DRIVER_CREDENTIALS } from "./lib/define.ts";

export { launchDetached, readTextFile, shellQuote, writeTextFile } from "./lib/shell.ts";
export { withSessionTeardown } from "./lib/session.ts";
