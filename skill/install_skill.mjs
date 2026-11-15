// Install the skill for Claude Code on this computer (personal skills folder), without the plugin system:
//   npm run skill:install        ->  ~/.claude/skills/sowcast-advisor
// Re-run after `npm run skill:sync` to update it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), 'skills', 'sowcast-advisor');
const dest = path.join(os.homedir(), '.claude', 'skills', 'sowcast-advisor');
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true, filter: (p) => !p.includes(`${path.sep}evals`) && !p.includes('__pycache__') });
console.log(`✓ installed to ${dest}. Start a new Claude Code session (or run /reload-skills) to use it.`);
