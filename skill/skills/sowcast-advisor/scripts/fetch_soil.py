"""Topsoil profile for ANY location from ISRIC SoilGrids 2.0 (250 m, keyless).

Usage:
    python scripts/fetch_soil.py --lat 16.43 --lon 102.83 [--out soil.json]

Prints texture (USDA class), sand/silt/clay, organic carbon, pH, CEC, and plant-available water for 0-30 cm,
with plain-language labels. Tries the SoilGrids REST API first; if it is down (it often is), falls back to
ISRIC's WCS map service, which serves the same maps (needs Pillow for that path: pip install pillow).
Town centres and water have no soil data, so it also tries points 3 and 6 km away.
SoilGrids is a model prediction at 250 m: good for "what kind of soil is typical here", not a field test.
"""
from __future__ import annotations

import argparse
import io
import json
import math
import sys
import time
import urllib.parse
import urllib.request

UA = {"User-Agent": "sowcast-advisor-skill/1.0"}
PROPS = ["clay", "sand", "silt", "soc", "phh2o", "cec", "wv0033", "wv1500", "bdod"]
DEPTHS = [("0-5cm", 5), ("5-15cm", 10), ("15-30cm", 15)]  # (label, thickness in cm) for the 0-30 cm weighted mean
# SoilGrids stores integers; divide by these to get the units in the comments
FACTOR = {"clay": 10, "sand": 10, "silt": 10, "soc": 10, "phh2o": 10, "cec": 10, "wv0033": 10, "wv1500": 10, "bdod": 100}
# clay/sand/silt %, soc g/kg, pH, cec cmol(c)/kg, wv0033/wv1500 volume % at field capacity / wilting point, bdod kg/dm³


def usda_texture(sand: float, silt: float, clay: float) -> str:
    if silt + 1.5 * clay < 15: return "sand"
    if silt + 1.5 * clay < 30: return "loamy sand"
    if (7 <= clay < 20 and sand > 52 and silt + 2 * clay >= 30) or (clay < 7 and silt < 50 and silt + 2 * clay >= 30): return "sandy loam"
    if 7 <= clay < 27 and 28 <= silt < 50 and sand <= 52: return "loam"
    if (silt >= 50 and 12 <= clay < 27) or (50 <= silt < 80 and clay < 12): return "silt loam"
    if silt >= 80 and clay < 12: return "silt"
    if 20 <= clay < 35 and silt < 28 and sand > 45: return "sandy clay loam"
    if 27 <= clay < 40 and 20 < sand <= 45: return "clay loam"
    if 27 <= clay < 40 and sand <= 20: return "silty clay loam"
    if clay >= 35 and sand > 45: return "sandy clay"
    if clay >= 40 and silt >= 40: return "silty clay"
    if clay >= 40 and sand <= 45 and silt < 40: return "clay"
    return "loam"


def candidates(lat: float, lon: float):
    yield 0, lat, lon
    for km in (3, 6):
        for k in range(8):
            a = k * math.pi / 4
            yield km, round(lat + km * math.cos(a) / 111.32, 4), round(lon + km * math.sin(a) / (111.32 * math.cos(math.radians(lat))), 4)


def rest(lat: float, lon: float) -> dict | None:
    q = "&".join([f"lon={lon}", f"lat={lat}"] + [f"property={p}" for p in PROPS] + [f"depth={d}" for d, _ in DEPTHS] + ["value=mean"])
    with urllib.request.urlopen(urllib.request.Request(f"https://rest.isric.org/soilgrids/v2.0/properties/query?{q}", headers=UA), timeout=25) as r:
        j = json.loads(r.read())
    out = {}
    for layer in j["properties"]["layers"]:
        out[layer["name"]] = {d["label"]: d["values"]["mean"] for d in layer["depths"]}
    return out if out.get("clay", {}).get("0-5cm") is not None else None


HALF = 0.07  # WCS window half-width in degrees: covers the 6 km candidates. Tiny windows make the server hang.


def wcs_grids(lat: float, lon: float) -> dict:
    """One small GeoTIFF per property x depth around the point (same maps as the REST API)."""
    from PIL import Image  # only needed for this fallback
    grids = {}
    for p in PROPS:
        for d, _ in DEPTHS:
            q = urllib.parse.urlencode({"map": f"/map/{p}.map", "SERVICE": "WCS", "VERSION": "2.0.1", "REQUEST": "GetCoverage",
                                        "COVERAGEID": f"{p}_{d}_mean", "FORMAT": "image/tiff",
                                        "SUBSETTINGCRS": "http://www.opengis.net/def/crs/EPSG/0/4326", "OUTPUTCRS": "http://www.opengis.net/def/crs/EPSG/0/4326"})
            q += f"&SUBSET=X({lon - HALF:.4f},{lon + HALF:.4f})&SUBSET=Y({lat - HALF:.4f},{lat + HALF:.4f})"
            for attempt in range(4):  # the map service returns 503 when busy; back off and retry
                try:
                    with urllib.request.urlopen(urllib.request.Request(f"https://maps.isric.org/mapserv?{q}", headers=UA), timeout=90) as r:
                        grids[(p, d)] = Image.open(io.BytesIO(r.read()))
                    break
                except Exception:  # noqa: BLE001
                    if attempt == 3:
                        raise
                    time.sleep(10 * (attempt + 1))
    return grids


