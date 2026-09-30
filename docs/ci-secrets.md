# CI credentials and approval gates

Provider execution uses one protected GitHub Environment per **account quota domain**:
`provider-e2b`, `provider-daytona`, `provider-modal`, and the other registry accounts.
Daytona VM/container share their vendor credentials; Modal gVisor/VM/GPU share theirs.
Every other account is isolated, including `provider-brezel` and `provider-freestyle`.

`release` is a separate protected environment with **no custom secrets**. It gates GHCR publication,
dataset publication and leaderboard changes. Provider SDKs do not execute in publication jobs.
The former shared `privileged` environment is retained only while old main workflows need it.

## Execution boundary

- Entry workflows call a reusable intermediary **without any secret forwarding**. The intermediary
  has no secret inputs or environment. Only its call to the provider worker uses `secrets: inherit`,
  allowing GitHub to resolve that worker's environment secrets while the incoming secret context is empty.
  CPU, GPU and provider release workers obtain credentials from their own account environment.
- Provider jobs use fresh `ubuntu-24.04` runners, disable persisted checkout credentials and declare
  explicit token permissions. Only the Namespace job grants `id-token: write`; Vercel obtains its
  project OIDC token through the pinned Vercel CLI using its own bootstrap credentials.
- Release and GPU workers use a read-only repository token. CPU workers additionally need
  `contents: write` for the durable account journal and `actions: read` for frozen experiment evidence.
  The CPU job's write token stays on the host; the public repository is cloned anonymously in guests.
  That token remains repository-wide; environment scoping cannot restrict it to a journal branch.
- The selected account is checked against the provider IDs before authentication. A generated
  presence-only check refuses CPU/GPU/release execution if another provider's credentials or the known
  unrelated repository/organization credentials are available. No secret values are exported by that check.
- Ordinary endpoints, targets and environment revision IDs use variables. Secrets do not serve as
  a fallback for ordinary configuration.

The workflow hardening and generated wiring gates reject shared credential environments, secret
forwarding outside these secretless intermediaries, dynamic/whole secret context extraction, unknown secret references, provider execution
outside reusable workers, nonstandard provider runners and unnecessary write/OIDC permissions.
Keep provider environment contents aligned with the registry using the administrator audit below.

## Configure environments

Create `provider-<account>` and `release` in GitHub repository settings with required maintainer
review, administrator bypass disabled and selected deployment branches. Permit `main`; temporary
validation may add one exact reviewed branch. Store only the account's credentials below, ordinary
configuration as variables, and no custom secrets in `release`.

```sh
# Upload without putting the value in argv or source.
gh secret set BREZEL_API_KEY --env provider-brezel

# Read-only audit of review, branches and exact credential names.
bun scripts/audit-provider-environments.ts
# During reviewed pre-merge validation:
bun scripts/audit-provider-environments.ts --validation-branch=codex/review-pr-534
```

Use `--accounts=brezel,release` for a scoped audit. Missing or foreign keys fail the audit.
The old `setup-privileged-environment.sh` entry point now performs this read-only audit.
Remove temporary branch policies after merging; retain the legacy store until main is validated.

Store each secret only in its owning provider environment:

   <!-- >>> generated: provider-secrets — bun run generate-provider-wiring -->
   | Secret | Environment | Used by |
   | --- | --- | --- |
   | `E2B_API_KEY` | `provider-e2b` | E2B runtime and validation |
   | `DAYTONA_API_KEY` | `provider-daytona` | Daytona (VM), Daytona (container) runtime and validation |
   | `BL_API_KEY` | `provider-blaxel` | Blaxel runtime and validation |
   | `BL_WORKSPACE` | `provider-blaxel` | Blaxel runtime and validation |
   | `MSB_API_KEY` | `provider-microsandbox-cloud` | Microsandbox Cloud runtime and validation |
   | `MODAL_TOKEN_ID` | `provider-modal` | Modal (gVisor), Modal (VM) runtime and validation |
   | `MODAL_TOKEN_SECRET` | `provider-modal` | Modal (gVisor), Modal (VM) runtime and validation |
   | `NOVITA_API_KEY` | `provider-novita` | Novita runtime and validation |
   | `RUNLOOP_API_KEY` | `provider-runloop` | Runloop runtime and validation |
   | `RUN_CLOUD_API_KEY` | `provider-runcloud` | run.cloud runtime and validation |
   | `TAMA_TOKEN` | `provider-tama` | tama runtime and validation |
   | `BOAT_API_KEY` | `provider-boat` | boat runtime and validation |
   | `FREESTYLE_API_KEY` | `provider-freestyle` | Freestyle runtime and validation |
   | `BREZEL_API_KEY` | `provider-brezel` | Brezel runtime and validation |
   <!-- <<< end generated: provider-secrets -->

