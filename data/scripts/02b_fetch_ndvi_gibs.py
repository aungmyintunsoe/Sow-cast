"""Step 2b — monthly greenness (NDVI) of the cropland around each region, from NASA GIBS map tiles.

No login, and no dependence on the (often down) ORNL MODIS service.

How it works:
  * GIBS serves VIIRS SNPP L3 NDVI *monthly* composites (2012 to now) as colour-coded PNG tiles and publishes
    the exact colour -> value table, so decoding each pixel's colour gives NDVI back (0.005-0.01 steps).
  * The MODIS IGBP land-cover tiles (same method) mark which pixels are cropland (class 12) or cropland mosaic (14).
  * For each region we take a 9 x 9 pixel window (about 10 km) around the reference town and average NDVI over
    the cropland pixels only, so towns, forest and water don't count. If fewer than 3 cropland pixels exist,
    all land pixels are used and the CSV says so.

Usage (from the repo root):
    data/.venv/Scripts/python.exe data/scripts/02b_fetch_ndvi_gibs.py [siteId ...]

Outputs:
    data/processed/<site>/ndvi_monthly.csv   year, month, ndvi, n_pixels, mask
    data/processed/<site>/ndvi_mask.json     how many cropland pixels were found, and where
Tiles are cached in data/raw/gibs/ so re-runs are instant.
"""
from __future__ import annotations

import csv
import io
import json
import math
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image

DATA = Path(__file__).resolve().parent.parent
RAW = DATA / "raw" / "gibs"
PROCESSED = DATA / "processed"
GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best"
NDVI = dict(layer="VIIRS_SNPP_L3_NDVI_Monthly", tms="GoogleMapsCompatible_Level7", z=7,
            colormap="https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_L3_NDVI.xml")
LANDCOVER = dict(layer="MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual", tms="GoogleMapsCompatible_Level8", z=8,
                 date="2024-01-01", colormap="https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_IGBP_Land_Cover_Type.xml")
CROPLAND = {12, 14}
WATER = {0, 17}
HALF = 4            # window = (2*HALF+1)^2 pixels at zoom 7 (~1.2 km each) ≈ 10 km across
FIRST_YEAR = 2012   # first full year of VIIRS NDVI monthly
UA = {"User-Agent": "sowcast-data-pipeline/1.0"}


def fetch(url: str, cache: Path) -> bytes | None:
    if cache.exists():
        data = cache.read_bytes()
        return None if data == b"MISSING" else data
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                data = r.read()
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_bytes(data)
            return data
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_bytes(b"MISSING")
                return None
            time.sleep(1.5 * 2 ** attempt)
        except Exception:
            time.sleep(1.5 * 2 ** attempt)
    raise RuntimeError(f"failed: {url}")


def load_colormap(url: str, classes: bool) -> dict[tuple[int, int, int], float]:
    """RGB -> value (range midpoint for NDVI, class number for land cover). Transparent/no-data entries skipped."""
    xml = fetch(url, RAW / "colormaps" / url.rsplit("/", 1)[1]).decode()
    out: dict[tuple[int, int, int], float] = {}
    for m in re.finditer(r"<ColorMapEntry ([^>]*)/>", xml):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        if attrs.get("transparent") == "true" or attrs.get("nodata") == "true":
            continue
        rgb = tuple(int(v) for v in attrs["rgb"].split(","))
        if classes:
            out[rgb] = float(attrs["sourceValue"].split(",")[0])
        else:
            lo, hi = (float(v) for v in attrs["value"].strip("[]()").split(","))
            out[rgb] = (lo + hi) / 2
    return out


def global_pixel(lat: float, lon: float, z: int) -> tuple[float, float]:
    n = 256 * 2 ** z
    lat_r = math.radians(lat)
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(lat_r) + 1 / math.cos(lat_r)) / math.pi) / 2 * n
    return x, y


def pixel_to_latlon(px: float, py: float, z: int) -> tuple[float, float]:
    n = 256 * 2 ** z
    lon = px / n * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py / n))))
    return lat, lon


