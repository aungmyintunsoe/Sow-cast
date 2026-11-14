// Shared helpers for the Sowcast data pipeline. Zero dependencies — Node 18+ (built-in fetch).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(here, '..');
export const RAW_DIR = path.join(DATA_DIR, 'raw');
export const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
export const CONFIG_PATH = path.join(DATA_DIR, 'config', 'sites.json');

export function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}


/** Sites filtered by optional CLI args: `node script.mjs iowa punjab` */
export function selectedSites(cfg = loadConfig()) {
  const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  return wanted.length ? cfg.sites.filter((s) => wanted.includes(s.id)) : cfg.sites;
}

export const hasFlag = (f) => process.argv.includes(f);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

/**
 * GET JSON with retries + optional on-disk cache (so re-runs are free and
 * flaky services like ORNL MODIS don't force a full restart).
 */
export async function fetchJSON(url, { cacheFile, retries = 5, timeoutMs = 120_000, headers = {} } = {}) {
  if (cacheFile && fs.existsSync(cacheFile) && !hasFlag('--refresh')) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'sowcast-data-pipeline/1.0', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const text = await res.text();
      const json = JSON.parse(text);
      if (cacheFile) {
        ensureDir(path.dirname(cacheFile));
        fs.writeFileSync(cacheFile, text);
      }
      return json;
    } catch (err) {
      lastErr = err;
      const wait = Math.min(30_000, 1500 * 2 ** (attempt - 1));
      console.warn(`  ! attempt ${attempt}/${retries} failed (${err.message}) — retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
  throw new Error(`Failed after ${retries} attempts: ${url}\n${lastErr?.message}`);
}

/** Run async tasks with limited concurrency. */
export async function pool(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

export function toCSV(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => {
    if (v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v))) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

export function writeCSV(file, rows) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, toCSV(rows));
  console.log(`  ✓ wrote ${path.relative(DATA_DIR, file)} (${rows.length} rows)`);
}

export function writeJSON(file, obj) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
  console.log(`  ✓ wrote ${path.relative(DATA_DIR, file)}`);
}

export function readCSV(file) {
  const [header, ...lines] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const cols = header.split(',');
  return lines.map((line) => {
    const vals = line.split(',');
    const row = {};
    cols.forEach((c, i) => {
      const v = vals[i];
      row[c] = v === '' || v === undefined ? null : isNaN(Number(v)) ? v : Number(v);
    });
    return row;
  });
}

export const round = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d);
export const mean = (a) => {
  const v = a.filter((x) => x !== null && Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
export const sum = (a) => a.filter((x) => x !== null && Number.isFinite(x)).reduce((s, x) => s + x, 0);

/** Ordinary least squares slope of y on x (ignores nulls). */
export function slope(xs, ys) {
  const pts = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pts.length < 3) return null;
  const mx = mean(pts.map((p) => p[0]));
  const my = mean(pts.map((p) => p[1]));
  let num = 0, den = 0;
  for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) ** 2; }
  return den === 0 ? null : num / den;
}

/** Mann-Kendall trend test (no ties correction) → { S, z, p, trend }. */
export function mannKendall(ys) {
  const v = ys.filter((y) => Number.isFinite(y));
  const n = v.length;
  if (n < 8) return { S: null, z: null, p: null, trend: 'insufficient data' };
  let S = 0;
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) S += Math.sign(v[j] - v[i]);
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  const z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const p = 2 * (1 - normCdf(Math.abs(z)));
  return { S, z: round(z, 3), p: round(p, 4), trend: p < 0.05 ? (z > 0 ? 'increasing' : 'decreasing') : 'no significant trend' };
}

function normCdf(x) {
  // Abramowitz-Stegun approximation
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}


/** YYYY-MM-DD → day of year */
export function doy(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86_400_000);
}
