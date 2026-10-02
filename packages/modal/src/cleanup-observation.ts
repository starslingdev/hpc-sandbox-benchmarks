import type { CleanupRecovery } from "@sandbox-benchmarks/schema";
import { ModalClient } from "modal";

/** Read-only clearance of the reviewed native-create App, never a guess at a missing ID. */
export async function observeModalCleanupApp(
	anchorSandboxId: string,
	signal: AbortSignal,
	client = new ModalClient({
		grpcMiddleware: [
			async function* (call, options) {
				return yield* call.next(call.request, {
					...options,
					signal,
				});
			},
		],
	}),
): Promise<CleanupRecovery["observation"]> {
	const appName = "sandbox-benchmarks";
	const app = await client.apps.fromName(appName, { createIfMissing: false });
	// A retained original allocation must appear in this App's server-side history. An empty App
	// in a different account/environment cannot certify cleanup of the original run.
	let anchored = false;
	let beforeTimestamp: number | undefined;
	for (let page = 0; page < 100; page++) {
		signal.throwIfAborted();
		const result = await client.cpClient.sandboxListV2({
			appId: app.appId,
			includeFinished: true,
			beforeTimestamp,
		});
		if (
			result.sandboxes.some(
				(sandbox) => sandbox.id === anchorSandboxId && sandbox.appId === app.appId,
			)
		) {
			anchored = true;
			break;
		}
		const last = result.sandboxes.at(-1);
		if (!last) break;
		if (
			!Number.isFinite(last.createdAt) ||
			(beforeTimestamp !== undefined && last.createdAt >= beforeTimestamp)
		)
			throw new Error("Modal history pagination did not advance");
		beforeTimestamp = last.createdAt;
	}
	if (!anchored)
		throw new Error("Modal App history does not contain the original run's anchor sandbox");
	for (let pass = 0; pass < 2; pass++) {
		for (const generation of [
			client.sandboxes.list({ appId: app.appId }),
			client.sandboxes.experimentalList({ appId: app.appId }),
		]) {
			for await (const sandbox of generation) {
				sandbox.detach();
				throw new Error(
					"Modal benchmark App still has a running allocation; identity-based cleanup required",
				);
			}
		}
	}
	return {
		kind: "modal-app",
		appName,
		appId: app.appId,
		anchorSandboxId,
		environment: client.environmentName() || "main",
		v1Running: 0,
		v2Running: 0,
		inventoryPasses: 2,
	};
}
