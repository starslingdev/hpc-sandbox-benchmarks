// @sandbox-benchmarks/driver — the sandbox driver kit (ADR-0007).
//
// This root entry is the trusted, arktype-free port and kit: everything the harness consumes and
// everything a driver author implements. Runtime validation is isolated at `./env` and `./schemas`;
// importing the core must not evaluate arktype or any schema-package runtime graph.

export type { ProviderId } from "@sandbox-benchmarks/schema/provider-ids";

export type {
	ArtifactOf,
	DriverContext,
	DriverModule,
	DriverSpec,
	EnvFromInputs,
	EnvInputFromInputs,
	EnvInputOf,
	EnvOf,
	ResolvedArtifactOf,
} from "./lib/define.ts";
export { defineDriver } from "./lib/define.ts";

export type {
	DriverErrorCode,
	DriverErrorFields,
	FailedCreateCleanupErrorOptions,
	FailedCreateRecovery,
} from "./lib/errors.ts";
export {
	DriverError,
	FailedCreateCleanupError,
	isDriverError,
	isFailedCreateCleanupError,
} from "./lib/errors.ts";
export type { ReadinessStrategy } from "./lib/poll.ts";
export { pollUntilReady } from "./lib/poll.ts";
export type {
	ControlPlaneProbes,
	CreateBudget,
	CreateRequest,
	DriverOperationOptions,
	ExecOptions,
	ExecResult,
	Exit,
	GpuSpec,
	ResolvedArtifact,
	SandboxDriver,
	SandboxFiles,
	SandboxObservation,
	SandboxRef,
	SandboxSession,
	SnapshotCapability,
	TargetSpec,
} from "./lib/port.ts";
export { sandboxRef, succeeded } from "./lib/port.ts";
export { withSessionTeardown } from "./lib/session.ts";
export { launchDetached, readTextFile, shellQuote, writeTextFile } from "./lib/shell.ts";
export type { MethodTable, MethodTableCreateResult } from "./lib/table.ts";
export { DeferredTeardownError, driverFromTable } from "./lib/table.ts";
