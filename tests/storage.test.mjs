// Import and load must never destroy history. Run with: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// A Map-backed localStorage, optionally with a size limit (characters).
function makeStorage(limit = Infinity) {
  const m = new Map();
  return {
    m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      const size = [...m].reduce((n, [key, val]) => n + (key === k ? 0 : val.length), 0) + String(v).length;
      if (size > limit) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
  };
}
globalThis.localStorage = makeStorage();

const store = await import('../js/storage.js');
const S = await import('../js/state.js');

const session = (id, startedAt, extra = {}) => ({ id, startedAt, endedAt: startedAt + 3600e3, drinks: [], waters: [], meals: [], challenges: [], pins: [], trail: [], sets: [], parts: [], steps: 0, distanceM: 0, ...extra });

beforeEach(() => { globalThis.localStorage = makeStorage(); });

test('files that are not Sprell exports are refused', () => {
  assert.deepEqual(store.checkImport('not json'), { ok: false, reason: 'not-json' });
  for (const text of ['[]', '{}', '"hello"', '{"name":"x"}', 'null']) {
    assert.equal(store.checkImport(text).ok, false, text);
    assert.equal(store.checkImport(text).reason, 'not-sprell', text);
  }
});

test('broken sessions are dropped and the rest get every array', () => {
  const r = store.checkImport(JSON.stringify({ sessions: [null, { id: 'a', startedAt: 1 }, { id: 'b' }, 'x'] }));
  assert.equal(r.ok, true);
  assert.equal(r.count, 1);
  const s = r.data.sessions[0];
  for (const k of ['drinks', 'waters', 'meals', 'challenges', 'pins', 'trail', 'sets', 'parts']) assert.ok(Array.isArray(s[k]), k);
  assert.doesNotThrow(() => S.summarise(s));
});

test('an export from before modes, sets and meals still loads', () => {
  const old = { v: 1, sessions: [{ id: 'old', startedAt: 1700000000000, endedAt: 1700007200000, drinks: [{ t: 1700001000000, kind: 'Pint' }], waters: [], pins: [], trail: [{ t: 1700000100000, lat: 51.5, lng: -0.1 }], steps: 1200, distanceM: 300 }] };
  const r = store.checkImport(JSON.stringify(old));
  assert.equal(r.ok, true);
  assert.doesNotThrow(() => S.summarise(r.data.sessions[0]));
  assert.equal(r.data.sessions[0].drinks.length, 1);
});

test('entries without a time, and trail points without a position, are dropped', () => {
  const r = store.checkImport(JSON.stringify({ sessions: [session('a', 1, {
    drinks: [{ t: 5, kind: 'Pint' }, { kind: 'Pint' }, { t: 'x' }],
    trail: [{ t: 2, lat: 51.5, lng: -0.1 }, { t: 3, lat: null, lng: 1 }, { t: 4, lat: 'NaN', lng: 0 }],
    pins: [{ t: 6, lat: null, lng: null, name: 'Off map' }, { t: 7, lat: 'x', lng: 1, name: 'Bad' }],
  })] }));
  const s = r.data.sessions[0];
  assert.equal(s.drinks.length, 1);
  assert.equal(s.trail.length, 1);
  assert.deepEqual(s.pins.map((p) => p.name), ['Off map']);
});

test('duplicate adventures are dropped and the newest comes first', () => {
  const r = store.checkImport(JSON.stringify({ sessions: [session('a', 1), session('b', 3), session('a', 2)] }));
  assert.deepEqual(r.data.sessions.map((s) => s.id), ['b', 'a']);
});

test('avatar colours must be colours', () => {
  const r = store.checkImport(JSON.stringify({ sessions: [], prefs: { avatar: { v: 3, colors: { skin: '#aabbcc', hair: 'red;background:url(https://evil/x)' } } } }));
  assert.equal(r.data.prefs.avatar.colors.skin, '#aabbcc');
  assert.equal(r.data.prefs.avatar.colors.hair, undefined);
});

test('prefs that are not an object are ignored', () => {
  const r = store.checkImport(JSON.stringify({ sessions: [], prefs: 'x' }));
  assert.equal(r.data.prefs['0'], undefined);
  assert.equal(r.data.prefs.hydrationEvery, 5);
});

test('an invalid live adventure is dropped, a valid one kept', () => {
  assert.equal(store.checkImport(JSON.stringify({ sessions: [], active: {} })).data.active, null);
  const live = { ...session('live', 10), endedAt: null };
  assert.equal(store.checkImport(JSON.stringify({ sessions: [], active: live })).data.active.id, 'live');
});

test('an import can be undone', () => {
  const mine = JSON.stringify({ v: 1, sessions: [session('mine', 5)] });
  localStorage.setItem('sprell_v1', mine);
  store.importJSON(JSON.stringify({ sessions: [session('theirs', 9)] }));
  assert.deepEqual(store.load().sessions.map((s) => s.id), ['theirs']);
  const back = store.undoImport();
  assert.deepEqual(back.sessions.map((s) => s.id), ['mine']);
  assert.equal(localStorage.getItem('sprell_v1'), mine);
});

