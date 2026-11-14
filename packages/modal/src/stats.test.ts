import { expect, it } from "bun:test";
import { create, toBinary } from "@bufbuild/protobuf";
import { SandboxGetTimeRangeStatsResponseSchema } from "./gen/modal/client/sandbox_stats_pb.ts";
import { decodeSandboxStatsResponse } from "./stats.ts";

it("decodes the decimal-string costs and maps an unset tag to null", () => {
	const bytes = toBinary(
		SandboxGetTimeRangeStatsResponseSchema,
		create(SandboxGetTimeRangeStatsResponseSchema, {
			groups: [
				{
					tags: { marker: { value: "m-1" }, team: {} },
					cost: 0.0101,
					costStr: "0.01009681",
					costByResourceStr: { CPU: "0.01006777", Memory: "0.00002904" },
				},
			],
		}),
	);
	expect(decodeSandboxStatsResponse(bytes).groups).toEqual([
		{
			tags: { marker: "m-1", team: null },
			cost: "0.01009681",
			costByResource: { CPU: "0.01006777", Memory: "0.00002904" },
		},
	]);
});
