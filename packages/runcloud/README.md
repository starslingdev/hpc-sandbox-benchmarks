# @sandbox-benchmarks/runcloud

Owns the runcloud driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

Run `bun run --filter @sandbox-benchmarks/runcloud test` or `typecheck` from the repo root.

## Boot failure diagnostics

A terminal boot state includes the provider's `last_error` text when available. Capture it before
cleanup changes the sandbox record so image preparation failures remain distinguishable from
quota refusals and request timeouts. Diagnostic rendering redacts credentials before truncation.
Cleanup confirmation remains required before a failure can be considered retryable.

A successful DELETE or `destroying` state is not proof of removal. The driver waits for
`destroyed` or a typed 404 and keeps pending deletions in inventory. This avoids claiming cleanup
succeeded while an image preparation race can still return the sandbox to running.

A timed-out or otherwise ambiguous create remains unresolved when exact-name lookups are empty.
The server may finish the POST later. Recovery retains the generated name and only releases that
uncertainty after finding and removing the matching allocation; it cannot claim cancellation from
repeated empty reads. This prevents account refill and a false `not-allocated` journal release.
