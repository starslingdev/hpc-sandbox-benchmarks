import { pollUntilReady } from "@sandbox-benchmarks/driver";
import { type } from "arktype";

const backgroundRequest = type({ "requestId?": "string", "resultUrl?": "string" });
const backgroundError = type({ "code?": "string" });

/** The SDK's own 202 loop has no deadline and drops cancellation. Resolve it inside the
 * transport so allocation, deletion and every background poll share one bounded signal. */
export function freestyleFetch(
	fetchImpl: typeof fetch,
	timeoutMs: number,
	callerSignal?: AbortSignal,
): typeof fetch {
	return Object.assign(
		async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
			const deadline = Date.now() + timeoutMs;
			const signal = AbortSignal.any([
				AbortSignal.timeout(timeoutMs),
				...(callerSignal ? [callerSignal] : []),
				...(init?.signal ? [init.signal] : []),
			]);
			signal.throwIfAborted();
			const response = await fetchImpl(input, { ...init, signal });
			if (response.status !== 202) return response;

			const body = backgroundRequest.assert(await response.json());
			const id = response.headers.get("x-freestyle-background-request-id") ?? body.requestId;
			const path =
				body.resultUrl ?? (id ? `/v5/background-requests/${encodeURIComponent(id)}` : "");
			const origin = new URL(input instanceof Request ? input.url : String(input));
			const resultUrl = new URL(path, origin);
			if (
				resultUrl.origin !== origin.origin ||
				!/^\/v5\/background-requests\/[A-Za-z0-9_-]+$/.test(resultUrl.pathname) ||
				resultUrl.search ||
				resultUrl.hash
			)
				throw new Error("Freestyle returned an invalid background request locator");
			const headers = new Headers(init?.headers);
			headers.delete("x-freestyle-background-after-secs");
			headers.delete("content-type");
			const completed = await pollUntilReady({
				provider: "freestyle",
				deadlineMs: Math.max(1, deadline - Date.now()),
				intervalMs: 500,
				signal,
				poll: async () => {
					const result = await fetchImpl(resultUrl, { method: "GET", headers, signal });
					return result.status === 202 ? null : result;
				},
			});
			// Preserve the SDK's uncapped GET fallback when a background result was too large to store.
			if (!completed.ok && (init?.method ?? "GET") === "GET") {
				const error = backgroundError(
					await completed
						.clone()
						.json()
						.catch(() => null),
				);
				if (!(error instanceof type.errors) && error.code === "BACKGROUND_RESULT_UNSTORABLE") {
					const direct = await fetchImpl(input, { ...init, headers, signal });
					if (direct.status === 202)
						throw new Error("Freestyle uncapped GET unexpectedly returned a background request");
					return direct;
				}
			}
			// A poll failure may concern the handle, auth or rate limit rather than the original
			// operation. It cannot prove allocation rejection or VM absence.
			if (!completed.ok)
				throw Object.assign(
					new Error(
						`Freestyle background request returned HTTP ${completed.status}; operation outcome is unconfirmed`,
					),
					{ status: completed.status },
				);
			return completed;
		},
		{ preconnect: fetch.preconnect },
	);
}
