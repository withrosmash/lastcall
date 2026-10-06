// The weekly venue square builder. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { venueFromFeature, dedupe, splitSquares, main } from '../scripts/venues/build.mjs';

const LAT_M = 1 / 110540;
const LNG_M = 1 / (111320 * Math.cos(51.5 * Math.PI / 180));
const point = (lng, lat, props) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: props });

test('a mapped point becomes a record at 5 decimals', () => {
  assert.deepEqual(
    venueFromFeature(point(-0.131487, 51.512113, { amenity: 'pub', name: 'The Grapes' })),
    ['The Grapes', 51.51211, -0.13149, 'pub'],
  );
});

test('a building counts as the centre of its box', () => {
  const f = {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[-0.1, 51.5], [-0.09, 51.5], [-0.09, 51.52], [-0.1, 51.52], [-0.1, 51.5]]] },
    properties: { club: 'social', name: 'Legion Club' },
  };
  assert.deepEqual(venueFromFeature(f), ['Legion Club', 51.51, -0.095, 'social_club']);
  const multi = { ...f, geometry: { type: 'MultiPolygon', coordinates: [f.geometry.coordinates] } };
  assert.deepEqual(venueFromFeature(multi), ['Legion Club', 51.51, -0.095, 'social_club']);
});

test('unnamed places and places that are not venues are dropped', () => {
  assert.equal(venueFromFeature(point(-0.1, 51.5, { amenity: 'cafe' })), null);
  assert.equal(venueFromFeature(point(-0.1, 51.5, { amenity: 'cafe', name: '  ' })), null);
  assert.equal(venueFromFeature(point(-0.1, 51.5, { shop: 'coffee', name: 'Beans' })), null);
});

test('the same name within 50 m is one place', () => {
  const at = (name, dm) => [name, 51.5 + dm * LAT_M, -0.1, 'pub'];
  assert.equal(dedupe([at('Kings Arms', 0), at('kings arms', 30)]).length, 1);
  assert.equal(dedupe([at('Kings Arms', 0), at('Kings Arms', 80)]).length, 2);
  assert.equal(dedupe([at('Kings Arms', 0), at('Kings Head', 5)]).length, 2);
});

test('a busy square splits until none holds more than 300', () => {
  const v = [];
  for (let i = 0; i < 301; i++) v.push([`P${i}`, 51.5 + (i % 20) * 40 * LAT_M, -0.1 + Math.floor(i / 20) * 40 * LNG_M, 'cafe']);
  const sq = splitSquares(v);
  assert.ok(sq.size > 1);
  for (const [k, list] of sq) assert.ok(list.length <= 300, `${k} holds ${list.length}`);
  assert.equal([...sq.values()].reduce((n, l) => n + l.length, 0), 301);
});

test('quiet places stay in big squares', () => {
  const v = Array.from({ length: 10 }, (_, i) => [`P${i}`, 50.5 + i * 0.4, -3 + i * 0.3, 'pub']);
  for (const k of splitSquares(v).keys()) assert.equal(k.length, 4);
});

test('a square at the smallest size never splits further', () => {
  const v = Array.from({ length: 400 }, (_, i) => [`P${i}`, 51.5121, -0.1315, 'bar']);
  const sq = splitSquares(v);
  assert.deepEqual([...sq.keys()], ['gcpvj12']);
  assert.equal(sq.get('gcpvj12').length, 400);
});

test('main writes the index, the squares and the licence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'venues-'));
  const input = join(dir, 'in.geojsonseq');
  await writeFile(input, [
    point(-0.1315, 51.5121, { amenity: 'pub', name: 'The Grapes' }),
    point(-2.236, 53.484, { amenity: 'bar', name: 'Night & Day' }),
    point(-3.196, 55.9475, { shop: 'bakery', name: 'Greggs' }),
    point(-3.196, 55.9475, { amenity: 'parking' }),
  ].map((f) => '\x1e' + JSON.stringify(f)).join('\n') + '\n');
  const out = join(dir, 'out');
  await main([input, out, '--source=2026-10-05T20:21:00Z']);
  const index = JSON.parse(await readFile(join(out, 'v1/index.json'), 'utf8'));
  assert.equal(index.v, 1);
  assert.equal(index.count, 3);
  assert.equal(index.source, '2026-10-05T20:21:00Z');
  assert.ok(!Number.isNaN(Date.parse(index.built)));
  const files = (await readdir(join(out, 'v1/sq'))).map((f) => f.replace(/\.json$/, '')).sort();
  assert.deepEqual(index.squares, files);
  const all = (await Promise.all(files.map((k) => readFile(join(out, 'v1/sq', k + '.json'), 'utf8')))).flatMap((t) => JSON.parse(t));
  assert.deepEqual(all.map((r) => r[0]).sort(), ['Greggs', 'Night & Day', 'The Grapes']);
  assert.match(await readFile(join(out, 'LICENSE.md'), 'utf8'), /© OpenStreetMap contributors/);
});
