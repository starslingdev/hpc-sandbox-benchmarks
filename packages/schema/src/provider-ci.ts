// Credential domains follow the same vendor account boundary as the benchmark scheduler.

import type { ProviderId } from "./provider-ids.ts";
import { PROVIDER_IDS } from "./provider-ids.ts";
import { REGISTRY } from "./provider-meta/index.ts";
import { normalizeProviderInput } from "./provider-meta.ts";

export function providerAccount(id: ProviderId): string {
	const meta = REGISTRY[id];
	return "quotaDomain" in meta ? meta.quotaDomain : id;
}
export const PROVIDER_ACCOUNTS = [...new Set(PROVIDER_IDS.map(providerAccount))];
export function providerEnvironment(account: string): string {
	if (!PROVIDER_ACCOUNTS.includes(account)) throw new Error(`Unknown provider account: ${account}`);
	return `provider-${account}`;
}
export function accountSecretNames(account: string): string[] {
	providerEnvironment(account);
	const names = PROVIDER_IDS.filter((id) => providerAccount(id) === account).flatMap((id) =>
		REGISTRY[id].inputs
			.map(normalizeProviderInput)
			.filter((input) => input.source.kind === "secret")
			.map((input) => input.name),
	);
	if (account === "namespace") names.push("NAMESPACE_TENANT_ID");
	if (account === "vercel") names.push("VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID");
	return [...new Set(names)].sort();
}
export function assertProviderAccount(account: string, providers: readonly string[]): void {
	providerEnvironment(account);
	if (
		providers.length === 0 ||
		providers.some(
			(id) =>
				!PROVIDER_IDS.includes(id as ProviderId) || providerAccount(id as ProviderId) !== account,
		)
	)
		throw new Error(`Providers must belong to account ${account}`);
}

/** Presence-only guard: no foreign secret value is exported into the runner process. */
export function foreignCredentialExpression(fixedAccount?: string): string {
	if (fixedAccount !== undefined) providerEnvironment(fixedAccount);
	const clauses = PROVIDER_ACCOUNTS.filter((account) => account !== fixedAccount).flatMap(
		(account) =>
			accountSecretNames(account).map((name) =>
				fixedAccount === undefined
					? `(inputs.account != '${account}' && secrets.${name} != '')`
					: `secrets.${name} != ''`,
			),
	);
	clauses.push(
		...["NSC_TOKEN", "ANTHROPIC_API_KEY", "SUBMODULES_PAT", "FIREWORKS_API_KEY"].map(
			(name) => `secrets.${name} != ''`,
		),
	);
	return `\${{ ${clauses.join(" || ")} }}`;
}
