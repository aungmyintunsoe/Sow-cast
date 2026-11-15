// Sowcast rotation recommender. Pure TypeScript, no dependencies, runs in the browser.
// Draft model: scores come from approximate priors, not validated against field trials.

export type Goal = 'soil_health' | 'market_income' | 'water_saving' | 'low_risk' | 'low_cost_labour' | 'balanced';
export type MarketTarget = 'self' | 'local_fresh' | 'commodity' | 'mixed';
export type WaterSource = 'rainfed' | 'limited' | 'irrigated';

export interface Region {
  id: string; country: string; region: string;
  rain_mm_approx: number; dry_months_approx: number; soil_texture: string; slope_pct_approx: number;
  flood_risk_0_3: number; salinity_risk_0_3: number; irrigation_access_0_3: number;
  tree_crop_dominated: number; soil_degraded: number; common_crops_in_area: string; rotation_relevance: string; confidence: string;
}
export interface Crop {
  id: string; name: string; family: string; season: string; water_need: number; nitrogen_fixing: boolean;
  drought_tolerance: number; flood_tolerance: number; salinity_tolerance: number; season_days: number;
  erosion_cover: number; organic_matter: number; market: number; seasonal_rain_need_mm: number; dry_season_crop: boolean;
  fertiliser_need_1_5: number; labour_need_1_5: number; seed_cost_1_5: number; pest_difficulty_1_5: number;
  storage_difficulty_1_5: number; relative_income_1_5: number; avoid_after: string; n_fixed_kg_ha_rough: string;
}
export interface CropFit { region_id: string; crop_id: string; fit: number; risk_part: number; limits: string }
export interface Options { goal: Goal; marketTarget?: MarketTarget; waterSource?: WaterSource; topN?: number }
export interface Recommendation {
  rank: number; sequence: string[]; sequenceNames: string; planType: string; goalMatchScore: number;
  scores: { soil: number; market: number; water: number; riskResilience: number; lowCost: number; cropSuitability: number };
  why: string[]; cautions: string[]; changeVsCurrentKeyScore: number | null;
}

const PERENN = new Set(['cashew', 'oil_palm', 'rubber', 'cover_legume']);
const DRAIN = new Set(['cassava', 'sugarcane', 'maize']);
const MC: Record<string, string> = {
  rice: 'staple', salt_rice: 'staple', maize: 'staple', sorghum: 'staple', sweet_potato: 'staple', cassava: 'industrial', sugarcane: 'industrial',
  oil_palm: 'industrial', rubber: 'industrial', cashew: 'industrial', soybean: 'pulse_oilseed', groundnut: 'pulse_oilseed', green_gram: 'pulse_oilseed',
  black_gram: 'pulse_oilseed', cowpea: 'pulse_oilseed', pigeon_pea: 'pulse_oilseed', chickpea: 'pulse_oilseed', sesame: 'pulse_oilseed',
  sunflower: 'pulse_oilseed', potato: 'fresh', watermelon: 'fresh', vegetables: 'fresh', pineapple: 'fresh', sunn_hemp: 'soil', cover_legume: 'soil',
};
const TF: Record<MarketTarget, Record<string, number>> = {
  self: { staple: 1, pulse_oilseed: 0.8, fresh: 0.6, industrial: 0.4, soil: 0.3 },
  local_fresh: { fresh: 1, pulse_oilseed: 0.7, staple: 0.6, industrial: 0.4, soil: 0.3 },
  commodity: { industrial: 0.9, pulse_oilseed: 1, staple: 0.7, fresh: 0.5, soil: 0.3 },
  mixed: { staple: 0.7, pulse_oilseed: 0.7, fresh: 0.7, industrial: 0.7, soil: 0.7 },
};
type SubKey = 'soil' | 'market' | 'water' | 'resil' | 'cost' | 'suit';
const SUBS: SubKey[] = ['soil', 'market', 'water', 'resil', 'cost', 'suit'];
export const GOALS: Record<Goal, Record<SubKey, number>> = {
  soil_health: { soil: 0.5, suit: 0.2, resil: 0.15, water: 0.05, market: 0.05, cost: 0.05 },
  market_income: { market: 0.45, suit: 0.25, cost: 0.1, resil: 0.1, soil: 0.1, water: 0 },
  water_saving: { water: 0.45, suit: 0.25, resil: 0.15, soil: 0.1, market: 0.05, cost: 0 },
  low_risk: { resil: 0.45, suit: 0.25, water: 0.15, soil: 0.1, market: 0.05, cost: 0 },
  low_cost_labour: { cost: 0.45, suit: 0.25, market: 0.15, soil: 0.1, resil: 0.05, water: 0 },
  balanced: { suit: 0.25, soil: 0.2, market: 0.2, resil: 0.15, water: 0.1, cost: 0.1 },
};
export const GOAL_LABEL: Record<Goal, string> = {
  soil_health: 'Best for soil health', market_income: 'Best for market value', water_saving: 'Best for saving water',
  low_risk: 'Best for low risk (flood, drought, salt)', low_cost_labour: 'Best for low cost and labour', balanced: 'Best balanced choice',
};
const WATER: Record<WaterSource, number> = { rainfed: 0, limited: 1, irrigated: 3 };
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

