// Public JSX runtime entry — `@repo/tsconfig/jsx.json` points `jsxImportSource` here, and TS/Bun
// append `/jsx-runtime` to it. Resolution goes through this package's `exports` map (ordinary package
// self-reference), so it does not depend on the hoisted-node_modules symlink.
//
// `JSX` is re-exported with `export type` because `declare namespace` is type-only and
// `verbatimModuleSyntax` rejects a value re-export of it (TS1205).

export type { JSX } from "./lib/jsx/runtime.ts";
export { jsx, jsxs } from "./lib/jsx/runtime.ts";