test('export, import, export gives the same adventures', () => {
  store.importJSON(JSON.stringify({ sessions: [session('a', 1, { drinks: [{ t: 2, kind: 'Pint' }] }), session('b', 5)] }));
  const first = JSON.parse(store.exportJSON());
  store.importJSON(JSON.stringify(first));
  const second = JSON.parse(store.exportJSON());
  assert.deepEqual(second.sessions, first.sessions);
});

test('saving marks the live adventure as touched', () => {
  const state = store.checkImport(JSON.stringify({ sessions: [], active: { ...session('live', 10), endedAt: null } })).data;
  const before = Date.now();
  store.save(state);
  assert.ok(state.active.touchedAt >= before);
});

test('a full phone never deletes adventures and reports the failure', () => {
  globalThis.localStorage = makeStorage(400);
  const errors = [];
  store.onStorageError((e) => errors.push(e));
  const state = store.checkImport(JSON.stringify({ sessions: [session('a', 1), session('b', 2), session('c', 3), session('d', 4), session('e', 5)] })).data;
  store.save(state);
  assert.equal(store.flush(), false);
  assert.equal(state.sessions.length, 5);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].name, 'QuotaExceededError');
});

test('errors are logged, keeping the last 20', () => {
  for (let i = 0; i < 25; i++) store.logError(new Error('boom ' + i), 'live');
  const log = JSON.parse(localStorage.getItem('sprell_errors'));
  assert.equal(log.length, 20);
  assert.equal(log[19].msg, 'boom 24');
  assert.equal(log[19].screen, 'live');
  assert.ok(log[19].stack.length <= 500);
  store.logError('a plain string', 'start');
  assert.equal(JSON.parse(localStorage.getItem('sprell_errors'))[19].msg, 'a plain string');
});

test('a save that should not count as activity leaves touchedAt alone', () => {
  const state = store.checkImport(JSON.stringify({ sessions: [], active: { ...session('live', 10), endedAt: null, touchedAt: 123 } })).data;
  store.save(state, { touch: false });
  assert.equal(state.active.touchedAt, 123);
});

test('the import backup goes once the undo is used or dropped', () => {
  localStorage.setItem('sprell_v1', JSON.stringify({ v: 1, sessions: [session('mine', 5)] }));
  store.importJSON(JSON.stringify({ sessions: [session('theirs', 9)] }));
  assert.ok(localStorage.getItem('sprell_v1_backup'));
  store.undoImport();
  assert.equal(localStorage.getItem('sprell_v1_backup'), null);
  store.importJSON(JSON.stringify({ sessions: [session('theirs', 9)] }));
  store.dropImportBackup();
  assert.equal(localStorage.getItem('sprell_v1_backup'), null);
});

test('an import that cannot be saved leaves your own history in place', () => {
  const mine = JSON.stringify({ v: 1, sessions: [session('mine', 5)] });
  store.importJSON(mine); // loads mine into the cache and storage
  // Now only just enough room for what's there plus a backup copy of it.
  const stored = localStorage.getItem('sprell_v1');
  globalThis.localStorage = makeStorage(stored.length * 2 + 50);
  localStorage.setItem('sprell_v1', stored);
  const big = JSON.stringify({ sessions: Array.from({ length: 40 }, (_, i) => session('big' + i, i + 10)) });
  assert.equal(store.importJSON(big), null);
  assert.deepEqual(JSON.parse(store.exportJSON()).sessions.map((s) => s.id), ['mine']);
});

test('history saved under the old name is read once, then saved under the new one', async () => {
  globalThis.localStorage = makeStorage();
  const old = JSON.stringify({ v: 1, sessions: [session('from-leit', 5)] });
  localStorage.setItem('lastcall_v1', old);
  const fresh = await import('../js/storage.js?fallback');
  assert.deepEqual(fresh.load().sessions.map((s) => s.id), ['from-leit']);
  fresh.save(fresh.load());
  fresh.flush();
  assert.deepEqual(JSON.parse(localStorage.getItem('sprell_v1')).sessions.map((s) => s.id), ['from-leit']);
});

test('the new name wins when both exist', async () => {
  globalThis.localStorage = makeStorage();
  localStorage.setItem('lastcall_v1', JSON.stringify({ v: 1, sessions: [session('old', 5)] }));
  localStorage.setItem('sprell_v1', JSON.stringify({ v: 1, sessions: [session('new', 6)] }));
  const fresh = await import('../js/storage.js?both');
  assert.deepEqual(fresh.load().sessions.map((s) => s.id), ['new']);
});

test('an import straight after the rename can still be undone', async () => {
  globalThis.localStorage = makeStorage();
  localStorage.setItem('lastcall_v1', JSON.stringify({ v: 1, sessions: [session('from-leit', 5)] }));
  const fresh = await import('../js/storage.js?import-first');
  fresh.load();
  fresh.importJSON(JSON.stringify({ sessions: [session('theirs', 9)] }));
  const back = fresh.undoImport();
  assert.deepEqual(back?.sessions.map((s) => s.id), ['from-leit']);
});
