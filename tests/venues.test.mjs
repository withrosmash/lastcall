// Venue squares: the shared tag list, geohash squares, nearby places, own
// places, merging and type-to-filter. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VENUE_TAGS, kindOf, geohash, squaresFor, nearbyFrom, ownPlaces,
  mergeSuggestions, filterByText, overpassQuery,
} from '../js/venues.js';

// About 1 m of latitude, and of longitude at London's latitude.
const LAT_M = 1 / 110540;
const LNG_M = 1 / (111320 * Math.cos(51.5 * Math.PI / 180));

test('geohash matches known values', () => {
  assert.equal(geohash(57.64911, 10.40744, 11), 'u4pruydqqvj');
  assert.equal(geohash(51.5121, -0.1315, 7), 'gcpvj12');
});

test('kindOf reads the shared tag list', () => {
  assert.equal(kindOf({ amenity: 'pub' }), 'pub');
  assert.equal(kindOf({ club: 'social' }), 'social_club');
  assert.equal(kindOf({ shop: 'bakery' }), 'bakery');
  assert.equal(kindOf({ leisure: 'bowling_alley' }), 'bowling_alley');
  assert.equal(kindOf({ shop: 'coffee' }), null);
  assert.equal(kindOf({ amenity: 'parking' }), null);
  assert.equal(kindOf({ amenity: 'cafe', shop: 'bakery' }), 'cafe');
  assert.equal(VENUE_TAGS.amenity.length, 15);
});

test('a position mid-square needs only that square', () => {
  assert.deepEqual(squaresFor(new Set(['gcpv']), 51.5121, -0.1315, 150), ['gcpv']);
});

test('a position near a square edge also gets its neighbour', () => {
  // Find the line of longitude where gcpvj12 turns into gcpvj13.
  const lat = 51.5121;
  let lo = -0.1315, hi = -0.1295;
  assert.equal(geohash(lat, lo, 7), 'gcpvj12');
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (geohash(lat, mid, 7) === 'gcpvj12') lo = mid; else hi = mid;
  }
  assert.equal(geohash(lat, hi, 7), 'gcpvj13');
  const keys = new Set(['gcpvj12', 'gcpvj13', 'gcpvj']);
  const got = squaresFor(keys, lat, lo - 10 * LNG_M, 150);
  assert.ok(got.includes('gcpvj12'), got);
  assert.ok(got.includes('gcpvj13'), got);
  assert.equal(new Set(got).size, got.length);
});

test('a position outside every square gets none', () => {
  assert.deepEqual(squaresFor(new Set(['gcpv', 'gcpvj12']), 40.4168, -3.7038, 150), []);
});

test('nearbyFrom keeps 150 m and sorts nearest first', () => {
  const lat = 51.5, lng = -0.1;
  const got = nearbyFrom([
    ['Far', lat + 200 * LAT_M, lng, 'pub'],
    ['Ninety', lat + 90 * LAT_M, lng, 'bar'],
    ['Twenty', lat, lng + 20 * LNG_M, 'cafe'],
  ], lat, lng, 150);
  assert.deepEqual(got.map((v) => v.name), ['Twenty', 'Ninety']);
  assert.equal(got[0].kind, 'cafe');
  assert.ok(Math.abs(got[0].d - 20) < 1);
});

test('ownPlaces finds named stops nearby from past and current adventures', () => {
  const lat = 51.5, lng = -0.1;
  const pin = (name, dm, extra = {}) => ({ t: 0, lat: lat + dm * LAT_M, lng, name, note: '', ...extra });
  const sessions = [
    { pins: [pin('the grapes', 30), pin('Unnamed stop', 5), pin('Stop', 6), pin('Far away', 300)] },
    { pins: [pin('The Grapes', 20), { t: 0, lat: null, lng: null, name: 'No fix' }] },
  ];
  const active = { pins: [pin('Kings Arms', 60)] };
  const got = ownPlaces(sessions, active, lat, lng, 150);
  assert.deepEqual(got.map((p) => p.name), ['The Grapes', 'Kings Arms']);
  assert.ok(got.every((p) => p.own === true));
});

test('ownPlaces copes with no active adventure and sessions without pins', () => {
  assert.deepEqual(ownPlaces([{}], null, 51.5, -0.1, 150), []);
});

test('mergeSuggestions puts own places first and shows a name once', () => {
  const got = mergeSuggestions(
    [{ name: 'The Grapes', d: 40, own: true }],
    [{ name: 'the grapes', d: 41 }, { name: 'Kings Arms', d: 60 }],
  );
  assert.deepEqual(got.map((v) => v.name), ['The Grapes', 'Kings Arms']);
  assert.equal(got[0].own, true);
});

test('filterByText ignores case and accents and keeps the order', () => {
  const list = [{ name: 'De Hems' }, { name: 'Café Nero' }, { name: '米家 Mi Canteen' }, { name: 'The "Quote" Bar' }];
  assert.deepEqual(filterByText(list, 'de h').map((v) => v.name), ['De Hems']);
  assert.deepEqual(filterByText(list, 'cafe').map((v) => v.name), ['Café Nero']);
  assert.deepEqual(filterByText(list, 'CAFÉ').map((v) => v.name), ['Café Nero']);
  assert.deepEqual(filterByText(list, '米家').map((v) => v.name), ['米家 Mi Canteen']);
  assert.deepEqual(filterByText(list, '"quote').map((v) => v.name), ['The "Quote" Bar']);
  const eight = Array.from({ length: 8 }, (_, i) => ({ name: `P${i}` }));
  assert.deepEqual(filterByText(eight, '').map((v) => v.name), ['P0', 'P1', 'P2', 'P3', 'P4', 'P5']);
  assert.deepEqual(filterByText(eight, '  ').length, 6);
});

test('overpassQuery asks for every kind in the list', () => {
  const q = overpassQuery(51.5, -0.1, 150);
  assert.ok(q.includes('["amenity"~"^(pub|'), q);
  assert.ok(q.includes('["shop"~"^(bakery|deli|pastry)$"]'), q);
  assert.ok(q.includes('["leisure"~"^(bowling_alley)$"]'), q);
  assert.ok(q.includes('["club"~"^(social)$"]'), q);
  assert.ok(q.includes('around:150,51.5,-0.1'), q);
  assert.ok(q.trim().endsWith('out center 60;'), q);
});
