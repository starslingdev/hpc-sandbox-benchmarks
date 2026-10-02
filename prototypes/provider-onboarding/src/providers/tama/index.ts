// The loader-facing module for a data-only CLI provider. In the target design this file does not
// exist: packages/drivers' generated loader calls compileCliManifest(REGISTRY[id].driver) itself.
// The named exports below exist only so the provider's unmodified legacy test suite can import them.

import { TAMA_PROVENANCE } from "../../../../../packages/tama/src/provenance.ts";
import { compileCliManifest } from "../../kit/cli.ts";
import { TAMA_MANIFEST } from "./manifest.ts";

const tama = compileCliManifest("tama", TAMA_MANIFEST);
export default tama.module(TAMA_PROVENANCE);

export { TAMA_PROVENANCE, tama as _compiled };
export const TAMA_MACHINES = tama.rows;
export const TAMA_SANDBOX_ID = tama.sandboxId;
export const TAMA_MACHINE_NOT_FOUND = tama.notFound;
export const TAMA_CREATE_CEILING_MS = TAMA_MANIFEST.timeouts.createCeilingMs;
export const TAMA_EXECUTION = tama.execution;
export const TAMA_REQUEST_COVERAGE = tama.coverage;
export const tamaSpec = tama.spec;