interface Eval { typ: string; seq: string[]; tree: boolean; s: any }
export class Recommender {
  private R = new Map<string, Region>(); private C = new Map<string, Crop>(); private F = new Map<string, CropFit>();
  private cropIds: string[]; private common = new Map<string, Set<string>>(); private cache = new Map<string, any>();
  constructor(regions: Region[], crops: Crop[], fits: CropFit[]) {
    regions.forEach(r => { this.R.set(r.id, r); this.common.set(r.id, new Set((r.common_crops_in_area || '').split('|').filter(Boolean))); });
    crops.forEach(c => this.C.set(c.id, c)); fits.forEach(f => this.F.set(f.region_id + '|' + f.crop_id, f));
    this.cropIds = crops.map(c => c.id);
  }
  private slot(c: Crop) {
    if (PERENN.has(c.id)) return 'perennial';
    if (c.season_days >= 250 || c.id === 'pineapple') return 'long';
    if (c.dry_season_crop) return 'dry';
    if (c.season.includes('wet or dry')) return 'either';
    return 'wet';
  }
  private wpart(r: Region, c: Crop, irr: number) {
    const rs = r.rain_mm_approx * 0.85; let ratio = rs / c.seasonal_rain_need_mm + irr * 0.15;
    if (c.dry_season_crop) ratio = Math.max(ratio, 0.5 + 0.15 * irr);
    const f = 1.8 - 0.25 * c.drought_tolerance;
    let w = ratio >= 1 ? 1.0 : clamp(1 - (1 - ratio) * f);
    if (r.rain_mm_approx > 2500 && c.drought_tolerance >= 4) w *= 1 - 0.5 * clamp((r.rain_mm_approx - 2500) / 2500) * (c.drought_tolerance - 2) / 3;
    return w;
  }
  private cropFit(rid: string, cid: string, irr: number) {
    const r = this.R.get(rid)!, c = this.C.get(cid)!, row = this.F.get(rid + '|' + cid)!;
    const irr0 = r.irrigation_access_0_3, w0 = this.wpart(r, c, irr0), w1 = this.wpart(r, c, irr0 === irr ? irr0 : irr);
    let f = row.fit;
    if (irr !== irr0) { const eps = 0.05; const k = Math.pow((w1 + eps) / (w0 + eps), 0.25); let raw = 50 + f * 50 / 95; raw *= k; f = clamp((raw - 50) / 50) * 95; }
    return { f, w: w1, row };
  }
  private base(x: string) { return x === 'rice' || x === 'salt_rice' ? 'rice' : x; }
  private valid(seq: string[], tree: boolean) {
    if (tree) return true; const n = seq.length;
    if (new Set(seq.map(x => this.base(x))).size < n) return false;
    if (seq.every(x => this.C.get(x)!.nitrogen_fixing)) return false;
    for (let i = 0; i < n; i++) {
      const prev = seq[(i - 1 + n) % n], nxt = seq[i];
      if (this.C.get(nxt)!.avoid_after.split('|').filter(Boolean).includes(prev)) return false;
    }
    return true;
  }
  private scoreSeq(rid: string, seq: string[], tree: boolean, target: MarketTarget, irr: number) {
    const r = this.R.get(rid)!, cs = seq.map(x => this.C.get(x)!), n = seq.length;
    const fits: number[] = [], wps: number[] = [];
    seq.forEach(x => { const o = this.cropFit(rid, x, irr); fits.push(o.f); wps.push(o.w); });
    const suit = sum(fits) / n / 95;
    const legs = cs.filter(c => c.nitrogen_fixing), cers = cs.filter(c => c.family === 'grass');
    const fix = Math.min(1, legs.length / n * 2), cl = legs.length && cers.length ? 1 : 0;
    const distinct = new Set(seq).size, div = Math.min(1, (distinct + (tree ? 1 : 0)) / 3);
    let reps = 0; if (!tree) for (let i = 0; i < n; i++) if (seq[i] === seq[(i + 1) % n]) reps++;
    const om = sum(cs.map(c => c.organic_matter)) / n / 5, cover = sum(cs.map(c => c.erosion_cover)) / n / 5;
    const degr = r.soil_degraded === 1 || ['sandy', 'sandy_loam'].includes(r.soil_texture) ? 1.0 : 0.4;
    const drain = seq.filter(x => DRAIN.has(x)).length / n * degr;
    const soil = clamp(0.30 * fix + 0.20 * cl + 0.15 * div + 0.15 * om + 0.20 * cover - 0.20 * drain - 0.15 * (reps / n));
    const tf = TF[target];
    const ms = cs.map(c => 0.45 * c.relative_income_1_5 / 5 + 0.30 * c.market / 5 + 0.25 * tf[MC[c.id]]);
    const stor = sum(cs.map(c => c.storage_difficulty_1_5)) / n / 5, sw = target === 'self' ? 0.5 : 1.0;
    const common = seq.filter(x => this.common.get(rid)!.has(x)).length / n;
    const market = clamp(sum(ms) / n - 0.15 * sw * stor + 0.05 * common);
    const wneed = sum(cs.map(c => c.water_need)) / n / 5;
    const water = clamp(0.6 * (sum(wps) / n) + 0.4 * (1 - wneed));
    const risk = sum(seq.map(x => this.F.get(rid + '|' + x)!.risk_part)) / n;
    const md = sum(cs.map(c => c.drought_tolerance)) / n, mf = sum(cs.map(c => c.flood_tolerance)) / n, msal = sum(cs.map(c => c.salinity_tolerance)) / n;
    const wd = Math.min(1, r.dry_months_approx / 6) * (r.rain_mm_approx < 1000 ? 1.5 : 1.0), wf = r.flood_risk_0_3 / 3, ws = r.salinity_risk_0_3 / 3, tot = wd + wf + ws;
    const stress = tot <= 0.001 ? 0.5 * (md + mf) / 5 : (wd * md + wf * mf + ws * msal) / tot / 5;
    const resil = clamp(0.4 * risk + 0.3 * stress + 0.3 * div);
    const cn = cs.map(c => (0.35 * c.fertiliser_need_1_5 + 0.30 * c.labour_need_1_5 + 0.20 * c.seed_cost_1_5 + 0.15 * c.pest_difficulty_1_5) / 5);
    const cost = clamp(1 - sum(cn) / n + 0.05 * cl);
    let mult = 1.0;
    for (const c of cs) if (this.slot(c) === 'dry' && c.id !== 'chickpea') { if (irr < 1) mult *= 0.7; else if (irr < 2 && r.dry_months_approx >= 4) mult *= 0.85; }
    return { suit, soil, market, water, resil, cost, mult, fix, cl, reps, cover, drain, stor, common, wneed };
  }
  private *perms<T>(arr: T[], k: number): Generator<T[]> {
    const n = arr.length, used = new Array(n).fill(false), cur: number[] = [];
    const self = this;
    function* rec(): Generator<T[]> {
      if (cur.length === k) { yield cur.map(i => arr[i]); return; }
      for (let i = 0; i < n; i++) { if (used[i]) continue; used[i] = true; cur.push(i); yield* rec(); cur.pop(); used[i] = false; }
    }
    yield* rec();
  }
  private candidates(rid: string, irr: number): { typ: string; seq: string[]; tree: boolean }[] {
    const r = this.R.get(rid)!;
    if (r.tree_crop_dominated === 1)
      return ['cover_legume', 'sunn_hemp', 'cowpea', 'groundnut', 'green_gram', 'vegetables', 'sweet_potato', 'pineapple'].map(x => ({ typ: 'young-tree intercrop plan', seq: [x], tree: true }));
    const ids = this.cropIds.filter(x => !PERENN.has(x));
    const fv = new Map(ids.map(x => [x, this.cropFit(rid, x, irr).f] as [string, number]));
    const pool = [...ids].sort((a, b) => fv.get(b)! - fv.get(a)!).filter(x => fv.get(x)! >= 45).slice(0, 10);
    const sl = (x: string) => this.slot(this.C.get(x)!);
    const wetcap = pool.filter(x => ['wet', 'either'].includes(sl(x))), drycap = pool.filter(x => ['dry', 'either'].includes(sl(x)));
    const out: { typ: string; seq: string[]; tree: boolean }[] = [];
    for (const w of wetcap) for (const d of drycap) if (w !== d && this.C.get(w)!.season_days + this.C.get(d)!.season_days + 30 <= 365)
      out.push({ typ: '1-year double crop (wet season, then dry season)', seq: [w, d], tree: false });
    for (const p of this.perms(wetcap, 2)) out.push({ typ: '2-year rotation (wet-season crops in different years)', seq: p, tree: false });
    for (const L of pool.filter(x => sl(x) === 'long'))
      for (const m of [...pool, 'sunn_hemp'].filter(x => this.C.get(x)!.nitrogen_fixing && ['wet', 'either'].includes(sl(x))))
        if (m !== L) out.push({ typ: '2-year cycle (long crop, then legume)', seq: [L, m], tree: false });
    for (const t of this.perms(wetcap.slice(0, 8), 3)) if (t.some(x => this.C.get(x)!.nitrogen_fixing)) out.push({ typ: '3-year rotation', seq: t, tree: false });
    return out;
  }
  private evaluate(rid: string, target: MarketTarget, irr: number) {
    const key = `${rid}|${target}|${irr}`; if (this.cache.has(key)) return this.cache.get(key);
    const ev: { typ: string; seq: string[]; tree: boolean; s: any }[] = [];
    for (const c of this.candidates(rid, irr)) if (this.valid(c.seq, c.tree)) ev.push({ ...c, s: this.scoreSeq(rid, c.seq, c.tree, target, irr) });
    const mm: Record<string, [number, number]> = {};
    for (const k of SUBS) mm[k] = [Math.min(...ev.map(e => e.s[k])), Math.max(...ev.map(e => e.s[k]))];
    const o = { ev, mm }; this.cache.set(key, o); return o;
  }
  private norm(s: any, mm: any, k: SubKey) { const [lo, hi] = mm[k]; return hi - lo < 1e-9 ? 0.5 : clamp((s[k] - lo) / (hi - lo)); }
  private total(goal: Goal, s: any, mm: any) { const w = GOALS[goal]; return 100 * sum(SUBS.map(k => w[k] * this.norm(s, mm, k))) * s.mult; }
  private short(x: string) { return this.C.get(x)!.name.split(' (')[0]; }
  private uniq<T>(xs: T[]) { return [...new Set(xs)]; }
  private reasons(rid: string, seq: string[], s: any, goal: Goal, irr: number) {
    const r = this.R.get(rid)!, cs = seq.map(x => this.C.get(x)!), n = seq.length;
    const legs = cs.filter(c => c.nitrogen_fixing), cers = cs.filter(c => c.family === 'grass'); const out: Record<string, string[]> = {};
    const soil: string[] = [];
    if (legs.length) soil.push(`${this.uniq(legs.map(c => this.short(c.id))).join(' and ')} fix nitrogen (${legs[0].n_fixed_kg_ha_rough})`);
    if (legs.length && cers.length) soil.push('alternating legume and cereal breaks disease cycles and cuts fertiliser need');
    if (s.reps === 0 && n > 1) soil.push('no crop repeats back-to-back on the same plot');
    soil.push(`average ground-cover score ${(s.cover * 5).toFixed(1)}/5` + (r.slope_pct_approx >= 8 ? ' (helps on sloping land)' : ''));
    const dr = seq.filter(x => DRAIN.has(x)).map(x => this.short(x));
    if (dr.length && s.drain > 0) soil.push(`${dr.join(', ')} drain soil nutrients here, so add organic matter or green manure`);
    out.soil = soil;
    const inc = sum(cs.map(c => c.relative_income_1_5)) / n;
    const mk = [`average income score ${inc.toFixed(1)}/5 (rough); sold as ${this.uniq(seq.map(x => MC[x].replace('_', ' / '))).join(', ')}`];
    const per = cs.filter(c => c.storage_difficulty_1_5 >= 4).map(c => this.short(c.id));
    if (per.length) mk.push(`hard to store (${per.join(', ')}): arrange a buyer before planting`);
    if (s.common > 0) mk.push('includes crops already grown locally (existing know-how and buyers)');
    out.market = mk;
    const rs = r.rain_mm_approx * 0.85, irtxt = ['rain only', 'limited water (well or small pump)', 'partial irrigation', 'good irrigation'][irr];
    out.water = [`average water need ${(s.wneed * 5).toFixed(1)}/5 (lower is better); season rain ~${Math.round(rs)} mm; water source: ${irtxt}`];
    const st: string[] = [];
    if (r.dry_months_approx >= 5 || r.rain_mm_approx < 1000) st.push('drought'); if (r.flood_risk_0_3 >= 2) st.push('flooding'); if (r.salinity_risk_0_3 >= 2) st.push('salinity');
    out.resil = [(st.length ? 'tolerates ' + st.join(', ') + ' common here' : 'no strong climate hazard in this area') + `; ${new Set(seq).size} different crop(s) spread the risk`];
    out.cost = [`mean labour need ${(sum(cs.map(c => c.labour_need_1_5)) / n).toFixed(1)}/5, fertiliser need ${(sum(cs.map(c => c.fertiliser_need_1_5)) / n).toFixed(1)}/5 (legumes reduce fertiliser need)`];
    const pick = { soil_health: ['soil'], market_income: ['market'], water_saving: ['water'], low_risk: ['resil'], low_cost_labour: ['cost'], balanced: ['soil', 'market'] }[goal];
    return pick.flatMap(k => out[k].slice(0, pick.length === 1 ? 3 : 2));
  }
  private cautions(rid: string, seq: string[], irr: number) {
    const c: string[] = [];
    for (const x of seq) for (const t of this.F.get(rid + '|' + x)!.limits.split('; ')) { const m = `${this.short(x)}: ${t}`; if (t && !c.includes(m)) c.push(m); }
    for (const x of seq) if (this.slot(this.C.get(x)!) === 'dry' && x !== 'chickpea' && irr < 2) c.push(`${this.short(x)} needs dry-season water; check your well, pump or canal access`);
    return c.slice(0, 4);
  }
  private keyAbs(g: Goal, s: any) {
    const k = { soil_health: ['soil'], market_income: ['market'], water_saving: ['water'], low_risk: ['resil'], low_cost_labour: ['cost'], balanced: ['soil', 'market', 'water', 'resil', 'cost'] }[g] as SubKey[];
    return 100 * sum(k.map(x => s[x])) / k.length;
  }
  /** Rank rotations for a region and goal. `currentSequence` (optional) lets the UI show change vs the farmer's current pattern. */
  recommend(regionId: string, opts: Options, currentSequence?: string[]): Recommendation[] {
    const r = this.R.get(regionId)!, target = opts.marketTarget ?? 'mixed', irr = opts.waterSource ? WATER[opts.waterSource] : r.irrigation_access_0_3;
    const { ev, mm } = this.evaluate(regionId, target, irr) as { ev: Eval[]; mm: any };
    const res = ev.map(e => ({ tot: this.total(opts.goal, e.s, mm), ...e })).sort((a, b) => {
      const d = Math.round(b.tot * 1e6) - Math.round(a.tot * 1e6); if (d !== 0) return d;
      const ka = a.seq.join('|'), kb = b.seq.join('|'); return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    const cur = currentSequence && currentSequence.length ? this.scoreSeq(regionId, currentSequence, false, target, irr) : null;
    const out: Recommendation[] = [], seen = new Set<string>();
    for (const e of res) {
      const key = [...new Set(e.seq)].sort().join(','); if (seen.has(key)) continue; seen.add(key);
      out.push({
        rank: out.length + 1, sequence: e.seq, planType: e.typ, goalMatchScore: Math.round(e.tot * 10) / 10,
        sequenceNames: e.tree ? 'Tree crop + ' + this.short(e.seq[0]) : e.seq.map(x => this.short(x)).join(' -> '),
        scores: { soil: Math.round(100 * e.s.soil), market: Math.round(100 * e.s.market), water: Math.round(100 * e.s.water), riskResilience: Math.round(100 * e.s.resil), lowCost: Math.round(100 * e.s.cost), cropSuitability: Math.round(100 * e.s.suit) },
        why: this.reasons(regionId, e.seq, e.s, opts.goal, irr), cautions: this.cautions(regionId, e.seq, irr),
        changeVsCurrentKeyScore: cur ? Math.round((this.keyAbs(opts.goal, e.s) - this.keyAbs(opts.goal, cur)) * 10) / 10 : null,
      });
      if (out.length === (opts.topN ?? 3)) break;
    }
    return out;
  }
}
