"""Step 5d — rotation plans per goal, using the team's recommender (data/inputs/recommender/rec.py) on MEASURED data.

The team's rec.py ranks every valid 1-3 crop rotation for six goals (soil health, market value, saving water,
low risk, low cost/labour, balanced) and keeps the top 3 per goal. Their published output
(data/inputs/sowcast_rotation_recommendations.*) was computed on the draft region values. This step runs the very
same code on the measured region values and crop scores from 05b, so rotations agree with the crop ranking.
Falls back to the team's draft output if 05b has not run.

    data/.venv/Scripts/python.exe -I data/scripts/05d_recommend_rotations.py
Output: data/processed/scored/sowcast_rotation_recommendations.json
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent
SCORED = DATA / "processed" / "scored"
INPUTS = DATA / "inputs"


def main() -> None:
    if not (SCORED / "regions_measured.csv").exists():
        print("⚠ no measured scores yet (run 05b) — copying the team's draft recommendations")
        shutil.copy(INPUTS / "sowcast_rotation_recommendations.json", SCORED / "sowcast_rotation_recommendations.json")
        return
    with tempfile.TemporaryDirectory() as tmp:
        t = Path(tmp)
        shutil.copy(SCORED / "regions_measured.csv", t / "sowcast_regions.csv")
        shutil.copy(INPUTS / "sowcast_crops.csv", t / "sowcast_crops.csv")
        shutil.copy(SCORED / "sowcast_region_crop_fit.csv", t / "sowcast_region_crop_fit.csv")
        shutil.copy(SCORED / "sowcast_rotations.csv", t / "sowcast_rotations.csv")
        os.environ["SOWCAST_REC_DIR"] = str(t) + os.sep
        sys.path.insert(0, str(INPUTS / "recommender"))
        import rec  # noqa: E402  (reads the CSVs at import)

        rows, js = rec.build()
    for rid, v in js.items():
        for g, lst in v["goals"].items():
            for it in lst:
                it["basis"] = "team recommender (rec.py) on measured region data; rule-based, not validated against field trials"
    (SCORED / "sowcast_rotation_recommendations.json").write_text(json.dumps(js, indent=1, ensure_ascii=False), encoding="utf8")
    print(f"✓ rotation plans: {len(rows)} ({len(js)} regions × 6 goals × top 3)")


if __name__ == "__main__":
    main()
