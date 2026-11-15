"""Re-score every crop for a region under changed rain and temperature, using the team's own rules.

Usage:
    python scripts/whatif.py th-isan --rain-pct -20 --temp-c 1

It starts from the inputs the app's scores used (measured where available, see the region file's
`scoring_inputs`), applies the change, and calls score() from scripts/make_data.py.
Needs pandas (make_data.py builds its tables with it).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
sys.argv, cli_args = sys.argv[:1], sys.argv[1:]  # make_data.py reads sys.argv at import
sys.path.insert(0, str(HERE))
import make_data as md  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("region_id")
    ap.add_argument("--rain-pct", type=float, default=0, help="change in yearly rain, e.g. -20 for 20%% drier")
    ap.add_argument("--temp-c", type=float, default=0, help="change in mean temperature, e.g. 1 for 1 °C hotter")
    ap.add_argument("--top", type=int, default=8)
    a = ap.parse_args(cli_args)

    rows = md.reg[md.reg.id == a.region_id]
    if rows.empty:
        sys.exit(f"Unknown region id '{a.region_id}'. Use scripts/lookup.py to find it.")
    region = rows.iloc[0].copy()

    # Use the same inputs as the app's current scores (measured values where the pipeline had them).
    detail = json.loads((DATA / "regions" / f"{a.region_id}.json").read_text(encoding="utf8"))
    used = []
    for u in detail.get("scoring_inputs", []):
        if u["used"] == "measured" and u["measured"] not in (None, ""):
            value = u["measured"]
            region[u["input"]] = float(value) if u["input"] != "soil_texture" else value
            used.append(u["input"])

    base = {c.id: md.score(region, c)["fit"] for _, c in md.crops.iterrows()}
    changed = region.copy()
    changed["rain_mm_approx"] = region["rain_mm_approx"] * (1 + a.rain_pct / 100)
    changed["mean_temp_c_approx"] = region["mean_temp_c_approx"] + a.temp_c
    after = {c.id: md.score(changed, c)["fit"] for _, c in md.crops.iterrows()}

    names = dict(zip(md.crops.id, md.crops.name))
    table = sorted(
        ({"crop": names[cid], "now": round(base[cid], 1), "what_if": round(after[cid], 1), "change": round(after[cid] - base[cid], 1)}
         for cid in base),
        key=lambda r: -r["what_if"],
    )
    print(json.dumps({
        "region_id": a.region_id,
        "scenario": {"rain_change_pct": a.rain_pct, "temp_change_c": a.temp_c},
        "rain_mm": {"now": round(float(region["rain_mm_approx"])), "what_if": round(float(changed["rain_mm_approx"]))},
        "mean_temp_c": {"now": round(float(region["mean_temp_c_approx"]), 1), "what_if": round(float(changed["mean_temp_c_approx"]), 1)},
        "measured_inputs_used": used,
        "crops": table[: a.top],
        "biggest_losers": sorted(table, key=lambda r: r["change"])[:3],
        "note": "Scores use the team's rule-based crop-fit formula (0-95). A scenario shows direction and size of change, not a forecast.",
    }, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
