import { describe, expect, it } from "bun:test";
import { CANDIDATE_SUFFIX } from "@sandbox-benchmarks/provider-core";
import { TOOLCHAIN_IMAGE_NAME, TOOLCHAIN_VERSION } from "@sandbox-benchmarks/schema";
import { e2bAdapter, e2bTemplate, e2bTemplateCandidate, e2bTemplateVersion } from "./index.ts";

describe("@sandbox-benchmarks/provider-e2b", () => {
	it("version-scopes the public template name from the shared toolchain identity", () => {
		expect(e2bTemplateVersion).toBe(`${TOOLCHAIN_IMAGE_NAME}-${TOOLCHAIN_VERSION}`);
	});

	it("derives the candidate name from the version via the shared candidate convention", () => {
		expect(e2bTemplateCandidate).toBe(`${e2bTemplateVersion}${CANDIDATE_SUFFIX}`);
	});

	it("boots the E2B_TEMPLATE override when set, else the public version", () => {
		expect(e2bTemplate).toBe(process.env.E2B_TEMPLATE ?? e2bTemplateVersion);
	});

	it("pins the active template as the adapter's create-time snapshotId", () => {
		// computesdk maps snapshotId → the e2b template id/name; cpu/memory live in the template's
		// e2b.toml, so the template ref is the adapter's entire create-time policy.
		expect(e2bAdapter.createOptions).toEqual({ snapshotId: e2bTemplate });
		expect(typeof e2bAdapter.createCompute).toBe("function");
	});
});
