import { describe, expect, spyOn, test } from "bun:test";
import { Freestyle } from "freestyle";
import { freestyleFetch } from "./transport.ts";

function transport(respond: (url: URL, init?: RequestInit) => Response | Promise<Response>) {
	return Object.assign(
		async (input: Parameters<typeof fetch>[0], init?: RequestInit) =>
			respond(new URL(String(input)), init),
		{ preconnect: fetch.preconnect },
	);
}
const accepted = (resultUrl = "/v5/background-requests/request-1") =>
	Response.json({ resultUrl }, { status: 202 });

describe("Freestyle bounded SDK transport", () => {
	test("resolves repeated 202 responses before returning the native SDK value", async () => {
		let polls = 0;
		const client = new Freestyle({
			apiKey: "test-sentinel",
			fetch: freestyleFetch(
				transport((url, init) => {
					if (url.pathname === "/v5/vms") return accepted();
					expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-sentinel");
					expect(new Headers(init?.headers).has("x-freestyle-background-after-secs")).toBe(false);
					return ++polls === 1 ? accepted() : Response.json({ vms: [], totalCount: 0 });
				}),
				2_000,
			),
		});
		expect(await client.vms.list()).toMatchObject({ vms: [], totalCount: 0 });
		expect(polls).toBe(2);
	});

	test("shares one deadline with a hanging background poll", async () => {
		let pollSignal: AbortSignal | undefined;
		const client = new Freestyle({
			apiKey: "test-sentinel",
			fetch: freestyleFetch(
				transport((url, init) => {
					if (url.pathname === "/v5/vms") return accepted();
					pollSignal = init?.signal ?? undefined;
					return new Promise((_resolve, reject) => {
						pollSignal?.addEventListener("abort", () => reject(pollSignal?.reason), { once: true });
					});
				}),
				30,
			),
		});
		await expect(client.vms.list()).rejects.toThrow();
		expect(pollSignal?.aborted).toBe(true);
	});

	test("cancels the fetch when polling times out before the deadline signal", async () => {
		const timeout = spyOn(AbortSignal, "timeout").mockReturnValue(new AbortController().signal);
		try {
			let pollSignal: AbortSignal | undefined;
			const bounded = freestyleFetch(
				transport((url, init) => {
					if (url.pathname === "/v5/vms") return accepted();
					pollSignal = init?.signal ?? undefined;
					return new Promise((_resolve, reject) => {
						pollSignal?.addEventListener("abort", () => reject(pollSignal?.reason), { once: true });
					});
				}),
				5,
			);
			await expect(bounded("https://api.freestyle.sh/v5/vms")).rejects.toMatchObject({
				code: "readiness-timeout",
			});
			expect(pollSignal?.aborted).toBe(true);
		} finally {
			timeout.mockRestore();
		}
	});

	test("caller cancellation stops polling and reaches the underlying fetch", async () => {
		const controller = new AbortController();
		let polls = 0;
		let pollSignal: AbortSignal | undefined;
		const client = new Freestyle({
			apiKey: "test-sentinel",
			fetch: freestyleFetch(
				transport((url, init) => {
					if (url.pathname === "/v5/vms") return accepted();
					polls++;
					pollSignal = init?.signal ?? undefined;
					controller.abort(new Error("cancelled by caller"));
					return accepted();
				}),
				2_000,
				controller.signal,
			),
		});
		await expect(client.vms.list()).rejects.toThrow("cancelled by caller");
		expect(polls).toBe(1);
		expect(pollSignal?.aborted).toBe(true);
	});

	test("rejects remote and malformed result locators before forwarding credentials", async () => {
		for (const resultUrl of [
			"https://unrelated.example/v5/background-requests/request-1",
			"/v5/vms/vm-other",
			"/v5/background-requests/request-1?extra=1",
		]) {
			let calls = 0;
			const bounded = freestyleFetch(
				transport(() => {
					calls++;
					return accepted(resultUrl);
				}),
				1_000,
			);
			await expect(bounded("https://api.freestyle.sh/v5/vms")).rejects.toThrow(
				"invalid background request locator",
			);
			expect(calls).toBe(1);
		}
	});

	test("supports the request-id header when the body has no locator", async () => {
		const bounded = freestyleFetch(
			transport((url) =>
				url.pathname === "/v5/vms"
					? Response.json(
							{},
							{ status: 202, headers: { "x-freestyle-background-request-id": "request-1" } },
						)
					: Response.json({ complete: true }),
			),
			1_000,
		);
		expect(await (await bounded("https://api.freestyle.sh/v5/vms")).json()).toEqual({
			complete: true,
		});
	});

	test("re-fetches a GET whose stored background result exceeded the API limit", async () => {
		let calls = 0;
		const client = new Freestyle({
			apiKey: "test-sentinel",
			fetch: freestyleFetch(
				transport((url, init) => {
					calls++;
					if (url.pathname.startsWith("/v5/background-requests/"))
						return Response.json(
							{ code: "BACKGROUND_RESULT_UNSTORABLE", message: "too large" },
							{ status: 500 },
						);
					return new Headers(init?.headers).has("x-freestyle-background-after-secs")
						? accepted()
						: Response.json({ vms: [], totalCount: 0 });
				}),
				1_000,
			),
		});
		expect(await client.vms.list()).toMatchObject({ vms: [], totalCount: 0 });
		expect(calls).toBe(3);
	});

	test("never repeats a mutation whose stored result exceeded the API limit", async () => {
		let calls = 0;
		const client = new Freestyle({
			apiKey: "test-sentinel",
			fetch: freestyleFetch(
				transport((url) => {
					calls++;
					return url.pathname.startsWith("/v5/background-requests/")
						? Response.json(
								{ code: "BACKGROUND_RESULT_UNSTORABLE", message: "too large" },
								{ status: 500 },
							)
						: accepted();
				}),
				1_000,
			),
		});
		await expect(client.vms.delete("vm-test")).rejects.toThrow("operation outcome is unconfirmed");
		expect(calls).toBe(2);
	});

	test("preserves vendor errors when a background error body is not JSON", async () => {
		const client = new Freestyle({
			apiKey: "test-sentinel",
			fetch: freestyleFetch(
				transport((url) =>
					url.pathname === "/v5/vms" ? accepted() : new Response("unavailable", { status: 503 }),
				),
				1_000,
			),
		});
		await expect(client.vms.list()).rejects.toMatchObject({ status: 503 });
	});
});
