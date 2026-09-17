---
status: proposed
---

# Recover cleanup from retained allocation evidence

CPU run 35221839824 retained a Modal sandbox identity after preparation and rollback both failed,
but produced no execution receipt. ADR-0014 required that receipt for publication recovery, even
though the digest-verified raw allocation identifies the exact resource.

Refine ADR-0014 to allow an original pre-execution failure to use its retained allocation record.
The record must bind the attempt, frozen plan, cell, provider and quota domain. No measurement or
execution/cleanup receipt may exist on this path. Recovery restores a missing allocation append
before observing removal, checks workflow quiescence and journal consistency, and appends the
existing identity-based release with its later cleanup attestation. Replays remain idempotent.
Collection and promotion independently verify the retained identity against the original raw digest
and durable journal. Original attempts remain failed and contribute no measurements.

This introduces no inventory-clearance exception. Runcloud timeout recovery must also preserve
ADR-0010's unknown-create rule: empty lookups do not cancel a timed-out POST. Only a definitive
rejection or positively observed removal can release ownership. This may stop an account that
ultimately allocated nothing; falsely releasing an allocation can leak resources and corrupt
capacity accounting.
