#!/usr/bin/env node
// Regenerates frontend/public/dev.xcrafttm.menumusic/icons.json, the icon list the sound target picker
// searches. It is a static file so the (large) icon sets are only downloaded by admins on the settings
// page instead of ending up in the panel's shared bundle.
//
// usage: node scripts/generate-icons.mjs <panel>/frontend
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const panelFrontend = process.argv[2];
if (!panelFrontend) {
  console.error('usage: node scripts/generate-icons.mjs <panel>/frontend');
  process.exit(1);
}

const require = createRequire(path.resolve(panelFrontend, 'package.json'));
const packs = [require('@fortawesome/free-solid-svg-icons').fas, require('@fortawesome/free-brands-svg-icons').fab];

// [name, width, height, svg path]; the panel renders `data-icon` with the canonical icon name,
// aliases (e.g. faTrashAlt) point to the same definition, so each name is listed once
const icons = new Map();
for (const pack of packs) {
  for (const { iconName, icon } of Object.values(pack)) {
    if (icons.has(iconName)) continue;
    const [width, height, , , pathData] = icon;
    icons.set(iconName, [iconName, width, height, Array.isArray(pathData) ? pathData.join(' ') : pathData]);
  }
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../frontend/public/dev.xcrafttm.menumusic/icons.json');
const list = [...icons.values()].sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync(out, JSON.stringify(list));
console.log(`wrote ${list.length} icons to ${path.relative(process.cwd(), out)}`);
