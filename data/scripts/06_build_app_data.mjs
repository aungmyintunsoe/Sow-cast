// Step 6 — Build the app's data files (public/data) from:
//   data/inputs/*.csv        the team's regions, crops, crop-fit scores and rotations (draft priors)
//   data/processed/<site>/   measured data from steps 1-5 (NASA POWER climate, SoilGrids, SRTM, MODIS if fetched)
//
//   node data/scripts/06_build_app_data.mjs
//
// Writes public/data/crops.json, public/data/regions/index.json, public/data/regions/<id>.json
// (shapes: src/types/index.ts). Old region files are removed so the app only shows current regions.
// Every generated sentence is rule-based and says where its numbers came from.
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, PROCESSED_DIR, readCSV, round, mean } from './lib.mjs';

const ROOT = path.resolve(DATA_DIR, '..');
const OUT = path.join(ROOT, 'public', 'data');
const IN = path.join(DATA_DIR, 'inputs');

const regions = readCSV(path.join(IN, 'sowcast_regions.csv'));
const cropRows = readCSV(path.join(IN, 'sowcast_crops.csv'));
// Crop fit and rotations: prefer the versions re-scored with measured region data (05b_score_measured.py),
// which apply the team's own rules (make_data.py) to measured rain, temperature, dry months, soil and slope.
const SCORED = path.join(PROCESSED_DIR, 'scored');
const scored = fs.existsSync(path.join(SCORED, 'sowcast_region_crop_fit.csv'));
const fitRows = readCSV(path.join(scored ? SCORED : IN, 'sowcast_region_crop_fit.csv'));
const rotRows = readCSV(path.join(scored ? SCORED : IN, 'sowcast_rotations.csv'));
const inputsUsed = scored && fs.existsSync(path.join(SCORED, 'region_inputs_used.csv')) ? readCSV(path.join(SCORED, 'region_inputs_used.csv')) : [];
const recFile = [path.join(SCORED, 'sowcast_rotation_recommendations.json'), path.join(IN, 'sowcast_rotation_recommendations.json')].find((f) => fs.existsSync(f));
const recs = recFile ? JSON.parse(fs.readFileSync(recFile, 'utf8')) : {};
const recMeasured = recFile?.includes('scored') ?? false;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Short source names for sentences ("CHIRPS (ClimateSERV)" → "CHIRPS"). */
const shortSrc = (s) => (s ? String(s).replace(/ \(.*\)$/, '') : 'NASA POWER');

const opt = (file) => {
  const p = path.join(PROCESSED_DIR, file);
  if (!fs.existsSync(p)) return null;
  return p.endsWith('.json') ? JSON.parse(fs.readFileSync(p, 'utf8')) : readCSV(p);
};
const split = (s, sep = '; ') => (s ? String(s).split(sep).map((x) => x.trim()).filter(Boolean) : []);
const bool = (v) => v === true || v === 'true' || v === 1;
const clamp15 = (x) => Math.max(1, Math.min(5, Math.round(x)));
const listText = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

// ---------- crops ----------
const crops = cropRows.map((c) => ({
  id: c.id, name: c.name, family: c.family, season: c.season, role: c.role,
  water_need: c.water_need, nitrogen_fixing: bool(c.nitrogen_fixing), root_depth: c.root_depth,
  drought_tolerance: c.drought_tolerance, frost_tolerance: c.frost_tolerance,
  flood_tolerance: c.flood_tolerance, salinity_tolerance: c.salinity_tolerance, sandy_soil_ok: c.sandy_soil_ok,
  temp_min_c: c.temp_min_c, temp_max_c: c.temp_max_c, season_days: c.season_days,
  seasonal_rain_need_mm: c.seasonal_rain_need_mm, needs_flat_land: bool(c.needs_flat_land), dry_season_crop: bool(c.dry_season_crop),
  erosion_cover: c.erosion_cover, organic_matter: c.organic_matter, market: c.market, forage_value: c.forage_value,
  pest_notes: c.pest_notes, plain_description: c.plain_description,
  // Farming details (team's crop table; rough, regional averages)
  yield_low: c.rough_yield_low ?? null, yield_high: c.rough_yield_high ?? null, yield_unit: c.yield_unit ?? null,
  n_fixed: c.n_fixed_kg_ha_rough && c.n_fixed_kg_ha_rough !== 'none' ? String(c.n_fixed_kg_ha_rough) : null,
  needs: {
    fertiliser: c.fertiliser_need_1_5 ?? null, labour: c.labour_need_1_5 ?? null, seed_cost: c.seed_cost_1_5 ?? null,
    pest_difficulty: c.pest_difficulty_1_5 ?? null, storage_difficulty: c.storage_difficulty_1_5 ?? null,
  },
  relative_income: c.relative_income_1_5 ?? null,
  good_after: split(c.good_after, '|'), avoid_after: split(c.avoid_after, '|'),
  farmer_tip: c.farmer_tip ?? '',
}));
const cropById = Object.fromEntries(crops.map((c) => [c.id, c]));
const cropName = (id) => (id === 'fallow' ? 'fallow' : id === 'perennial_tree' ? 'tree crops' : (cropById[id]?.name ?? id).replace(/ \(.*\)$/, ''));
// Traits assumed for the non-crop token "perennial_tree" (rubber, oil palm, coffee, fruit) when scoring rotations.
const TREE = { organic_matter: 3, erosion_cover: 4, market: 4, water_need: 3, nitrogen_fixing: false, family: 'tree' };

