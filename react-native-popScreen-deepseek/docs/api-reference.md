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

## Window geometry

### `setWindowRect(x?, y?, width?, height?): Promise<void>`
Sets the window's position and/or size directly. Any parameter may be omitted.

### `setSizeConstraints(minWidth?, minHeight?, maxWidth?, maxHeight?): Promise<void>`
Sets limits on how small or large the window may be during user resize (defaults: min 150×150).

## Configuration

### `<PopScreenContent dragHandleHeight? resizeHandleSize?>`
Wraps your overlay UI. Pass `dragHandleHeight` (dp) to override the native drag-handle region height. Pass `resizeHandleSize` (dp) to override the bottom-right resize handle hit target size.

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
