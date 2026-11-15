"""Step 3b — Soil fallback: the same ISRIC SoilGrids 2.0 maps, read through ISRIC's WCS map service.

The SoilGrids REST API (used by 03_fetch_soil.mjs) is often down or times out. ISRIC also serves the exact
same 250 m maps through WCS (https://maps.isric.org), keyless. This script reads the mean value of each
property × depth at the same candidate points 03_fetch_soil.mjs would try (town point, then 3 km, then 6 km),
and writes the result into data/raw/soil/<site>_<i>.json in the REST response format. Re-running
03_fetch_soil.mjs then builds soil_profile.csv / soil_summary.json from that cache as usual.

Only the mean is available through WCS, so the 5 % / 95 % quantiles are left empty.

    data/.venv/Scripts/python.exe -I data/scripts/03b_fetch_soil_wcs.py [siteId ...]
"""
from __future__ import annotations

import io
import json
import math
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw" / "soil"
PROCESSED = ROOT / "processed"
PROPS = ["bdod", "cec", "cfvo", "clay", "sand", "silt", "nitrogen", "phh2o", "soc", "wv0033", "wv1500"]
DEPTHS = [("0-5cm", 0, 5), ("5-15cm", 5, 15), ("15-30cm", 15, 30), ("30-60cm", 30, 60), ("60-100cm", 60, 100), ("100-200cm", 100, 200)]
# Same mapped units and conversion factors the REST API reports
UNITS = {
    "bdod": (100, "cg/cm³", "kg/dm³"), "cec": (10, "mmol(c)/kg", "cmol(c)/kg"), "cfvo": (10, "cm³/dm³", "cm³/100cm³"),
    "clay": (10, "g/kg", "%"), "sand": (10, "g/kg", "%"), "silt": (10, "g/kg", "%"), "nitrogen": (100, "cg/kg", "g/kg"),
    "phh2o": (10, "pH*10", "-"), "soc": (10, "dg/kg", "g/kg"), "wv0033": (10, "0.1 v%", "v%"), "wv1500": (10, "0.1 v%", "v%"),
}
HALF = 0.07  # window half-width in degrees (covers the 6 km candidates)


def candidates(lat: float, lon: float) -> list[tuple[float, float]]:
    pts = [(lat, lon)]
    for km in (3, 6):
        for k in range(8):
            a = k * math.pi / 4
            pts.append((round(lat + km * math.cos(a) / 111.32, 4),
                        round(lon + km * math.sin(a) / (111.32 * math.cos(lat * math.pi / 180)), 4)))
    return pts


def fetch_window(prop: str, depth: str, lat: float, lon: float) -> np.ndarray:
    url = (f"https://maps.isric.org/mapserv?map=/map/{prop}.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage"
           f"&COVERAGEID={prop}_{depth}_mean&FORMAT=image/tiff"
           f"&SUBSET=X({lon - HALF:.4f},{lon + HALF:.4f})&SUBSET=Y({lat - HALF:.4f},{lat + HALF:.4f})"
           "&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326")
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "sowcast-data-pipeline"}), timeout=60) as r:
                return np.array(Image.open(io.BytesIO(r.read()))).astype(float)
        except Exception as e:  # noqa: BLE001
            print(f"    ! {prop} {depth} attempt {attempt + 1} failed ({e}); retrying")
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"WCS failed for {prop} {depth}")


def sample(arr: np.ndarray, lat0: float, lon0: float, lat: float, lon: float) -> float | None:
    h, w = arr.shape[:2]
    col = int((lon - (lon0 - HALF)) / (2 * HALF) * w)
    row = int(((lat0 + HALF) - lat) / (2 * HALF) * h)
    col, row = min(max(col, 0), w - 1), min(max(row, 0), h - 1)
    v = arr[row, col]
    return None if v <= -32000 else float(v)


def main() -> None:
    sites = json.loads((ROOT / "config" / "sites.json").read_text(encoding="utf8"))["sites"]
    want = set(sys.argv[1:])
    for s in sites:
        sid, lat, lon = s["id"], s["location"]["lat"], s["location"]["lon"]
        if want and sid not in want:
            continue
        if (PROCESSED / sid / "soil_summary.json").exists() and not want:
            continue
        cached = [f for f in RAW.glob(f"{sid}_*.json") if "WCS" in f.read_text(encoding="utf8")[-200:] and '"mean": null' not in f.read_text(encoding="utf8")[:400]]
        if cached and not want:
            print(f"  · {sid}: already fetched via WCS ({cached[0].name})")
            continue
        print(f"▶ SoilGrids WCS {sid} ({lat}, {lon})")
        grids = {(p, d): fetch_window(p, d, lat, lon) for p in PROPS for d, _, _ in DEPTHS}
        pts = candidates(lat, lon)
        for i, (plat, plon) in enumerate(pts):
            clay = sample(grids[("clay", "0-5cm")], lat, lon, plat, plon)
            if clay is None:
                continue
            layers = []
            for p in PROPS:
                d_factor, mapped, target = UNITS[p]
                layers.append({"name": p, "unit_measure": {"d_factor": d_factor, "mapped_units": mapped, "target_units": target, "uncertainty_unit": ""},
                               "depths": [{"range": {"top_depth": t, "bottom_depth": b, "unit_depth": "cm"}, "label": d,
                                           "values": {"Q0.05": None, "Q0.95": None, "mean": sample(grids[(p, d)], lat, lon, plat, plon)}}
                                          for d, t, b in DEPTHS]})
            RAW.mkdir(parents=True, exist_ok=True)
            # Mark earlier candidates as empty so 03_fetch_soil.mjs skips straight to this one from cache
            for j in range(i):
                empty = {"type": "Feature", "properties": {"layers": [{"name": "clay", "depths": [{"values": {"mean": None}}]}]}, "source": "ISRIC SoilGrids WCS (no data at this point)"}
                (RAW / f"{sid}_{j}.json").write_text(json.dumps(empty), encoding="utf8")
            out = {"type": "Feature", "geometry": {"type": "Point", "coordinates": [plon, plat]},
                   "properties": {"layers": layers}, "source": "ISRIC SoilGrids 2.0 via WCS (maps.isric.org); mean only"}
            (RAW / f"{sid}_{i}.json").write_text(json.dumps(out), encoding="utf8")
            print(f"  ✓ data at candidate {i} ({plat}, {plon}); clay 0-5 cm = {clay / 10:.1f} %")
            break
        else:
            print(f"  ⚠ no soil data within 6 km of {sid}")


if __name__ == "__main__":
    main()
