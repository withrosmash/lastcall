// The word for an outing. Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, phrase, setWording, currentWording, WORDINGS } from '../js/words.js';

test('article agrees with the noun', () => {
  assert.equal(t('{a}', 'adventure'), 'an adventure');
  assert.equal(t('{a}', 'outing'), 'an outing');
  assert.equal(t('{a}', 'quest'), 'a quest');
  assert.equal(t('{a}', 'sidequest'), 'a sidequest');
  assert.equal(t('{a}', 'night'), 'a night');
});

test('capital tokens capitalise at the start of a sentence', () => {
  assert.equal(t('{A} under 90 minutes', 'outing'), 'An outing under 90 minutes');
  assert.equal(t('{N} deleted.', 'quest'), 'Quest deleted.');
  assert.equal(t('{Ns}', 'night'), 'Nights');
});

test('noun and plural fill in place', () => {
  assert.equal(t('Start {n}', 'quest'), 'Start quest');
  assert.equal(t('No {ns} yet.', 'sidequest'), 'No sidequests yet.');
  assert.equal(t('Track the {n}.', 'adventure'), 'Track the adventure.');
});

test('a string with no tokens comes back unchanged', () => {
  assert.equal(t('Piece it together later.', 'quest'), 'Piece it together later.');
});

test('end title: night keeps its idiom, the rest are generic', () => {
  assert.equal(phrase('endTitle', 'night'), 'Call it a night?');
  assert.equal(phrase('endTitle', 'adventure'), 'End the adventure?');
});

test('recap title: quests complete, adventures are exclaimed', () => {
  assert.equal(phrase('recapTitle', 'night'), 'That was a night.');
  assert.equal(phrase('recapTitle', 'adventure'), 'What an adventure.');
  assert.equal(phrase('recapTitle', 'outing'), 'What an outing.');
  assert.equal(phrase('recapTitle', 'quest'), 'Quest complete.');
  assert.equal(phrase('recapTitle', 'sidequest'), 'Sidequest complete.');
});

test('the set in use defaults to adventure and ignores unknown keys', () => {
  assert.equal(currentWording(), 'adventure');
  setWording('nonsense');
  assert.equal(currentWording(), 'adventure');
  setWording('quest');
  assert.equal(t('{n}'), 'quest');
  assert.equal(phrase('endTitle'), 'End the quest?');
  setWording('adventure');
});

test('five sets, in the order they were proposed', () => {
  assert.deepEqual(Object.keys(WORDINGS), ['adventure', 'outing', 'quest', 'sidequest', 'night']);
});
