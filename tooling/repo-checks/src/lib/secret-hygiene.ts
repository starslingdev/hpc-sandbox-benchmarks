// Drift gate: the repository never commits credential material. SECURITY.md promises "Never commit
// API keys, tokens, or `.env` files"; .gitignore blocks the usual filenames — but a convention plus
// an ignore list is not enforcement (a `git add -f`, a renamed file, or a pasted key in a source
// string all slip past both). This gate turns the promise into an invariant checked in CI, over the
// set of files git actually tracks. Two independent checks:
//
//   1. Forbidden filenames — a tracked path whose name is a credential file by convention
//      (`.env`/`.env.<env>` except the documented `.env.example`, private-key material `*.pem` /
//      `*.key` / `*.p12` / `*.pfx` / `id_rsa` …, `credentials.json`). These carry secrets by their
//      very name; none belongs in version control.
//   2. Secret material in content — a tracked text file whose bytes contain a high-signal secret
//      token (a PEM private-key header, an AWS access-key id, a GitHub PAT, a Slack/Google key).
//      The patterns are deliberately specific (fixed vendor prefixes + length) so real source does
//      not trip them; low-signal shapes (bare `password=`, provider tokens with no fixed prefix) are
//      left to human review rather than risk a false gate failure.
//
// Pure detectors below are unit-tested on synthetic input; `checkSecretHygiene()` runs them against
// the real tracked tree and IS the CI enforcement point (same precedent as workflow-hardening.ts).
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "./workspace.ts";

/** Files whose CONTENT is not scanned for secret material, with the reason. Their bytes legitimately
 *  contain secret-shaped strings, so scanning them would be a guaranteed false positive:
 *   - this gate's own source + test carry the detector patterns and example tokens by necessity;
 *   - `bun.lock` is a machine-generated dependency graph (integrity hashes look tokenish, and it is
 *     large) — its filenames are still subject to the forbidden-name check, only its content is skipped.
 *  Keyed by repo-relative path. Filename rules (check 1) still apply to every tracked file. */
export const CONTENT_SCAN_EXCLUDED: Readonly<Record<string, string>> = {
	"tooling/repo-checks/src/lib/secret-hygiene.ts": "defines the secret-material detector patterns",
	"tooling/repo-checks/src/secret-hygiene.test.ts": "exercises the detectors with example tokens",
	"bun.lock": "generated lockfile; integrity hashes are token-shaped and the file is large",
};

/** A tracked file larger than this is assumed generated/binary and skipped for content scanning.
 *  Real source files are far smaller; a committed secret lives in a small text file, not a blob. */
const MAX_CONTENT_SCAN_BYTES = 512 * 1024;

/** One forbidden-filename rule: a predicate over the repo-relative path and the reason it is banned. */
export interface FilenameRule {
	readonly label: string;
	readonly test: (relPath: string) => boolean;
}

/** The final path segment (works for both "/"-joined git paths and bare names). */
function baseName(relPath: string): string {
	const slash = relPath.lastIndexOf("/");
	return slash === -1 ? relPath : relPath.slice(slash + 1);
}

/** Lowercased extension including the dot, or "" if none (e.g. "a/b/key.PEM" → ".pem"). */
function extension(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot <= 0 ? "" : name.slice(dot).toLowerCase();
}

/** Private-key / keystore extensions that should never be committed. */
const KEY_EXTENSIONS = new Set([".pem", ".key", ".p12", ".pfx", ".jks", ".keystore"]);

/** Exact basenames of conventional secret files. */
const SECRET_BASENAMES = new Set([
	"id_rsa",
	"id_dsa",
	"id_ecdsa",
	"id_ed25519",
	"credentials.json",
]);

