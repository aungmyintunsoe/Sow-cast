# 🌱 Sowcast
*Adapting farms to shifting climates with NASA Earth observations.*

## ⚡ What it does in one breath
A farmer picks their field on a map. Sowcast looks at 20+ years of NASA satellite and climate data for that spot and tells them in plain words what’s going wrong (bare soil, heat, falling water). Then it compares what they grow now against better rotation options and ranks individual crops for their goal. 

*It doesn’t predict anything and it doesn’t replace an agronomist. It spots patterns and suggests options, and it says what it doesn’t know.*

## 🗺️ The Flow
1. **Pick your field:** A satellite map with pins for demo regions. Answer 3 tap-only questions (No typing, no jargon).
2. **Field check-up:** 4 plain-English insight cards, a 12-month Field Year Calendar, and "What if?" sliders to adjust rainfall or temperature.
3. **Compare rotations:** Side-by-side comparison of current vs. alternative rotation strategies with transparent 5-dot scoring.
4. **Crop options:** Ranks individual crops based on the farmer's goal and local climate survivability.
5. **Farmer summary:** A shareable, printable "My field plan" tailored to the specific plot.

## 🛰️ How we know this (Data Sources)
| What the farmer sees | NASA / Partner Source |
| :--- | :--- |
| Heat, frost, rain history | NASA POWER, GPM IMERG |
| Topsoil moisture | SMAP |
| Green vs bare fields | Landsat / MODIS NDVI |
| Heat stress hotspots | ECOSTRESS |
| Groundwater decline | GRACE-FO |
| Soil type, slope | USDA SSURGO, SRTM elevation |

## 🧠 Transparent Architecture
For this prototype, environmental data is precomputed into static JSON to guarantee stability under presentation load. There’s no black-box AI. It’s one deterministic formula: `(Local Fit) × (Goal Alignment) - (Irrigation Penalty)`. 
Every number comes with a reason shown on screen.

---
*Disclaimer: We suggest options based on satellite patterns. Always check with a local agricultural expert.*
