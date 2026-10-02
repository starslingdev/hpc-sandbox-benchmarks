// Prototype: the tiny data language shared by HTTP and CLI manifests. Deliberately not an
// expression language: dotted lookups, `{{path}}` templates, and ordered match tables are enough
// for every control plane in the fleet, and anything richer belongs in a TypeScript hook.

import type { Phase } from "./ops.ts";

export interface PhaseRule {
	readonly phase: Phase;
	/** Every listed field must match one of its values (AND across fields, OR within a list). */
	readonly where: Readonly<Record<string, readonly string[]>>;
}

export interface PhaseRules {
	readonly rules: readonly PhaseRule[];
	readonly otherwise: Phase;
	readonly ignoreCase?: boolean;
}

/** Dotted lookup; `undefined` path returns the value itself. */
export function pick(value: unknown, path: string | undefined): unknown {
	if (path === undefined || path === "") return value;
	let current = value;
	for (const key of path.split(".")) {
		if (typeof current !== "object" || current === null) return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

export function phaseOf(table: PhaseRules, row: unknown): Phase {
	const norm = (value: unknown) => (table.ignoreCase ? String(value).toLowerCase() : String(value));
	for (const rule of table.rules) {
		const matches = Object.entries(rule.where).every(([field, values]) => {
			const actual = pick(row, field);
			return actual !== undefined && values.some((value) => norm(value) === norm(actual));
		});
		if (matches) return rule.phase;
	}
	return table.otherwise;
}

const WHOLE = /^\{\{([\w.]+)\}\}$/;
const PART = /\{\{([\w.]+)\}\}/g;

/**
 * Render a JSON template. A string that is exactly `{{path}}` keeps the raw value's type (so
 * numbers stay numbers and an absent value drops its key); embedded placeholders interpolate.
 */
export function render(template: unknown, scope: object): unknown {
	if (typeof template === "string") {
		const whole = WHOLE.exec(template);
		if (whole) return pick(scope, whole[1]);
		return template.replace(PART, (_match, path: string) => String(pick(scope, path) ?? ""));
	}
	if (Array.isArray(template)) return template.map((item) => render(item, scope));
	if (typeof template === "object" && template !== null) {
		const entries = Object.entries(template)
			.map(([key, value]) => [key, render(value, scope)] as const)
			.filter(([, value]) => value !== undefined);
		return Object.fromEntries(entries);
	}
	return template;
}

/** Placeholders a template references, for generator-time validation against declared inputs. */
export function placeholders(template: unknown): string[] {
	const found: string[] = [];
	const walk = (value: unknown): void => {
		if (typeof value === "string")
			for (const match of value.matchAll(PART)) found.push(match[1] ?? "");
		else if (Array.isArray(value)) value.forEach(walk);
		else if (typeof value === "object" && value !== null) Object.values(value).forEach(walk);
	};
	walk(template);
	return found;
}