/** Filename rules. A tracked path matching any of these fails the gate regardless of its content. */
export const FILENAME_RULES: readonly FilenameRule[] = [
	{
		label: "dotenv file (holds environment credentials)",
		// The dotenv family is exactly `.env` or `.env.<suffix>`. `.env.example` is the documented,
		// secret-free template (see .gitignore `!.env.example`) and is allowed. Config files that merely
		// end in `.env` (e.g. `target.env`, a PTS suite descriptor) are NOT dotenv files and are fine.
		test: (rel) => {
			const name = baseName(rel);
			if (name === ".env.example") return false;
			return name === ".env" || name.startsWith(".env.");
		},
	},
	{
		label: "private key / keystore material",
		test: (rel) => KEY_EXTENSIONS.has(extension(baseName(rel))),
	},
	{
		label: "conventional credential file",
		test: (rel) => SECRET_BASENAMES.has(baseName(rel).toLowerCase()),
	},
];

/** Repo-relative paths that trip a filename rule. Empty when the tree is clean. */
export function forbiddenTrackedFilenames(relPaths: readonly string[]): string[] {
	const errors: string[] = [];
	for (const rel of relPaths) {
		for (const rule of FILENAME_RULES) {
			if (rule.test(rel)) {
				errors.push(`${rel}: ${rule.label} must not be committed (see SECURITY.md)`);
			}
		}
	}
	return errors.sort();
}

/** One secret-material content detector: a label and the token pattern (with `g` for matchAll). */
export interface SecretPattern {
	readonly label: string;
	readonly pattern: RegExp;
}

/** High-signal secret tokens: fixed vendor prefixes + length so ordinary source can't trip them. New
 *  vendor formats can be appended here. Kept narrow on purpose — see the module header. */
export const SECRET_PATTERNS: readonly SecretPattern[] = [
	{
		label: "PEM private key header",
		pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
	},
	{ label: "AWS access key id", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
	{ label: "GitHub token", pattern: /\bgh[posru]_[A-Za-z0-9]{36,}\b/g },
	{ label: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
	{ label: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
	{ label: "OpenAI-style API key", pattern: /\bsk-[A-Za-z0-9]{32,}\b/g },
];

/** Distinct secret-pattern labels found in `text` (sorted, deduped). Empty for clean content. */
export function secretMaterialIn(text: string): string[] {
	const hits = new Set<string>();
	for (const { label, pattern } of SECRET_PATTERNS) {
		// A fresh lastIndex per call: these are module-level `g` regexes reused across files.
		pattern.lastIndex = 0;
		if (pattern.test(text)) hits.add(label);
	}
	return [...hits].sort();
}

/** Bytes look binary if the head contains a NUL — skip content scanning (and its decode cost). */
function looksBinary(buf: Buffer): boolean {
	const end = Math.min(buf.length, 8192);
	for (let i = 0; i < end; i++) {
		if (buf[i] === 0) return true;
	}
	return false;
}

/** Repo-relative paths of every file git tracks, from `git ls-files -z` under `root`. */
export function trackedFiles(root: string = findRepoRoot()): string[] {
	const res = Bun.spawnSync(["git", "ls-files", "-z"], { cwd: root });
	if (res.exitCode !== 0) {
		throw new Error(`git ls-files failed: ${res.stderr.toString()}`);
	}
	return res.stdout
		.toString("utf8")
		.split("\0")
		.filter((p) => p.length > 0);
}

/**
 * The whole gate: no tracked file has a forbidden credential filename, and no scanned tracked file
 * contains high-signal secret material. `excluded` maps content-scan-exempt paths to their reason.
 */
export function checkSecretHygiene(
	root: string = findRepoRoot(),
	excluded: Readonly<Record<string, string>> = CONTENT_SCAN_EXCLUDED,
): string[] {
	const files = trackedFiles(root);
	const errors = forbiddenTrackedFilenames(files);

	for (const rel of files) {
		if (rel in excluded) continue;
		const abs = join(root, rel);
		let stat: ReturnType<typeof statSync>;
		try {
			stat = statSync(abs);
		} catch {
			// Tracked but absent from the working tree (e.g. a sparse checkout) — nothing to scan.
			continue;
		}
		if (!stat.isFile() || stat.size > MAX_CONTENT_SCAN_BYTES) continue;
		const buf = readFileSync(abs);
		if (looksBinary(buf)) continue;
		for (const label of secretMaterialIn(buf.toString("utf8"))) {
			errors.push(
				`${rel}: looks like it contains a ${label} — remove the secret (see SECURITY.md)`,
			);
		}
	}
	return errors.sort();
}
