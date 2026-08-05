// Tiny DOM helpers. Deliberately not a framework — the whole app is a dozen
// screens and a render-on-change loop is easier to follow than a diffing layer.

export function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
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

export const btn = (label, cls, onclick, extra = {}) =>
  el('button', { class: `btn ${cls}`, type: 'button', onclick, ...extra }, label);

export const tile = (k, v, { unit, mod } = {}) =>
  el('div', { class: 'tile' },
    el('div', { class: 'tile__k', text: k }),
    el('div', { class: `tile__v${mod ? ' ' + mod : ''}` }, String(v), unit ? el('span', { class: 'tile__u', text: ' ' + unit }) : null),
  );

export const spacer = () => el('div', { class: 'spacer' });

/* ---------- screen mounting ---------- */

const app = () => document.getElementById('app');

export function mount(nodes, { flush = false } = {}) {
  const root = app();
  root.classList.toggle('flush', flush);
  root.replaceChildren(...[nodes].flat().filter(Boolean));
  root.scrollTop = 0;
}

/* ---------- bottom sheet ---------- */

let closeSheet = null;

export function sheet(build, { onClose } = {}) {
  dismissSheet();
  const root = document.getElementById('sheet-root');
  const panel = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' },
    el('div', { class: 'sheet__grip' }),
  );
  const scrim = el('div', {
    class: 'scrim',
    onclick: (e) => { if (e.target === scrim) dismissSheet(); },
  }, panel);

  closeSheet = () => {
    root.replaceChildren();
    document.removeEventListener('keydown', onKey);
    closeSheet = null;
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') dismissSheet(); };
  document.addEventListener('keydown', onKey);

  panel.append(...[build(dismissSheet)].flat().filter(Boolean));
  root.replaceChildren(scrim);
  panel.querySelector('input')?.focus({ preventScroll: true });
  return dismissSheet;
}

export function dismissSheet() { closeSheet?.(); }

/* ---------- toast ---------- */

let toastTimer = null;
export function toast(msg, ms = 2600) {
  clearTimeout(toastTimer);
  document.querySelector('.toast')?.remove();
  const node = el('div', { class: 'toast', role: 'status', text: msg });
  document.body.append(node);
  toastTimer = setTimeout(() => node.remove(), ms);
}

/* ---------- formatting ---------- */

export function hhmm(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
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

export function shortDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function longDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function km(m) { return (m / 1000).toFixed(1); }

export const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export function words(n) { return NUMBER_WORDS[n] ?? String(n); }