// ---------- helpers for measured data ----------
function trendStat(t) {
  if (!t) return { per_decade: null, first_10y_mean: null, last_10y_mean: null, p: null };
  return { per_decade: t.per_decade, first_10y_mean: t.first_10y_mean, last_10y_mean: t.last_10y_mean, p: t.mann_kendall?.p ?? null };
}

function buildInsights(r, trends, annual, fits, monthly) {
  const out = [];
  const period = (trends?.period ?? '2001-2024').replace('-', '–');
  const rainSrc = shortSrc(trends?.quality?.rain_source), tempSrc = shortSrc(trends?.quality?.temp_source);
  const srcFor = (k) => `${k === 'heat_days' ? tempSrc : rainSrc}, ${period}`;
  const T = trends?.trends ?? {};
  const fmt = (v, d = 0) => (v === null || v === undefined ? '?' : Number(v).toFixed(d));
  const conf = (p) => (p < 0.05 ? 'high' : 'medium');
  const weatherOk = trends?.quality?.weather !== 'suspect';

  // 1) Measured climate changes (NASA POWER), only where the trend test says it is likely real (p < 0.15)
  const candidates = [
    { k: 'heavy_rain_days', title: (up) => (up ? 'Downpours are becoming more common' : 'Fewer downpours than before'),
      body: (s) => `Days with 20 mm or more of rain went from about ${fmt(s.first_10y_mean)} to ${fmt(s.last_10y_mean)} a year (first vs last 10 years). ${s.per_decade > 0 ? 'Bare soil during these storms washes away fastest.' : ''}`,
      badge: (up) => (up ? 'warning' : 'neutral') },
    { k: 'heat_days', title: (up) => (up ? 'More very hot days' : 'Fewer very hot days'),
      body: (s) => `Days at 35 °C or hotter went from about ${fmt(s.first_10y_mean)} to ${fmt(s.last_10y_mean)} a year. Heat at flowering cuts yields of rice, maize and most pulses.`,
      badge: (up) => (up ? 'warning' : 'opportunity') },
    { k: 'max_dry_spell_days', title: (up) => (up ? 'Dry spells are getting longer' : 'Dry spells are getting shorter'),
      body: (s) => `The longest run of days without rain went from about ${fmt(s.first_10y_mean)} to ${fmt(s.last_10y_mean)} days. ${s.per_decade > 0 ? 'Short, drought-tolerant crops lower the risk.' : ''}`,
      badge: (up) => (up ? 'warning' : 'opportunity') },
    { k: 'precip_mm', title: (up) => (up ? 'Rainfall has increased' : 'Rainfall has decreased'),
      body: (s) => `Yearly rain went from about ${fmt(s.first_10y_mean)} mm to ${fmt(s.last_10y_mean)} mm.`,
      badge: (up) => (up ? 'neutral' : 'warning') },
  ];
  const sig = candidates
    .map((c) => ({ c, s: T[c.k] ? { ...T[c.k], p: T[c.k].mann_kendall?.p } : null }))
    .filter(() => weatherOk) // trends are artefacts where the weather series is broken
    .filter(({ s }) => s && s.p !== null && s.p < 0.15 && s.per_decade)
    .sort((a, b) => a.s.p - b.s.p);
  for (const { c, s } of sig) {
    const up = s.per_decade > 0;
    if (out.length < 2) out.push({ title: c.title(up), body: c.body(s).trim(), source: srcFor(c.k), confidence: conf(s.p), badgeType: c.badge(up) });
  }

  // 2) Water budget (rain minus crop water demand), measured
  const wb = mean(annual.map((a) => a.water_balance_mm));
  const wbSrc = `${rainSrc} rain, ${tempSrc} temperature, ${period}`;
  if (wb !== null && weatherOk && out.length < 2) {
    out.push(wb < -300
      ? { title: 'Rain does not cover crop water needs', body: `On average, crops here need about ${fmt(-wb)} mm more water each year than rain provides. Irrigation or drought-tolerant crops matter.`, source: wbSrc, confidence: 'medium', badgeType: 'warning' }
      : wb > 300
        ? { title: 'Rain is more than crops can use', body: `Rain exceeds crop water demand by about ${fmt(wb)} mm a year. Waterlogging and runoff are bigger risks than drought.`, source: wbSrc, confidence: 'medium', badgeType: 'neutral' }
        : { title: 'Rain roughly matches crop needs', body: `Yearly rain and crop water demand are within about ${fmt(Math.abs(wb))} mm of each other. Timing within the year matters more than the total.`, source: wbSrc, confidence: 'medium', badgeType: 'neutral' });
  }

  // 3) Greenness calendar (NASA VIIRS NDVI over cropland), measured
  const nd = (monthly ?? []).filter((m) => m.ndvi !== null && m.ndvi !== undefined);
  if (nd.length === 12 && out.length < 2) {
    const hi = nd.reduce((a, b) => (b.ndvi > a.ndvi ? b : a)), lo = nd.reduce((a, b) => (b.ndvi < a.ndvi ? b : a));
    out.push({ title: `Fields are greenest in ${MONTHS[hi.month - 1]}, barest in ${MONTHS[lo.month - 1]}`,
      body: `Satellite greenness of the farmland here peaks at ${hi.ndvi.toFixed(2)} and drops to ${lo.ndvi.toFixed(2)} (0 = bare, 1 = dense crop). The low months are when soil is most exposed to rain and wind.`,
      source: 'NASA VIIRS NDVI over cropland, 2012–2024', confidence: 'medium', badgeType: 'neutral' });
  }

  // 4) Best-matched crops (team's scoring rules; measured inputs when available)
  {
    const top = fits.slice(0, 3).map((f) => cropName(f.crop_id));
    out.push({ title: 'Best-matched crops for this area', body: `${listText(top)} score highest on climate, water and soil fit.`,
      source: scored && weatherOk ? 'Sowcast crop-fit score using measured climate and soil' : 'Sowcast crop-fit score (draft values)',
      confidence: scored && weatherOk ? 'medium' : 'experimental', badgeType: 'opportunity' });
  }

  // 5) Known local risks from the team's draft region values
  if (out.length < 3 && r.salinity_risk_0_3 >= 2) out.push({ title: 'Salt water is a known risk', body: 'Seawater pushes inland in the dry season. Salt-tolerant rice or short pulses after the wet season are safer.', source: 'Team draft region data (not yet measured)', confidence: 'experimental', badgeType: 'warning' });
  if (out.length < 3 && r.flood_risk_0_3 >= 2) out.push({ title: 'Flooding is a known risk', body: 'Crops that cannot stand in water are at risk in the wet season.', source: 'Team draft region data (not yet measured)', confidence: 'experimental', badgeType: 'warning' });
  return out.slice(0, 3);
}