def wcs_at(grids: dict, lat0: float, lon0: float, lat: float, lon: float) -> dict | None:
    out = {}
    for (p, d), im in grids.items():
        col = min(im.width - 1, max(0, int((lon - (lon0 - HALF)) / (2 * HALF) * im.width)))
        row = min(im.height - 1, max(0, int(((lat0 + HALF) - lat) / (2 * HALF) * im.height)))
        v = im.getpixel((col, row))
        out.setdefault(p, {})[d] = None if v is None or v <= -32000 else v
    return out if out["clay"]["0-5cm"] not in (None, 0) else None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, required=True)
    ap.add_argument("--lon", type=float, required=True)
    ap.add_argument("--out")
    a = ap.parse_args()

    raw, source, at = None, None, None
    try:
        for km, la, lo in candidates(a.lat, a.lon):
            raw = rest(la, lo)
            if raw:
                source, at = "SoilGrids REST API", {"lat": la, "lon": lo, "km_from_point": km}
                break
    except Exception as e:  # noqa: BLE001  (the REST API is often down or times out)
        print(f"SoilGrids REST API failed ({e}); trying the WCS map service.", file=sys.stderr)
    if not raw:
        try:
            grids = wcs_grids(a.lat, a.lon)
            for km, la, lo in candidates(a.lat, a.lon):
                raw = wcs_at(grids, a.lat, a.lon, la, lo)
                if raw:
                    source, at = "SoilGrids WCS map service (mean only)", {"lat": la, "lon": lo, "km_from_point": km}
                    break
        except ImportError:
            print("The WCS fallback needs Pillow: pip install pillow", file=sys.stderr)
        except Exception as e:  # noqa: BLE001
            print(f"SoilGrids WCS failed: {e}", file=sys.stderr)
    if not raw:
        sys.exit("No soil data: SoilGrids is unreachable or has no data within 6 km. Try later, use the web-fetch tool on "
                 "https://rest.isric.org/soilgrids/v2.0/properties/query?lon=..&lat=..&property=clay&depth=0-5cm&value=mean, "
                 "or use the nearest bundled region's soil (scripts/lookup.py).")

    def top30(p):
        vals = [(raw[p].get(d), t) for d, t in DEPTHS if raw[p].get(d) is not None]
        return sum(v * t for v, t in vals) / sum(t for _, t in vals) / FACTOR[p] if vals else None

    t = {p: top30(p) for p in PROPS}
    texture = usda_texture(t["sand"], t["silt"], t["clay"]) if None not in (t["sand"], t["silt"], t["clay"]) else None
    awc = (t["wv0033"] - t["wv1500"]) * 3 if t["wv0033"] and t["wv1500"] else None  # mm of plant-available water in 0-30 cm (vol% x 300 mm / 100)
    labels = {
        "texture": texture,
        "organic_matter": None if t["soc"] is None else "low" if t["soc"] < 10 else "moderate" if t["soc"] < 20 else "good",
        "acidity": None if t["phh2o"] is None else "strongly acid (lime likely needed)" if t["phh2o"] < 5.5 else "slightly acid" if t["phh2o"] < 6.5
        else "neutral" if t["phh2o"] <= 7.5 else "alkaline",
        "nutrient_holding": None if t["cec"] is None else "low (nutrients leach; split fertiliser)" if t["cec"] < 10 else "moderate" if t["cec"] < 20 else "high",
        "water_holding": None if awc is None else "low" if awc < 30 else "moderate" if awc < 50 else "high",
    }
    result = {"source": source, "sampled_at": at, "topsoil_0_30cm": {k: (round(v, 1) if v is not None else None) for k, v in t.items()},
              "plant_available_water_mm_0_30cm": round(awc) if awc else None, "labels": labels,
              "note": "SoilGrids 2.0 is a 250 m model prediction (ISRIC). Confirm with a local soil test before buying lime or fertiliser."}
    if a.out:
        with open(a.out, "w", encoding="utf8") as f:
            json.dump(result, f, indent=1)
    print(json.dumps(result, indent=1))


if __name__ == "__main__":
    main()
