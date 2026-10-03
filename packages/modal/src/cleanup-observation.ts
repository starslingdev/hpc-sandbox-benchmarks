import type { CleanupRecovery } from "@sandbox-benchmarks/schema";
import { ModalClient } from "modal";
import { MODAL_APP_NAME, modalListingPages } from "./vendor.ts";

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
	const appName = MODAL_APP_NAME;
	const app = await client.apps.fromName(appName, { createIfMissing: false });
	// A retained original allocation must appear in this App's server-side history. An empty App
	// in a different account/environment cannot certify cleanup of the original run.
	let anchored = false;
	const history = modalListingPages(async (beforeTimestamp) => {
		signal.throwIfAborted();
		return (
			await client.cpClient.sandboxListV2({
				appId: app.appId,
				includeFinished: true,
				beforeTimestamp,
			})
		).sandboxes;
	}, 100);
	for await (const page of history) {
		if (page.some((sandbox) => sandbox.id === anchorSandboxId && sandbox.appId === app.appId)) {
			anchored = true;
			break;
		}
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
