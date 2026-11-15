#!/usr/bin/env bash
# Soil via WCS for every region still missing it, then the whole pipeline (cached sources are skipped).
cd "$(dirname "$0")/../.."
data/.venv/Scripts/python.exe -I data/scripts/03b_fetch_soil_wcs.py
node data/scripts/run_all.mjs
