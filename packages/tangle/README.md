# @sandbox-benchmarks/tangle

Opt-in Tangle Sandbox driver using `@tangle-network/sandbox`. Set `TANGLE_API_KEY`.

Boots the shared toolchain image at the target shape. The runtime's uid has no passwd entry and the
image filesystem is read-only, so a provider-local preflight gives PTS writable state, installs and
code under `$HOME`. Egress is HTTP(S)-only, and the uid cannot claim pgbench's root-owned cluster, so
WAN iperf and pgbench record gaps.

Run `bun test packages/tangle`; `bun apps/cli/src/bin/driver-check.ts --provider tangle` is live.
