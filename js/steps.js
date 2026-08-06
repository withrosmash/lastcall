// Step counting behind one interface, native-first.
//
// Native: the phone's hardware step counter via LastCallNative — counts in
// silicon whether or not the app is awake, which is the only way a night in a
// pocket records real numbers.
//
// Web fallback: accelerometer peak detection, foreground-only and honest about
// it (the tile is hidden entirely when the sensor is absent). Both paths emit
// DELTAS, not totals, so the caller accumulates and a restart can only ever
// undercount, never rewind.

import * as keepalive from './keepalive.js';

let mode = null; // 'native' | 'web' | null
let onDelta = () => {};
let handler = null;

// Peak detection on the magnitude of acceleration. A step shows up as a bump
// above ~11.5 m/s²; the refractory window rejects the double-bounce that would
// otherwise count each footfall twice.
const THRESHOLD = 11.5;
const REFRACTORY_MS = 260;
let armed = true;
let lastStep = 0;
let smoothed = 9.81;

function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a || a.x == null) return;
  const mag = Math.hypot(a.x, a.y, a.z);
  smoothed = smoothed * 0.8 + mag * 0.2;

  const now = Date.now();
  if (armed && smoothed > THRESHOLD && now - lastStep > REFRACTORY_MS) {
    armed = false;
    lastStep = now;
    onDelta(1);
  } else if (smoothed < THRESHOLD - 0.8) {
    armed = true;
  }
}

export async function start(cb) {
  onDelta = cb || onDelta;

  if (await keepalive.startSteps((d) => onDelta(d))) {
    mode = 'native';
    return true;
  }

  if (typeof DeviceMotionEvent === 'undefined') return false;

  // iOS gates the sensor behind an explicit gesture; without one, hide the
  // tile rather than showing a confidently wrong zero.
  if (typeof DeviceMotionEvent.requestPermission === 'function') return false;

  if (!handler) {
    handler = onMotion;
    window.addEventListener('devicemotion', handler);
  }

  // Desktop Chrome fires devicemotion with null readings, so the event alone
  // proves nothing — wait for one that actually carries acceleration.
  return await new Promise((resolve) => {
    let usable = false;
    const probe = (e) => {
      const a = e.accelerationIncludingGravity;
      if (a && a.x != null && (a.x || a.y || a.z)) usable = true;
    };
    window.addEventListener('devicemotion', probe);
    setTimeout(() => {
      window.removeEventListener('devicemotion', probe);
      if (usable) mode = 'web';
      else stop();
      resolve(usable);
    }, 1200);
  });
}

export function stop() {
  if (mode === 'native') keepalive.stopSteps();
  if (handler) {
    window.removeEventListener('devicemotion', handler);
    handler = null;
  }
  mode = null;
}
