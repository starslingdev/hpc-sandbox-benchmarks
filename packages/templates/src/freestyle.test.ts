import { expect, test } from "bun:test";
import { existsSync, lstatSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freestyleSetupScript, freestyleStockToolsCleanup } from "./freestyle.ts";

test("removes global stock tool links while retaining benchmark and system tools", () => {
	const bin = mkdtempSync(join(tmpdir(), "freestyle-stock-tools-"));
	try {
		symlinkSync(
			"/usr/local/nvm/versions/node/v24/bin/typescript-language-server",
			join(bin, "typescript-language-server"),
		);
		symlinkSync("/opt/freestyle/python/bin/pylsp", join(bin, "pylsp"));
		symlinkSync("/usr/local/share/mise/bin/node", join(bin, "node"));
		writeFileSync(join(bin, "mise"), "benchmark tool");
		const result = Bun.spawnSync(["bash", "-e", "-c", freestyleStockToolsCleanup(bin)]);
		expect(result.exitCode).toBe(0);
		expect(() => lstatSync(join(bin, "typescript-language-server"))).toThrow();
		expect(() => lstatSync(join(bin, "pylsp"))).toThrow();
		expect(lstatSync(join(bin, "node")).isSymbolicLink()).toBe(true);
		expect(existsSync(join(bin, "mise"))).toBe(true);
	} finally {
		rmSync(bin, { recursive: true, force: true });
	}
});

test("native snapshot recipe parses as Bash", () => {
	const recipe = freestyleSetupScript();
	const parsed = Bun.spawnSync(["bash", "-n"], {
		stdin: Buffer.from(recipe),
		stdout: "pipe",
		stderr: "pipe",
	});
	if (parsed.exitCode !== 0) throw new Error(parsed.stderr.toString());
	expect(parsed.exitCode).toBe(0);
});
