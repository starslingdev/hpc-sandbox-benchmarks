// Vercel Sandbox's vendor adapter: translation only. It receives the SDK's `Sandbox` statics and
// states what the v2 name-keyed API means in the vendor port's terms: the OIDC credential
// projection, the sandbox name as identity and ownership marker, record statuses as phases, and
// current-session execution. Readiness, cleanup confirmation, recovery, inventory and the disk proof
// live in the driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Every lookup passes `resume: false`: the SDK defaults to resuming a stopped session on `get`, and
// a benchmark that silently booted a replacement VM after loss would hide the loss it exists to
// measure.

import { Buffer } from "node:buffer";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	bounded,
	httpStatus,
	LEAK_EXPIRY_MS,
	markerSpelling,
	refusedOn,
} from "@sandbox-benchmarks/driver/vendor";
import type { Sandbox } from "@vercel/sandbox";
import { APIError } from "@vercel/sandbox";
import { type } from "arktype";

/** The SDK surface the adapter translates; the package entry passes the real `Sandbox` class. */
export type VercelSdk = Pick<typeof Sandbox, "create" | "get" | "list">;