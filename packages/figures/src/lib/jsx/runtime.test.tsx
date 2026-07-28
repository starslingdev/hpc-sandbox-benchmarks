// This file is .tsx on purpose: it is the only place that exercises the JSX syntax path, which under
// Bun goes through `jsxDEV` in ../../jsx-dev-runtime.ts rather than the `jsx` that tsc typechecks.
import { describe, expect, it } from "bun:test";
import type { Child, Element } from "./types.ts";

function Box({ label, children }: { label: string; children?: Child }) {
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			<span style={{ color: "#fff" }}>{label}</span>
			{children}
		</div>
	) as Element;
}

describe("jsx runtime", () => {
	it("builds a satori element tree from JSX syntax", () => {
		const el = (<div style={{ display: "flex" }}>hello</div>) as Element;
		expect(el.type).toBe("div");
		expect(el.props.children).toBe("hello");
		expect(el.props.style).toEqual({ display: "flex" });
	});

	it("calls function components immediately — there is no reconciler", () => {
		const el = (<Box label="hi" />) as Element;
		expect(el.type).toBe("div");
		expect(Array.isArray(el.props.children)).toBe(true);
	});

	it("strips undefined style values, which crash satori's CSS parser unattributably", () => {
		const width = undefined;
		const el = (<div style={{ display: "flex", width }}>x</div>) as Element;
		expect(Object.hasOwn(el.props.style as object, "width")).toBe(false);
	});

	it("keeps `key` off the element props", () => {
		const el = (<div key="k" style={{ display: "flex" }} />) as Element;
		expect(el.key).toBe("k");
		expect(Object.hasOwn(el.props, "key")).toBe(false);
	});

	it("renders a list without a wrapper element per item", () => {
		const el = (
			<div style={{ display: "flex" }}>
				{["a", "b"].map((k) => (
					<span key={k} style={{ display: "flex" }}>
						{k}
					</span>
				))}
			</div>
		) as Element;
		expect(Array.isArray(el.props.children)).toBe(true);
	});

	it("accepts a conditional null child", () => {
		// `hasSpans`-style optional sections in MetricTable.tsx render exactly this shape.
		const show: boolean = "a".length > 1;
		const el = (<div style={{ display: "flex" }}>{show ? <span /> : null}</div>) as Element;
		expect(el.props.children).toBeNull();
	});
});
