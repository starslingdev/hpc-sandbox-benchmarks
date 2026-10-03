import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("SIGTERM waits for a release operation's cancellation cleanup before exiting", async () => {
	const directory = await mkdtemp(join(tmpdir(), "release-owner-")),
		path = join(directory, "release.ts");
	const owner = new URL("./sandbox-owner.ts", import.meta.url).href;
	await Bun.write(
		path,
		`import {withOwnedShutdownOperation} from ${JSON.stringify(owner)};
await withOwnedShutdownOperation(async signal=>{
 const aborted=new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));
 console.log('ready');await aborted;await Bun.sleep(30);console.log('release-cleaned');signal.throwIfAborted();
}).catch(()=>{});`,
	);
	const child = Bun.spawn([process.execPath, path], { stdout: "pipe", stderr: "pipe" });
	try {
		const reader = child.stdout.getReader(),
			ready = await reader.read();
		expect(new TextDecoder().decode(ready.value)).toContain("ready");
		child.kill("SIGTERM");
		let output = "";
		for (;;) {
			const chunk = await reader.read();
			if (chunk.done) break;
			output += new TextDecoder().decode(chunk.value);
		}
		reader.releaseLock();
		expect(await child.exited).toBe(143);
		expect(output).toContain("release-cleaned");
	} finally {
		child.kill("SIGKILL");
		await rm(directory, { recursive: true, force: true });
	}
});
