// The package's single binding of its vendor library. CJS on purpose: mixing novita-sandbox's ESM
// build with CJS dependents makes Bun's require(chalk) flaky (unchanged from the current driver).
import { createRequire } from "node:module";

export type NovitaSdk = typeof import("novita-sandbox");
export const loadNovitaSdk = (): NovitaSdk =>
	createRequire(import.meta.url)("novita-sandbox") as NovitaSdk;
export const NOVITA_DOMAIN = "us-phx-1.sandbox.novita.ai";
