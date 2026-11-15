# Crop notes: what to know about each crop, and how to learn a new one

Contents: 1 Reading the crop table · 2 Notes by crop group · 3 Learning a crop that is not in the table · 4 extra-crops JSON format

The full trait table for the 25 bundled crops is in `crop-table.md` (generated from the team's data; refresh with the
project's sync script). Read the row for each crop you discuss.

## 1. Reading the crop table

- `temp_min_c`–`temp_max_c`: the comfortable range for the season's mean temperature. Outside it by more than ~1 °C,
  expect poor growth. The upper limit also flags heat risk at flowering.
- `season_days`: sowing to harvest. Compare with the rainy-season length.
- `seasonal_rain_need_mm`: water needed over the season (rain + irrigation + stored moisture).
- `drought / flood / salinity tolerance` (1–5): 4–5 copes, 1–2 fails.
- `nitrogen_fixing`, `n_fixed`: legumes; what they leave for the next crop.
- `good_after` / `avoid_after`: sequence rules from the team's table (agronomy literature, general knowledge).
- `needs` (fertiliser, labour, seed cost, pest difficulty, storage difficulty, 1–5) and `relative_income`: the
  practical side farmers care about.
- `farmer_tip`, `pest_notes`: the one thing to get right, and what attacks it.

## 2. Notes by crop group (Southeast Asia)

**Rice (lowland, salt-tolerant):** needs standing water; transplant or direct-seed at the start of the rains. Continuous
rice builds brown planthopper, stem borer and blast; a legume break once a year helps. Heat over 35 °C at flowering causes
sterile grains. Salt-tolerant varieties exist for coastal and delta fields; check water salinity before sowing.

**Maize and sorghum:** maize is a heavy nitrogen feeder and the main host of fall armyworm (scout weekly in the first
month); split nitrogen. Sorghum is the drought-tolerant cereal for dry zones and a good break after legumes; protect from birds.

**Grain legumes (groundnut, green gram, black gram, cowpea, soybean, pigeon pea, chickpea):** fix nitrogen; respond to
phosphorus; need inoculant on new fields. Short ones (green gram, black gram, cowpea, 60–90 days) fit after rice on residual
moisture. Groundnut needs calcium (gypsum) and must be dried well to avoid aflatoxin. Pigeon pea is deep-rooted, slow early,
long (5–6 months): intercrop or use as a windbreak. Chickpea is a cool-season crop sown after the monsoon on stored moisture.
Avoid legume after legume of the same type (shared diseases).

**Oilseeds (sesame, sunflower):** sesame tolerates drought and heat but not waterlogging; harvest as lower capsules turn
yellow before they shatter. Sunflower is deep-rooted; protect heads from birds.

**Roots and tubers (cassava, sweet potato, potato):** cassava is drought-tolerant but drains soil nutrients, the classic
monocrop problem on sandy soils; return residue and rotate with legumes or green manure. Use disease-free stakes (mosaic
virus, mealybug). Potato is cool-climate (highlands); watch late blight. Sweet potato is a short, low-input food-security crop.

**Cash and long crops (sugarcane, pineapple, watermelon, vegetables):** sugarcane only pays near a mill; legumes between
cycles. Watermelon and vegetables need markets close by and careful water management; rotate plant families every season.

**Soil builders (sunn hemp, legume cover crops):** no direct income; plough in sunn hemp at flowering (45–60 days);
covers (Pueraria, Mucuna, Calopogonium) protect soil between young trees.

**Tree crops (rubber, oil palm, cashew):** perennial; rotation applies only between young trees or at replanting.

## 3. Learning a crop that is not in the table

When a farmer asks about another crop (e.g. mungbean variety X, chilli, durian, taro, cotton, tobacco, cabbage):

1. **Look it up** in FAO ECOCROP (search "ECOCROP" + crop): optimal and absolute temperature, rainfall, soil pH,
   texture, drainage, salinity, growing period. Cross-check with a national extension guide or IRRI/ICRISAT/CIAT pages.
2. **Build a profile** with the same fields as the table (see section 4). Use the optimal temperature range for
   `temp_min_c`/`temp_max_c`, the lower end of its optimal rainfall scaled to the season for `seasonal_rain_need_mm`,
   and judge 1–5 tolerances from the ranges (narrow range = low tolerance).
3. **Family matters** for rotation: e.g. chilli/tomato/eggplant are Solanaceae (shared wilt diseases, also with potato);
   cabbage family = Brassicaceae (clubroot); cucurbits share mildews and fruit flies.
4. **Save it** as JSON and pass it to the critique: `python scripts/critique_rotation.py ... --extra-crops my_crops.json`.
5. **Tell the farmer** that the crop's profile came from FAO ranges, not local trials.

## 4. extra-crops JSON format

A list of objects. Required: `id`, `name`, `family`, `season_days`, `temp_min_c`, `temp_max_c`,
`seasonal_rain_need_mm`, `nitrogen_fixing`, `dry_season_crop`, `drought_tolerance`, `flood_tolerance`,
`salinity_tolerance` (1–5). Optional: `needs` {fertiliser, labour, seed_cost, pest_difficulty, storage_difficulty},
`relative_income`, `good_after`, `avoid_after` (crop ids), `farmer_tip`, `pest_notes`.

```json
[{"id": "chilli", "name": "Chilli", "family": "solanaceae", "season_days": 150, "temp_min_c": 18, "temp_max_c": 32,
  "seasonal_rain_need_mm": 600, "nitrogen_fixing": false, "dry_season_crop": true, "drought_tolerance": 2,
  "flood_tolerance": 1, "salinity_tolerance": 2, "needs": {"fertiliser": 4, "labour": 5}, "relative_income": 5,
  "avoid_after": ["potato", "vegetables"], "pest_notes": "Anthracnose, thrips, bacterial wilt"}]
```
