// Public JSX dev-runtime entry. Bun emits `jsxDEV` calls under `bun test` and
// `bun build --target=bun` regardless of `jsx: "react-jsx"`, so this module — not ./jsx-runtime.ts —
// is what actually executes in tests. Deleting it turns every `.tsx` test into
// `Cannot find module '@sandbox-benchmarks/figures/jsx-dev-runtime'`.

export type { JSX } from "./lib/jsx/runtime.ts";
export { Fragment, jsxDEV } from "./lib/jsx/runtime.ts";
