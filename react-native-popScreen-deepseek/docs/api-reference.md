# PopScreen API Reference

## Setup

### `registerOverlaySurface(component)`
Call once in `index.js` alongside `registerRootComponent`. Registers the component rendered inside the floating overlay window.

## Permissions

### `hasOverlayPermission(): Promise<boolean>`
Returns whether the "draw over other apps" permission is currently granted.

### `requestOverlayPermission(): Promise<void>`
Opens the system settings screen for this app's overlay permission.

### `hasBatteryOptimizationExemption(): Promise<boolean>`
Returns whether the app is exempt from Android battery optimization (relevant for overlay persistence on aggressive OEMs like MIUI).

### `requestBatteryOptimizationExemption(): Promise<void>`
Opens Android's battery optimization settings list.

## Overlay lifecycle

### `show(): Promise<void>`
Shows the floating overlay window. Starts the foreground Service if not already running.

### `hide(): Promise<void>`
Removes the overlay window. The Service remains running so `show()` can reattach cheaply.

### `destroy(): Promise<void>`
Fully tears down the overlay: removes the window, stops the Service, releases all native resources.

### `openApp(): Promise<void>`
Brings the host app's main activity to the foreground.

## Window geometry

### `setWindowRect(x?, y?, width?, height?): Promise<void>`
Sets the window's position and/or size directly. Any parameter may be omitted.

### `setSizeConstraints(minWidth?, minHeight?, maxWidth?, maxHeight?): Promise<void>`
Sets limits on how small or large the window may be during user resize (defaults: min 150×150).

### `setDragMode(mode): Promise<void>`
Sets where the overlay window can be dragged from:
- `'handle'` — a top drag-handle strip (default; height from `dragHandleHeight`).
- `'header'` — only the header is draggable.
- `'body'` — the whole overlay body is draggable.

The bottom-right resize corner keeps working in every mode.

## Configuration & Header

### `<PopScreenContent dragHandleHeight? resizeHandleSize? dragMode? showHeader? header? headerProps?>`
Wraps your overlay UI.
- `dragHandleHeight` (dp): Height of the top drag-handle strip in `'handle'` mode (default: 32).
- `resizeHandleSize` (dp): Overrides the bottom-right resize handle target size (default: 24).
- `dragMode` (`'handle' | 'header' | 'body'`): Where the overlay can be dragged from
  (default: `'handle'`). `'header'` drags only from the header and auto-sizes the
  strip to the header height (default 40dp, overridable via `dragHandleHeight`);
  `'body'` makes the whole overlay body draggable.
- `showHeader` (boolean): Shows or hides the header in the overlay (default: `false`).
- `header` (ReactNode): Custom header element (overrides default `<PopScreenHeader />`).
- `headerProps`: Props passed to default `<PopScreenHeader />`.

> Taps in the drag region (header buttons, text fields, …) still pass through to
> the content — the window only starts dragging once the finger moves past touch
> slop.

### `<PopScreenHeader title? onCancel? onBackToApp? showCancel? showBackToApp?>`
Configurable React Native overlay header. Includes **Cancel** (hides overlay) and **Back to Main App** (launches host app and hides overlay) buttons by default.

## State hook

### `usePopScreen<T>(key, defaultValue?): [T, setter]`
Subscribe to a key in the shared cross-surface store. Works identically in both the host app and the overlay.

### `getPopScreenState(): Record<string, any>`
Read the full shared store outside a React component.

## Minimize / restore

### `minimize(currentRect?, options?): Promise<void>`
Shrinks the overlay to small fixed size. `options.width`/`height` override the default 64×64.

### `restore(): Promise<void>`
Restores the overlay to the size/position before `minimize()`.

### `getIsMinimized(): boolean`
Returns the current minimize state synchronously.

## Events

### `addDragUpdateListener(listener): Subscription`
Fired during/after drag gestures. Payload: `{ phase, x, y, width, height }`.

### `addResizeUpdateListener(listener): Subscription`
Fired during/after resize gestures. Payload: `{ phase, x, y, width, height }`.

### `addWindowStateChangeListener(listener): Subscription`
Fired when overlay lifecycle state changes. Payload: `{ state: 'shown'|'hidden'|'destroyed', reason? }`.

### `addPermissionResultListener(listener): Subscription`
Fired when overlay permission is revoked mid-session. Payload: `{ granted: boolean, reason? }`.

## Architecture detection

### `getReactArchitectureInfo(): Promise<{ architecture, isNewArchitecture }>`
Returns which RN architecture the host app is running on.
