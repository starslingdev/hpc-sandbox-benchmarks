# Modal cleanup recovery research — 2026-09-14

Scope: CPU run `34853816482`, frozen revision
`845a0f19b3aa3bda32f0ec988c1d1c188c9e260f`, and the missing allocation ID for
`modal-gvisor-realworld-better-auth-r3`. This note records read-only source research;
it does not itself attest that a cloud resource was removed.

## Ownership and the empty inventory

The frozen Modal implementation allocates through `nativeModalCompute`, which resolves
the App named `sandbox-benchmarks` and uses `experimentalCreate` for gVisor. The installed
ComputeSDK wrapper's default App, `computesdk-modal`, is therefore irrelevant to this
run. Both allocation and inventory use the same benchmark App constant.
[Frozen allocation and inventory source](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/845a0f19b3aa3bda32f0ec988c1d1c188c9e260f/packages/modal/src/shared.ts#L350).

Installed `modal` is version `0.9.0`. Both high-level listing implementations set
`includeFinished: false`; stable `list` calls `SandboxList`, while `experimentalList`
calls `SandboxListV2` and requires an App ID. Consequently, `owned: []` is consistent
with the separately observed terminal Mastra sandbox being
excluded from inventory. It is not evidence that it never existed. `foreignCount: 26`
counts entries outside the benchmark App through the repository's two listing paths;
it does not establish that any of those entries belongs to this benchmark.
[Installed SDK implementation](../node_modules/modal/dist/index.js), lines 63950–64020;
[repository inventory](../packages/modal/src/shared.ts), `modalInventory`.

The latest official reference now describes `experimentalList` as covering both
generations and permits an omitted App ID. That differs from the installed 0.9
implementation, so recovery must use the installed contract rather than assume latest
documentation describes this run's behavior.
[Current Modal Sandbox reference](https://modal.com/docs/sdk/js/latest/Sandbox#experimentalList).

## Recovering the historical ID

The installed SDK exposes `ModalClient.cpClient`, including `sandboxList` and
`sandboxListV2`. Their generated request accepts `includeFinished: true` and
`beforeTimestamp`; the response contains `SandboxInfo` records with `id`, `createdAt`,
`appId`, `name`, `imageId`, `resourceInfo`, `timeoutSecs` and `taskInfo`. A read-only
history query scoped to the benchmark App can therefore retain information that the
high-level iterator discards. This is an exposed generated control-plane API, not a
documented stable high-level history feature. Iterate every page and retain sanitized
response evidence. Match historical candidates against immutable run times, names,
images and known allocation IDs; a timestamp alone does not establish cell identity.
[Installed SDK declarations](../node_modules/modal/dist/index.d.ts), `SandboxInfo`,
`SandboxListRequest`, `ModalClient.cpClient`.

`sandboxes.fromId` only constructs a local handle. `poll()` performs a zero-timeout
wait and returns `null` while running or a numeric exit code when finished. A retained
historical ID followed by a numeric poll result can establish terminal state without
deleting anything. A successful `fromId`, an expired expected lifetime, or an empty
running inventory cannot individually establish the identity and terminal state of
the missing allocation.
[Installed SDK implementation](../node_modules/modal/dist/index.js), lines 63886–63890
and 64721–64730; [official lifecycle guide](https://modal.com/docs/guide/sandboxes).

## If the historical ID cannot be recovered

The exact created-request preparation failure is materially narrower than an
interrupted create: the frozen driver has already received the handle and parsed its
sandbox ID before invoking `prepareAndVerifyCreatedRequest`. Cleanup then calls destroy
with that parsed reference. The missing durable ID is a persistence problem after a
returned allocation, rather than evidence of an in-flight create that could appear
after inventory collection.
[Frozen driver source](https://github.com/starslingdev/hpc-sandbox-benchmarks/blob/845a0f19b3aa3bda32f0ec988c1d1c188c9e260f/packages/driver/src/computesdk.ts#L1098).

A publication-only, append-only cleanup attestation could use that exact source
revision and failure signature, original attempt digests, completed original workflow,
verified account/environment identity, and two complete empty inventories covering
both generations of the benchmark App under quiescent writers. Such evidence would
record observed benchmark-App clearance, not a recovered sandbox identity, successful
measurement, or empty account. Foreign resources must remain untouched. This is a
proposed policy extension, not an existing recovery permission: ADR-0010 currently
limits identifier-free clearance to a different historical journal-append failure,
and ADR-0011 keeps Modal admission at account scope. A publication attestation must
explicitly preserve failed attempts and separate its cleanup conclusion from future
account admission.
[ADR-0010](adr/0010-experiment-completeness.md), operator recovery sections;
[ADR-0011](adr/0011-inventory-admission-scope.md).

Credentials and environment are part of the evidence: an empty App in a different
Modal environment or account proves nothing about the original run. Do not treat an
authentication error, an App lookup failure, partial pagination, or a transient name
lookup miss as clearance. The repository already avoids broad name-lookup not-found
translation because nested authentication RPC failures can otherwise be misclassified.
[Control-plane wrapper](../packages/modal/src/shared.ts), `modalControlPlane` and
`modalLifecycle`.
