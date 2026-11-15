"""Trend projections and their consequences for crops (used by 05b_score_measured.py).

Method (documented for users in data/ANALYSIS.md):
  1. Trend:      Theil-Sen slope (median of all pairwise slopes) on the 2001-2024 yearly series.
                 Robust to single extreme years, unlike an ordinary least-squares line.
  2. Is it real: Mann-Kendall test. p < 0.05 = "likely", p < 0.15 = "possible", otherwise "no clear trend".
  3. Projection: if the trend is likely/possible, extend the Theil-Sen line to 2035; otherwise project the
                 2001-2024 average (no clear direction → assume it stays as it has been).
  4. Range:      80 % prediction interval for a single year, from the residual spread around the line
                 (t-distribution, widening with distance from the data). It shows how far one year can swing.
  5. Crops:      re-run the team's crop score (make_data.score) with the projected 2035 rain, temperature and
                 dry months ("trend"), and with the dry/hot edge of the range ("bad year around 2035").
This is statistical extrapolation of observed data, not a climate-model forecast.
"""
from __future__ import annotations

import math
from statistics import mean, median

import pymannkendall as mk
from scipy import stats

HORIZON = 2035
LEVEL = 0.80

METRICS = {
    # key: (label, unit, decimals, which edge of the range is "bad" for farming)
    "precip_mm": ("Yearly rain", "mm", 0, "low"),
    "tmean_c": ("Average temperature", "°C", 1, "high"),
    "heat_days": ("Days at 35 °C or hotter", "days", 0, "high"),
    "heavy_rain_days": ("Downpour days (20 mm or more)", "days", 0, "high"),
    "max_dry_spell_days": ("Longest dry spell", "days", 0, "high"),
    "water_balance_mm": ("Rain minus crop water demand", "mm", 0, "low"),
    "dry_months": ("Dry months", "months", 1, "high"),
}


def theil_sen(x: list[float], y: list[float]) -> tuple[float, float]:
    slopes = [(y[j] - y[i]) / (x[j] - x[i]) for i in range(len(x)) for j in range(i + 1, len(x)) if x[j] != x[i]]
    b = median(slopes) if slopes else 0.0
    a = median([yi - b * xi for xi, yi in zip(x, y)])
    return a, b


# Physical limits: counts and rain cannot go below 0, dry months stay within 0-12
LIMITS = {"precip_mm": (0, None), "heat_days": (0, 366), "heavy_rain_days": (0, 366), "max_dry_spell_days": (0, 366), "dry_months": (0, 12)}


def project_series(years: list[int], values: list[float], decimals: int, key: str = "") -> dict | None:
    pts = [(int(x), float(v)) for x, v in zip(years, values) if v is not None and not math.isnan(v)]
    if len(pts) < 10:
        return None
    x = [p[0] for p in pts]
    y = [p[1] for p in pts]
    n = len(x)
    a, b = theil_sen(x, y)
    p = float(mk.original_test(y).p)
    sig = "likely" if p < 0.05 else "possible" if p < 0.15 else "none"
    xbar, ybar = mean(x), mean(y)
    sxx = sum((xi - xbar) ** 2 for xi in x)
    t = stats.t.ppf(0.5 + LEVEL / 2, n - 2)
    if sig != "none":
        resid = [yi - (a + b * xi) for xi, yi in zip(x, y)]
        s = math.sqrt(sum(r * r for r in resid) / (n - 2))
        line = lambda X: a + b * X  # noqa: E731
        half = lambda X: t * s * math.sqrt(1 + 1 / n + (X - xbar) ** 2 / sxx)  # noqa: E731
    else:
        s = math.sqrt(sum((yi - ybar) ** 2 for yi in y) / (n - 1))
        line = lambda X: ybar  # noqa: E731
        half = lambda X: t * s * math.sqrt(1 + 1 / n)  # noqa: E731
    lo_lim, hi_lim = LIMITS.get(key, (None, None))

    def r(v):
        if lo_lim is not None:
            v = max(lo_lim, v)
        if hi_lim is not None:
            v = min(hi_lim, v)
        return round(v, decimals) if decimals else round(v)
    last = x[-1]
    proj = [{"year": X, "mid": r(line(X)), "lo": r(line(X) - half(X)), "hi": r(line(X) + half(X))} for X in range(last, HORIZON + 1)]
    return {
        "per_decade": round(b * 10, 3),
        "p": round(p, 4),
        "significance": sig,
        "model": "theil_sen" if sig != "none" else "average",
        "baseline": r(ybar),                    # 2001-2024 average (what today's crop scores use)
        "recent_5y": r(mean(y[-5:])),
        "fitted_last_year": r(line(last)),
        "at_horizon": proj[-1],                 # {year, mid, lo, hi}
        "projection": proj,
    }


