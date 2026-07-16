// Emit a release bin's machine-readable output WITHOUT relying on a pristine stdout. The build/plan
// bins spawn subprocesses (build.sh, provider CLIs) that inherit stdout, so a `bun bin >> "$GITHUB_OUTPUT"`
// redirect would splice that subprocess chatter into the outputs file and GitHub would reject it
// ("Unable to process file command 'output'"). Writing the `key=value` lines straight to the file named
// by $GITHUB_OUTPUT keeps the outputs clean regardless of what a child process prints. Locally
// ($GITHUB_OUTPUT unset) it falls back to stdout so the bins stay runnable by hand.
import { appendFileSync } from "node:fs";

/**
 * Append newline-terminated `key=value` output lines to the GitHub Actions step-output file
 * ($GITHUB_OUTPUT), or print them to stdout when that env var is absent (local dev). `lines` is the
 * already-joined block (no trailing newline required).
 */
export function emitStepOutputs(lines: string): void {
	const file = process.env.GITHUB_OUTPUT;
	const block = lines.endsWith("\n") ? lines : `${lines}\n`;
	if (file) {
		appendFileSync(file, block);
	} else {
		process.stdout.write(block);
	}
}
