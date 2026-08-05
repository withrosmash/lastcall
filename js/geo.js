// Location behind one interface. The web path uses navigator.geolocation and
// stops the moment the screen locks; the native path runs in an Android
// foreground service and keeps going with the phone in a pocket, which is the
// whole reason this ships as an app rather than a website. Nothing outside
// this file knows which is in play — that is what keeps an eventual iOS port a
// config exercise rather than a rewrite.

import { registerPlugin, Capacitor } from '../vendor/capacitor-core.js';

// registerPlugin only builds a bridge proxy; the implementation is the native
// code compiled into the APK. No bundler involved.
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

let watchId = null;
let native = false;
let listeners = { fix: () => {}, status: () => {} };

export function isNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export async function start({ onFix, onStatus }) {
  listeners = { fix: onFix || listeners.fix, status: onStatus || listeners.status };
  listeners.status('waiting');

  if (isNative()) {
    try {
      await BackgroundGeolocation.start(
        {
          // Shown in the permanent Android notification. Not optional: the OS
          // only grants background location to a foreground service.
          backgroundTitle: 'Last Call',
          backgroundMessage: 'Last Call is tracking your night.',
          requestPermissions: true,
          stale: false,
          distanceFilter: 25,
        },
        (location, error) => {
          if (error) {
            listeners.status(error.code === 'NOT_AUTHORIZED' ? 'denied' : 'error');
            return;
          }
          if (!location) return;
          listeners.status('live');
          listeners.fix({ lat: location.latitude, lng: location.longitude, t: Date.now() });
        },
      );
      native = true;
      watchId = 'native';
      return true;
    } catch {
      listeners.status('error');
      return false;
    }
  }

  if (!navigator.geolocation) { listeners.status('unsupported'); return false; }

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      listeners.status('live');
      listeners.fix({ lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() });
    },
    (err) => listeners.status(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
    { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 },
  );
  return true;
}

export async function stop() {
  if (watchId == null) return;
  if (native) {
    try { await BackgroundGeolocation.stop(); } catch { /* already stopped */ }
    native = false;
  } else {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
}

export function running() { return watchId != null; }

// Android makes background location a separate trip to system settings, so the
// priming screen sends people straight there rather than leaving them hunting.
export async function openSettings() {
  if (!isNative()) return false;
  try { await BackgroundGeolocation.openSettings(); return true; }
  catch { return false; }
}

// One-shot fix, used to centre the map before the first watch update lands.
export function current() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  });
}
