// The hydration nudge as a real notification, so it lands when the phone is
// locked in a pocket and the WebView is suspended. Web builds get nothing —
// there is no service worker push here and a foreground-only notification
// would just duplicate the banner already on screen.

import { registerPlugin, Capacitor } from '../vendor/capacitor-core.js';

const LocalNotifications = registerPlugin('LocalNotifications');

const HYDRATION_ID = 1;
let granted = false;

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

export async function hydrationNudge(sinceCount) {
  if (!granted) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: HYDRATION_ID,
        title: 'Last Call',
        body: 'Time for a water.',
        // Fires a moment later so it doesn't collide with the in-app banner
        // when the phone is actually in the user's hand.
        schedule: { at: new Date(Date.now() + 30_000) },
        extra: { sinceCount },
      }],
    });
  } catch { /* notification is a courtesy, never a failure path */ }
}

export async function clearHydration() {
  if (!granted) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: HYDRATION_ID }] }); }
  catch { /* nothing pending */ }
}
