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

**Next step:** Build and run on a POCO M3 with `npx expo run:android`, verify the overlay window renders "🎈 Hello from the overlay!" content, and confirm Show→Hide→Show works cleanly.
