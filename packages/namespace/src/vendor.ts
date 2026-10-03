// Namespace's vendor adapter: translation only. Namespace's generated clients own RPC encoding,
// protobuf types, and typed errors; this states what they mean in the vendor port's terms.
// Readiness, cleanup confirmation, recovery, inventory and the disk proof live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).

import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, createClient } from "@connectrpc/connect";
import { createComputeClient, createRegionTransport } from "@namespacelabs/sdk/api";
import type { TokenSource } from "@namespacelabs/sdk/auth";
import { fromBearerToken } from "@namespacelabs/sdk/auth";
import { CommandService } from "@namespacelabs/sdk/proto/namespace/cloud/compute/v1beta/command_pb";