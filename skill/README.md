# Sowcast advisor: a Claude skill for farmers

Part of [Sowcast](https://sow-cast.vercel.app), the satellite-backed crop rotation app.

Ask Claude about the land you farm and your crop rotation, and it answers from measured satellite data instead of guesswork.

- **Learn your area:** rain month by month, the rainy season, heat and dry spells, soil, and what is changing (with 2035 projections).
- **Check your own rotation:** month by month against local rain, heat and soil, plus crop-sequence rules (repeats, legumes, bare soil in heavy rain).
- **Get recommendations:** ranked rotations for a goal (soil health, income, saving water, low risk, low cost).
- **Put it into practice:** trial plot, season plan, inputs, sowing timing, markets, who to ask locally.
- **Works anywhere:** bundled data for 31 regions of Myanmar, Thailand, Vietnam, Cambodia and Malaysia, plus live open data
  (ERA5, CHIRPS, SoilGrids) for any coordinates, and guidance on which other sources to look up.

## Install

**Claude Code (recommended), two commands:**

```
/plugin marketplace add aungmyintunsoe/Sow-cast
/plugin install sowcast@sowcast
```

On Claude Code 2.1.275 or later this works in one step:

```
/plugin install sowcast --marketplace aungmyintunsoe/Sow-cast
```

Then just ask, e.g. *"I grow cassava every year near Khon Kaen, what should I rotate with?"* The skill loads by itself;
you can also call it as `/sowcast:sowcast-advisor`.

**Claude Code, without the plugin system (from a clone of this repo):** `npm run skill:install` copies the skill to
`~/.claude/skills/sowcast-advisor`.

**Claude apps (claude.ai, desktop):** download [`dist/sowcast-advisor.zip`](dist/sowcast-advisor.zip), then
Settings → Capabilities → Skills → Upload skill. Code execution must be on. If live lookups are blocked there, the skill
uses its bundled data and the web search tool instead.

**Requirements:** Python 3.9+. The scripts use only the standard library, except `whatif.py` (pandas) and the soil
fallback (Pillow). Live data needs internet access.

## What's inside

```
skill/
├── .claude-plugin/plugin.json      plugin manifest (the repo root has .claude-plugin/marketplace.json)
├── skills/sowcast-advisor/
│   ├── SKILL.md                     workflow, safety rules, answer format
│   ├── scripts/
│   │   ├── lookup.py                bundled region by name or coordinates
│   │   ├── fetch_climate.py         any coordinates: ERA5 (+CHIRPS) 2001-2024, trends, 2035 projection
│   │   ├── fetch_soil.py            any coordinates: SoilGrids topsoil
│   │   ├── critique_rotation.py     month-by-month rotation check
│   │   ├── whatif.py                re-score crops for drier/hotter conditions (team rules)
│   │   └── make_data.py             the team's scoring rules (synced copy)
│   ├── references/                  data sources, analysis methods, rotation principles, crop notes,
│   │                                crop table (generated), implementation, data model
│   ├── data/                        snapshot of the app's data (synced)
│   └── evals/                       test cases (claude plugin eval)
├── sync_skill_data.mjs              npm run skill:sync     refresh data/ and crop-table.md from the app's data
├── package_skill.py                 npm run skill:package  build dist/sowcast-advisor.zip
└── install_skill.mjs                npm run skill:install  copy into ~/.claude/skills
```

## Maintainers

After the data pipeline changes: `npm run data:build`, `npm run skill:sync`, `npm run skill:package`, and commit
`skill/dist/sowcast-advisor.zip` so app users get the update. Bump `version` in `.claude-plugin/plugin.json` so plugin
users get it too.

Run the test cases with Claude Code (billed model runs), from `skill/skills/sowcast-advisor`:
`claude plugin eval . --allow-tools Write,Edit,Bash,WebSearch,WebFetch`.
