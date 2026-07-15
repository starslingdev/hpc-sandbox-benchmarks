<!--
Thanks for contributing! Keep the summary tight and let the diff carry the detail.
Live provider benches and toolchain releases are maintainer-only (Environment `privileged`); a fork
PR runs only the hosted CI gate — see CONTRIBUTING.md and docs/ci-secrets.md.
-->

## Summary

<!-- What changes and why, in a sentence or two. -->

## Type of change

- [ ] Bug fix
- [ ] New provider / suite / metric (see CONTRIBUTING.md)
- [ ] CI / tooling / docs
- [ ] Other

## Checklist

- [ ] `bun run lint`, `bun run typecheck`, and `bun run test` pass locally (the same gate CI runs)
- [ ] `bun run spell` passes (via `mise`)
- [ ] For PTS-catalog changes: regenerated and `bun run check:catalog-drift` is clean
- [ ] No secrets, `.env` files, or credentials are committed (SECURITY.md)
