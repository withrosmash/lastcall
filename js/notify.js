// The hydration nudge as a real notification, so it lands when the phone is
// locked in a pocket and the WebView is suspended. Web builds get nothing —
// there is no service worker push here and a foreground-only notification
// would just duplicate the banner already on screen.

import { registerPlugin, Capacitor } from '../vendor/capacitor-core.js';

const LocalNotifications = registerPlugin('LocalNotifications');

const HYDRATION_ID = 1;
let granted = false;
// Schedules and cancels run one at a time, in the order asked, so a cancel
// can't land between a reschedule's two steps and leave a reminder behind.
let queue = Promise.resolve();
const inTurn = (job) => (queue = queue.then(job, job));

const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

export async function init() {
  if (!isNative()) return false;
  try {
    const res = await LocalNotifications.requestPermissions();
    granted = res?.display === 'granted';
    return granted;
  } catch {
    return false;
  }
}

export function hydrationNudge(sinceCount) {
  return inTurn(async () => {
    if (!granted) return;
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: HYDRATION_ID,
          title: 'Leit',
          body: 'Time for a water.',
          // Fires a moment later so it doesn't collide with the in-app banner
          // when the phone is actually in the user's hand.
          schedule: { at: new Date(Date.now() + 30_000) },
          extra: { sinceCount },
        }],
      });
    } catch { /* notification is a courtesy, never a failure path */ }
  });
}

/** On a walk the reminder is timed, so it's scheduled to land at `when`, phone in pocket or not. */
export function waterAt(when) {
  return inTurn(async () => {
    if (!granted) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: HYDRATION_ID }] });
      await LocalNotifications.schedule({
        notifications: [{ id: HYDRATION_ID, title: 'Leit', body: 'Time for a water.', schedule: { at: new Date(Math.max(when, Date.now() + 5000)) } }],
      });
    } catch { /* notification is a courtesy, never a failure path */ }
  });
}

export function clearHydration() {
  return inTurn(async () => {
    if (!granted) return;
    try { await LocalNotifications.cancel({ notifications: [{ id: HYDRATION_ID }] }); }
    catch { /* nothing pending */ }
  });
}
