"""Fetch and analyse 2001-2024 daily weather for ANY farm location (keyless, standard library only).

Usage:
    python scripts/fetch_climate.py --lat 16.43 --lon 102.83 [--chirps] [--start 2001 --end 2024] [--out climate.json]

What it does:
  1. Daily max/min/mean temperature, rain and reference evapotranspiration (ET0, FAO-56) from ERA5 via the
     Open-Meteo archive API. Open-Meteo corrects temperature to the point's real elevation (90 m DEM).
  2. With --chirps: replaces ERA5 rain with CHIRPS 2.0 (satellite + gauges, ~5 km, best for tropical rain),
     averaged over a ~11 km box via SERVIR ClimateSERV. Slower (a few minutes) but more accurate than ERA5 rain,
     which tends to have too many light-rain days and too few downpours in the tropics. CHIRPS covers 50°S-50°N land.
  3. Summarises: monthly climatology, yearly series, heat days (>= 35 °C), downpour days (>= 20 mm), longest dry
     spell (< 1 mm), water balance (rain - ET0), dry months (rain < half of ET0, FAO growing-period rule),
     the rainy season, Mann-Kendall trend tests, Theil-Sen slopes and a projection to 2035 with an 80% range.

Output: a JSON file (default climate_<lat>_<lon>.json) whose "monthly" block has the same shape as a bundled
region's "monthly", so scripts/critique_rotation.py --climate <file> can use it. A plain summary is printed.
If the network is blocked (e.g. sandboxed code execution), the script says so; use the web-fetch tool on the
same URLs or fall back to the nearest bundled region (scripts/lookup.py --lat --lon).
"""
from __future__ import annotations

import argparse
import json
import math
import statistics as st
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = {"User-Agent": "sowcast-advisor-skill/1.0"}
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
HEAT_C = 35.0      # heat-stress threshold at flowering for rice, maize and most pulses
DOWNPOUR_MM = 20.0  # a day that causes runoff/erosion on bare soil
DRY_DAY_MM = 1.0    # below this, a day counts as dry for dry-spell length
HORIZON = 2035
T80 = 1.32          # two-sided 80% t-value for ~22 degrees of freedom (24 years minus 2)


def get_json(url: str, timeout: int = 120, tries: int = 5):
    last = None
    for a in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return json.loads(r.read().decode("utf8"))
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 429:  # Open-Meteo hourly limit: wait longer
                time.sleep(20 * (a + 1))
            else:
                time.sleep(3 * (a + 1))
        except Exception as e:  # noqa: BLE001  (DNS failure, timeout, sandbox without network)
            last = e
            time.sleep(3 * (a + 1))
    sys.exit(f"Network request failed ({last}). If this environment has no internet access, fetch\n  {url[:160]}...\n"
             "with a web tool instead, or use the nearest bundled region: python scripts/lookup.py --lat <lat> --lon <lon>")


def era5(lat: float, lon: float, y0: int, y1: int) -> tuple[list[dict], float | None]:
    q = urllib.parse.urlencode({
        "latitude": lat, "longitude": lon, "start_date": f"{y0}-01-01", "end_date": f"{y1}-12-31", "timezone": "UTC",
        "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,et0_fao_evapotranspiration",
    })
    j = get_json(f"https://archive-api.open-meteo.com/v1/archive?{q}")
    d = j["daily"]
    rows = [{"date": t, "tmax": d["temperature_2m_max"][i], "tmin": d["temperature_2m_min"][i], "tmean": d["temperature_2m_mean"][i],
             "rain": d["precipitation_sum"][i], "et0": d["et0_fao_evapotranspiration"][i]} for i, t in enumerate(d["time"])]
    return rows, j.get("elevation")


def chirps(lat: float, lon: float, y0: int, y1: int) -> dict[str, float]:
    api, box, out = "https://climateserv.servirglobal.net/api", 0.05, {}
    ring = [[lon - box, lat - box], [lon + box, lat - box], [lon + box, lat + box], [lon - box, lat + box], [lon - box, lat - box]]
    for a in range(y0, y1 + 1, 6):  # ClimateSERV works best in chunks of a few years
        b = min(y1, a + 5)
        q = urllib.parse.urlencode({"datatype": 0, "begintime": f"01/01/{a}", "endtime": f"12/31/{b}", "intervaltype": 0,
                                    "operationtype": 5, "geometry": json.dumps({"type": "Polygon", "coordinates": [ring]})})
        job = get_json(f"{api}/submitDataRequest/?{q}")[0]
        for _ in range(200):
            p = get_json(f"{api}/getDataRequestProgress/?id={job}")[0]
            if p >= 100:
                break
            if p < 0:
                sys.exit("ClimateSERV job failed; re-run without --chirps to use ERA5 rain.")
            time.sleep(3)
        for d in get_json(f"{api}/getDataFromRequest/?id={job}").get("data", []):
            v = (d.get("value") or {}).get("avg")
            if v is not None and v >= 0:
                out[f"{d['year']}-{int(d['month']):02d}-{int(d['day']):02d}"] = v
        print(f"  CHIRPS {a}-{b}: done", file=sys.stderr)
    return out


