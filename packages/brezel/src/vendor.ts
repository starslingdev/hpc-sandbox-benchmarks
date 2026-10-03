// Brezel's vendor adapter: translation only. It states what Brezel's HTTP API means in the vendor
// port's terms and receives its transport; readiness, cleanup confirmation, recovery, inventory and
// the disk proof live in the driver kit (`@sandbox-benchmarks/driver/vendor`).

import { AsyncLocalStorage } from "node:async_hooks";
import type { Sandbox } from "@infercrane/brezel";
import { BrezelClient, BrezelError } from "@infercrane/brezel";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { httpStatus, refusedOn } from "@sandbox-benchmarks/driver/vendor";