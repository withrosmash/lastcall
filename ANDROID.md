# Building and installing the Android app

## How this is put together

There is no bundler. The app is plain ES modules served straight from `www/`,
which `scripts/build.mjs` assembles by copying `index.html`, `css/`, `js/`,
`vendor/`, `icons/`, `manifest.webmanifest` and `sw.js`. Capacitor copies that
folder into the APK's assets.

Capacitor plugins normally arrive through a bundler. Instead, `@capacitor/core`
ships a self-contained 24 KB ESM bundle which is vendored to
`vendor/capacitor-core.js`, and the app calls `registerPlugin('…')` to get a
bridge proxy. The implementation is native code compiled into the APK, so this
costs nothing on the web — `Capacitor.isNativePlatform()` returns `false` there
and `geo.js` falls back to `navigator.geolocation`.

`vendor/capacitor-core.js` is committed as well as generated, because GitHub
Pages serves the repo without running `npm install`.

## Getting an APK

**Via CI (no local Android toolchain needed).** Push to `main`. The
`Build Android APK` workflow runs on Ubuntu, where the Android SDK is
preinstalled, and uploads `lastcall-debug-<sha>.apk` as a build artifact.
Download it from the run's summary page. Free minutes on a public repo.

**Locally**, if you ever install Android Studio:

```bash
npm install && npm run sync && cd android && ./gradlew assembleDebug
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Installing on your phone

The APK is debug-signed, so Android treats it as coming from an unknown source.
On the phone: open the downloaded file, and when prompted allow "install unknown
apps" for whatever app you downloaded it with (Chrome, Files, Drive). No Play
Store account and no developer fee.

## What it asks for, and why

- **Location.** Grant it. Without it the app still tracks time, drinks, water
  and steps, but there is no map and no route on the share card.
- **"Allow all the time".** Android puts this behind a separate trip to system
  settings, which is what screen 13 primes you for. Strictly it is belt and
  braces: a foreground service started while the app is open can keep reading
  location with only "While using the app", which covers the normal flow of
  tapping Start night and pocketing the phone. See the comment in
  `android/app/src/main/AndroidManifest.xml` — deleting one line there drops the
  heavier permission entirely.
- **Notifications.** Android 13+ needs this to show the persistent tracking
  notification, which the OS requires and which cannot be hidden. It also
  carries the hydration nudge.

## Keeping a night recording end to end

Tracking runs only between Start night and End night — nothing is recorded
between nights. Within a night it is built to not drop out:

- **Foreground service.** Survives the screen locking, the app being
  backgrounded, and the phone going in a pocket. This is what the permanent
  notification is for; Android will not grant background location without it.
- **Battery optimisation.** Samsung's Device Care puts apps to "sleep" and
  stops their services, which is the most likely way to lose half a night. The
  first time you start a night the app asks Android to exempt it. If you decline
  — or if Samsung silently re-enables it later — the session screen shows an
  amber warning with a **Fix it** button, and the state is re-checked every time
  you return to the app. You get told before you lose a night, not after.
- **Reboot.** A restart kills the service, and Android does not let anything
  restart location tracking from the background. Rather than pretend, a
  notification says tracking stopped and one tap picks the night back up.
- **Gaps are reported, not hidden.** If no fix arrives for more than 12 minutes
  the recap says so — "Tracking dropped for 40 minutes, so part of the route is
  missing." The map draws a straight line across a hole, which would otherwise
  read as a walk that never happened.

### Samsung, by hand

The in-app prompt covers most of it. If the warning persists:
Settings → Apps → Last Call → Battery → **Unrestricted**, and
Settings → Battery → Background usage limits → make sure Last Call is **not** in
**Sleeping apps** or **Deep sleeping apps**.

## The test that matters

Start a night, lock the phone, put it in a pocket, walk a few hundred metres,
come back. The trail should be **continuous with no gap**. That single check is
the entire reason this is a native app rather than a web page.

Then watch: battery drain over an hour, whether the hydration notification
arrives with the app closed, whether step counts look sane against the phone's
own health app, and whether a card exports and shares at full resolution.

## Still open

- **Offline map tiles.** The brief asks for bundled tiles and no cross-origin
  imagery. Currently the map pulls CARTO's dark basemap over the network, so
  the map is blank without signal. Everything else works offline.
- **iOS.** `geo.js` and `steps.js` are already abstracted behind a platform
  check, so this is a `cap add ios` plus an Apple Developer membership
  ($99/year) rather than a rewrite.
