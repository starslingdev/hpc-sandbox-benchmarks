import { types as utilTypes } from "node:util";

const encoder = new TextEncoder();

export interface CanonicalJsonLimits {
	maxBytes: number;
	maxDepth: number;
	maxNodes: number;
	maxArrayLength: number;
	maxObjectKeys: number;
	maxStringLength: number;
	maxKeyLength: number;
}

export const PROVIDER_RESPONSE_LIMITS: CanonicalJsonLimits = {
	maxBytes: 64 * 1024,
	maxDepth: 16,
	maxNodes: 4_096,
	maxArrayLength: 1_024,
	maxObjectKeys: 1_024,
	maxStringLength: 8_192,
	maxKeyLength: 256,
};

/** Canonical comparison limits for the full evidence envelope, including its bounded response string. */
export const PROVIDER_EVIDENCE_JSON_LIMITS: CanonicalJsonLimits = {
	...PROVIDER_RESPONSE_LIMITS,
	maxBytes: 96 * 1024,
	maxStringLength: 64 * 1024,
};

function plainObject(value: object): value is Record<string, unknown> {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/** Read a dense ordinary array without property access, rejecting shapes JSON cannot represent. */
function arrayValues(value: unknown[]): unknown[] {
	const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
	if (
		!lengthDescriptor ||
		!("value" in lengthDescriptor) ||
		typeof lengthDescriptor.value !== "number" ||
		!Number.isSafeInteger(lengthDescriptor.value) ||
		lengthDescriptor.value < 0 ||
		!lengthDescriptor.writable ||
		lengthDescriptor.enumerable ||
		lengthDescriptor.configurable
	) {
		throw new Error("canonical JSON array has an unexpected length descriptor");
	}
	const length = lengthDescriptor.value;
	const keys = Reflect.ownKeys(value);
	if (
		keys.length !== length + 1 ||
		keys.some((key) => key !== "length" && !/^\d+$/.test(String(key)))
	) {
		throw new Error("canonical JSON array is sparse or has unexpected properties");
	}
	const output = new Array<unknown>(length);
	for (let index = 0; index < length; index++) {
		const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
		if (
			!descriptor ||
			!("value" in descriptor) ||
			!descriptor.enumerable ||
			!descriptor.configurable ||
			!descriptor.writable
		) {
			throw new Error("canonical JSON array index has an accessor or unexpected descriptor");
		}
		output[index] = descriptor.value;
	}
	return output;
}

/** Canonical compact JSON with sorted object keys and explicit structural/resource limits. */
export function canonicalJsonString(
	value: unknown,
	limits: CanonicalJsonLimits = PROVIDER_RESPONSE_LIMITS,
): string {
	if (value === null || typeof value !== "object") {
		throw new Error("canonical JSON must contain an object or array");
	}
	let nodes = 0;
	let bytes = 0;
	const active = new Set<object>();
	const charge = (fragment: string): string => {
		bytes += encoder.encode(fragment).byteLength;
		if (bytes > limits.maxBytes) throw new Error("canonical JSON exceeds byte limit");
		return fragment;
	};
	const visit = (input: unknown, depth: number): string => {
		if (++nodes > limits.maxNodes) throw new Error("canonical JSON exceeds node limit");
		if (depth > limits.maxDepth) throw new Error("canonical JSON exceeds nesting depth");
		if (input === null || typeof input === "boolean") return charge(JSON.stringify(input));
		if (typeof input === "number") {
			if (!Number.isFinite(input)) throw new Error("canonical JSON contains a non-finite number");
			return charge(JSON.stringify(input));
		}
		if (typeof input === "string") {
			if (input.length > limits.maxStringLength)
				throw new Error("canonical JSON string is too long");
			return charge(JSON.stringify(input));
		}
		if (typeof input !== "object") throw new Error("canonical JSON contains a non-JSON value");
		if (utilTypes.isProxy(input)) throw new Error("canonical JSON contains a Proxy object");
		if (active.has(input)) throw new Error("canonical JSON contains a cycle");
		active.add(input);
		try {
			if (Array.isArray(input)) {
				const values = arrayValues(input);
				if (values.length > limits.maxArrayLength)
					throw new Error("canonical JSON array is too long");
				charge(`[${",".repeat(Math.max(0, values.length - 1))}]`);
				return `[${values.map((item) => visit(item, depth + 1)).join(",")}]`;
			}
			if (!plainObject(input)) throw new Error("canonical JSON contains an unsupported prototype");
			const keys = Object.keys(input).sort((a, b) => a.localeCompare(b, "en"));
			if (keys.length > limits.maxObjectKeys)
				throw new Error("canonical JSON object has too many keys");
			charge(`{${",".repeat(Math.max(0, keys.length - 1))}}`);
			return `{${keys
				.map((key) => {
					if (key.length > limits.maxKeyLength) throw new Error("canonical JSON key is too long");
					charge(`${JSON.stringify(key)}:`);
					const descriptor = Object.getOwnPropertyDescriptor(input, key);
					if (!descriptor || !("value" in descriptor)) {
						throw new Error("canonical JSON contains an accessor property");
					}
					return `${JSON.stringify(key)}:${visit(descriptor.value, depth + 1)}`;
				})
				.join(",")}}`;
		} finally {
			active.delete(input);
		}
	};
	const json = visit(value, 0);
	return json;
}

/** Structural equality for JSON-compatible values, independent of object insertion order. */
export function canonicalJsonEqual(left: unknown, right: unknown): boolean {
	try {
		return canonicalJsonString(left) === canonicalJsonString(right);
	} catch {
		return false;
	}
}
