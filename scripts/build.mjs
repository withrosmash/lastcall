// Copies the static app into www/ for Capacitor.
//
// Capacitor's webDir is copied wholesale into the Android assets, so it can't
// be the repo root — that would drag in node_modules, android/ and the design
// package. There's no bundler here on purpose; this is a file copy.

import { cp, rm, mkdir, access } from 'node:fs/promises';
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
