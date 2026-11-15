# Helping a farmer put a rotation into practice

Contents: 1 Start small · 2 Season plan · 3 Inputs to arrange · 4 Timing the sowing · 5 Residue and green manure ·
6 Market first · 7 Keep records · 8 After the season · 9 Where to get help · 10 Season plan template

## 1. Start small

Suggest trying the new rotation on 10–20% of the land (one plot) for one or two seasons, next to the usual practice.
The farmer risks little, sees the difference with their own eyes, and learns the new crop's timing before scaling up.

## 2. Season plan

Turn the rotation into dated steps, using the local rainy-season months (bundled `calendar` or `fetch_climate.py`):
- one month before sowing: buy seed (and inoculant for legumes), arrange labour, prepare land, soil test if possible;
- sowing window (see section 4);
- weeding, fertiliser splits, pest scouting dates (by crop);
- harvest month; what happens to the residue; when the next crop goes in.
The Sowcast app's "Download PDF plan" already builds this checklist for its rotations; offer it for bundled regions.

## 3. Inputs to arrange

- **Seed:** certified or from a trusted source; short-duration varieties for residual-moisture crops.
- **Legume inoculant (rhizobium):** on fields where that legume has not grown recently. Cheap; can double nitrogen fixed.
- **Lime / gypsum:** on acid soils before legumes; gypsum at pegging for groundnut.
- **Phosphorus:** legumes respond to P more than to N; little or no nitrogen fertiliser for legumes.
- **Water:** for dry-season crops, confirm the well, pump or canal before planting.

## 4. Timing the sowing

- Wet-season crops: wait for the onset rule (3 days totalling ≥ 20 mm, no 10-day dry spell after) rather than the
  first shower. Check the 16-day forecast (Open-Meteo forecast API) when the season approaches.
- Residual-moisture crops: sow within a few days of the previous harvest; zero-tillage or minimal tillage keeps moisture.
- Heat: move sowing so flowering misses the hottest weeks (the critique script names the month).
- El Niño expected: plan for a late, weak monsoon (shorter varieties, drought-tolerant crops); La Niña: plan drainage.

## 5. Residue and green manure

- Don't burn residue: it is fertiliser and soil cover. Mulch or incorporate it.
- Green manure (sunn hemp, cowpea): plough in at flowering (about 45–60 days), 2–3 weeks before the next crop.
- Legume roots and stems left in the field feed the next crop.

## 6. Market first

Before planting a new crop, find the buyer: local trader, cooperative, mill, contract buyer. Ask about price, quality
standards and when they buy. Hard-to-store crops (vegetables, watermelon, cassava roots) need a sale arranged in advance.

## 7. Keep records

A notebook page per plot per season: crop and variety, sowing date, inputs and costs, rain events, pests seen, harvest
date, yield, price. Two seasons of records beat any model for that field.

## 8. After the season

Compare the trial plot with the usual practice: yield, costs, labour days, income, and how the soil looks and drains.
Adjust timing or crop choice; scale up what worked.

## 9. Where to get help

Name the local service (see `data-sources.md` section 5): the extension office for varieties, seed and timing; the plant
protection office for pests; the land development or soil service for soil tests and green-manure seed; cooperatives
for markets and group input buying. Crop insurance and credit schemes exist in several countries; suggest asking the
extension office or the farmer's bank.

## 10. Season plan template

```
Plot: ______   Size: ____   Rotation: ________________   Year: ____
Month | Task                                   | Done | Notes / cost
------|----------------------------------------|------|-------------
      | Buy seed (+ inoculant)                  |      |
      | Prepare land / soil test                |      |
      | Sow <crop> when onset rule is met       |      |
      | Weed / first fertiliser split           |      |
      | Scout pests: <pest list>                |      |
      | Harvest <crop>; keep residue            |      |
      | Sow next crop within days of harvest    |      |
Yield: ____   Price: ____   Total cost: ____   What to change next time: ______________
```