function buildRotations(r, rots, fits) {
  const fitByCrop = Object.fromEntries(fits.map((f) => [f.crop_id, f]));
  const current = rots.find((x) => x.option === 'current');
  const currentHasFallow = current ? bool(current.has_fallow) : false;
  return rots.map((x) => {
    const steps = String(x.sequence).split('|');
    const ids = steps.flatMap((s) => s.split('+'));
    const traits = ids.filter((id) => id !== 'fallow').map((id) => (id === 'perennial_tree' ? TREE : cropById[id])).filter(Boolean);
    const hasFallow = bool(x.has_fallow);
    const nfix = bool(x.has_nitrogen_fixer);
    const distinct = new Set(ids.filter((id) => id !== 'fallow')).size;

    // Transparent 1-5 scores from crop traits (draft rule; only used for the current-practice card's reasons)
    const scores = {
      soil: clamp15((mean(traits.map((t) => t.organic_matter)) ?? 2) + (nfix ? 1 : 0) - (hasFallow ? 1 : 0)),
      water: clamp15(6 - (mean(traits.map((t) => t.water_need)) ?? 3)),
      erosion: clamp15((mean(traits.map((t) => t.erosion_cover)) ?? 2) - (hasFallow ? 1 : 0)),
      income: clamp15(mean(traits.map((t) => t.market)) ?? 2),
      pest_break: clamp15((distinct <= 1 ? 1 : distinct === 2 ? 3 : 4) + (bool(x.cereal_legume_break) ? 1 : 0)),
    };

    const benefits = [];
    if (nfix) benefits.push('A legume in the sequence adds nitrogen for the next crop');
    if (bool(x.cereal_legume_break)) benefits.push('Switching between a cereal and a legume breaks pest and disease cycles');
    if (!hasFallow && currentHasFallow && x.option !== 'current') benefits.push('Replaces the bare fallow season with a crop');
    if (distinct >= 2) benefits.push(`Spreads risk across ${distinct} crops`);
    if (x.avg_crop_suitability !== null) benefits.push(`Average crop match here: ${x.avg_crop_suitability}/100`);

    const risks = [];
    for (const id of new Set(ids)) {
      const f = fitByCrop[id];
      for (const lim of split(f?.limits)) risks.push(`${cropName(id)}: ${lim}`);
    }
    if (!risks.length) risks.push('None flagged by the crop-fit score; still check pests, prices and labour locally');

    const gaps = ['Sowing and harvest months are not collected yet, so ground cover by month is not shown'];
    if (x.confidence === 'low') gaps.push('Based on general agronomy knowledge; check with local farmers or extension staff');

    // Evidence chips: literature references like "Herridge 2019" when cited, else the data's status
    const refs = [...new Set((String(x.source_or_basis).match(/[A-Z][A-Za-z]+(?: et al\.)? \d{4}/g) ?? []))];
    return {
      id: x.option,
      label: x.option === 'current' ? 'Current' : x.option === 'alt_a' ? 'Option A' : 'Option B',
      name: x.label.replace(/ \(.*\)$/, ''),
      tagline: /\(.*\)$/.test(x.label) ? x.label.match(/\((.*)\)$/)[1] : undefined,
      sequence: steps,
      cover_by_month: null,
      scores,
      // Use the team's cited reason when there is one; otherwise say plainly that it is unverified.
      // A bare citation list ("Vityakon 2007; Rambo 2017") is not a reason, so only use text that explains something.
      why: !/^general knowledge/i.test(String(x.source_or_basis)) &&
        String(x.source_or_basis).replace(/[A-Z][A-Za-z]+(?: et al\.?)?(?: \d{4})?/g, '').replace(/[^a-z]/gi, '').length > 15
        ? String(x.source_or_basis).replace(/\.?$/, '.')
        : x.option === 'current'
          ? `The usual pattern in ${r.region}${refs.length ? ', as described in the cited studies' : ', based on general knowledge'}.`
          : 'A common option in similar areas. Not yet checked for this region.',
      evidence: refs.length ? refs : ['Not yet verified'],
      benefits: benefits.slice(0, 4),
      gaps,
      risks: risks.slice(0, 4),
      confidence: x.confidence === 'medium' ? 'medium' : 'low',
    };
  });
}

