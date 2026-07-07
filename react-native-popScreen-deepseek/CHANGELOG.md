# Changelog

All notable changes to PopScreen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-07

### Added
- Android-only floating overlay window via `TYPE_APPLICATION_OVERLAY` /
  `SYSTEM_ALERT_WINDOW`, hosted by a foreground `Service`.
- Dual old/new React Native architecture support (legacy bridge and
  Fabric/Bridgeless), auto-detected at runtime via `ReactArchitectureDetector`.
- `PopScreenModule` (Expo Modules API) with full function surface:
  `show`, `hide`, `destroy`, `setWindowRect`, `setSizeConstraints`,
  `setHandleDimensions`, `hasOverlayPermission`, `requestOverlayPermission`,
  `hasBatteryOptimizationExemption`, `requestBatteryOptimizationExemption`,
  `getReactArchitectureInfo`.
- `PopScreenContent` component — wraps arbitrary developer-provided RN UI
  as overlay content; accepts `dragHandleHeight` and `resizeHandleSize` props.
- `registerOverlaySurface(component)` — registers a RN component as the
  overlay's root surface (second `AppRegistry` surface on the same JS instance).
- `usePopScreen(key, defaultValue)` hook — cross-surface shared state via a
  minimal external store (`useSyncExternalStore`-based, no Context required).
- `minimize(currentRect?, options?)` / `restore()` / `getIsMinimized()` —
  JS-driven minimize/restore built entirely on `setWindowRect` with no
  native-side "minimize" concept.
- Native drag support (`PopScreenTouchInterceptorView`) — native window
  movement via `WindowManager.updateViewLayout()`, content-area touch
  passthrough to the RN surface, throttled `onDragUpdate` events to JS.
- Native resize support — bottom-right corner resize handle, min/max
  size constraints via `setSizeConstraints`, `onResizeUpdate` events.
- Permission revocation detection — 3-second poll, graceful window teardown
  on revocation, `onPermissionResult` event to JS.
- `onWindowStateChange` event — `shown`/`hidden`/`destroyed` lifecycle
  transitions emitted to JS.
- Config plugin (`withPopScreenAndroidManifest`) — auto-injects
  `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_SPECIAL_USE` permissions and the
  `OverlayService` declaration into `AndroidManifest.xml` via
  `expo prebuild`.
- Device rotation / config change handling in the foreground Service.
- `docs/state-sync.md`, `docs/known-limitations.md`,
  `docs/api-reference.md`, `docs/play-policy-guidance.md`,
  `docs/compatibility.md`.

### Known limitations (v1.0.0)
- Overlay does not survive host app process death (see
  `docs/known-limitations.md`).
- Snap-to-edge deferred to v1.1.
- iOS is not supported (platform constraint — see
  `docs/known-limitations.md`).
- Expo Go is not supported; `expo-dev-client` required.
