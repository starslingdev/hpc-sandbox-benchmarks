# CPU benchmark, August 2026

Nine sandbox providers. Same machine (4 vCPU, 8 GiB RAM). Same open CPU test.
Median of all trials, each on a fresh machine.

We build [Ascii Box](https://box.ascii.dev), one of the providers below. So do not take
our word for it. Every number here can be checked with the data and commands in this repo.

## CPU per dollar

Median runs/s divided by hourly price at the same machine shape. This is the number that
matters when work fans out across many sandboxes.

| Provider | $/hr | runs/s | per $/hr | × bottom |
| --- | ---: | ---: | ---: | ---: |
| Ascii Box (bare metal) | 0.036 | 27.67 | 769 | 61.2× |
| Ascii Box (Hetzner) | 0.036 | 8.88 | 247 | 19.6× |
| Daytona (VM) | 0.2502 | 18.60 | 74 | 5.9× |
| Blaxel | 0.3312 | 19.80 | 60 | 4.8× |
| Novita | 0.2333 | 13.52 | 58 | 4.6× |
| Freestyle | 0.2645 | 9.64 | 36 | 2.9× |
| E2B | 0.3312 | 11.24 | 34 | 2.7× |
| Modal (VM) | 0.7612 | 15.07 | 20 | 1.6× |
| Modal (gVisor) | 0.7612 | 9.56 | 13 | 1.0× |

## Raw CPU speed

Same test, before price. runs/s, higher is better.

| Provider | p50 | p95 | spread | × bottom |
| --- | ---: | ---: | --- | ---: |
| Ascii Box (bare metal) | 27.67 | 28.72 | 24.26–28.98 | 3.1× |
| Blaxel | 19.80 | 21.44 | 17.37–21.75 | 2.2× |
| Daytona (VM) | 18.60 | 19.29 | 16.47–19.68 | 2.1× |
| Modal (VM) | 15.07 | 15.52 | 12.81–15.73 | 1.7× |
| Novita | 13.52 | 18.64 | 13.05–18.82 | 1.5× |
| E2B | 11.24 | 12.09 | 10.50–12.17 | 1.3× |
| Freestyle | 9.64 | 10.56 | 7.78–10.78 | 1.1× |
| Modal (gVisor) | 9.56 | 10.57 | 8.49–10.62 | 1.1× |
| Ascii Box (Hetzner) | 8.88 | 10.61 | 7.11–10.66 | 1.0× |

The slowest bare-metal trial we recorded (24.26 runs/s) is faster than every other
provider's p95.

## How we measured

- Same requested shape everywhere: 4 vCPU, 8 GiB RAM. The harness checks what the VM
  actually reports.
- Fresh machine for every run. Median of all trials, never the best one.
- Open test harness: [Phoronix Test Suite](https://www.phoronix-test-suite.com/)
  `node-web-tooling`, run inside the sandbox.
- Published list prices at this shape ([Box billing](https://docs.ascii.dev/box/billing)).
  No credits or free tiers netted in, for anyone.
- Box and Freestyle measured 2026-08-24. The others come from our
  [July CI run](../../../data/dataset/runs/30019301067.json), same harness, same test.
- Full detail: [methodology.md](../../methodology.md).

## What this does not say

- One CPU test at one machine size. For disk, memory, network, Postgres, and real-world
  dev workflows, see the full-suite leaderboard linked under Raw data. (Short version:
  bare metal leads most of those too, but not all. Memory bandwidth and loopback network
  go to others.)
- Small samples (10 to 54 trials per provider). Ranking tests and intervals:
  [leaderboard.md](./leaderboard.md).
- August rows and July rows were measured on different dates. Treat cross-date gaps as
  indicative.

## Reproduce it

You need [Bun](https://bun.sh) and a key for the provider you want to test
([get a Box key](https://box.ascii.dev/box/dashboard?tab=secrets)):

```bash
git clone https://github.com/AnicetNgrt/hpc-sandbox-benchmarks.git && cd hpc-sandbox-benchmarks
bun install --ignore-scripts
cp .env.example .env   # fill in the provider's key
bun apps/cli/src/bin/bench-suite.ts ascii-box-bare-metal cpu-node myrun --replicate 0 --require ascii-box-bare-metal
bun apps/cli/src/bin/leaderboard.ts data/runs/myrun.json
```

One cell takes 10 to 25 minutes depending on the provider. Missing keys are recorded as
skips, never as failures. Want your provider or your size tested?
[It is a PR](../../../CONTRIBUTING.md).

## Raw data

- CPU shards (12 cells): [shards/](./shards/)
- Full-suite run document (all 9 suites, 61 cells + the July run; bulky per-result host
  metadata trimmed for size, metrics and gaps intact): [run.json](./run.json)
- Full-suite leaderboard with statistics (disk, memory, network, pgbench, real-world):
  [leaderboard.md](./leaderboard.md)
- July CI run (the non-Box rows): [data/dataset/runs/30019301067.json](../../../data/dataset/runs/30019301067.json)
- Methodology: [docs/methodology.md](../../methodology.md)

To run code on the fastest row above:
[docs.ascii.dev/box/use-in-code](https://docs.ascii.dev/box/use-in-code).