// ---------- crop calendars (team planting rules: sow_month from make_data.window(), length from season_days) ----------
const PERENNIAL = new Set(['cashew', 'oil_palm', 'rubber', 'cover_legume', 'perennial_tree']);
const nMonths = (days) => Math.max(1, Math.min(12, Math.round(days / 30)));
function calendarFor(steps, planType, sowOf) {
  const blank = () => Array(12).fill(null);
  const place = (row, id, start, n) => { for (let i = 0; i < n; i++) row[(start - 1 + i) % 12] ??= id; };
  const dur = (id) => Number(cropById[id]?.season_days) || 120;
  const flat = steps.flatMap((x) => x.split('+'));
  const tree = flat.find((x) => PERENNIAL.has(x) && x !== 'cover_legume');
  // Tree crops with something between the rows: trees all year, the intercrop in its own months
  if (tree) {
    const under = blank();
    for (const id of flat.filter((x) => x !== tree)) place(under, id, sowOf(id) ?? 5, id === 'cover_legume' ? 12 : nMonths(dur(id)));
    const rows = [{ label: 'Trees', cells: Array(12).fill(tree) }];
    if (under.some(Boolean)) rows.push({ label: 'Between rows', cells: under });
    return { rows, approximate: true };
  }
  const ids = flat.filter((x) => x !== 'fallow');
  if (!ids.length) return null;
  if (/^1-year/.test(planType ?? '')) {
    const row = blank();
    for (const id of ids) place(row, id, sowOf(id) ?? 5, nMonths(dur(id)));
    return { rows: [{ label: 'Every year', cells: row }], approximate: true };
  }
  if (planType) {
    // Multi-year rotation: one crop per year
    return {
      rows: ids.map((id, k) => { const row = blank(); place(row, id, sowOf(id) ?? 5, nMonths(dur(id))); return { label: `Year ${k + 1}`, cells: row }; }),
      approximate: true,
    };
  }
  // Current practice: the same crop every year, or crops one after another within the year
  if (new Set(ids).size === 1 && ids[0] !== 'rice') {
    const row = blank(); place(row, ids[0], sowOf(ids[0]) ?? 5, nMonths(dur(ids[0])));
    return { rows: [{ label: 'Every year', cells: row }], approximate: true };
  }
  const row = blank();
  let t = sowOf(ids[0]) ?? 5;
  for (const id of ids) { const n = nMonths(dur(id)); place(row, id, t, n); t = ((t - 1 + n) % 12) + 1; }
  return { rows: [{ label: 'Every year', cells: row }], approximate: true };
}

