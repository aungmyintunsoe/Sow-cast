"""Step 7 — re-score crops and rotations with *measured* region data, using the team's own scoring rules.

The team's make_data.py scores every crop from draft region values (rain, temperature, dry months, soil,
slope, ...). This step swaps in measured values wherever we have them and re-runs the very same score(),
so the app's crop rankings reflect the region's real conditions:

    rain_mm_approx        ← CHIRPS (or the merged series) mean yearly rain, 2001-2024
    mean_temp_c_approx    ← mean temperature (NASA POWER, or ERA5 where POWER is broken)
    dry_months_approx     ← months whose average rain is below half the crop water demand (FAO growing-period rule)
    soil_texture          ← ISRIC SoilGrids topsoil texture (0-30 cm)
    slope_pct_approx      ← NASA SRTM mean slope within ~1.5 km
Kept from the draft (no measured source yet): drainage, flood / salinity / irrigation risk, tree-crop and
degraded-soil flags, common crops.

It also fills the crop-fit TREND (draft value "tbd"): each crop is re-scored year by year with that year's
rain, temperature and dry months, and a Mann-Kendall test on those 24 scores says whether the crop's fit is
improving, declining or flat.

Usage:  data/.venv/Scripts/python.exe data/scripts/05b_score_measured.py
Outputs (data/processed/scored/):
    sowcast_region_crop_fit.csv   same columns as the draft, measured inputs, trend filled
    sowcast_rotations.csv         same columns as the draft
    region_inputs_used.csv        draft vs measured value for every input, and which one was used
    regions_measured.csv          the region table with measured values swapped in (input to 05d)
Also writes data/processed/<site>/projections.json: 2001-2024 trends extended to 2035 and what they mean
for the crops (lib_projections.py; method in data/ANALYSIS.md).
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import pandas as pd
import pymannkendall as mk

DATA = Path(__file__).resolve().parent.parent
PROCESSED = DATA / "processed"
OUT = PROCESSED / "scored"
sys.argv = sys.argv[:1]  # make_data reads sys.argv at import
sys.path.insert(0, str(DATA / "inputs"))
import make_data as md  # noqa: E402  (the team's scoring rules)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_projections import build_projections  # noqa: E402

# SoilGrids USDA texture class → the soil classes make_data.py understands
TEXTURE = {
    "sand": "sandy", "loamy sand": "sandy", "sandy loam": "sandy_loam",
    "loam": "loam", "silt loam": "loam", "silt": "loam",
    "sandy clay loam": "clay_loam", "clay loam": "clay_loam", "silty clay loam": "silty_clay_loam",
    "sandy clay": "clay", "silty clay": "clay", "clay": "clay",
}
TREND_P = 0.10      # Mann-Kendall p-value needed to call a trend
TREND_MIN = 2.0     # and the fit must change by at least this many points over the 24 years


def read_csv(path: Path) -> list[dict] | None:
    if not path.exists():
        return None
    with open(path, encoding="utf8") as f:
        return list(csv.DictReader(f))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def dry_months(monthly: list[dict]) -> int:
    """Months where rain < half of crop water demand (FAO length-of-growing-period rule)."""
    return sum(1 for m in monthly if num(m["precip_mm"]) is not None and num(m["et0_mm"]) and num(m["precip_mm"]) < 0.5 * num(m["et0_mm"]))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    reg = md.reg.copy()
    used_rows, yearly_inputs, annual_of, clim_of = [], {}, {}, {}

    for i, r in reg.iterrows():
        d = PROCESSED / r.id
        trends = json.loads((d / "trends.json").read_text(encoding="utf8")) if (d / "trends.json").exists() else {}
        weather_ok = trends.get("quality", {}).get("weather") == "ok"
        annual = read_csv(d / "annual.csv")
        clim = read_csv(d / "monthly_climatology.csv")
        series = read_csv(d / "monthly_series.csv")
        soil = json.loads((d / "soil_summary.json").read_text(encoding="utf8")) if (d / "soil_summary.json").exists() else None
        terrain = json.loads((d / "terrain.json").read_text(encoding="utf8")) if (d / "terrain.json").exists() else None
        q = trends.get("quality", {})

        def use(field, measured, source):
            draft = r[field]
            ok = measured is not None
            used_rows.append({"region_id": r.id, "input": field, "draft": draft, "measured": measured if ok else "",
                              "used": "measured" if ok else "draft", "source": source if ok else "no measured data yet"})
            if ok:
                reg.at[i, field] = measured

        if weather_ok and annual and clim:
            annual_of[r.id], clim_of[r.id] = annual, clim
            rain = sum(num(a["precip_mm"]) for a in annual) / len(annual)
            temp = sum(num(a["tmean_c"]) for a in annual) / len(annual)
            use("rain_mm_approx", round(rain), q.get("rain_source", ""))
            use("mean_temp_c_approx", round(temp, 1), q.get("temp_source", ""))
            use("dry_months_approx", dry_months(clim), f"{q.get('rain_source', '')} rain vs crop water demand")
            # per-year inputs for the trend
            by_year: dict[int, list[dict]] = {}
            for m in series or []:
                by_year.setdefault(int(m["year"]), []).append(m)
            yearly_inputs[r.id] = [
                {"year": int(a["year"]), "rain": num(a["precip_mm"]), "temp": num(a["tmean_c"]),
                 "dry": dry_months(by_year.get(int(a["year"]), []))}
                for a in annual if num(a["precip_mm"]) is not None and num(a["tmean_c"]) is not None
            ]
        else:
            for f in ("rain_mm_approx", "mean_temp_c_approx", "dry_months_approx"):
                use(f, None, "")
        tex = TEXTURE.get((soil or {}).get("topsoil_0_30cm", {}).get("usda_texture") or "")
        if tex and r.confidence == "medium":
            # Literature-sourced regions (Dry Zone, Isan): a field study beats a 250 m model prediction that was
            # often sampled several km from town, so keep the draft texture but record what SoilGrids says.
            used_rows.append({"region_id": r.id, "input": "soil_texture", "draft": r.soil_texture, "measured": tex,
                              "used": "draft", "source": "kept literature value; ISRIC SoilGrids 0-30 cm shown for comparison"})
        else:
            use("soil_texture", tex, "ISRIC SoilGrids 0-30 cm" if tex else "")
        slope = (terrain or {}).get("slope_pct_landscape_mean")
        use("slope_pct_approx", round(slope, 1) if slope is not None else None, "NASA SRTM, mean within ~1.5 km")
        for f in ("drainage", "flood_risk_0_3", "salinity_risk_0_3", "irrigation_access_0_3"):
            use(f, None, "")

    fit = md.build_fit(reg)
    rot = md.build_rotations(fit)

    # ---- crop-fit trend: re-score each crop year by year ----
    trend_of: dict[tuple[str, str], str] = {}
    for i, r in reg.iterrows():
        years = yearly_inputs.get(r.id)
        if not years or len(years) < 10:
            continue
        per_crop: dict[str, list[float]] = {c.id: [] for _, c in md.crops.iterrows()}
        for y in years:
            ry = r.copy()
            ry["rain_mm_approx"], ry["mean_temp_c_approx"], ry["dry_months_approx"] = y["rain"], y["temp"], y["dry"]
            for _, c in md.crops.iterrows():
                per_crop[c.id].append(md.score(ry, c)["fit"])
        for cid, vals in per_crop.items():
            res = mk.original_test(vals)
            change = res.slope * (len(vals) - 1)
            trend_of[(r.id, cid)] = ("increasing" if change > 0 else "declining") if res.p < TREND_P and abs(change) >= TREND_MIN else "flat"
    fit["trend"] = [trend_of.get((a, b), "tbd (weather data not reliable here)") for a, b in zip(fit.region_id, fit.crop_id)]
    # Sowing month as a number (the team's window() rule, which the planting-window text also comes from)
    fit["sow_month"] = [(int(md.window(a, b)[1]) - 1) % 12 + 1 for a, b in zip(fit.region_id, fit.crop_id)]
    fit["basis"] = "team scoring rules (make_data.py) applied to measured region data; see region_inputs_used.csv"

    # ---- projections to 2035 and their consequences (only where the weather series is reliable) ----
    names = {c.id: c["name"].split(" (")[0] for _, c in md.crops.iterrows()}
    n_proj = 0
    for i, r in reg.iterrows():
        target = PROCESSED / r.id / "projections.json"
        if r.id not in annual_of:
            target.unlink(missing_ok=True)
            continue
        ranked = fit[fit.region_id == r.id].sort_values("rank").crop_id.tolist()
        ranked = [c for c in ranked if c not in md.PERENN]
        dry_by_year = {y["year"]: y["dry"] for y in yearly_inputs.get(r.id, [])}
        proj = build_projections(r, annual_of[r.id], dry_by_year, md.crops, md.score, clim_of[r.id], names, ranked)
        target.write_text(json.dumps(proj, indent=1, ensure_ascii=False), encoding="utf8")
        n_proj += 1
    print(f"✓ projections to 2035 for {n_proj} regions")

    reg.to_csv(OUT / "regions_measured.csv", index=False)
    fit.to_csv(OUT / "sowcast_region_crop_fit.csv", index=False)
    rot.to_csv(OUT / "sowcast_rotations.csv", index=False)
    pd.DataFrame(used_rows).to_csv(OUT / "region_inputs_used.csv", index=False)

    # ---- report what changed ----
    draft = pd.read_csv(DATA / "inputs" / "sowcast_region_crop_fit.csv")
    print(f"✓ scored {len(fit)} region-crop pairs; trends: {pd.Series(list(trend_of.values())).value_counts().to_dict()}")
    for rid in reg.id:
        old = draft[draft.region_id == rid].head(3).crop_id.tolist()
        new = fit[fit.region_id == rid].head(3).crop_id.tolist()
        if old != new:
            print(f"  {rid:22} top 3 draft {old} → measured {new}")


if __name__ == "__main__":
    main()
