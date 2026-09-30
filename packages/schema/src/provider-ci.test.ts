import { expect, test } from "bun:test";
import {
	accountSecretNames,
	assertProviderAccount,
	PROVIDER_ACCOUNTS,
	providerAccount,
	providerEnvironment,
} from "./provider-ci.ts";
import { PROVIDER_IDS } from "./provider-ids.ts";

test("shared vendor variants share exactly one credential domain", () => {
	expect(providerAccount("daytona-vm")).toBe("daytona");
	expect(providerAccount("daytona-container")).toBe("daytona");
	expect(providerAccount("modal-vm")).toBe("modal");
	expect(providerAccount("modal-gvisor")).toBe("modal");
	assertProviderAccount("daytona", ["daytona-vm", "daytona-container"]);
	expect(() => assertProviderAccount("brezel", ["brezel", "e2b"])).toThrow();
	expect(() => assertProviderAccount("brezel", [])).toThrow();
	expect(() => assertProviderAccount("brezel", ["unknown"])).toThrow();
	expect(() => providerEnvironment("unknown")).toThrow();
});

test("every credential belongs to exactly one account environment", () => {
	const owners = new Map<string, string>();
	for (const account of PROVIDER_ACCOUNTS) {
		for (const name of accountSecretNames(account)) {
			expect(owners.has(name)).toBe(false);
			owners.set(name, account);
		}
	}
	for (const id of PROVIDER_IDS) expect(PROVIDER_ACCOUNTS).toContain(providerAccount(id));
	expect(accountSecretNames("brezel")).toEqual(["BREZEL_API_KEY"]);
	expect(accountSecretNames("namespace")).toEqual(["NAMESPACE_TENANT_ID"]);
	expect([...owners.keys()]).not.toContain("NSC_TOKEN");
});
