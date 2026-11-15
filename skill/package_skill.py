"""Zip the skill for upload to Claude apps (claude.ai: Settings > Capabilities > Skills > Upload).

    python skill/package_skill.py      ->  skill/dist/sowcast-advisor.zip

The zip holds one top-level folder, sowcast-advisor/, with SKILL.md inside. Test cases (evals/) and caches are left out.
"""
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "skills" / "sowcast-advisor"
OUT = HERE / "dist" / "sowcast-advisor.zip"
SKIP_DIRS = {"evals", "__pycache__"}

OUT.parent.mkdir(exist_ok=True)
n = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(SRC.rglob("*")):
        rel = f.relative_to(SRC)
        if f.is_dir() or SKIP_DIRS & set(rel.parts) or f.suffix == ".pyc":
            continue
        z.write(f, f"sowcast-advisor/{rel.as_posix()}")
        n += 1
print(f"✓ {OUT.relative_to(HERE.parent).as_posix()}: {n} files, {OUT.stat().st_size / 1e6:.1f} MB")
