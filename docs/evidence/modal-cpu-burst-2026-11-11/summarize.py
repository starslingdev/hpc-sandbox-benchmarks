"""Recompute the published study tables from its individual task and usage samples."""

import json
from collections import defaultdict
from math import isclose
from pathlib import Path
from statistics import mean, median


def main():
    data = json.loads(Path(__file__).with_name("samples.json").read_text())
    groups = defaultdict(list)
    cases = set()
    for run in data["runs"]:
        assert run["case"] not in cases
        cases.add(run["case"])
        assert run["status"] == "success" and run["terminated_at"]
        assert run["final_usage_stable"] and run["usage_reads"] >= 2
        assert run["cpu_request"] == 4 and run["cpu_limit"] in (4, 8)
        assert run["memory_request_mib"] == run["memory_limit_mib"] == 8192
        assert run["nproc"] == run["cpu_limit"]
        assert set(run["tasks"]) == set(data["task_order"])
        usage = run["usage"]
        expected_cost = (
            usage["billed_cpu_core_seconds"] * data["observed_cpu_usd_per_billed_core_second"]
            + usage["billed_memory_gib_seconds"] * data["observed_memory_usd_per_billed_gib_second"]
        )
        assert isclose(float(usage["cost"]), expected_cost, abs_tol=2e-8)
        assert isclose(
            usage["billed_memory_gib_seconds"],
            8 * usage["duration_hours"] * 3600,
            rel_tol=1e-9,
        )
        groups[run["runtime"], run["cpu_limit"]].append(run)

    assert len(cases) == 12 and set(groups) == {(runtime, limit) for runtime in ("vm", "gvisor") for limit in (4, 8)}
    results = {}
    print("| Runtime | CPU request / limit | Pipeline score (s) | Mean compute cost (USD) |")
    print("| --- | --- | ---: | ---: |")
    for runtime in ("vm", "gvisor"):
        for limit in (4, 8):
            runs = groups[runtime, limit]
            assert len(runs) == 3 and {r["replicate"] for r in runs} == {1, 2, 3}
            score = sum(median(r["tasks"][task]["measured_seconds"] for r in runs) for task in data["task_order"])
            cost = mean(float(r["usage"]["cost"]) for r in runs)
            results[runtime, limit] = score, cost
            print(f"| {runtime} | 4 / {limit} | {score:.3f} | ${cost:.8f} |")

    print()
    for runtime in ("vm", "gvisor"):
        capped_score, capped_cost = results[runtime, 4]
        burst_score, burst_cost = results[runtime, 8]
        print(
            f"{runtime}: {100 * (1 - burst_score / capped_score):.2f}% less benchmark time; "
            f"{100 * (1 - burst_cost / capped_cost):.2f}% lower mean compute cost."
        )
        for cap, burst in zip(
            sorted(groups[runtime, 4], key=lambda r: r["replicate"]),
            sorted(groups[runtime, 8], key=lambda r: r["replicate"]),
        ):
            assert sum(t["measured_seconds"] for t in burst["tasks"].values()) < sum(
                t["measured_seconds"] for t in cap["tasks"].values()
            )
            assert float(burst["usage"]["cost"]) < float(cap["usage"]["cost"])


if __name__ == "__main__":
    main()
