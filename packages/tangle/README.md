# @sandbox-benchmarks/tangle

Opt-in Tangle Sandbox driver using `@tangle-network/sandbox`. Set `TANGLE_API_KEY`.

Boots the shared toolchain image at the target shape. The sandbox runs as an unprivileged user with a
read-only image. Before staging PTS under `$HOME`, the driver checks the workspace mount against
the requested disk capacity. HTTP(S)-only egress leaves WAN iperf unsupported. On images with the
portable PostgreSQL fixture, pgbench uses a private copy of the original baked cluster. Earlier
images record the permission gap.

Run `bun test packages/tangle`; `bun apps/cli/src/bin/driver-check.ts --provider tangle` is live.
