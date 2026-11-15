# Rotation principles: how to judge and recommend a crop rotation

Contents: 1 What a good rotation does · 2 Critique rubric · 3 Red flags · 4 Common Southeast Asian patterns · 5 How to recommend · 6 Tree-crop areas

## 1. What a good rotation does (and why)

1. **Fits the water calendar.** Each crop grows when rain (or irrigation, or stored soil moisture) covers its need. This
   matters more than anything else: the wrong month fails regardless of how clever the sequence is.
2. **Alternates plant families.** Pests, diseases and weeds specialise. Grass (rice, maize, sorghum, sugarcane) → legume
   (groundnut, green gram, soybean, cowpea) → other (sesame, cassava, vegetables) breaks their cycles.
3. **Puts nitrogen back.** A legume every year or every other year supplies roughly 30–100 kg N/ha for the next crop
   (more if ploughed in as green manure) and cuts fertiliser bills. Legumes need phosphorus, sometimes lime and inoculant.
4. **Keeps the soil covered in heavy rain.** Bare soil in downpour months loses topsoil and fertiliser. Relay crops,
   cover crops, or leaving residue fill the gap.
5. **Balances hungry and restoring crops.** Cassava, sugarcane and maize remove a lot of nutrients; follow them with a
   legume or green manure, especially on sandy or degraded soil.
6. **Varies root depth.** Deep-rooted crops (pigeon pea, cassava, sunflower) recover nutrients and break hardpans that
   shallow-rooted crops (rice, green gram) leave.
7. **Spreads risk.** Different crops fail in different bad years and sell in different markets.
8. **Pays and fits the family's labour.** A rotation that loses money or clashes with harvest labour peaks will be dropped.

## 2. Critique rubric

Score each 1–5 and explain each score in one plain sentence. Run `scripts/critique_rotation.py` first; it covers the
first five rows month by month.

| Dimension | 5 looks like | 1 looks like |
|---|---|---|
| Climate fit | Every crop inside its temperature range, flowering away from heat | A crop outside its range, or flowering in the hottest weeks |
| Water fit | Each crop's need met in a normal year and most dry years | A crop short of water in normal years |
| Soil health | Legume each year, residue kept, cover in rainy months | No legume, residue burned, long bare rainy periods |
| Pest and disease break | No same crop/family back to back | The same crop repeated year after year |
| Ground cover | Under 3 bare months, none in the stormiest months | Bare through the heaviest rain |
| Workload | Labour peaks don't collide; inputs affordable | Two harvests and a sowing in the same weeks |
| Income and market | At least one crop with a known buyer and price | Only low-value crops, or no buyer |
| Risk spread | A drought-tolerant crop as insurance; 2+ families | Everything depends on one crop and one rainfall pattern |

Lead with the most important problem, not the longest list. Pair every problem with a concrete fix.

## 3. Red flags (always mention)

- The same annual crop on the same field every year (continuous cassava, maize, groundnut).
- A crop sown when the data says it will be short of water in a normal year.
- Flowering in a month with ~10+ days at 35 °C for a heat-sensitive crop.
- Soil bare in the two or three heaviest-rain months, especially on slopes or sand.
- A dry-season crop with no irrigation and no residual moisture (sown weeks after the wet-season harvest).
- Groundnut on acid soil without lime/gypsum; legumes on new land without inoculant.
- Two crops planned in the field at the same time (unless it is a deliberate intercrop).
- A plan that ignores salt or flood risk the farmer has told you about.

## 4. Common Southeast Asian patterns (starting points, check locally)

| Situation | Pattern | Notes |
|---|---|---|
| Rainfed lowland rice, dry season after | Rice → green gram/black gram/cowpea on residual moisture | Sow the legume within days of the rice harvest; short varieties (60–70 days) |
| Irrigated double rice | Rice → rice → short legume or maize in one season every year or two | Breaks planthopper/blast build-up; maize needs drained fields |
| Upland maize | Maize → soybean/groundnut/cowpea; or maize + legume intercrop | Fall armyworm pressure falls with rotation |
| Cassava on sandy soil (NE Thailand, Cambodia) | Cassava → sunn hemp or cowpea green manure → cassava; or cassava → groundnut | Sunn hemp ploughed in at flowering (~45–60 days) rebuilds organic matter (Thai research, e.g. Kasetsart/Khon Kaen) |
| Dry zone (Myanmar) | Green gram/groundnut early monsoon → sesame/sorghum; pigeon pea as windbreak/intercrop | Legume-heavy systems still need a cereal break (Herridge et al. 2019) |
| Highlands vegetables | Vegetables → maize or a legume; terraces and cover | Different families each season; soil-borne disease builds fast |
| Salt-affected deltas | Salt-tolerant rice → short legume after the rains, or rice–shrimp | Check water salinity before every sowing |

## 5. How to recommend

1. Start from what the farmer does now. Small changes are adopted; complete redesigns are not.
2. Offer 2–3 options, ranked, each with: the sequence and months, why it fits here (data + principle), what it costs
   (seed, inoculant, labour), what could go wrong, and what to check locally.
3. Prefer crops the farmer already knows or neighbours grow, and crops with a buyer.
4. For the bundled regions, the team's recommender gives ranked rotations per goal (`scripts/lookup.py --plan-goal ...`).
   Treat them as candidates and still run the critique on the one you recommend.
5. Suggest trying the change on part of the land first (see `implementation.md`).

## 6. Tree-crop areas (rubber, oil palm, durian, coffee)

Rotation in the usual sense only applies to land between young trees (first 2–4 years) or at replanting. Recommend
legume cover crops (e.g. Pueraria, Mucuna, Calopogonium), short intercrops (pineapple, vegetables, groundnut) and a
weed-free ring around each tree. Do not suggest clearing trees for annual crops without a strong reason.
