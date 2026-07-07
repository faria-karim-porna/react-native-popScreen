# PopScreen

**Android-only** floating overlay library for React Native (Expo). Render
any React Native UI as a system-level floating window — like YouTube
Picture-in-Picture or Messenger chat bubbles — on top of other apps.

> **Platform:** Android only (API 26+). iOS cannot support system-wide
> overlays from third-party apps — this is a platform constraint, not a
> library limitation. See [docs/known-limitations.md](docs/known-limitations.md).
>
> **Expo Go:** not supported. A custom dev client is required.
> See [Installation](#installation).

## Features

- Render any RN component tree in a floating overlay window
- Drag, resize, minimize, and restore the overlay — all controllable from JS
- Cross-surface state sync between the host app and the overlay via `usePopScreen()`
- Generic native layer — Kotlin never knows what's inside the overlay
- Dual old/new RN architecture support (Fabric + legacy bridge)
- Foreground service for overlay persistence while the app is backgrounded
- Permission revocation detection and graceful teardown

## Installation

```bash
npx expo install popscreen
npx expo install expo-dev-client
npx expo prebuild --platform android
eas build --profile development --platform android
```

The library ships an [Expo Config Plugin](https://docs.expo.dev/config-plugins/introduction/)
that automatically injects the required Android permissions and service
declaration — no manual `AndroidManifest.xml` editing needed.

## Quick start

```tsx
// index.js — register the overlay surface early
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import MyBubble from './MyBubble';

registerRootComponent(App);
registerOverlaySurface(MyBubble);
```

```tsx
// MyBubble.tsx — the component rendered in the floating window
import { PopScreenContent } from 'popscreen';
export default function MyBubble() {
  return <PopScreenContent><YourUI /></PopScreenContent>;
}
```

```tsx
// Anywhere in your main app
import * as PopScreen from 'popscreen';
await PopScreen.requestOverlayPermission();
await PopScreen.show();
```

## API reference

See [docs/api-reference.md](docs/api-reference.md) for the full API.

## State sync

See [docs/state-sync.md](docs/state-sync.md) for how to share state
between your app and the floating overlay.

## Play Store guidance

See [docs/play-policy-guidance.md](docs/play-policy-guidance.md) if you
are distributing your app on Google Play.

## Known limitations

See [docs/known-limitations.md](docs/known-limitations.md).

## Milestone Progress

This project was built incrementally across 8 milestones:

| Milestone | Summary |
|-----------|---------|
| **0** | Spike — live RN surface inside a `TYPE_APPLICATION_OVERLAY` window via `WindowManager`, foreground `Service`, second React surface with auto-updating counter. |
| **1** | Expo module scaffolding — `PopScreenModule` + `PopScreenPackage`, architecture detection, config plugin for Android permissions. |
| **2** | Generic overlay window — `PopScreenReactSurfaceHost` dual-path (New/Old Arch), `show()`/`hide()` API, `PopScreenContent` wrapper, `registerOverlaySurface`. |
| **3** | Touch interaction — `PopScreenTouchInterceptorView` with drag handle, `updateViewLayout()` with throttled `onDragUpdate` events to JS. |
| **4** | Resize & minimize — three-region touch (drag/resize/content) via `ActiveGesture` enum, `setWindowRect()` generic JS-driven rect primitive, pure-JS minimize/restore. |
| **5** | State sync & hook API — `usePopScreen(key, default)` backed by module-scoped store (no Context), Counter & Input Submit demos proving cross-surface sync vs local state. |
| **6** | Lifecycle hardening — permission revocation poll, `destroy()` API, `onWindowStateChange` events, battery optimization functions, `START_NOT_STICKY`, `onConfigurationChanged`. |
| **7** | Testing & docs — 19 Jest tests (createOverlayStore, usePopScreen, minimizeRestore, PopScreenContent) with native module mocks. Android JUnit + instrumented tests. GitHub Actions CI (JS tests + Android build + plugin build). Publishable README, API reference, Play policy guidance, known limitations docs, state sync docs. Demo app polish with inline JSDoc comments explaining each demo. TypeScript infrastructure (tsconfig, @types/jest, typecheck). |
| **8** | Publication — `package.json` restructured as npm library (peerDeps, exports, expo-module config). Production `tsconfig.build.json`, `.npmignore`, `expo-module.config.json`. `CHANGELOG.md` (v1.0.0), `docs/compatibility.md` (version/device matrix). Build verified via `tsc`, tests 19/19 pass, `npm pack --dry-run` clean (50 files, ~65KB). |

## License

MIT
