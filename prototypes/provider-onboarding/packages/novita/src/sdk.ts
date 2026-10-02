// The package's single binding of its vendor library. CJS on purpose: mixing novita-sandbox's ESM
// build with CJS dependents makes Bun's require(chalk) flaky (unchanged from the current driver).
import { createRequire } from "node:module";

export type NovitaSdk = typeof import("novita-sandbox");
let sdk: NovitaSdk | undefined;
export const loadNovitaSdk = (): NovitaSdk => {
	sdk ??= createRequire(import.meta.url)("novita-sandbox") as NovitaSdk;
	return sdk;
};
export const NOVITA_DOMAIN = "us-phx-1.sandbox.novita.ai";
