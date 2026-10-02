# Sandbox drivers

This context describes the sandbox behavior that benchmark execution can request and observe.

## Language

**Sandbox session**:
An allocated sandbox with provider-qualified identity and available execution and lifecycle
capabilities. A session identifies a particular allocation, not a provider as a whole.

**Reported artifact**:
The boot artifact identity observed from the provider's control plane. It must agree with the
requested artifact before the driver returns a session; copying a request does not establish an
observation.

**Driver**:
An implementation of sandbox creation and behavior for a provider integration. Its exposed
capabilities describe that integration, not every capability offered by the vendor.

**Durable execution**:
Command execution that can outlive its launch interaction and whose completion is observed
separately. Launch acceptance is not command completion or success.

**Vendor port**:
The control-plane and data-plane operations a provider package translates from its vendor
(create, get, remove, page, and optionally find, refused, and admit; attach and exec, and
optionally launch and files). It is not a driver: the driver kit derives the driver from it.
Snapshots, accelerators, and cost evidence are passthroughs beside the port, not port operations.

**Phase**:
The provider-neutral reading of one control-plane record: pending, ready, failed, deleting, or
gone. A failed record still owns resources; gone is removal evidence. An acknowledged delete is not
removal (see cleanup confirmation in the benchmark execution context).

**Ownership marker**:
The per-attempt value a create carries (label, metadata, name, or idempotency key) that attributes
an allocation to the benchmark. Inventory and ambiguous-create recovery rest on it; it is never
inferred from timing or resource shape.

**Dedicated account**:
A credential whose vendor account holds only benchmark allocations. Every live record is owned,
and an ambiguous create is recovered by replaying its idempotent create.

**Provider package**:
A provider's only importer of its vendor libraries. It exposes a driver and, when the provider
bakes an image from the toolchain base, an artifact builder.

**Artifact builder**:
The build of a provider's boot artifact. An OCI baker turns the digest-pinned toolchain base into a
vendor image in its provider package; a native-snapshot baker is derived from the driver's snapshot
capability and captures a sandbox the release lane prepared. Either returns exactly the reference
its driver boots and states how a same-name predecessor was replaced; a destructive replace
(delete, then create) leaves the name unresolvable until the create succeeds.