const GOAL_IDS = ['balanced', 'soil_health', 'market_income', 'water_saving', 'low_risk', 'low_cost_labour'];
const splitSemi = (s) => (s ? String(s).split('; ').map((x) => x.trim()).filter(Boolean) : []);
const stepsOf = (seqText) => (String(seqText).startsWith('perennial_tree+') ? [String(seqText).replace(/\|/g, '+')] : String(seqText).split('|'));
const capital = (x) => x.charAt(0).toUpperCase() + x.slice(1);

/** Current practice + the team recommender's top 3 per goal, in one shape (RotationPlan in src/types). */
function buildPlans(r, rots, fits) {
  const sowOf = (id) => Number(fits.find((f) => f.crop_id === id)?.sow_month) || null;
  const rec = recs[r.id];
  const curRow = rots.find((x) => x.option === 'current');
  const cur = curRow ? buildRotations(r, [curRow], fits)[0] : null;
  const cs = rec?.current_rotation?.scores;
  const current = cur ? {
    id: `current:${curRow.sequence}`, kind: 'current', goal: null, rank: null,
    name: cur.name, tagline: cur.tagline ?? null, plan_type: 'What most farmers here do now',
    sequence: cur.sequence, goal_match: null, change_vs_current: null,
    scores: cs ? { soil: cs.soil, market: cs.market, water: cs.water, resilience: cs.resil, low_cost: cs.cost, suitability: cs.suit } : null,
    why: [cur.why], cautions: cur.risks, evidence: cur.evidence,
    calendar: calendarFor(cur.sequence, null, sowOf),
    confidence: cur.confidence, basis: 'Team rotation table (sowcast_rotations.csv)',
  } : null;
  const byGoal = {};
  for (const g of GOAL_IDS) {
    byGoal[g] = (rec?.goals?.[g] ?? []).map((p) => {
      const steps = stepsOf(p.sequence);
      return {
        id: `plan:${p.sequence}`, kind: 'recommended', goal: g, rank: Number(p.rank),
        name: p.sequence_names.replace(/ -> /g, ' then ').replace(/^Tree crop \+ /, 'Tree crops with '),
        tagline: null, plan_type: capital(p.plan_type),
        sequence: steps, goal_match: Math.round(p.goal_match_score),
        change_vs_current: p.change_vs_current_key_score === null || p.change_vs_current_key_score === undefined || p.change_vs_current_key_score === '' ? null : Number(p.change_vs_current_key_score),
        scores: { soil: p.soil_score, market: p.market_score, water: p.water_score, resilience: p.risk_resilience_score, low_cost: p.low_cost_score, suitability: p.crop_suitability_score },
        why: splitSemi(p.why).map(capital), cautions: splitSemi(p.cautions), evidence: [],
        calendar: calendarFor(steps, p.plan_type, sowOf),
        confidence: p.confidence === 'medium' ? 'medium' : 'low',
        basis: recMeasured ? 'Team recommender (rec.py) on measured data' : 'Team recommender (rec.py) on draft values',
      };
    });
  }
  return { current, by_goal: byGoal };
}

