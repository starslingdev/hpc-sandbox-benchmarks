# @sandbox-benchmarks/tangle

Opt-in Tangle Sandbox driver using `@tangle-network/sandbox`. Set `TANGLE_API_KEY`.

Boots the shared toolchain image as an isolated, agent-free, ephemeral sandbox at the target shape.
The runtime's uid has no passwd entry and `/usr/share` is read-only, so a provider-local preflight
gives PTS writable state and code under `$HOME`.

Run `bun test packages/tangle` for the adapter checks. Use
`bun apps/cli/src/bin/driver-check.ts --provider tangle` for live conformance.