def mann_kendall_p(y: list[float]) -> float:
    n = len(y)
    s = sum((y[j] > y[i]) - (y[j] < y[i]) for i in range(n) for j in range(i + 1, n))
    var = n * (n - 1) * (2 * n + 5) / 18
    z = 0 if s == 0 else (s - 1) / math.sqrt(var) if s > 0 else (s + 1) / math.sqrt(var)
    return math.erfc(abs(z) / math.sqrt(2))  # two-sided p from the normal approximation


def theil_sen(x: list[float], y: list[float]) -> tuple[float, float]:
    slopes = [(y[j] - y[i]) / (x[j] - x[i]) for i in range(len(x)) for j in range(i + 1, len(x)) if x[j] != x[i]]
    b = st.median(slopes) if slopes else 0.0
    return st.median([yi - b * xi for xi, yi in zip(x, y)]), b


def project(years: list[int], vals: list[float], floor: float | None = 0.0) -> dict:
    """Trend test + projection to HORIZON (Theil-Sen line if p < 0.15, else the average) with an 80% single-year range."""
    p = mann_kendall_p(vals)
    sig = "likely" if p < 0.05 else "possible" if p < 0.15 else "none"
    n, xbar, ybar = len(years), st.mean(years), st.mean(vals)
    sxx = sum((x - xbar) ** 2 for x in years)
    a, b = theil_sen(years, vals)
    if sig != "none":
        s = math.sqrt(sum((v - (a + b * x)) ** 2 for x, v in zip(years, vals)) / (n - 2))
        mid = a + b * HORIZON
        half = T80 * s * math.sqrt(1 + 1 / n + (HORIZON - xbar) ** 2 / sxx)
    else:
        s = st.stdev(vals)
        mid, half = ybar, T80 * s * math.sqrt(1 + 1 / n)
    clip = (lambda v: max(floor, v)) if floor is not None else (lambda v: v)
    return {"mean_2001_2024": round(ybar, 1), "per_decade": round(b * 10, 2), "mann_kendall_p": round(p, 3), "trend": sig,
            "at_2035": {"mid": round(clip(mid), 1), "lo": round(clip(mid - half), 1), "hi": round(clip(mid + half), 1)},
            "first_10y": round(st.mean(vals[:10]), 1), "last_10y": round(st.mean(vals[-10:]), 1)}