def _fmt(v: float, unit: str, d: int = 0) -> str:
    s = f"{abs(v):,.{d}f}" if d else f"{abs(round(v)):,}"
    return f"{s} {unit}" if unit not in ("°C",) else f"{s} °C"


def build_projections(region, annual_rows: list[dict], yearly_dry: dict[int, float], crops, score_fn, monthly_clim: list[dict] | None,
                      crop_names: dict[str, str], candidate_crops: list[str]) -> dict:
    """region: pandas row with measured inputs; annual_rows: annual.csv rows; score_fn: make_data.score."""
    num = lambda v: (float(v) if v not in (None, "") else None)  # noqa: E731
    years = [int(a["year"]) for a in annual_rows]
    series: dict[str, dict] = {}
    for key, (label, unit, d, bad) in METRICS.items():
        vals = [yearly_dry.get(yy) for yy in years] if key == "dry_months" else [num(a.get(key)) for a in annual_rows]
        res = project_series(years, vals, d, key)
        if res:
            res.update(label=label, unit=unit, bad_edge=bad,
                       history=[{"year": yy, "value": (round(v, d) if d else round(v))} for yy, v in zip(years, vals) if v is not None])
            series[key] = res

    # ---- crop outlook: today's score vs the 2035 trend vs a bad year around 2035 ----
    def scored(rain, temp, dry):
        rr = region.copy()
        rr["rain_mm_approx"], rr["mean_temp_c_approx"], rr["dry_months_approx"] = rain, temp, max(0.0, min(12.0, dry))
        return {c.id: score_fn(rr, c) for _, c in crops.iterrows()}

    P, T, D = series.get("precip_mm"), series.get("tmean_c"), series.get("dry_months")
    outlook = []
    if P and T and D:
        now = scored(region["rain_mm_approx"], region["mean_temp_c_approx"], region["dry_months_approx"])
        # Shift today's inputs by the projected change (keeps today's score as the reference point)
        dP = P["at_horizon"]["mid"] - P["baseline"]
        dT = T["at_horizon"]["mid"] - T["baseline"]
        dD = D["at_horizon"]["mid"] - D["baseline"]
        trend = scored(region["rain_mm_approx"] + dP, region["mean_temp_c_approx"] + dT, region["dry_months_approx"] + dD)
        bad = scored(region["rain_mm_approx"] + (P["at_horizon"]["lo"] - P["baseline"]),
                     region["mean_temp_c_approx"] + (T["at_horizon"]["hi"] - T["baseline"]),
                     region["dry_months_approx"] + (D["at_horizon"]["hi"] - D["baseline"]))
        for cid in candidate_crops:
            outlook.append({"crop": cid, "fit_now": round(now[cid]["fit"]), "fit_trend_2035": round(trend[cid]["fit"]),
                            "fit_bad_year_2035": round(bad[cid]["fit"]),
                            "water_now": round(now[cid]["water"], 2), "water_bad_year": round(bad[cid]["water"], 2)})

    consequences = _consequences(series, outlook, crops, monthly_clim, crop_names, region)
    return {
        "method": "Theil-Sen trend + Mann-Kendall test on 2001-2024 yearly data, extended to 2035 with an 80% prediction range. "
                  "Where there is no clear trend, the 2001-2024 average is projected. Statistical extrapolation, not a climate-model forecast.",
        "base_period": f"{years[0]}-{years[-1]}",
        "horizon": HORIZON,
        "interval": LEVEL,
        "series": series,
        "crop_outlook": outlook,
        "consequences": consequences,
    }


