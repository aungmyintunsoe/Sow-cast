# Sowcast advisor — Claude skill (groundwork)

`sowcast-advisor/` is a Claude skill that answers farmers' crop and rotation questions in chat, using the same data and scoring rules as the app.

```
sowcast-advisor/
├── SKILL.md                 instructions Claude follows (workflow, safety rules, answer format)
├── scripts/lookup.py        find a region by name or coordinates, print a source-labelled summary
├── scripts/whatif.py        re-score crops for "what if it's 20% drier / 1 °C hotter" (team rules)
├── scripts/make_data.py     copy of data/inputs/make_data.py (synced, don't edit here)
├── references/data-model.md what each field in a region file means
└── data/                    snapshot of public/data + MANIFEST.json (synced)
```

**Refresh after new data:** `npm run data:build`, then `node skill/sync_skill_data.mjs`.

**Try the scripts locally:**

```bash
data/.venv/Scripts/python.exe skill/sowcast-advisor/scripts/lookup.py "Khon Kaen" --goal water
data/.venv/Scripts/python.exe skill/sowcast-advisor/scripts/whatif.py th-isan --rain-pct -20 --temp-c 1
```

## Status and next steps

- [x] Structure, instructions, scripts, data sync (23 regions; soil for 11 so far, see `data/MANIFEST.json`)
- [ ] Finish the soil download, re-sync
- [ ] Test prompts and evals (e.g. "I grow cassava near Khon Kaen, what should I rotate with?", a Burmese-language question, a place outside the 23 regions, a question about a region with flagged data)
- [ ] Tune the description so the skill triggers on real farmer phrasing
- [ ] Package (`.skill`) and decide where it runs: Claude apps, or the Claude API behind a simple chat page
