// Location behind one interface. The web path uses navigator.geolocation and
// stops the moment the screen locks; the native path (added with Capacitor)
// keeps running with the phone in a pocket, which is the whole point of
// shipping this as an Android app. Nothing outside this file knows which is in
// play — that is what keeps the eventual iOS port a config exercise.

let watchId = null;
let nativePlugin = null;
let listeners = { fix: () => {}, status: () => {} };

export function isNative() {
  return !!(globalThis.Capacitor?.isNativePlatform?.());
}

async function loadNative() {
  if (nativePlugin) return nativePlugin;
  const mod = await import('@capgo/background-geolocation');
  nativePlugin = mod.BackgroundGeolocation;
  return nativePlugin;
}

export async function start({ onFix, onStatus }) {
  listeners = { fix: onFix || listeners.fix, status: onStatus || listeners.status };
  listeners.status('waiting');

  if (isNative()) {
    try {
      const plugin = await loadNative();
      watchId = await plugin.addWatcher(
        {
          // Shown in the permanent Android notification. Required by the OS:
          // background location is only granted to a foreground service.
          backgroundMessage: 'Last Call is tracking your night.',
          backgroundTitle: 'Last Call',
          requestPermissions: true,
          stale: false,
          distanceFilter: 25,
        },
        (location, error) => {
          if (error) {
            listeners.status(error.code === 'NOT_AUTHORIZED' ? 'denied' : 'error');
            return;
          }
          listeners.status('live');
          listeners.fix({ lat: location.latitude, lng: location.longitude, t: Date.now() });
        },
      );
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
  if (isNative() && nativePlugin) {
    try { await nativePlugin.removeWatcher({ id: watchId }); } catch { /* already gone */ }
  } else {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
}

export function running() { return watchId != null; }

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
