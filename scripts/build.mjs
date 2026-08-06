// Copies the static app into www/ for Capacitor.
//
// Capacitor's webDir is copied wholesale into the Android assets, so it can't
// be the repo root — that would drag in node_modules, android/ and the design
// package. There's no bundler here on purpose; this is a file copy.

import { cp, rm, mkdir, access, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'www');

// @capacitor/core ships a self-contained ESM bundle, so vendoring it lets the
// app call registerPlugin() with no bundler. Committed to vendor/ as well,
// because GitHub Pages serves the repo without running npm install.
const CORE_SRC = resolve(root, 'node_modules/@capacitor/core/dist/index.js');
const CORE_DEST = resolve(root, 'vendor/capacitor-core.js');
try {
  await access(CORE_SRC);
  await cp(CORE_SRC, CORE_DEST);
  console.log('vendored @capacitor/core → vendor/capacitor-core.js');
} catch {
  console.log('node_modules absent — using the committed vendor/capacitor-core.js');
}

const ENTRIES = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'css',
  'js',
  'vendor',
  'icons',
];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const entry of ENTRIES) {
  await cp(resolve(root, entry), resolve(out, entry), { recursive: true });
}

console.log(`www/ built from ${ENTRIES.length} entries`);

// The service worker hardcodes its app-shell list, so a new module that isn't
// added there gets served stale forever — and it fails in ways that look
// nothing like a caching bug. Fail the build instead of shipping that.
const sw = await readFile(resolve(root, 'sw.js'), 'utf8');
const shell = new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean));

const shouldCache = [];
for (const dir of ['js', 'css', 'css/tokens', 'vendor', 'icons', 'icons/badges']) {
  for (const name of await readdir(resolve(root, dir), { withFileTypes: true })) {
    if (name.isFile() && /\.(js|css|png|svg)$/.test(name.name)) shouldCache.push(`${dir}/${name.name}`);
  }
}

const missing = shouldCache.filter((p) => !shell.has(p));
const stale = [...shell].filter((p) => p && !existsSync(resolve(root, p)));

if (missing.length || stale.length) {
  for (const p of missing) console.error(`  sw.js SHELL is missing: ${p}`);
  for (const p of stale) console.error(`  sw.js SHELL references a deleted file: ${p}`);
  console.error('\nAdd the entries to SHELL in sw.js and bump CACHE.');
  process.exit(1);
}

console.log(`sw.js shell verified — ${shell.size} entries, none missing or stale`);
