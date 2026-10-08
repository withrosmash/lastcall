// Nothing that ships still calls the app Leit or Last Call. Run with: npm test
//
// The two deliberate leftovers are marked "allowed-old-name" on their line:
// the venue squares' URL (the GitHub repo's name) and the old storage key the
// web preview falls back to once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const TEXT = /\.(js|mjs|css|html|json|webmanifest|xml|java|gradle|yml|properties)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    // Android's assets folder is a generated copy of www/, rebuilt on every build.
    if (statSync(p).isDirectory()) { if (name !== 'assets') walk(p, out); }
    else if (TEXT.test(name)) out.push(p);
  }
  return out;
}

const shipped = [
  ...walk(join(root, 'js')),
  ...walk(join(root, 'css')),
  ...walk(join(root, 'android/app/src/main')),
  ...['index.html', 'manifest.webmanifest', 'sw.js', 'capacitor.config.json', 'package.json',
    'android/app/build.gradle', '.github/workflows/android.yml', 'scripts/icons.mjs',
    'scripts/build.mjs', 'scripts/import-avatar-art.mjs', 'design/dev-seed.html'].map((f) => join(root, f)),
];

test('no shipped file names the old app', () => {
  const found = [];
  for (const file of shipped) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/leit|last ?call/i.test(line) && !line.includes('allowed-old-name')) {
        found.push(`${relative(root, file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
      }
    });
  }
  assert.deepEqual(found, []);
});

test('the Java code lives in the new package', () => {
  const java = walk(join(root, 'android/app/src/main/java')).filter((f) => f.endsWith('.java'));
  assert.ok(java.length >= 4);
  for (const f of java) {
    assert.ok(relative(root, f).startsWith('android/app/src/main/java/app/sprell/'), f);
    assert.match(readFileSync(f, 'utf8'), /^package app\.sprell;/m, f);
  }
});
