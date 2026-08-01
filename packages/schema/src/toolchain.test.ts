import { describe, expect, it } from "bun:test";
import {
	TOOLCHAIN_VERSION,
	VERCEL_PROJECT_NAME_DEFAULT,
	VERCEL_TEAM_SLUG_DEFAULT,
	VERCEL_VCR_REPOSITORY,
	validateVercelVcrImageRef,
	vercelVcrImageRefs,
} from "./toolchain.ts";

describe("Vercel VCR image refs", () => {
	it("uses realistic team-slug and project-name namespace segments", () => {
		const refs = vercelVcrImageRefs("starsling-dev", "sandbox-benchmarks");
		expect(refs).toEqual({
			repository: `vcr.vercel.com/starsling-dev/sandbox-benchmarks/${VERCEL_VCR_REPOSITORY}`,
			version: `vcr.vercel.com/starsling-dev/sandbox-benchmarks/${VERCEL_VCR_REPOSITORY}:${TOOLCHAIN_VERSION}`,
			candidate: `vcr.vercel.com/starsling-dev/sandbox-benchmarks/${VERCEL_VCR_REPOSITORY}:${TOOLCHAIN_VERSION}-candidate`,
		});
	});

	it("ships defaults that are themselves valid namespace components", () => {
		// The defaults are what every job resolves to when the CI variables are unset, so an invalid one
		// would throw at config load in EVERY provider's job — not just Vercel's. Gate them here, where
		// the failure is a unit test rather than a fleet-wide import crash.
		expect(() =>
			vercelVcrImageRefs(VERCEL_TEAM_SLUG_DEFAULT, VERCEL_PROJECT_NAME_DEFAULT),
		).not.toThrow();
		expect(
			vercelVcrImageRefs(VERCEL_TEAM_SLUG_DEFAULT, VERCEL_PROJECT_NAME_DEFAULT).repository,
		).toBe(
			`vcr.vercel.com/${VERCEL_TEAM_SLUG_DEFAULT}/${VERCEL_PROJECT_NAME_DEFAULT}/${VERCEL_VCR_REPOSITORY}`,
		);
	});

	it("rejects API IDs and unsafe Docker path components", () => {
		expect(() => vercelVcrImageRefs("team_abc123", "sandbox-benchmarks")).toThrow(
			"never an API ID",
		);
		expect(() => vercelVcrImageRefs("starsling-dev", "prj_abc123")).toThrow("never an API ID");
		expect(() => vercelVcrImageRefs("Starsling Dev", "sandbox-benchmarks")).toThrow(
			"canonical lowercase name",
		);
		expect(() => vercelVcrImageRefs("starsling-dev", "../other-project")).toThrow(
			"canonical lowercase name",
		);
	});

	it("accepts only tags or digests in the configured canonical repository", () => {
		const refs = vercelVcrImageRefs("starsling-dev", "sandbox-benchmarks");
		expect(
			validateVercelVcrImageRef(
				`${refs.repository}@sha256:${"a".repeat(64)}`,
				"starsling-dev",
				"sandbox-benchmarks",
			),
		).toContain("@sha256:");
		expect(() =>
			validateVercelVcrImageRef(
				"vcr.vercel.com/team_abc/prj_abc/toolchain:v6",
				"starsling-dev",
				"sandbox-benchmarks",
			),
		).toThrow("expected repository");
		expect(() =>
			validateVercelVcrImageRef(
				`${refs.repository}@sha256:not-a-digest`,
				"starsling-dev",
				"sandbox-benchmarks",
			),
		).toThrow("expected repository");
	});
});
