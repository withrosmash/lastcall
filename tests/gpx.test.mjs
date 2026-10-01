// GPX export. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toGpx } from '../js/history.js';
import { newSession } from '../js/state.js';

test('waypoints follow GPX 1.1 order: time, then name, then type', () => {
  const t0 = new Date('2026-07-04T12:00').getTime();
  const s = newSession(t0);
  s.pins = [{ t: t0 + 60e3, lat: 51.5, lng: -0.1, name: 'Bar & Grill' }, { t: t0 + 90e3, lat: null, lng: null, name: 'No fix' }];
  s.sets = [{ t: t0 + 120e3, lat: 51.51, lng: -0.11, name: 'The Act' }];
  const wpts = toGpx(s).match(/<wpt[^>]*>.*?<\/wpt>/g);
  assert.equal(wpts.length, 2);
  for (const w of wpts) {
    const tags = [...w.matchAll(/<(time|name|type)>/g)].map((m) => m[1]);
    assert.deepEqual(tags, tags.includes('type') ? ['time', 'name', 'type'] : ['time', 'name']);
  }
  assert.match(toGpx(s), /<name>Bar &amp; Grill<\/name>/);
});
