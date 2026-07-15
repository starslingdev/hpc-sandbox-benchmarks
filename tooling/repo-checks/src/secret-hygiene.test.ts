// Invariant: no credential material is ever committed. checkSecretHygiene() against the real tracked
// tree IS the CI enforcement point (same precedent as workflow-hardening.test.ts); the rest is unit
// coverage of the pure detectors on synthetic drift so a regression names the offender. The example
// tokens below are syntactically valid vendor formats but are NOT real credentials — this file is in
// CONTENT_SCAN_EXCLUDED so the gate does not scan its own fixtures. See ./lib/secret-hygiene.ts.
import { describe, expect, test } from "bun:test";
import {
	CONTENT_SCAN_EXCLUDED,
	checkSecretHygiene,
	forbiddenTrackedFilenames,
	secretMaterialIn,
	trackedFiles,
} from "./lib/secret-hygiene.ts";

describe("forbiddenTrackedFilenames", () => {
	test("flags dotenv files but allows .env.example and non-dotenv *.env config", () => {
		const errors = forbiddenTrackedFilenames([
			".env",
			".env.local",
			"apps/cli/.env.production",
			".env.example", // documented template — allowed
			"lib/pts/realworld/selftest/target.env", // PTS suite config, not a dotenv — allowed
			"packages/schema/src/pts-profiles/local/x/target.env", // allowed
		]);
		expect(errors).toEqual([
			".env.local: dotenv file (holds environment credentials) must not be committed (see SECURITY.md)",
			".env: dotenv file (holds environment credentials) must not be committed (see SECURITY.md)",
			"apps/cli/.env.production: dotenv file (holds environment credentials) must not be committed (see SECURITY.md)",
		]);
	});

	test("flags private-key / keystore extensions case-insensitively", () => {
		const errors = forbiddenTrackedFilenames([
			"certs/server.pem",
			"deploy/id.KEY",
			"a/b/store.p12",
			"c/keystore.jks",
			"d/app.pfx",
			"src/index.ts", // ordinary source — allowed
		]);
		expect(errors).toHaveLength(5);
		expect(errors.every((e) => e.includes("private key / keystore material"))).toBe(true);
	});

	test("flags conventional credential basenames", () => {
		const errors = forbiddenTrackedFilenames([
			"deploy/id_rsa",
			"home/.ssh/id_ed25519",
			"gcp/credentials.json",
			"packages/schema/src/config.json", // ordinary json — allowed
		]);
		expect(errors).toHaveLength(3);
		expect(errors.every((e) => e.includes("conventional credential file"))).toBe(true);
	});

	test("returns [] for a clean list", () => {
		expect(forbiddenTrackedFilenames(["README.md", "src/index.ts", "docs/methodology.md"])).toEqual(
			[],
		);
	});
});

describe("secretMaterialIn", () => {
	test("detects a PEM private-key header", () => {
		expect(secretMaterialIn("prefix\n-----BEGIN OPENSSH PRIVATE KEY-----\n...")).toEqual([
			"PEM private key header",
		]);
	});

	test("detects an AWS access key id", () => {
		expect(secretMaterialIn("aws_access_key_id = AKIAIOSFODNN7EXAMPLE")).toEqual([
			"AWS access key id",
		]);
	});

	test("detects a GitHub token", () => {
		expect(secretMaterialIn("token: ghp_0123456789abcdefghijklmnopqrstuvwxyz")).toEqual([
			"GitHub token",
		]);
	});

	test("detects a Google API key and an OpenAI-style key", () => {
		// Google keys are AIza + exactly 35 of [0-9A-Za-z_-]; OpenAI-style are sk- + 32+ alnum.
		const google = `AIza${"b".repeat(35)}`;
		const openai = `sk-${"a".repeat(36)}`;
		expect(secretMaterialIn(`key1 ${google} key2 ${openai}`)).toEqual([
			"Google API key",
			"OpenAI-style API key",
		]);
	});

	test("does not fire on ordinary source text", () => {
		expect(
			secretMaterialIn(
				"const E2B_API_KEY = process.env.E2B_API_KEY; // read the key from the environment\nhttps://example.com/sk-not-a-key",
			),
		).toEqual([]);
	});

	test("does not fire on a short sk- string (below the length floor)", () => {
		expect(secretMaterialIn("sk-short")).toEqual([]);
	});
});

describe("the gate itself", () => {
	test("the real tracked tree carries no committed secrets", () => {
		expect(checkSecretHygiene()).toEqual([]);
	});

	test("every content-scan exclusion is a tracked file with a documented reason", () => {
		// The exclusion list can't rot into scanning nothing: each excluded path must still be tracked,
		// and must carry a non-empty reason (parity with workflow-hardening's CREDENTIALED_CHECKOUTS).
		// Use the library helper (rooted at the repo, not the process cwd) so the paths are repo-relative
		// under `bun --filter`, which runs this test from the package directory.
		const tracked = new Set(trackedFiles());
		for (const [path, reason] of Object.entries(CONTENT_SCAN_EXCLUDED)) {
			expect(reason.length).toBeGreaterThan(0);
			expect(tracked.has(path)).toBe(true);
		}
	});
});