def longest_run(flags: list[bool]) -> int:
    best = cur = 0
    for f in flags:
        cur = cur + 1 if f else 0
        best = max(best, cur)
    return best


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--start", type=int, default=2001)
    ap.add_argument("--end", type=int, default=2024)
    ap.add_argument("--chirps", action="store_true", help="use CHIRPS rain (slower, better in the tropics)")
    ap.add_argument("--out", help="output JSON path")
    a = ap.parse_args()

    rows, elev = era5(a.lat, a.lon, a.start, a.end)
    rain_src = "ERA5 (Open-Meteo)"
    if a.chirps:
        c = chirps(a.lat, a.lon, a.start, a.end)
        if len(c) > 0.9 * len(rows):
            for r in rows:
                r["rain"] = c.get(r["date"], r["rain"])
            rain_src = "CHIRPS 2.0 (ClimateSERV)"
        else:
            print("CHIRPS returned too little data here (outside 50°S-50°N or over water?); keeping ERA5 rain.", file=sys.stderr)
    rows = [r for r in rows if None not in (r["tmax"], r["tmin"], r["rain"], r["et0"])]

    by_year: dict[int, list[dict]] = {}
    for r in rows:
        by_year.setdefault(int(r["date"][:4]), []).append(r)
    years = sorted(y for y, v in by_year.items() if len(v) >= 360)
    annual = []
    for y in years:
        d = by_year[y]
        rain, et0 = sum(r["rain"] for r in d), sum(r["et0"] for r in d)
        months = {m: [r for r in d if int(r["date"][5:7]) == m] for m in range(1, 13)}
        dry_m = sum(1 for m in months.values() if sum(r["rain"] for r in m) < 0.5 * sum(r["et0"] for r in m))
        annual.append({"year": y, "precip_mm": round(rain), "tmean_c": round(st.mean(r["tmean"] for r in d), 2),
                       "heat_days": sum(r["tmax"] >= HEAT_C for r in d), "heavy_rain_days": sum(r["rain"] >= DOWNPOUR_MM for r in d),
                       "max_dry_spell_days": longest_run([r["rain"] < DRY_DAY_MM for r in d]), "et0_mm": round(et0),
                       "water_balance_mm": round(rain - et0), "dry_months": dry_m})

    nyears = len(years)
    monthly = []
    for m in range(1, 13):
        d = [r for r in rows if int(r["date"][5:7]) == m and int(r["date"][:4]) in by_year]
        monthly.append({"month": m, "precip_mm": round(sum(r["rain"] for r in d) / nyears, 1), "et0_mm": round(sum(r["et0"] for r in d) / nyears, 1),
                        "tmax_c": round(st.mean(r["tmax"] for r in d), 1), "tmin_c": round(st.mean(r["tmin"] for r in d), 1),
                        "heat_days": round(sum(r["tmax"] >= HEAT_C for r in d) / nyears, 1),
                        "heavy_rain_days": round(sum(r["rain"] >= DOWNPOUR_MM for r in d) / nyears, 1), "ndvi": None})
    wet = [m["month"] for m in monthly if m["precip_mm"] >= 0.5 * m["et0_mm"]]
    trends = {k: project(years, [r[k] for r in annual], floor=None if k in ("tmean_c", "water_balance_mm") else 0.0)
              for k in ("precip_mm", "tmean_c", "heat_days", "heavy_rain_days", "max_dry_spell_days", "water_balance_mm", "dry_months")}

    result = {
        "location": {"lat": a.lat, "lon": a.lon, "elevation_m": elev},
        "period": f"{years[0]}-{years[-1]}",
        "sources": {"rain": rain_src, "temperature_and_et0": "ERA5 via Open-Meteo (elevation-corrected)"},
        "summary": {"rain_mm_year": round(st.mean(r["precip_mm"] for r in annual)), "mean_temp_c": round(st.mean(r["tmean_c"] for r in annual), 1),
                    "dry_months": round(st.mean(r["dry_months"] for r in annual), 1), "wet_months": wet,
                    "water_balance_mm_year": round(st.mean(r["water_balance_mm"] for r in annual))},
        "monthly": monthly,
        "annual": annual,
        "trends": trends,
        "notes": ["Trend 'likely' = Mann-Kendall p<0.05, 'possible' = p<0.15. at_2035 extends the Theil-Sen line only when a trend is "
                  "likely/possible, else the 2001-2024 average; lo/hi is an 80% range for a single year. Statistical extrapolation, "
                  "not a climate-model forecast."],
    }
    out = a.out or f"climate_{a.lat:.2f}_{a.lon:.2f}.json"
    with open(out, "w", encoding="utf8") as f:
        json.dump(result, f, indent=1)

    s = result["summary"]
    print(f"Location {a.lat}, {a.lon} (elevation {elev} m). {result['period']}. Rain: {rain_src}.")
    print(f"Yearly rain ~{s['rain_mm_year']} mm, mean temperature {s['mean_temp_c']} °C, dry months ~{s['dry_months']}, "
          f"water balance {s['water_balance_mm_year']} mm/yr. Rainy months: {', '.join(MONTHS[m - 1] for m in wet) or 'none'}.")
    print("Month   rain  ET0  tmax  tmin  heat-days downpour-days")
    for m in monthly:
        print(f"{MONTHS[m['month'] - 1]:5} {m['precip_mm']:6.0f} {m['et0_mm']:4.0f} {m['tmax_c']:5.1f} {m['tmin_c']:5.1f} {m['heat_days']:9.1f} {m['heavy_rain_days']:9.1f}")
    print("Trends (2001-2024 → 2035):")
    for k, t in trends.items():
        print(f"  {k:20} mean {t['mean_2001_2024']:>8}  trend {t['trend']:8} (p={t['mann_kendall_p']})  2035 ≈ {t['at_2035']['mid']} "
              f"[{t['at_2035']['lo']}–{t['at_2035']['hi']}]")
    print(f"Saved {out}")


if __name__ == "__main__":
    main()