// ---------- write ----------
fs.mkdirSync(path.join(OUT, 'regions'), { recursive: true });
for (const f of fs.readdirSync(path.join(OUT, 'regions'))) if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT, 'regions', f));
fs.writeFileSync(path.join(OUT, 'crops.json'), JSON.stringify(crops, null, 2) + '\n');

const index = [];
const missing = [];
for (const r of regions) {
  const monthlyRows = opt(`${r.id}/monthly_climatology.csv`);
  const annualRows = opt(`${r.id}/annual.csv`);
  const trends = opt(`${r.id}/trends.json`);
  const soil = opt(`${r.id}/soil_summary.json`);
  const terrain = opt(`${r.id}/terrain.json`);
  if (!monthlyRows || !annualRows) missing.push(r.id);

  const fits = fitRows.filter((f) => f.region_id === r.id).sort((a, b) => a.rank - b.rank);
  const rots = rotRows.filter((x) => x.region_id === r.id);
  const annual = (annualRows ?? []).map((a) => ({
    year: a.year, heat_days: a.heat_days, precip_mm: a.precip_mm, heavy_rain_days: a.heavy_rain_days,
    max_dry_spell_days: a.max_dry_spell_days, water_balance_mm: a.water_balance_mm,
  }));
  const common = split(r.common_crops_in_area, '|');
  const weatherOk = trends?.quality?.weather !== 'suspect';
  const measuredRain = weatherOk ? mean(annual.map((a) => a.precip_mm)) : null;
  const noTrend = trendStat(null);

  const detail = {
    region: { id: r.id, name: r.region, place: r.place, country: r.country, lat: r.lat, lon: r.lon },
    monthly: (monthlyRows ?? []).map((m) => ({
      month: m.month, tmax_c: m.tmax_c, tmin_c: m.tmin_c, precip_mm: m.precip_mm, et0_mm: m.et0_mm,
      soil_moisture: m.soil_moisture, ndvi: m.ndvi ?? null, heat_days: m.heat_days, heavy_rain_days: m.heavy_rain_days,
      typically_bare: m.typically_bare === null || m.typically_bare === undefined ? null : bool(m.typically_bare),
    })),
    annual,
    trends: {
      period: trends?.period ?? null,
      heat_days: weatherOk ? trendStat(trends?.trends?.heat_days) : noTrend,
      precip_mm: weatherOk ? trendStat(trends?.trends?.precip_mm) : noTrend,
      heavy_rain_days: weatherOk ? trendStat(trends?.trends?.heavy_rain_days) : noTrend,
      max_dry_spell_days: weatherOk ? trendStat(trends?.trends?.max_dry_spell_days) : noTrend,
      mean_water_balance_mm: weatherOk ? round(mean(annual.map((a) => a.water_balance_mm)), 0) : null,
    },
    data_quality: {
      weather: weatherOk ? 'ok' : 'suspect',
      sources: {
        rain: trends?.quality?.rain_source ?? null,
        temperature: trends?.quality?.temp_source ?? null,
        greenness: trends?.quality?.ndvi_source ?? null,
        power_replaced: Boolean(trends?.quality?.power_check?.broken),
      },
      note: weatherOk ? null : `The weather series for this area has a break around 2008: rain jumps ${trends?.quality?.final_check?.rain_step_ratio_2008_vs_before ?? '?'} times and temperature shifts ${trends?.quality?.final_check?.tmean_step_c_2008_vs_before ?? '?'} °C at once. That is a data problem, not a real change, so weather numbers are hidden until a better source is added.`,
    },
    soil: soil ? {
      texture: soil.app_labels.texture, organic_matter: soil.app_labels.organic_matter,
      drainage: soil.app_labels.drainage_heuristic, water_holding: soil.app_labels.water_holding,
      slope_pct: terrain?.slope_pct_field ?? null, erosion_risk: terrain?.erosion_risk_from_slope ?? null,
      sampled_km_from_town: soil.sampled_at?.km_from_reference ?? null,
      source: `ISRIC SoilGrids${terrain ? ' + NASA SRTM' : ''}`,
    } : null,
    priors: {
      rain_mm: r.rain_mm_approx, mean_temp_c: r.mean_temp_c_approx, dry_months: r.dry_months_approx,
      soil_texture: r.soil_texture, drainage: r.drainage, slope_pct: r.slope_pct_approx,
      flood_risk: r.flood_risk_0_3, salinity_risk: r.salinity_risk_0_3, irrigation_access: r.irrigation_access_0_3,
      tree_crop_dominated: bool(r.tree_crop_dominated), soil_degraded: bool(r.soil_degraded),
      common_crops: common, evidence: r.evidence_sources, confidence: r.confidence === 'medium' ? 'medium' : 'low',
    },
    // Which region inputs the crop scores used: measured value or the team's draft (05b_score_measured.py)
    scoring_inputs: inputsUsed.filter((u) => u.region_id === r.id).map((u) => ({
      input: u.input, draft: u.draft, measured: u.measured, used: u.used, source: u.source,
    })),
    insights: buildInsights(r, trends, annual, fits, monthlyRows ?? []),
    calendar: { wet_start: Number(r.wet_season_start_month_approx) || null, wet_end: Number(r.wet_season_end_month_approx) || null, confidence: r.calendar_confidence ?? null },
    rotation_relevance: r.rotation_relevance ?? 'normal',
    plans: buildPlans(r, rots, fits),
    // 2001-2024 trends extended to 2035 and their consequences (05b + lib_projections.py; method in data/ANALYSIS.md)
    outlook: weatherOk ? opt(`${r.id}/projections.json`) : null,
    crop_fit: fits.map((f) => ({
      crop: f.crop_id, rank: f.rank, fit: Math.round(f.fit), fit_band: f.fit_band,
      // year-by-year re-scoring + Mann-Kendall (05b_score_measured.py); 'unknown' where weather is not reliable
      trend: ['increasing', 'declining', 'flat'].includes(f.trend) ? f.trend : 'unknown',
      limits: split(f.limits), why: split(f.why), common_locally: bool(f.common_locally),
      parts: { climate: f.climate_part, water: f.water_part, soil: f.soil_part, risk: f.risk_part, benefit: f.benefit_part },
      label: f.fit_label ?? null, planting_window: f.suggested_planting_window ?? null, harvest: f.approx_harvest_month ?? null,
      sow_month: Number(f.sow_month) || null, yield_outlook: f.yield_outlook_here ?? null, rotation_tip: f.rotation_tip_here ?? null,
    })),
    sources: [
      ...(monthlyRows ? [`rain from ${shortSrc(trends?.quality?.rain_source)}`, `temperature from ${shortSrc(trends?.quality?.temp_source)}`] : []),
      ...(trends?.quality?.ndvi_source ? ['greenness from NASA VIIRS'] : []),
      ...(soil ? ['ISRIC SoilGrids'] : []),
      ...(terrain ? ['NASA SRTM elevation'] : []),
      scored ? 'crop scores from the team rules applied to measured data' : 'Sowcast team draft crop and rotation data',
    ],
  };
  fs.writeFileSync(path.join(OUT, 'regions', `${r.id}.json`), JSON.stringify(detail, null, 2) + '\n');

  const crops3 = common.slice(0, 3).map((id) => cropName(id).toLowerCase());
  const rainForTagline = measuredRain ?? r.rain_mm_approx;
  const rainText = rainForTagline ? `about ${(Math.round(rainForTagline / 50) * 50).toLocaleString('en-US')} mm of rain a year` : null;
  const tagline = bool(r.tree_crop_dominated) && !crops3.length
    ? `Mostly tree crops${rainText ? `, ${rainText}` : ''}`
    : `${crops3.length ? `Grows ${listText(crops3)}` : 'Mixed farming'}${rainText ? `; ${rainText}` : ''}`;
  index.push({ id: r.id, name: r.region, place: r.place, country: r.country, lat: r.lat, lon: r.lon, tagline, confidence: r.confidence === 'medium' ? 'medium' : 'low' });
}
fs.writeFileSync(path.join(OUT, 'regions', 'index.json'), JSON.stringify(index, null, 2) + '\n');

console.log(`✓ public/data: ${crops.length} crops, ${index.length} regions`);
if (missing.length) console.warn(`⚠ no climate data yet for: ${missing.join(', ')} — run steps 1-5 first`);
