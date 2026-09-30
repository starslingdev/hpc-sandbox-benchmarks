#!/usr/bin/env bun
// Read-only audit. Configure environments in repository settings; see docs/ci-secrets.md.
import {
	accountSecretNames,
	PROVIDER_ACCOUNTS,
	providerEnvironment,
} from "@sandbox-benchmarks/schema/provider-ci";
import { type } from "arktype";

function gh(...args: string[]): string {
	const result = Bun.spawnSync(["gh", ...args], {
		env: { ...process.env, GH_TOKEN: undefined, GITHUB_TOKEN: undefined },
		stdout: "pipe",
		stderr: "pipe",
	});
	if (result.exitCode !== 0) throw new Error(Buffer.from(result.stderr).toString());
	return Buffer.from(result.stdout).toString().trim();
}
const api = (path: string): unknown => JSON.parse(gh("api", path));
const repo = gh("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner");
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))
	throw new Error("Invalid repository identity");
const option = (name: string) =>
	process.argv
		.slice(2)
		.find((arg) => arg.startsWith(`--${name}=`))
		?.split("=", 2)[1];
if (process.argv.slice(2).some((arg) => !/^--(accounts|validation-branch)=/.test(arg)))
	throw new Error("Read-only audit: only --accounts and --validation-branch are supported");
const accounts = option("accounts")?.split(",") ?? [...PROVIDER_ACCOUNTS, "release"];
const branch = option("validation-branch");
if (branch && (!branch.startsWith("codex/") || /[*?[\]{}\s]/.test(branch)))
	throw new Error("Validation must name one exact codex branch");
if (
	!accounts.length ||
	accounts.some((account) => account !== "release" && !PROVIDER_ACCOUNTS.includes(account))
)
	throw new Error("Unknown provider account");
for (const account of accounts) {
	const environment = account === "release" ? "release" : providerEnvironment(account);
	const path = `repos/${repo}/environments/${environment}`;
	const config = type({
		protection_rules: type({ type: "string", "reviewers?": "unknown[]" }).array(),
		deployment_branch_policy: { custom_branch_policies: "boolean" },
		can_admins_bypass: "boolean",
	}).assert(api(path));
	if (
		!config.protection_rules.some(
			(rule) => rule.type === "required_reviewers" && rule.reviewers?.length,
		) ||
		!config.deployment_branch_policy.custom_branch_policies ||
		config.can_admins_bypass !== false
	)
		throw new Error(
			`${environment}: required review, selected branches and no admin bypass required`,
		);
	const policies = type({
		branch_policies: type({ name: "string", type: "string" }).array(),
	}).assert(api(`${path}/deployment-branch-policies`)).branch_policies;
	const branches = ["main", ...(branch && account !== "release" ? [branch] : [])];
	if (
		!policies.some((policy) => policy.name === "main" && policy.type === "branch") ||
		policies.some((policy) => policy.type !== "branch" || !branches.includes(policy.name))
	)
		throw new Error(`${environment}: unexpected branch policy`);
	const allowed = account === "release" ? [] : accountSecretNames(account);
	const actual = type({ secrets: type({ name: "string" }).array() })
		.assert(api(`${path}/secrets`))
		.secrets.map((secret) => secret.name);
	if (
		allowed.some((name) => !actual.includes(name)) ||
		actual.some((name) => !allowed.includes(name))
	)
		throw new Error(
			`${environment}: credential names must exactly match ${allowed.join(", ") || "none"}`,
		);
	console.log(`${environment}: protections and credential allowlist verified`);
}
