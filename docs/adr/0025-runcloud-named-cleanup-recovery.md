---
status: accepted
---

# Runcloud cleanup recovery from a retained unique create name

Run 37073680030 retained an unresolved Runcloud create without an allocation or execution receipt.
Its digest-bound diagnostic preserves the exact name and idempotency key chosen before POST. The
provider later retained the sandbox under that name as a destroyed tombstone. Empty inventory
still cannot prove that an ambiguous request was never accepted.

Refine ADR-0014 for the reviewed source revision
`f571eec3dc1378680f223a365d586f61a4fc6658` and its exact premeasurement ambiguous-create signature.
The original failed attempt must have no allocation or execution/cleanup receipt. Two complete,
independently paginated Runcloud inventories must each contain exactly one row under its exact
retained name, with the same sandbox ID and `destroyed` state. Missing, duplicate, active, deleting,
failed, changing or incomplete observations refuse recovery. The observer only reads the provider.

The existing explicit cleanup command appends a `released/reconciled` journal record with a
`runcloud-named-sandbox` observation after checking workflow quiescence and unchanged ownership
history. It records the later identity without inventing an original retained allocation or claiming
non-allocation. Collection, aggregation and promotion independently verify the reviewed source and
name binding. Original attempts and raw digests remain immutable; failed cells supply no measurements.

Deploy compatible journal readers to main before appending this observation, and stop older local
writers. Other revisions, generic create failures and empty inventories remain unresolved. This is
an explicit historical recovery path, never an automatic admission or publication fallback.
