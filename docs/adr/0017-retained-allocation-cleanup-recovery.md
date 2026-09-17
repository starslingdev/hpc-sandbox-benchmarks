---
status: accepted
---

# Recover cleanup from retained allocation evidence

## Context

CPU run 35221839824 retained a Modal sandbox identity after preparation and rollback both failed,
but produced no execution receipt. ADR-0014 required that receipt for publication recovery, even
though the digest-verified raw allocation identifies the exact resource.

In the same run Runcloud treated empty lookups after a timed-out create as cancellation. Six
benchmark-owned allocations from the timed-out requests' window later surfaced in inventory,
outside ownership accounting: a server can finish a POST after every bounded lookup.

## Decision

Refine ADR-0014 to allow an original pre-execution failure to use its retained allocation record.
The record must bind the attempt, frozen plan, cell, provider and quota domain. No measurement or
execution/cleanup receipt may exist on this path. Recovery restores a missing allocation append
before observing removal, checks workflow quiescence and journal consistency, and appends the
existing identity-based release with its later cleanup attestation. Replays remain idempotent.
Collection and promotion independently verify the retained identity against the original raw digest
and durable journal. Original attempts remain failed and contribute no measurements.

This introduces no inventory-clearance exception. Runcloud timeout recovery must also preserve
ADR-0010's unknown-create rule: empty lookups do not cancel a timed-out POST. Only a definitive
rejection or positively observed removal can release ownership.

## Consequences

An ambiguous Runcloud create may stop an account that ultimately allocated nothing; falsely
releasing an allocation can leak resources and corrupt capacity accounting, which is worse.

The Runcloud driver holds the recovery callback in memory for the process that issued the create.
A recovery name may survive in diagnostic prose, but no structured, authoritative rejection verdict
is retained. After process exit the intent therefore stays unresolved: the legacy
`recover-rejected-create` command refuses generic create-failure markers before opening a provider
or journal. Empty inventory cannot release them. Identity-based recovery requires a retained
allocation; other cases need vendor-confirmed evidence and an explicitly reviewed recovery path.
Durable structured recovery locators remain future work.

Between the restored allocation append and the attested release, the attempt is an ordinary
interrupted allocation: admission recovery would release it without an attestation, after which
publication recovery cannot be attached by that implementation.
[ADR-0018](./0018-attest-already-released-cleanup.md) adds an append-only attestation for this case.
