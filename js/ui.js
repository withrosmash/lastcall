// Tiny DOM helpers plus the shell primitives every screen composes from.
// Deliberately not a framework — thirteen screens and a render-on-change loop
// is easier to follow than a diffing layer.

import { icon } from './icons.js';
import { t } from './words.js';

export function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style') node.setAttribute('style', v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

export { icon };

/* ---------- buttons ---------- */

export function btn(label, cls, onclick, { iconName, lg, disabled } = {}) {
  const node = el('button', {
    class: `btn press ${cls}${lg ? ' btn--lg' : ''}`,
    type: 'button',
    onclick,
  }, iconName ? icon(iconName, { size: 16 }) : null, el('span', { text: label }));
  if (disabled) node.disabled = true;
  return node;
}

export const navPair = (items) =>
  el('div', { class: 'btn-pair' },
    items.map(([label, onclick]) => btn(label, 'btn--sec', onclick)));

/* ---------- surfaces ---------- */

export const tile = (label, value, { unit, tone } = {}) =>
  el('div', { class: 'tile' },
    el('div', { class: 'tile__k', text: label }),
    el('div', { class: `tile__v${tone ? ' tile__v--' + tone : ''}` },
      String(value),
      unit ? el('span', { class: 'tile__u', text: ' ' + unit }) : null),
  );

export const tiles = (...kids) => el('div', { class: 'tiles' }, kids.flat().filter(Boolean));
export const glass = (...kids) => el('div', { class: 'glass' }, kids.flat().filter(Boolean));
export const spacer = () => el('div', { class: 'spacer' });
export const foot = (...kids) => el('div', { class: 'foot' }, kids.flat().filter(Boolean));

// The screen's heading is a real h1: the title, or the eyebrow when there's
// no title, so screen readers can find it and jump between screens.
export function head({ eyebrow, title, back, actions = null }) {
  return el('div', { class: 'head' },
    el('div', {},
      eyebrow ? el(title ? 'div' : 'h1', { class: 'eb', style: 'margin:0', text: eyebrow }) : null,
      title ? el('h1', { class: 'title head__title', text: title }) : null,
    ),
    back ? el('button', { class: 'back press', type: 'button', onclick: back },
      icon('chevron-left', { size: 15 }), el('span', { text: 'Back' })) : null,
    actions ? el('div', { class: 'head__actions' }, actions) : null,
  );
}

/** A 44px icon-only button with a spoken name. */
export const iconBtn = (name, label, onclick) =>
  el('button', { class: 'iconbtn press', type: 'button', 'aria-label': label, title: label, onclick }, icon(name, { size: 20 }));

/* ---------- theme ---------- */

// Dark is the default and carries no attribute; light sets data-theme on
// <html>, which colors-light.css is scoped to.
export const currentTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

export function applyTheme(theme) {
  const light = theme === 'light';
  const root = document.documentElement;
  if (light) root.dataset.theme = 'light';
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#EEF2F8' : '#000000');
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', light ? 'light' : 'dark');
  return light;
}

/* ---------- screen mounting ---------- */

const app = () => document.getElementById('app');

