"""Find a Sowcast region and print a compact, source-labelled summary of it.

Usage:
    python scripts/lookup.py "Khon Kaen"
    python scripts/lookup.py --lat 16.4 --lon 102.8 [--goal soil|water|nitrogen|income] [--plan-goal balanced] [--json]

Prints: region match (and distance if matched by coordinates), measured weather and its quality flag,
2035 outlook (projection + consequences), crops ranked for a goal (with planting window and harvest),
current practice and the recommender's top 3 rotations for a plan goal, soil, and the team's estimates.

Standard library only, so it runs in any sandbox.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
QUALITY_NOTE = "weather data for this region failed a quality check; do not quote weather numbers"


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf8"))


def km(lat1, lon1, lat2, lon2) -> float:
    r = math.pi / 180
    a = math.sin((lat2 - lat1) * r / 2) ** 2 + math.cos(lat1 * r) * math.cos(lat2 * r) * math.sin((lon2 - lon1) * r / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find(regions: list[dict], query: str | None, lat: float | None, lon: float | None) -> tuple[dict, float | None]:
    if query:
        q = query.lower().strip()
        for field in ("id", "place", "name"):
            hits = [r for r in regions if q == r[field].lower() or q in r[field].lower()]
            if hits:
                return hits[0], None
        hits = [r for r in regions if q in r["country"].lower()]
        if hits:
            return hits[0], None
        sys.exit(f"No region matches '{query}'. Try a town name or --lat/--lon. Regions: "
                 + ", ".join(f"{r['name']} ({r['place']}, {r['country']})" for r in regions))
    if lat is None or lon is None:
        sys.exit("Give a place name or both --lat and --lon.")
    best = min(regions, key=lambda r: km(lat, lon, r["lat"], r["lon"]))
    return best, km(lat, lon, best["lat"], best["lon"])


def goal_score(goal: str, fit: float, c: dict) -> float:
    # Same formulas as the app's Crops page (src/lib/cropScoring.ts).
    if goal == "soil":
        return round(fit * 0.45 + (c["erosion_cover"] * 10 + c["organic_matter"] * 10) * 0.55)
    if goal == "water":
        bonus = 15 if c["drought_tolerance"] >= 5 else 8 if c["drought_tolerance"] >= 4 else 0
        return min(99, round(fit * 0.4 + ((6 - c["water_need"]) * 18 + bonus) * 0.6))
    if goal == "nitrogen":
        return min(99, round(fit * 0.45 + (52 if c["nitrogen_fixing"] else 10) + c["organic_matter"] * 3))
    if goal == "income":
        return min(99, round(fit * 0.45 + c["market"] * 11))
    return fit


def plan_brief(p: dict | None) -> dict | None:
    if not p:
        return None
    return {"name": p["name"], "type": p["plan_type"], "sequence": p["sequence"], "goal_match": p.get("goal_match"),
            "scores_0_100": p.get("scores"), "change_vs_current": p.get("change_vs_current"), "why": p.get("why"),
            "cautions": p.get("cautions"), "evidence": p.get("evidence"), "confidence": p.get("confidence")}


def summary(region: dict, detail: dict, crops: dict, goal: str, plan_goal: str, distance: float | None) -> dict:
    q = detail.get("data_quality", {})
    weather_ok = q.get("weather") == "ok" and detail.get("monthly")
    t = detail.get("trends", {})
    ranked = sorted(
        ({"crop": crops[f["crop"]]["name"], "score": goal_score(goal, f["fit"], crops[f["crop"]]), "trend": f["trend"],
          "why": f["why"], "limits": f["limits"], "grown_here": f["common_locally"],
          "plant": f.get("planting_window"), "harvest": f.get("harvest"), "yield_outlook": f.get("yield_outlook")}
         for f in detail["crop_fit"] if f["crop"] in crops),
        key=lambda x: -x["score"],
    )
    return {
        "region": f"{region['name']}, {region['country']}",
        "region_id": region["id"],
        "reference_town": region["place"],
        "distance_km_if_nearest_match": round(distance) if distance is not None else None,
        "sources": detail.get("sources"),
        "weather": {
            "quality": q.get("weather"),
            "rain_source": q.get("sources", {}).get("rain"),
            "temperature_source": q.get("sources", {}).get("temperature"),
            "trends": {k: t.get(k) for k in ("heat_days", "precip_mm", "heavy_rain_days", "max_dry_spell_days")} if weather_ok else QUALITY_NOTE,
            "mean_water_balance_mm": t.get("mean_water_balance_mm") if weather_ok else None,
        },
        "insights": detail.get("insights"),
        "goal": goal,
        "top_crops": ranked[:6],
        "outlook_2035_projection": None if not (weather_ok and detail.get("outlook")) else {
            "method": detail["outlook"]["method"],
            "series": {k: {"baseline_2001_2024": v["baseline"], "at_2035": v["at_horizon"], "trend": v["significance"], "unit": v["unit"]}
                       for k, v in detail["outlook"]["series"].items()},
            "consequences": [{k: c[k] for k in ("severity", "headline", "detail", "action", "crops")} for c in detail["outlook"]["consequences"]],
            "crop_outlook": detail["outlook"]["crop_outlook"][:8],
        },
        "rainy_season_months": detail.get("calendar"),
        "plan_goal": plan_goal,
        "current_practice": plan_brief(detail.get("plans", {}).get("current")),
        "recommended_rotations": [plan_brief(p) for p in detail.get("plans", {}).get("by_goal", {}).get(plan_goal, [])],
        "local_estimates_not_measured": {k: detail["priors"][k] for k in ("flood_risk", "salinity_risk", "irrigation_access", "common_crops")},
        "draft_vs_measured": detail.get("scoring_inputs"),
        "soil": detail.get("soil"),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="?")
    ap.add_argument("--lat", type=float)
    ap.add_argument("--lon", type=float)
    ap.add_argument("--goal", default="overall", choices=["overall", "soil", "water", "nitrogen", "income"])
    ap.add_argument("--plan-goal", default="balanced",
                    choices=["balanced", "soil_health", "market_income", "water_saving", "low_risk", "low_cost_labour"])
    ap.add_argument("--json", action="store_true", help="print the full summary as indented JSON")
    a = ap.parse_args()

    regions = load("regions/index.json")
    crops = {c["id"]: c for c in load("crops.json")}
    region, distance = find(regions, a.query, a.lat, a.lon)
    detail = load(f"regions/{region['id']}.json")
    s = summary(region, detail, crops, a.goal, a.plan_goal, distance)
    print(json.dumps(s, indent=1 if a.json else None, ensure_ascii=False))


if __name__ == "__main__":
    main()
