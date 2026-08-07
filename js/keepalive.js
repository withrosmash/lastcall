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

// Writes a PNG into the system gallery via MediaStore. An <a download> click —
// the web path — does nothing inside Android's WebView, which is why the card
// "saved" to nowhere on the phone.
export async function saveImage(base64, name) {
  if (!isNative()) return false;
  await LastCallNative.saveToGallery({ data: base64, name });
  return true;
}

// Live state of everything tracking depends on. null on the web, where none of
// it applies.
export async function permissionStatus() {
  if (!isNative()) return null;
  try {
    const res = await LastCallNative.permissionStatus();
    return {
      fineLocation: !!res?.fineLocation,
      backgroundLocation: !!res?.backgroundLocation,
      activity: !!res?.activity,
      notifications: !!res?.notifications,
      battery: !!res?.battery,
    };
  } catch {
    return null;
  }
}

// Ask for the step-counter permission while the user is still holding the
// phone — chained before the location dialog at Start night.
export async function requestActivityPermission() {
  if (!isNative()) return true;
  try {
    const res = await LastCallNative.requestActivityPermission();
    return !!res?.granted;
  } catch {
    return false;
  }
}

/* ---------- quick log from the notification shade ---------- */

export async function showQuickLog(drinkLabel = 'Drink') {
  if (!isNative()) return;
  try { await LastCallNative.showQuickLog({ drinkLabel }); } catch { /* cosmetic */ }
}

export async function hideQuickLog() {
  if (!isNative()) return;
  try { await LastCallNative.hideQuickLog(); } catch { /* already gone */ }
}

// Taps recorded while the WebView slept, with the tap's own timestamps.
export async function drainQuickLogs() {
  if (!isNative()) return [];
  try {
    const res = await LastCallNative.drainPendingLogs();
    return Array.isArray(res?.events) ? res.events : [];
  } catch {
    return [];
  }
}

export async function onQuickLog(cb) {
  if (!isNative()) return null;
  try { return await LastCallNative.addListener('quicklog', cb); } catch { return null; }
}

/* ---------- text files to Downloads (GPX, JSON export) ---------- */

export async function saveTextFile(name, mime, data) {
  if (!isNative()) return false;
  await LastCallNative.saveTextFile({ name, mime, data });
  return true;
}

/* ---------- steps ----------
   The hardware step counter accumulates in silicon regardless of app state, so
   even if events pause while the phone sleeps, the next delivery carries the
   full count. The web accelerometer can never match this: it hears nothing
   once the screen locks, which is how a 5,500-step walk logged 89. */

let stepHandle = null;
let lastTotal = 0;

export async function startSteps(onDelta) {
  if (!isNative()) return false;
  try {
    const res = await LastCallNative.startStepCount();
    if (!res?.available) return false;
    lastTotal = 0;
    stepHandle = await LastCallNative.addListener('steps', (e) => {
      const total = Number(e?.steps) || 0;
      const delta = total - lastTotal;
      lastTotal = total;
      if (delta > 0) onDelta(delta);
    });
    return true;
  } catch {
    return false;
  }
}

export async function stopSteps() {
  try { stepHandle?.remove?.(); } catch { /* gone */ }
  stepHandle = null;
  lastTotal = 0;
  if (!isNative()) return;
  try { await LastCallNative.stopStepCount(); } catch { /* not counting */ }
}