export function mount(nodes, { flush = false, bloom = 'hero', chrome = null, focus = false } = {}) {
  document.getElementById('bloom').dataset.bloom = bloom;
  const chromeRoot = document.getElementById('chrome');
  chromeRoot.replaceChildren(...(chrome ? [chrome] : []));
  const root = app();
  root.classList.toggle('flush', flush);
  // A re-render replaces every node; keep a screen reader's place by finding
  // the same control in the new screen (same role and words) and focusing it.
  const was = !focus && root.contains(document.activeElement) ? document.activeElement : null;
  const key = was && `${was.tagName}|${was.getAttribute('aria-label') || ''}|${was.textContent.trim()}`;
  root.replaceChildren(...[nodes].flat().filter(Boolean));
  root.scrollTop = 0;
  if (key) {
    const again = [...root.querySelectorAll(was.tagName)].find((n) => `${n.tagName}|${n.getAttribute('aria-label') || ''}|${n.textContent.trim()}` === key);
    again?.focus({ preventScroll: true });
  }
  // On a new screen (not a re-render), a screen reader starts at its heading.
  if (focus) {
    const h = root.querySelector('h1, h2, .title');
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
}

// Android draws the real notification while the foreground service runs; this
// mirrors it in-app so the tracking state is legible without pulling the shade.
export const serviceNotice = () =>
  el('div', { class: 'service' },
    icon('circle-dot', { size: 13, color: 'var(--mint)' }),
    el('span', { text: t('Leit is tracking your {n}.') }));

/* ---------- bottom sheet ---------- */

let closeSheet = null;

export function sheet(build, { onClose } = {}) {
  dismissSheet();
  const opener = document.activeElement;
  const root = document.getElementById('sheet-root');
  const frame = document.querySelector('.frame');
  const panel = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    el('div', { class: 'sheet__grip' }));
  const scrim = el('div', {
    class: 'scrim',
    onclick: (e) => { if (e.target === scrim) dismissSheet(); },
  }, panel);

  closeSheet = () => {
    root.replaceChildren();
    if (frame) frame.inert = false;
    if (opener && opener.isConnected) opener.focus?.({ preventScroll: true });
    document.removeEventListener('keydown', onKey);
    closeSheet = null;
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') dismissSheet(); };
  document.addEventListener('keydown', onKey);

  attachDragDown(panel);
  panel.append(...[build(dismissSheet)].flat().filter(Boolean));
  root.replaceChildren(scrim);
  // Named by its heading, focused there, and the screen behind put out of
  // reach until it closes, so a screen reader stays inside the sheet.
  const title = panel.querySelector('h1, h2, .title');
  if (title) {
    title.id = title.id || `sheet-title-${Date.now().toString(36)}`;
    panel.setAttribute('aria-labelledby', title.id);
    title.tabIndex = -1;
    title.focus({ preventScroll: true });
  }
  if (frame) frame.inert = true;
  return dismissSheet;
}

// Drag the panel down to dismiss, as the kit specifies. Only engages when the
// sheet is already scrolled to the top, so it can't fight inner scrolling.
function attachDragDown(panel) {
  let startY = null;
  panel.addEventListener('pointerdown', (e) => {
    if (panel.scrollTop > 0) return;
    startY = e.clientY;
  });
  panel.addEventListener('pointermove', (e) => {
    if (startY == null) return;
    const dy = e.clientY - startY;
    if (dy <= 0) return;
    panel.style.transform = `translateY(${dy}px)`;
    panel.style.animation = 'none';
  });
  const release = (e) => {
    if (startY == null) return;
    const dy = e.clientY - startY;
    startY = null;
    panel.style.transform = '';
    if (dy > 110) dismissSheet();
  };
  panel.addEventListener('pointerup', release);
  panel.addEventListener('pointercancel', release);
}

export function dismissSheet() { closeSheet?.(); }

/* ---------- switch row ----------
   A setting that's on or off: the whole row is the switch, it says its state
   in words, and screen readers hear it as a switch. */

export function switchRow({ label, hint = null, on, onChange }) {
  let state = !!on;
  const value = el('span', { class: state ? 'on' : '', text: state ? 'On' : 'Off' });
  const row = el('button', {
    class: 'listrow listrow--tall press', type: 'button', role: 'switch', 'aria-checked': state ? 'true' : 'false',
    onclick: () => {
      state = !state;
      row.setAttribute('aria-checked', state ? 'true' : 'false');
      value.textContent = state ? 'On' : 'Off';
      value.className = state ? 'on' : '';
      onChange(state);
    },
  },
  el('span', { class: 'stack', style: 'gap:2px' },
    el('span', { class: 'listrow__d', text: label }),
    hint ? el('span', { class: 'cap', text: hint }) : null),
  el('span', { class: 'listrow__m' }, value));
  return row;
}

/* ---------- toast ---------- */

let toastTimer = null;
export function toast(msg, ms = 2600, onTap = null) {
  // An undo needs time to read and reach.
  if (onTap) ms = Math.max(ms, 6000);
  clearTimeout(toastTimer);
  document.querySelector('.toast')?.remove();
  const node = el('div', {
    class: 'toast', role: 'status', text: msg,
    onclick: onTap ? () => { node.remove(); onTap(); } : null,
  });
  if (onTap) node.style.cursor = 'pointer';
  document.body.append(node);
  toastTimer = setTimeout(() => node.remove(), ms);
}

// A short tick you can feel in a loud room. Silently absent on iOS WebViews.
export function buzz(ms = 30) {
  try { navigator.vibrate?.(ms); } catch { /* unsupported */ }
}

/* ---------- formatting ---------- */

// H:MM:SS — the kit's format. The seconds are the only continuous motion in
// the app, which is why the timer is tabular.
export function hms(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function hm(ms) {
  const total = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
}

export function longDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} minute${m === 1 ? '' : 's'}`;
  if (!m) return `${h} hour${h === 1 ? '' : 's'}`;
  return `${h} hour${h === 1 ? '' : 's'} ${m} minute${m === 1 ? '' : 's'}`;
}

export function clockTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}

export const shortDate = (ts) =>
  new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export const upperDate = (ts) => shortDate(ts).toUpperCase();

export const km = (m) => (m / 1000).toFixed(1);

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const words = (n) => NUMBER_WORDS[n] ?? String(n);