def _consequences(S, outlook, crops, monthly_clim, names, region) -> list[dict]:
    out: list[dict] = []
    cmap = {c.id: c for _, c in crops.iterrows()}
    top = [o["crop"] for o in outlook[:8]]
    nm = lambda ids: _list([names[i] for i in ids])  # noqa: E731
    H = HORIZON

    def chg(k):
        s = S.get(k)
        return (s["at_horizon"]["mid"] - s["baseline"]) if s and s["significance"] != "none" else 0.0

    # 1) Heat
    if (s := S.get("heat_days")) and s["significance"] != "none" and chg("heat_days") >= 5:
        d = chg("heat_days")
        hit = [c for c in top if cmap[c].temp_max_c <= 35 and not cmap[c].dry_season_crop][:4]
        out.append(dict(kind="heat", severity="high" if d >= 15 else "medium", metric="heat_days",
                        headline=f"About {round(d)} more scorching days a year by {H}",
                        detail=f"Days at 35 °C or hotter are heading from about {s['baseline']} to {s['at_horizon']['mid']} a year. "
                               f"Heat during flowering kills pollen, so grain and pod set drop{(' — ' + nm(hit) + ' are most exposed') if hit else ''}.",
                        action="Sow so flowering misses the hottest weeks, or pick heat-tolerant varieties.", crops=hit, significance=s["significance"]))
    # 2) Warming that pushes crops past their range
    if (s := S.get("tmean_c")) and s["significance"] != "none" and chg("tmean_c") >= 0.2:
        d = chg("tmean_c"); T35 = s["at_horizon"]["mid"]
        near = [c for c in top if cmap[c].temp_max_c - T35 < 2][:4]
        out.append(dict(kind="warming", severity="medium" if near else "low", metric="tmean_c",
                        headline=f"{d:+.1f} °C warmer on average by {H}",
                        detail=f"The yearly average moves from {s['baseline']} °C to about {T35} °C."
                               + (f" That is close to the top of the comfortable range for {nm(near)}." if near else " Most recommended crops stay inside their temperature range."),
                        action="Watch heat stress in cool-climate crops; earlier sowing helps.", crops=near, significance=s["significance"]))
    # 3) Rain going down / up
    if (s := S.get("precip_mm")) and s["significance"] != "none":
        d = chg("precip_mm"); pct = d / s["baseline"] * 100 if s["baseline"] else 0
        if pct <= -5:
            hit = [o["crop"] for o in outlook[:8] if o["fit_trend_2035"] <= o["fit_now"] - 3][:4]
            out.append(dict(kind="drying", severity="high" if pct <= -12 else "medium", metric="precip_mm",
                            headline=f"Rain could fall {abs(round(pct))}% by {H}",
                            detail=f"Yearly rain trends from about {s['baseline']:,} mm to {s['at_horizon']['mid']:,} mm."
                                   + (f" {nm(hit)} lose the most ground." if hit else ""),
                            action="Favour drought-tolerant crops and keep crop residue on the soil to hold moisture.", crops=hit, significance=s["significance"]))
        elif pct >= 5:
            out.append(dict(kind="wetting", severity="low", metric="precip_mm",
                            headline=f"About {round(pct)}% more rain by {H}",
                            detail=f"Yearly rain trends from about {s['baseline']:,} mm to {s['at_horizon']['mid']:,} mm. More water, but also more waterlogging on heavy soil.",
                            action="Keep drains open; raised beds help crops that hate wet feet.", crops=[], significance=s["significance"]))
    # 4) Downpours + bare months → erosion
    if (s := S.get("heavy_rain_days")) and s["significance"] != "none" and chg("heavy_rain_days") >= 1:
        bare = _bare_months(monthly_clim)
        out.append(dict(kind="downpours", severity="high" if chg("heavy_rain_days") >= 4 else "medium", metric="heavy_rain_days",
                        headline=f"More downpours: about {s['at_horizon']['mid']} heavy-rain days a year by {H}",
                        detail=f"Up from about {s['baseline']} today. Each downpour on bare soil washes away topsoil and the fertiliser in it"
                               + (f"; fields here are barest in {bare}." if bare else "."),
                        action="Keep the ground covered (a legume or crop residue) through the rainy months.", crops=[], significance=s["significance"]))
    # 5) Dry spells
    if (s := S.get("max_dry_spell_days")) and s["significance"] != "none" and chg("max_dry_spell_days") >= 3:
        out.append(dict(kind="dry_spells", severity="high" if s["at_horizon"]["mid"] >= 60 else "medium", metric="max_dry_spell_days",
                        headline=f"Dry spells stretching to about {s['at_horizon']['mid']} days",
                        detail=f"The longest run without rain is growing from about {s['baseline']} days. Seedlings sown on the first rains, and crops in flower, can die in a long gap.",
                        action="Wait until the rains are steady before sowing; choose short, drought-tolerant varieties.", crops=[], significance=s["significance"]))
    # 6) Water budget worsening
    if (s := S.get("water_balance_mm")) and s["significance"] != "none" and chg("water_balance_mm") <= -50:
        out.append(dict(kind="water_gap", severity="medium", metric="water_balance_mm",
                        headline=f"Crops will need about {abs(round(chg('water_balance_mm')))} mm more water than rain gives",
                        detail=f"Rain minus crop water demand moves from {s['baseline']:,} mm to about {s['at_horizon']['mid']:,} mm a year.",
                        action="Plan irrigation or water harvesting, or shift to crops that need less water.", crops=[], significance=s["significance"]))
    # 7) Bad year: year-to-year swings, true even without a trend
    if (s := S.get("precip_mm")) and outlook:
        lo = s["at_horizon"]["lo"]; pct = (lo - s["baseline"]) / s["baseline"] * 100 if s["baseline"] else 0
        fail = [o["crop"] for o in outlook[:8] if o["water_bad_year"] < 0.7 <= o["water_now"]][:4]
        drop = [o for o in outlook[:8] if o["fit_bad_year_2035"] <= o["fit_now"] - 8]
        if fail or drop or pct <= -15:
            out.append(dict(kind="bad_year", severity="high" if fail else "medium", metric="precip_mm",
                            headline=f"In a dry year, rain can drop to about {lo:,} mm",
                            detail=f"That is {abs(round(pct))}% below the {s['baseline']:,} mm average; about 1 year in 10 is this dry or worse."
                                   + (f" {nm(fail)} would fall short of water." if fail else (f" {nm([o['crop'] for o in drop][:3])} lose the most." if drop else "")),
                            action="Keep a drought-tolerant crop in the plan as insurance.", crops=fail or [o["crop"] for o in drop][:3], significance="variability"))
    # 8) Biggest crop winners/losers by 2035 (team score)
    losers = sorted([o for o in outlook[:10] if o["fit_trend_2035"] <= o["fit_now"] - 3], key=lambda o: o["fit_trend_2035"] - o["fit_now"])[:3]
    if losers:
        out.append(dict(kind="crop_shift", severity="medium", metric=None,
                        headline=f"{names[losers[0]['crop']]} fits {losers[0]['fit_now'] - losers[0]['fit_trend_2035']} points worse by {H}",
                        detail="If today's trends continue: " + "; ".join(f"{names[o['crop']]} {o['fit_now']} → {o['fit_trend_2035']}" for o in losers) + " (crop match out of 100).",
                        action="Build the rotation around crops whose match holds up.", crops=[o["crop"] for o in losers], significance="projection"))
    if not any(c["kind"] in ("heat", "warming", "drying", "wetting", "downpours", "dry_spells", "water_gap") for c in out):
        out.insert(0, dict(kind="stable", severity="low", metric=None,
                           headline="No clear long-term change since 2001",
                           detail="Rain, heat and dry spells show no reliable trend here. The bigger risk is the swing from one year to the next.",
                           action="Plan for a bad year rather than a changing average.", crops=[], significance="none"))
    rank = {"high": 0, "medium": 1, "low": 2}
    return sorted(out, key=lambda c: rank[c["severity"]])[:5]


def _bare_months(monthly) -> str:
    if not monthly:
        return ""
    M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    nd = [(int(m["month"]), float(m["ndvi"])) for m in monthly if m.get("ndvi") not in (None, "")]
    rain = {int(m["month"]): float(m["precip_mm"]) for m in monthly if m.get("precip_mm") not in (None, "")}
    if len(nd) < 12:
        return ""
    nd.sort(key=lambda t: t[1])
    low = sorted([m for m, _ in nd[:3]])
    wet_low = [m for m in low if rain.get(m, 0) >= 100]
    pick = wet_low or low
    return _list([M[m - 1] for m in pick])


def _list(items: list[str]) -> str:
    items = [i for i in items if i]
    return items[0] if len(items) == 1 else (", ".join(items[:-1]) + " and " + items[-1]) if items else ""
