# Security Policy

## Reporting a vulnerability

Please report security issues privately. Do **not** open a public issue for anything that could
expose credentials, allow remote code execution in CI, or leak provider API keys.

- Preferred: email **security@starsling.dev** (or the contact listed on the StarSling org profile).
- Include steps to reproduce, affected workflows/packages, and any mitigating details you already have.
- We will acknowledge receipt and work a fix before any public disclosure.

## Secrets

- Never commit API keys, tokens, or `.env` files. Broader `.env*` patterns are gitignored.
- Never paste secrets into issues, pull request bodies, or comments.
- Provider credentials for CI live only in the GitHub Environment **`privileged`** — not as
  repository secrets. See [docs/ci-secrets.md](./docs/ci-secrets.md).
- Pull requests (including forks) do not receive those secrets. Live benches and toolchain
  releases require a maintainer `workflow_dispatch` on `main` plus Environment approval.

## Scope notes

- Self-hosted runners only execute same-repository PR heads and privileged maintainer jobs.
- We do not use `pull_request_target`.
- Third-party Actions are SHA-pinned; installs use `--ignore-scripts` / Bun's empty
  `trustedDependencies` posture.
