// Blaxel's vendor adapter: translation only, over @blaxel/core's `SandboxInstance`. It states what
// Blaxel means in the vendor port's terms: the memory-coupled shape, the disk-backed volume and
// keepalive a benchmark needs on Blaxel's RAM-overlay root, the sandbox name as identity and
// marker, and statuses as phases. Readiness, cleanup confirmation, recovery, inventory and the disk
// proof live in the driver kit (`@sandbox-benchmarks/driver/vendor`).

import { randomUUID } from "node:crypto";
import type { SandboxInstance } from "@blaxel/core";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";