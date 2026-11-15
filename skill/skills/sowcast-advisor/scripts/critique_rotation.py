"""Check a farmer's own rotation, month by month, against local climate, soil and crop rules.

Usage:
    python scripts/critique_rotation.py --region th-isan --plan "rice@Jun; green_gram@Nov | cassava@May"
    python scripts/critique_rotation.py --climate climate_16.43_102.83.json [--soil soil.json] --plan "..." [--irrigation none|some|full]
    python scripts/critique_rotation.py --region mm-dry-zone --plan "..." --extra-crops my_crops.json --json

Plan syntax (one string):
    years are separated by "|", crops within a year by ";" (or ","), each crop is  name@Month
    optional length: name@Jun+150d (days) or name@Jun-Sep (last month). Default length = crop's season_days.
    "fallow" can be written but is simply bare months. Crop names: ids (green_gram) or names ("mung bean").
    The rotation is treated as repeating: after the last year comes year 1 again.

Checks (each says why it matters):
    per crop  - temperature vs the crop's range, heat (>= 35 °C days) at flowering, season rain vs the crop's need,
                waterlogging, sowing into downpours, flood/salt risk, dry-season crops without water
    sequence  - same crop or same family back to back, "avoid after" rules, legume/cereal alternation,
                heavy feeders in a row, soil-draining crops on poor soil, bare soil in the heaviest-rain months,
                two crops in the field in the same month, diversity and income
Data: crop traits from data/crops.json (+ --extra-crops for crops not in the table); monthly climate from a bundled
region (--region) or from scripts/fetch_climate.py (--climate). Standard library only.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
M_INDEX = {m.lower(): i for i, m in enumerate(MONTHS)}
FULL = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
EFFECTIVE_RAIN = 0.85  # share of rain a crop can use (same factor as the team's scoring rules)
IRRIGATION_MM = {"none": 0, "some": 250, "full": 800}  # rough extra water per season from irrigation
RESIDUAL_MM = 120  # stored soil moisture a crop sown right after a wet-season crop can draw on (rough, loam soils)


def month_of(s: str) -> int:
    s = s.strip().lower()
    for i, f in enumerate(FULL):
        if f.startswith(s[:3]):
            return i
    sys.exit(f"Unknown month '{s}'. Use Jan, Feb, ...")


def find_crop(name: str, crops: dict) -> str:
    n = name.strip().lower().replace(" ", "_")
    if n in crops or n == "fallow":
        return n
    plain = name.strip().lower()
    for cid, c in crops.items():
        if plain in c["name"].lower() or plain.replace("_", " ") in c["name"].lower():
            return cid
    sys.exit(f"Unknown crop '{name}'. Known: {', '.join(sorted(crops))}. For other crops pass --extra-crops (see references/crop-notes.md).")


def parse_plan(text: str, crops: dict) -> list[list[dict]]:
    years = []
    for y in text.split("|"):
        y = re.sub(r"^\s*(y(ear)?\s*\d+)\s*:\s*", "", y.strip(), flags=re.I)
        items = []
        for part in re.split(r"[;,]", y):
            part = part.strip()
            if not part:
                continue
            m = re.match(r"^(.+?)@\s*([A-Za-z]+)\s*(?:\+\s*(\d+)\s*d|-\s*([A-Za-z]+))?\s*$", part)
            if not m:
                sys.exit(f"Could not read '{part}'. Write crop@Month, e.g. rice@Jun or cassava@May+300d.")
            cid = find_crop(m.group(1), crops)
            start = month_of(m.group(2))
            if m.group(3):
                n = max(1, round(int(m.group(3)) / 30))
            elif m.group(4):
                n = (month_of(m.group(4)) - start) % 12 + 1
            else:
                n = 1 if cid == "fallow" else max(1, min(12, round(crops[cid]["season_days"] / 30)))
            items.append({"crop": cid, "start": start, "months": n})
        years.append(items)
    return years


def load_context(a, crops):
    if a.region:
        d = json.loads((DATA / "regions" / f"{a.region}.json").read_text(encoding="utf8"))
        if d["data_quality"]["weather"] != "ok" or len(d["monthly"]) != 12:
            sys.exit("This region's weather failed the quality check; fetch fresh data with scripts/fetch_climate.py and use --climate.")
        pr = d["priors"]
        irr = a.irrigation or {0: "none", 1: "some", 2: "some", 3: "full"}[int(pr["irrigation_access"])]
        soil = (d.get("soil") or {}).get("texture") or pr["soil_texture"]
        return {"name": f"{d['region']['name']} ({d['region']['place']}, {d['region']['country']})", "monthly": d["monthly"],
                "flood": pr["flood_risk"], "salt": pr["salinity_risk"], "degraded": pr["soil_degraded"], "soil": str(soil).replace("_", " "),
                "slope": (d.get("soil") or {}).get("slope_pct") or pr["slope_pct"], "irrigation": irr,
                "source": f"bundled region {a.region}: {', '.join(d['sources'])}"}
    c = json.loads(Path(a.climate).read_text(encoding="utf8"))
    soil, soil_src = "unknown", ""
    if a.soil:
        s = json.loads(Path(a.soil).read_text(encoding="utf8"))
        soil, soil_src = s["labels"]["texture"] or "unknown", f"; soil from {s['source']}"
    return {"name": f"point {c['location']['lat']}, {c['location']['lon']}", "monthly": c["monthly"], "flood": None, "salt": None,
            "degraded": None, "soil": soil, "slope": None, "irrigation": a.irrigation or "none",
            "source": f"{c['sources']['rain']} rain, {c['sources']['temperature_and_et0']}, {c['period']}{soil_src}"}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--region", help="bundled region id (see scripts/lookup.py)")
    src.add_argument("--climate", help="JSON from scripts/fetch_climate.py")
    ap.add_argument("--soil", help="JSON from scripts/fetch_soil.py (with --climate)")
    ap.add_argument("--plan", required=True)
    ap.add_argument("--irrigation", choices=["none", "some", "full"], help="water beyond rain (default: region estimate, or none)")
    ap.add_argument("--extra-crops", help="JSON list of crop profiles for crops not in data/crops.json")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    crops = {c["id"]: c for c in json.loads((DATA / "crops.json").read_text(encoding="utf8"))}
    if a.extra_crops:
        for c in json.loads(Path(a.extra_crops).read_text(encoding="utf8")):
            c.setdefault("needs", {}); c.setdefault("good_after", []); c.setdefault("avoid_after", [])
            crops[c["id"]] = c
    ctx = load_context(a, crops)
    M = {m["month"] - 1: m for m in ctx["monthly"]}
    plan = parse_plan(a.plan, crops)
    ny = len(plan)

    # ---- lay the plan on a repeating calendar: grid[year][month] = list of crops in the field ----
    grid = [[[] for _ in range(12)] for _ in range(ny)]
    placed = []  # in time order
    for y, items in enumerate(plan):
        for it in items:
            if it["crop"] == "fallow":
                continue
            cells = [((y + (it["start"] + k) // 12) % ny, (it["start"] + k) % 12) for k in range(it["months"])]
            for yy, mm in cells:
                grid[yy][mm].append(it["crop"])
            placed.append({**it, "year": y, "cells": cells})
    placed.sort(key=lambda p: (p["year"], p["start"]))

    problems, cautions, strengths = [], [], []
    per_crop = []

    seen = set()

    def add(kind, text, why, fix=None):
        if text in seen:  # the rotation repeats, so the same pairing can be found twice
            return
        seen.add(text)
        (problems if kind == "problem" else cautions if kind == "caution" else strengths).append({"text": text, "why": why, "fix": fix})

    def follows_wet_crop(p) -> bool:
        """Sown within a month after another crop that grew through rainy months (residual soil moisture)."""
        before = {(p["year"] if p["start"] > 0 else (p["year"] - 1) % ny, (p["start"] - k) % 12) for k in (1, 2)}
        return any(cell in before and M[cell[1]]["precip_mm"] >= 100 for q in placed if q is not p for cell in q["cells"])

    for p in placed:
        c = crops[p["crop"]]; name = c["name"].split(" (")[0]
        months = [mm for _, mm in p["cells"]]
        label = f"{name} (Year {p['year'] + 1}, sown {MONTHS[p['start']]}, ~{p['months']} months)"
        notes = []
        # temperature
        t = sum((M[m]["tmax_c"] + M[m]["tmin_c"]) / 2 for m in months) / len(months)
        if t < c["temp_min_c"] - 1 or t > c["temp_max_c"] + 1:
            add("problem", f"{label}: average {t:.1f} °C is outside its range ({c['temp_min_c']}–{c['temp_max_c']} °C)",
                "Outside its range the crop grows slowly, flowers poorly or fails.", "Move it to months that fit its range, or choose another crop.")
        elif t > c["temp_max_c"] - 1 or t < c["temp_min_c"] + 1:
            notes.append(f"temperature {t:.1f} °C is near the edge of its range")
        # heat at flowering (roughly 55-75% of the way through the season)
        fm = p["cells"][min(len(p["cells"]) - 1, int(0.6 * len(p["cells"])))][1]
        hd = M[fm].get("heat_days") or 0
        if c["temp_max_c"] <= 35 and hd >= 5 and c["id"] not in ("cassava", "sugarcane", "oil_palm", "rubber", "cashew", "sunn_hemp", "cover_legume"):
            add("problem" if hd >= 10 else "caution", f"{label}: likely flowering in {MONTHS[fm]}, which has ~{hd:.0f} days at 35 °C or hotter",
                "Heat during flowering kills pollen; grain and pod set drop sharply.", "Sow 3–5 weeks earlier or later so flowering misses the hottest weeks, or use a heat-tolerant variety.")
        # water during the season
        season_rain = sum(M[m]["precip_mm"] for m in months)
        if c["id"] in ("rice", "salt_rice"):
            # Bunded paddies store rain from the month before transplanting as standing water
            season_rain += M[(p["start"] - 1) % 12]["precip_mm"]
        rain = season_rain * EFFECTIVE_RAIN + IRRIGATION_MM[ctx["irrigation"]] * (0.5 if c["dry_season_crop"] else 1)
        residual = follows_wet_crop(p) and season_rain / len(months) < 100 and season_rain < c["seasonal_rain_need_mm"]
        if residual:
            rain += RESIDUAL_MM
            notes.append(f"relies on ~{RESIDUAL_MM} mm of moisture left in the soil by the previous crop: sow straight after its harvest")
        need = c["seasonal_rain_need_mm"]
        ratio = rain / need if need else 9
        if c["dry_season_crop"] and c["id"] == "chickpea":
            pass  # grown on stored soil moisture after the rains; season rain is not the right test
        elif c["id"] in ("rice", "salt_rice") and ratio < 0.9:
            add("problem" if ratio < 0.5 else "caution", f"{label}: about {rain:.0f} mm of usable water vs ~{need} mm a paddy needs",
                "Rainfed rice depends on bunds holding water; short rains mean drought stress at tillering or flowering.",
                "Keep bunds high, transplant when fields have standing water, or choose a shorter, drought-tolerant variety.")
        elif ratio < 0.6:
            add("problem", f"{label}: about {rain:.0f} mm of usable water in its months vs ~{need} mm needed",
                "Too little water: the crop will be stunted or fail in most years.",
                "Shift it into the rainy months, add irrigation, or pick a crop with lower water need." )
        elif ratio < 0.9:
            notes.append(f"water is tight (~{rain:.0f} of ~{need} mm); a dry year will hurt")
        if ratio > 2.5 and c["flood_tolerance"] <= 2 and sum(M[m]["precip_mm"] for m in months) / len(months) > 200:
            add("caution", f"{label}: very wet months ({sum(M[m]['precip_mm'] for m in months) / len(months):.0f} mm/month) for a crop that hates waterlogging",
                "Waterlogged roots rot and the crop yellows.", "Plant on raised beds or ridges, keep drains open, or move it to the drier shoulder of the season.")
        # sowing into downpours
        if (M[p["start"]].get("heavy_rain_days") or 0) >= 3:
            notes.append(f"sowing month {MONTHS[p['start']]} has ~{M[p['start']]['heavy_rain_days']:.0f} downpour days (seed washout, crusting)")
        # local hazards (bundled region estimates)
        wet = [m for m in months if M[m]["precip_mm"] >= 150]
        if ctx["flood"] is not None and ctx["flood"] >= 2 and c["flood_tolerance"] <= 2 and wet:
            add("problem", f"{label}: grows through flood-prone wet months here", "Flooding kills crops that cannot stand in water.", "Grow it after the floods recede, or use a flood-tolerant crop.")
        if ctx["salt"] is not None and ctx["salt"] >= 2 and c["salinity_tolerance"] <= 2:
            add("caution", f"{label}: salt-sensitive crop in an area with salt-water risk", "Salt in soil or water burns roots and cuts yield.", "Check water salinity before sowing; consider salt-tolerant varieties.")
        if c["dry_season_crop"] and ctx["irrigation"] == "none" and c["id"] != "chickpea" and sum(M[m]["precip_mm"] for m in months) < need * 0.5:
            add("caution", f"{label}: dry-season crop with no irrigation", "It depends on moisture left in the soil after the rains.", "Sow straight after the rice/wet-season harvest, or secure water from a well or pump.")
        per_crop.append({"crop": p["crop"], "label": label, "temp_c": round(t, 1), "usable_water_mm": round(rain), "need_mm": need,
                         "flowering_month": MONTHS[fm], "heat_days_at_flowering": hd, "notes": notes})
        for n_ in notes:
            add("caution", f"{label}: {n_}", "Not a deal-breaker, but it raises the risk in a bad year.")

    # ---- sequence checks (the rotation repeats, so the last crop is followed by the first) ----
    seq = [p["crop"] for p in placed]
    for i, cur in enumerate(seq):
        nxt = seq[(i + 1) % len(seq)] if len(seq) > 1 else None
        if nxt is None:
            break
        A, B = crops[cur], crops[nxt]
        if cur == nxt:
            if cur in ("rice", "salt_rice"):
                add("caution", f"{A['name']} follows itself", "Continuous rice is normal in paddies but builds up planthoppers, stem borer and blast.",
                    "Break it with a short legume (green gram, black gram) once a year if water allows.")
            else:
                add("problem", f"{A['name']} follows itself", "The same crop back to back builds up its pests, diseases and weeds and mines the same nutrients.",
                    "Put a crop from a different family in between.")
        elif A["family"] == B["family"] and A["family"] not in ("tree",):
            add("caution", f"{B['name']} follows {A['name']} (same family: {A['family']})", "Crops of one family share pests and diseases.", "Insert a crop from another family.")
        if cur in B.get("avoid_after", []):
            add("problem", f"{B['name']} should not follow {A['name']} (team crop table)", "They share pests/diseases or the first leaves the soil poor for the second.",
                "Reorder the crops or put a break crop in between.")
        if cur in B.get("good_after", []):
            add("strength", f"{B['name']} after {A['name']} is a good pairing", "The first crop leaves nitrogen, breaks pests or improves soil for the second.")
        if (A["needs"].get("fertiliser") or 0) >= 4 and (B["needs"].get("fertiliser") or 0) >= 4:
            add("caution", f"Two heavy feeders in a row: {A['name']} then {B['name']}", "Soil nutrients run down fast; fertiliser bills climb.",
                "Put a legume between them to add nitrogen.")
    legumes = [c for c in set(seq) if crops[c]["nitrogen_fixing"]]
    cereals = [c for c in set(seq) if crops[c]["family"] == "grass"]
    if not legumes:
        add("caution", "No legume anywhere in the rotation", "Without a legume, all nitrogen must be bought and soil organic matter declines.",
            "Add a short legume (green gram, cowpea, groundnut, soybean) in a gap or as a cover crop.")
    elif cereals:
        add("strength", f"Mixes legumes ({', '.join(crops[c]['name'].split(' (')[0] for c in legumes)}) and cereals",
            "Legumes add nitrogen for the cereal; alternating families breaks pest and disease cycles.")
    drainers = [c for c in set(seq) if c in ("cassava", "sugarcane", "maize")]
    if drainers and (ctx["degraded"] or ctx["soil"] in ("sand", "loamy sand", "sandy", "sandy loam")):
        add("caution", f"{', '.join(crops[c]['name'] for c in drainers)} on {ctx['soil']} soil", "These crops remove a lot of nutrients; sandy or degraded soil runs down quickly.",
            "Return crop residue, add manure, and follow with a legume or green manure.")
    # bare soil during the heaviest rain
    stormy = sorted(range(12), key=lambda m: -(M[m].get("heavy_rain_days") or 0) - M[m]["precip_mm"] / 100)[:3]
    for y in range(ny):
        bare_storm = [m for m in stormy if not grid[y][m] and M[m]["precip_mm"] >= 100]
        if bare_storm:
            add("problem" if len(bare_storm) >= 2 else "caution",
                f"Year {y + 1}: soil is bare in {', '.join(MONTHS[m] for m in bare_storm)}, among the heaviest-rain months",
                "Rain on bare soil washes away topsoil and fertiliser; this is when most erosion happens.",
                "Keep a crop, cover crop or crop residue on the soil in those months.")
    for y in range(ny):
        for m in range(12):
            if len(grid[y][m]) > 1 and not any(crops[c]["family"] == "tree" or c in ("cover_legume",) for c in grid[y][m]):
                add("problem", f"Year {y + 1}, {MONTHS[m]}: {' and '.join(crops[c]['name'] for c in grid[y][m])} are in the field at the same time",
                    "Two crops overlap unless they are deliberately intercropped.", "Shift a sowing date, or say if this is an intercrop.")
    if len(set(seq)) >= 3:
        add("strength", f"{len(set(seq))} different crops", "Diversity spreads weather and price risk and breaks pest cycles.")
    if seq and all((crops[c].get("relative_income") or 3) <= 2 for c in set(seq)):
        add("caution", "Every crop in the plan has low income", "Farmers drop rotations that do not pay.", "Include at least one cash crop with a known buyer.")

    bare = [sum(1 for m in range(12) if not grid[y][m]) for y in range(ny)]
    result = {"location": ctx["name"], "data": ctx["source"], "irrigation_assumed": ctx["irrigation"], "soil": ctx["soil"],
              "calendar": [{"year": y + 1, "months": {MONTHS[m]: grid[y][m] for m in range(12)}, "bare_months": bare[y]} for y in range(ny)],
              "crops": per_crop, "problems": problems, "cautions": cautions, "strengths": strengths}
    if a.json:
        print(json.dumps(result, indent=1, ensure_ascii=False))
        return

    print(f"Rotation check for {ctx['name']}\nData: {ctx['source']}. Irrigation assumed: {ctx['irrigation']}. Soil: {ctx['soil']}.\n")
    print("Calendar (rotation repeats; '..' = bare soil):")
    print("        " + " ".join(f"{m:>4}" for m in MONTHS))
    rain_row = "  rain  " + " ".join(f"{M[m]['precip_mm']:4.0f}" for m in range(12))
    print(rain_row)
    for y in range(ny):
        print(f"  Y{y + 1}    " + " ".join(f"{(grid[y][m][0][:4] if grid[y][m] else '..'):>4}" for m in range(12)) + f"   bare {bare[y]} mo")
    for title, items in (("PROBLEMS", problems), ("CAUTIONS", cautions), ("STRENGTHS", strengths)):
        print(f"\n{title} ({len(items)})")
        for it in items:
            print(f"- {it['text']}\n    why: {it['why']}" + (f"\n    fix: {it['fix']}" if it.get("fix") else ""))
    print("\nNot checked by this script: prices and buyers, labour peaks, pests present locally this year, seed availability, "
          "your field's own drainage. Ask about these.")


if __name__ == "__main__":
    main()
