// Keeping a night recording end to end on Android — specifically on Samsung,
// where Device Care will put the app to sleep and stop the foreground service
// without telling anyone. The web build no-ops throughout.

import { registerPlugin, Capacitor } from '../vendor/capacitor-core.js';

const LastCallNative = registerPlugin('LastCallNative');

export const isNative = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

/** true / false on device, null where the question doesn't apply. */
export async function isExempt() {
  if (!isNative()) return null;
  try {
    const res = await LastCallNative.isIgnoringBatteryOptimizations();
    return !!res?.ignoring;
  } catch {
    return null;
  }
}

/** Fires the system dialog. Returns the state afterwards, which may still be false. */
export async function requestExempt() {
  if (!isNative()) return null;
  try {
    const res = await LastCallNative.requestIgnoreBatteryOptimizations();
    return !!res?.ignoring;
  } catch {
    return null;
  }
}

export async function openAppSettings() {
  if (!isNative()) return false;
  try { await LastCallNative.openAppSettings(); return true; }
  catch { return false; }
}

// Mirrors "a night is open" into SharedPreferences, where the boot receiver can
// still read it after a restart has wiped the WebView.
export async function setSessionActive(active) {
  if (!isNative()) return;
  try { await LastCallNative.setSessionActive({ active: !!active }); }
  catch { /* the flag is a courtesy, never a failure path */ }
}
