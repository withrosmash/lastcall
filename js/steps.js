// Step counting from the accelerometer. On the web this only runs while the
// app is in the foreground, so it undercounts — the tile is hidden entirely
// rather than shown wrong when the sensor isn't there. The native build swaps
// this for the phone's own pedometer.

let count = 0;
let onChange = () => {};
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
    count += 1;
    onChange(count);
  } else if (smoothed < THRESHOLD - 0.8) {
    armed = true;
  }
}

export function supported() {
  return typeof DeviceMotionEvent !== 'undefined';
}

// iOS Safari gates the sensor behind an explicit gesture. Returns false rather
// than throwing so callers can just hide the tile.
export async function start(cb, { fromGesture = false } = {}) {
  if (!supported()) return false;
  onChange = cb || onChange;

  const needsPermission = typeof DeviceMotionEvent.requestPermission === 'function';
  if (needsPermission) {
    if (!fromGesture) return false;
    try {
      const res = await DeviceMotionEvent.requestPermission();
      if (res !== 'granted') return false;
    } catch { return false; }
  }

  if (handler) return true;
  handler = onMotion;
  window.addEventListener('devicemotion', handler);

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
      if (!usable) stop();
      resolve(usable);
    }, 1200);
  });
}

export function stop() {
  if (!handler) return;
  window.removeEventListener('devicemotion', handler);
  handler = null;
}

export function reset() { count = 0; }
export function total() { return count; }