def read_window(spec: dict, date: str, z: int, x0: int, y0: int, w: int, h: int, cmap: dict) -> np.ndarray:
    """Decode a w x h window of global pixels starting at (x0, y0) into values (NaN = no data)."""
    out = np.full((h, w), np.nan)
    tiles = {(tx, ty) for tx in range(x0 // 256, (x0 + w - 1) // 256 + 1) for ty in range(y0 // 256, (y0 + h - 1) // 256 + 1)}
    for tx, ty in tiles:
        url = f"{GIBS}/{spec['layer']}/default/{date}/{spec['tms']}/{z}/{ty}/{tx}.png"
        data = fetch(url, RAW / spec["layer"] / date / f"{z}_{ty}_{tx}.png")
        if data is None:
            continue
        img = np.asarray(Image.open(io.BytesIO(data)).convert("RGBA"))
        for gy in range(max(y0, ty * 256), min(y0 + h, ty * 256 + 256)):
            for gx in range(max(x0, tx * 256), min(x0 + w, tx * 256 + 256)):
                r, g, b, a = img[gy - ty * 256, gx - tx * 256]
                if a == 0:
                    continue
                v = cmap.get((int(r), int(g), int(b)))
                if v is not None:
                    out[gy - y0, gx - x0] = v
    return out


def main() -> None:
    cfg = json.loads((DATA / "config" / "sites.json").read_text(encoding="utf8"))
    wanted = [a for a in sys.argv[1:] if not a.startswith("--")]
    sites = [s for s in cfg["sites"] if not wanted or s["id"] in wanted]
    end_year = cfg["period"]["end_year"]
    ndvi_cmap = load_colormap(NDVI["colormap"], classes=False)
    lc_cmap = load_colormap(LANDCOVER["colormap"], classes=True)
    dates = [f"{y}-{m:02d}-01" for y in range(FIRST_YEAR, end_year + 1) for m in range(1, 13)]

    for site in sites:
        lat, lon = site["location"]["lat"], site["location"]["lon"]
        print(f"\n▶ GIBS NDVI {site['id']} ({lat}, {lon})", flush=True)
        cx, cy = (int(v) for v in global_pixel(lat, lon, NDVI["z"]))
        x0, y0, size = cx - HALF, cy - HALF, 2 * HALF + 1

        # Land-cover mask at zoom 8: each zoom-7 pixel = 2x2 zoom-8 pixels; cropland if most of them are.
        lc = read_window(LANDCOVER, LANDCOVER["date"], LANDCOVER["z"], 2 * x0, 2 * y0, 2 * size, 2 * size, lc_cmap)
        crop = np.zeros((size, size), bool)
        land = np.zeros((size, size), bool)
        for j in range(size):
            for i in range(size):
                block = lc[2 * j:2 * j + 2, 2 * i:2 * i + 2].ravel()
                block = block[~np.isnan(block)]
                crop[j, i] = block.size > 0 and np.isin(block, list(CROPLAND)).sum() >= 2
                land[j, i] = block.size > 0 and not np.isin(block, list(WATER)).all()
        use_crop = crop.sum() >= 3
        mask = crop if use_crop else land
        ys, xs = np.nonzero(mask)
        centre = pixel_to_latlon(x0 + xs.mean() + 0.5, y0 + ys.mean() + 0.5, NDVI["z"]) if xs.size else (lat, lon)
        print(f"  cropland pixels in ~10 km window: {int(crop.sum())}/{size * size} → using {'cropland' if use_crop else 'all land'}", flush=True)

        def one(date: str) -> dict:
            vals = read_window(NDVI, date, NDVI["z"], x0, y0, size, size, ndvi_cmap)[mask]
            vals = vals[~np.isnan(vals)]
            return {"year": int(date[:4]), "month": int(date[5:7]),
                    "ndvi": round(float(vals.mean()), 4) if vals.size else "",
                    "n_pixels": int(vals.size), "mask": "cropland" if use_crop else "all land"}

        with ThreadPoolExecutor(max_workers=8) as pool:
            rows = list(pool.map(one, dates))

        out_dir = PROCESSED / site["id"]
        out_dir.mkdir(parents=True, exist_ok=True)
        with open(out_dir / "ndvi_monthly.csv", "w", newline="", encoding="utf8") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)
        (out_dir / "ndvi_mask.json").write_text(json.dumps({
            "source": "NASA GIBS: VIIRS SNPP L3 NDVI monthly, decoded from colour tiles; MODIS IGBP land cover 2024 mask",
            "window_pixels": size * size, "pixel_km": round(156.543 * math.cos(math.radians(lat)) / 2 ** NDVI["z"], 2),
            "cropland_pixels": int(crop.sum()), "mask_used": "cropland" if use_crop else "all land",
            "mask_centre": {"lat": round(centre[0], 4), "lon": round(centre[1], 4)},
        }, indent=2) + "\n", encoding="utf8")
        got = sum(1 for r in rows if r["ndvi"] != "")
        print(f"  ✓ ndvi_monthly.csv: {got}/{len(rows)} months with data", flush=True)


if __name__ == "__main__":
    main()
