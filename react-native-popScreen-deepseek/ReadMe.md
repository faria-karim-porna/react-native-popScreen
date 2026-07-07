# PopScreen Spike — Milestone 0 & 1

**Milestone 0 — Spike / Validation**
Prove that a live React Native surface can render and auto-update inside a `TYPE_APPLICATION_OVERLAY` system window with zero native involvement per update.

- `OverlayService` — foreground `Service` creating a system overlay via `WindowManager`, hosting a second React surface (`ReactHost.createSurface()`) on the New Architecture.
- `PopScreenModule` + `PopScreenPackage` — native module exposing `hasOverlayPermission`, `requestOverlayPermission`, `startOverlay`, and `stopOverlay` to JS.
- `OverlayRoot.js` — overlay content with a live "Tick: N" counter (proves RN re-renders flow automatically).
- `App.js` — host app control panel with permission, start, and stop buttons.

**Milestone 1 — Expo Module Scaffolding**
Native module renamed to `PopScreenModule` + `PopScreenPackage`. Added `getReactArchitectureInfo()` to detect New vs Old React Native architecture. Created Expo config plugin (`plugin/src/index.ts` + `app.plugin.js`) that injects overlay permissions and service declaration into `AndroidManifest.xml`. Added TypeScript types and wrappers (`src/`). Wired plugin into `app.json`. Updated `App.js` to display detected architecture info.

**Milestone 2 — Generic Overlay Window + Static Content**
`PopScreenReactSurfaceHost` with dual-path creation (New Arch via reflection, Old Arch via `ReactRootView`). `PopScreenHostProvider` interface. `show()`/`hide()` API in `PopScreenModule`. `OverlayDemo.js`, `PopScreenContent.js`, `registerOverlaySurface.js`. Deleted `OverlayRoot.js`.

**Milestone 3 — Touch Interaction**
`PopScreenTouchInterceptorView` wraps the RN surface, intercepting drag-handle touches (top 32dp strip) while passing content touches through. `OverlayService` moves the real system window via `WindowManager.updateViewLayout()` with throttled `onDragUpdate` events emitted to JS. `OverlayDemo.js` proves both touch domains with a drag handle + tappable button. `NativeEventEmitter` listens for drag events in `App.js`.

**Milestone 4 — Resize, Minimize, Restore**
`PopScreenTouchInterceptorView` now handles three touch regions (drag/resize/content) via `ActiveGesture` enum. `OverlayService` added `setWindowRect()` (generic JS-driven rect primitive), `resizeWindowBy()` with `coerceIn` clamping, and `setSizeConstraints()`. `src/minimizeRestore.ts` — pure JS minimize/restore on top of `setWindowRect` (no native minimize concept). `OverlayDemo.js` has ⤡ resize handle, Minimize button, and minimized 🎈 state.

**Milestone 5 — State Sync & Hook API**
`usePopScreen(key, default)` hook backed by a module-scoped external store — no Context needed, works across both RN surfaces. Two canonical demos: **Counter** (+/− buttons via shared store, values sync live between overlay and main app) and **Input Submit** (TextInput + Submit with local `useState`, proving IME-in-overlay works). `OverlaySwitcher.js` reads `activeDemo` from the shared store. `PopScreenContent` accepts `dragHandleHeight`/`resizeHandleSize` props. Deleted dead `OverlayDemo.js`. `docs/state-sync.md` documents both patterns.

**Milestone 6 — Lifecycle Hardening**
Permission revocation poll (Handler every 3s) triggers graceful teardown with `onPermissionResult` + `onWindowStateChange` events. `destroy()` full teardown API. `onWindowStateChange` event (shown/hidden/destroyed). Battery optimization functions (`hasBatteryOptimizationExemption`/`requestBatteryOptimizationExemption`). `START_NOT_STICKY` ties overlay to host process. `onConfigurationChanged` recomputes DP→PX on rotation. `docs/known-limitations.md` documenting process-death, MIUI battery, and IME behavior.

**Next step:** Build on a POCO M3 with `npx expo run:android`, verify permission revocation detection, destroy cycle, battery exemption UX, and rotation.
