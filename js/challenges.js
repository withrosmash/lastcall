// The challenge sheet. The list and the rules for which ones fit live in
// challenges-data.js.

import { el, btn, sheet, toast } from './ui.js';
import { t } from './words.js';
import * as S from './state.js';
import { CHALLENGES, poolFor, pickFrom } from './challenges-data.js';

export { CHALLENGES };

// Random from the ones that fit the mode and company you're in right now,
// never one already done or skipped this adventure until they've all had a go.
// `avoid` is the one on screen, so Another always changes the text even once
// a small pool has started again.
export function pick(session, exclude = [], avoid = null) {
  const done = new Set([...(session.challenges || []).map((c) => c.id), ...exclude]);
  return pickFrom(poolFor(CHALLENGES, S.currentPart(session), done), avoid);
}

// Filled before it's shown, so the text saved with the challenge reads right.
const worded = (c) => ({ ...c, text: t(c.text) });

export function openChallenge(ctx, session) {
  let current = worded(pick(session));
  const skipped = [];

  sheet((close) => {
    const body = el('p', { class: 'body', style: 'margin:0;font-size:16px;line-height:1.5', text: current.text });
    const count = (session.challenges || []).length;

    const next = () => {
      skipped.push(current.id);
      current = worded(pick(session, skipped, current.id));
      body.textContent = current.text;
    };

    return [
      el('h2', { class: 'eb eb--mint', style: 'margin:0', text: count ? `Challenge · ${count} done so far` : 'Challenge' }),
      body,
      el('div', { class: 'foot' },
        btn('Done', 'btn--pri', () => { close(); ctx.logChallenge(current); }),
        el('div', { class: 'btn-pair' },
          btn('Another', 'btn--sec', next),
          btn('Not now', 'btn--sec', close),
        ),
      ),
    ];
  });
}