Namespace additionally needs `NAMESPACE_TENANT_ID` in `provider-namespace`; Vercel needs
`VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` in `provider-vercel`.
Do not store `NSC_TOKEN`: Namespace uses short-lived tokens minted through GitHub OIDC.

Provider configuration variables:

   <!-- >>> generated: provider-variables — bun run generate-provider-wiring -->
   | Variable | Used by | Default |
   | --- | --- | --- |
   | `E2B_TEMPLATE` | E2B | — |
   | `DAYTONA_TARGET` | Daytona (VM) | <code>us-west-2</code> |
   | `DAYTONA_SNAPSHOT` | Daytona (VM) | — |
   | `DAYTONA_CONTAINER_TARGET` | Daytona (container) | <code>us-west-2</code> |
   | `DAYTONA_CONTAINER_SNAPSHOT` | Daytona (container) | — |
   | `MSB_API_URL` | Microsandbox Cloud | — |
   | `NOVITA_TEMPLATE` | Novita | — |
   | `RUNLOOP_BLUEPRINT` | Runloop | — |
   | `VERCEL_TEAM_SLUG` | Vercel Sandbox | — |
   | `VERCEL_PROJECT_NAME` | Vercel Sandbox | — |
   | `TAMA_CLI` | tama | — |
   | `BOAT_BASE_URL` | boat | — |
   | `BREZEL_API_URL` | Brezel | — |
   | `BREZEL_PROJECT_ID` | Brezel | — |
   | `BREZEL_ENVIRONMENT_REVISION` | Brezel | — |
   <!-- <<< end generated: provider-variables -->

Put variables in their owning provider environment (repository variables are also supported).
Brezel needs `BREZEL_API_URL`, `BREZEL_PROJECT_ID` and `BREZEL_ENVIRONMENT_REVISION`.

### Namespace trust migration

The Namespace trust must accept issuer `https://token.actions.githubusercontent.com`, audience
`namespace.so`, and the exact subject
`repo:starslingdev/hpc-sandbox-benchmarks:environment:provider-namespace`.
Configure it while authenticated to the **benchmark tenant**, not a personal workspace:

```sh
nsc workspace describe
nsc auth trust-relationships add \
  --issuer https://token.actions.githubusercontent.com \
  --subject-match repo:starslingdev/hpc-sandbox-benchmarks:environment:provider-namespace \
  --audience namespace.so
```

Verify a Namespace worker mints its six-hour scoped token successfully before retiring the old trust.
A subject tied to `privileged` does not authorize the new environment.

## Release and publication rules

Toolchain release remains manual, same-repository and main-only. The plan selects the scope and base;
provider workers bake and validate independently, then revalidate and stage each version artifact.
The final `release` job checks complete per-provider evidence, source revision, immutable base digest,
version, release mode and every required provider before writing the public base **last**. A scoped
backfill requires an existing published base and never retags it. `force_republish` cannot be combined
with a backfill; a failed forced Daytona rebuild can leave an existing snapshot absent.

`promote: false` stops after bake/verification. A required provider failure blocks publication;
best-effort failures remain visible in diagnostics. Stock/external artifact-free providers cannot be
named in a scoped toolchain backfill.

Fork PR checks remain credential-free. Branch benchmark dispatches require `allow_branch` plus an
exact environment branch policy and maintainer approval; publication always requires main.

Dataset and leaderboard publication use path-fenced bot PRs, not direct pushes to main.
Keep code-owner review on code, workflow and script changes; dataset/leaderboard ownership exemptions
permit the existing bot publication path. Enable GitHub Actions PR creation. Bot-created PRs do not
trigger ordinary CI, so adding required checks requires a maintainer merge or a separately scoped App.

Backfill a failed dataset commit through `commit-dataset.yml` with the original run ID, or
`scripts/backfill-dataset.sh`. Incomplete experiments require explicit verified partial publication.
Update the public leaderboard through `update-leaderboard.yml` or `scripts/update-leaderboard.sh`.

## Retire the shared store

After this change reaches main and the provider workers are verified, remove provider secrets from
`privileged`, remove repository-level provider copies (including the legacy `NSC_TOKEN`), and delete
its wildcard/temporary deployment policies. Keep the old encrypted values until migration is verified;
GitHub cannot return their plaintext. Re-run the administrator audit whenever credentials or
provider environments change.
