# PopScreen Spike — Milestone 0

**Goal:** Prove that a live React Native surface can render and auto-update inside a `TYPE_APPLICATION_OVERLAY` system window with zero native involvement per update.

**What was built:**
- Expo project (SDK 57 / RN 0.86) with `expo-dev-client` and native Android prebuild.
- `OverlayService` — a foreground `Service` that creates a system overlay window via `WindowManager` and hosts a second React surface using `ReactHost.createSurface()` (New Architecture).
- `OverlaySpikeModule` + `OverlaySpikePackage` — a native module exposing `hasOverlayPermission`, `requestOverlayPermission`, `startOverlay`, and `stopOverlay` to JS.
- `OverlayRoot.js` — overlay content rendering a live "Tick: N" counter that increments every 1s via plain `useState`/`setInterval`, proving RN re-renders flow into the overlay automatically.
- `App.js` — host app control panel with permission, start, and stop buttons.
- `AndroidManifest.xml` — declared `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE` permissions and the overlay service.

**Next step:** Build and run on a POCO M3 (or any Android device) with `npx expo run:android` and follow the manual test sequence in `milestone-0-implementation.md`.
