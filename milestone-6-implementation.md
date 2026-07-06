# PopScreen — Milestone 6: Lifecycle Hardening — Full Implementation Guide

**Goal of this document:** a literal, step-by-step build guide for Milestone 6 only, as described in `docs/implementation-plan.md` §20:

> Milestone 6 — Lifecycle Hardening
> Permission revocation handling, process-death behavior, OEM background-kill testing with the POCO M3 (MIUI 14) as the primary stress-test device, supplemented by stock Android and one Samsung device if available, foreground service notification UX.

**What this milestone delivers, concretely:** six hardening areas, each with code and a manual verification step:

1. **Permission revocation mid-session** — active polling + `onPermissionResult` event actually firing when the user revokes overlay permission while the overlay is running.
2. **`destroy()` public API** — the full teardown function from the main plan's §6 module surface, which was deferred past Milestones 2–5.
3. **`onWindowStateChange` event** — the lifecycle-state event also from §6, wired up for real.
4. **Process-death binding** — explicit coupling of the overlay `Service` lifecycle to the host process, with the v1 known-limitation clearly documented both in code comments and in a new `docs/known-limitations.md`.
5. **Battery optimization guidance** — `hasBatteryOptimizationExemption()`/`requestBatteryOptimizationExemption()` native functions, with Play-policy-safe intent usage and documentation pointing to `dontkillmyapp.com` for OEM-specific steps.
6. **Config change handling** — `onConfigurationChanged` in the `Service` to keep DP→PX conversions correct after device rotation.

**What this milestone is NOT:** automated test coverage (Milestone 7). This milestone's "testing" means running specific, targeted manual stress sequences on the POCO M3 and documenting the outcomes before v1 ships — not Jest or instrumented tests, which come next.

**Primary test device:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31) — the canonical worst-case OEM for every concern in this milestone. Supplement with a stock Android emulator or Pixel device and, if available, a Samsung OneUI device. Run every manual test on the POCO M3 first before checking any other device.

---

## Step 0 — Prerequisites

Continue in the same `popscreen` repository, with Milestone 5 fully passing. Every feature from Milestones 1–5 must be solid before hardening — a window that crashes on show doesn't benefit from permission-revocation handling. Confirm the Counter and Input Submit demos both work on both architecture paths before starting this milestone.

---

## Step 1 — Permission revocation detection and graceful teardown

The main plan's §10 lifecycle table specifies: "User revokes overlay permission mid-session → Kotlin detects via permission re-check on next `show()`/resume, tears down window gracefully, emits `onPermissionResult: revoked` event."

The `onPermissionResult` event was declared in Milestone 1's module definition but never actually fired by any detection code. Fix that now.

### 1a — Add a periodic permission re-check inside `PopScreenOverlayService`

Update **`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`**, adding a `Handler`-based poll that checks `Settings.canDrawOverlays()` every few seconds while the overlay is active. This is the most reliable detection pattern for `SYSTEM_ALERT_WINDOW` revocation, since Android does not broadcast an intent when this specific permission changes — unlike most runtime permissions, it cannot be monitored via `registerReceiver` or `PackageManager.addOnPermissionsChangeListener` because it is not a standard runtime permission:

```kotlin
package expo.modules.popscreen

import android.app.*
import android.content.*
import android.content.res.Configuration
import android.graphics.PixelFormat
import android.os.*
import android.provider.Settings
import android.view.*

class PopScreenOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var interceptorView: PopScreenTouchInterceptorView? = null
    private var surfaceHost: PopScreenReactSurfaceHost? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private var lastEmitTimeMs = 0L
    private val emitIntervalMs = 32L
    private var dragStartWindowX = 0
    private var dragStartWindowY = 0
    private var resizeStartWidth = 0
    private var resizeStartHeight = 0
    private var minWidthPx = 150
    private var minHeightPx = 150
    private var maxWidthPx = Int.MAX_VALUE
    private var maxHeightPx = Int.MAX_VALUE

    // Milestone 6: permission poll
    private val permissionCheckHandler = Handler(Looper.getMainLooper())
    private val permissionCheckIntervalMs = 3000L

    private val permissionCheckRunnable = object : Runnable {
        override fun run() {
            if (!Settings.canDrawOverlays(this@PopScreenOverlayService)) {
                android.util.Log.w("PopScreen", "Overlay permission revoked mid-session — tearing down")
                lifecycleEventListener?.invoke(
                    "onPermissionResult",
                    mapOf("granted" to false, "reason" to "revoked")
                )
                lifecycleEventListener?.invoke(
                    "onWindowStateChange",
                    mapOf("state" to "destroyed", "reason" to "permission_revoked")
                )
                stopSelf()
                return
            }
            permissionCheckHandler.postDelayed(this, permissionCheckIntervalMs)
        }
    }

    companion object {
        const val CHANNEL_ID = "popscreen_overlay_channel"
        const val NOTIFICATION_ID = 2001
        const val SURFACE_NAME = "PopScreenOverlay"
        const val DRAG_HANDLE_HEIGHT_DP = 32
        const val RESIZE_HANDLE_SIZE_DP = 28

        var hostProvider: PopScreenHostProvider? = null
        var dragEventListener: ((eventName: String, payload: Map<String, Any?>) -> Unit)? = null

        // Milestone 6: unified lifecycle event channel, separate from
        // dragEventListener so PopScreenModule can route them to the correct
        // Expo Modules event emitter without mixing concerns.
        var lifecycleEventListener: ((eventName: String, payload: Map<String, Any?>) -> Unit)? = null

        var activeInstance: PopScreenOverlayService? = null
    }

    override fun onCreate() {
        super.onCreate()
        activeInstance = this
        createNotificationChannelIfNeeded()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        showOverlay()
        return START_NOT_STICKY
        // START_NOT_STICKY (not START_STICKY) is deliberate for Milestone 6:
        // per the main plan's §9 process-death recommendation, we are TYING
        // the overlay's lifecycle to the host process. START_NOT_STICKY means
        // Android will NOT automatically recreate this Service if the process
        // is killed — the overlay simply disappears, which is the correct v1
        // behavior. See Step 3 for the full process-death documentation.
    }

    override fun onDestroy() {
        permissionCheckHandler.removeCallbacks(permissionCheckRunnable)
        if (activeInstance == this) activeInstance = null
        removeOverlay()
        super.onDestroy()
    }

    // Milestone 6: handle device rotation / configuration changes.
    // Service-hosted windows are NOT recreated on config change the way
    // Activities are — the Service survives, but DP→PX conversions computed
    // at creation time become stale. Re-apply the interceptor's handle
    // dimensions whenever the config changes.
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val density = resources.displayMetrics.density
        interceptorView?.dragHandleHeightPx =
            (DRAG_HANDLE_HEIGHT_DP * density).toInt()
        interceptorView?.resizeHandleSizePx =
            (RESIZE_HANDLE_SIZE_DP * density).toInt()
        android.util.Log.d("PopScreen", "Config changed — recomputed handle dimensions for new density")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun showOverlay() {
        if (interceptorView != null) return

        // Milestone 6: check permission immediately at show time, not just at
        // the JS call site, since the Service could be restarted by OS in edge
        // cases where the permission was revoked between the JS call and the
        // Service receiving the intent.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            !Settings.canDrawOverlays(this)
        ) {
            android.util.Log.e("PopScreen", "Overlay permission not granted at show time — stopping")
            lifecycleEventListener?.invoke(
                "onPermissionResult",
                mapOf("granted" to false, "reason" to "not_granted")
            )
            stopSelf()
            return
        }

        val provider = hostProvider
        if (provider == null) {
            android.util.Log.e("PopScreen", "No PopScreenHostProvider set — aborting overlay")
            stopSelf()
            return
        }

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val host = PopScreenReactSurfaceHost(this, provider)
        surfaceHost = host
        val contentView = host.createAndAttachSurface(SURFACE_NAME, Bundle())

        val density = resources.displayMetrics.density
        val dragHandleHeightPx = (DRAG_HANDLE_HEIGHT_DP * density).toInt()
        val resizeHandleSizePx = (RESIZE_HANDLE_SIZE_DP * density).toInt()

        val interceptor = PopScreenTouchInterceptorView(
            this, dragHandleHeightPx, resizeHandleSizePx,
            object : PopScreenTouchInterceptorView.OnDragListener {
                override fun onDragStart() {
                    dragEventListener?.invoke("onDragUpdate", mapOf("phase" to "start"))
                }
                override fun onDragMove(deltaX: Int, deltaY: Int) {
                    moveWindowBy(deltaX, deltaY)
                    maybeEmitThrottled("onDragUpdate", "move")
                }
                override fun onDragEnd(finalX: Int, finalY: Int) {
                    moveWindowBy(finalX, finalY)
                    dragStartWindowX = layoutParams?.x ?: dragStartWindowX
                    dragStartWindowY = layoutParams?.y ?: dragStartWindowY
                    emitNow("onDragUpdate", "end")
                }
            },
            object : PopScreenTouchInterceptorView.OnResizeListener {
                override fun onResizeStart() {
                    resizeStartWidth = layoutParams?.width ?: resizeStartWidth
                    resizeStartHeight = layoutParams?.height ?: resizeStartHeight
                    dragEventListener?.invoke("onResizeUpdate", mapOf("phase" to "start"))
                }
                override fun onResizeMove(dw: Int, dh: Int) {
                    resizeWindowBy(dw, dh)
                    maybeEmitThrottled("onResizeUpdate", "move")
                }
                override fun onResizeEnd(fdw: Int, fdh: Int) {
                    resizeWindowBy(fdw, fdh)
                    resizeStartWidth = layoutParams?.width ?: resizeStartWidth
                    resizeStartHeight = layoutParams?.height ?: resizeStartHeight
                    emitNow("onResizeUpdate", "end")
                }
            }
        )
        interceptor.attachContentView(contentView)
        interceptorView = interceptor

        val params = WindowManager.LayoutParams(
            500, 350,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 80; y = 250
        }
        layoutParams = params
        dragStartWindowX = params.x; dragStartWindowY = params.y
        resizeStartWidth = params.width; resizeStartHeight = params.height

        windowManager?.addView(interceptor, params)

        lifecycleEventListener?.invoke("onWindowStateChange", mapOf("state" to "shown"))

        // Start the permission poll AFTER the overlay is visible.
        permissionCheckHandler.postDelayed(permissionCheckRunnable, permissionCheckIntervalMs)
    }

    private fun removeOverlay() {
        interceptorView?.let { view ->
            try { windowManager?.removeView(view) } catch (e: IllegalArgumentException) { /* already removed */ }
        }
        surfaceHost?.destroy()
        surfaceHost = null
        interceptorView = null
        layoutParams = null
        lifecycleEventListener?.invoke("onWindowStateChange", mapOf("state" to "hidden"))
    }

    fun destroyCompletely() {
        lifecycleEventListener?.invoke("onWindowStateChange", mapOf("state" to "destroyed"))
        stopSelf()
    }

    fun setWindowRect(x: Int?, y: Int?, w: Int?, h: Int?) {
        val params = layoutParams ?: return
        val view = interceptorView ?: return
        x?.let { params.x = it }
        y?.let { params.y = it }
        w?.let { params.width = it.coerceIn(minWidthPx, maxWidthPx) }
        h?.let { params.height = it.coerceIn(minHeightPx, maxHeightPx) }
        applyLayout(view, params)
        dragStartWindowX = params.x; dragStartWindowY = params.y
        resizeStartWidth = params.width; resizeStartHeight = params.height
    }

    fun setSizeConstraints(minW: Int?, minH: Int?, maxW: Int?, maxH: Int?) {
        minW?.let { minWidthPx = it }; minH?.let { minHeightPx = it }
        maxW?.let { maxWidthPx = it }; maxH?.let { maxHeightPx = it }
    }

    fun setHandleDimensions(dragHandleHeightDp: Double?, resizeHandleSizeDp: Double?) {
        val density = resources.displayMetrics.density
        dragHandleHeightDp?.let { interceptorView?.dragHandleHeightPx = (it * density).toInt() }
        resizeHandleSizeDp?.let { interceptorView?.resizeHandleSizePx = (it * density).toInt() }
    }

    private fun moveWindowBy(dx: Int, dy: Int) {
        val params = layoutParams ?: return; val view = interceptorView ?: return
        params.x = dragStartWindowX + dx; params.y = dragStartWindowY + dy
        applyLayout(view, params)
    }

    private fun resizeWindowBy(dw: Int, dh: Int) {
        val params = layoutParams ?: return; val view = interceptorView ?: return
        params.width = (resizeStartWidth + dw).coerceIn(minWidthPx, maxWidthPx)
        params.height = (resizeStartHeight + dh).coerceIn(minHeightPx, maxHeightPx)
        applyLayout(view, params)
    }

    private fun applyLayout(view: android.view.View, params: WindowManager.LayoutParams) {
        try { windowManager?.updateViewLayout(view, params) }
        catch (e: IllegalArgumentException) {
            android.util.Log.w("PopScreen", "updateViewLayout failed, view likely detached", e)
        }
    }

    private fun maybeEmitThrottled(eventName: String, phase: String) {
        val now = System.currentTimeMillis()
        if (now - lastEmitTimeMs < emitIntervalMs) return
        lastEmitTimeMs = now
        emitNow(eventName, phase)
    }

    private fun emitNow(eventName: String, phase: String) {
        val params = layoutParams
        dragEventListener?.invoke(eventName, mapOf(
            "phase" to phase,
            "x" to (params?.x ?: 0), "y" to (params?.y ?: 0),
            "width" to (params?.width ?: 0), "height" to (params?.height ?: 0)
        ))
    }

    private fun buildNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            Notification.Builder(this, CHANNEL_ID)
        else @Suppress("DEPRECATION") Notification.Builder(this)
        return builder
            .setContentTitle("PopScreen")
            .setContentText("Floating overlay active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
    }

    private fun createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "PopScreen Overlay", NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
```

> **Why poll rather than a broadcast receiver?** `SYSTEM_ALERT_WINDOW` revocation does not trigger a standard `android.intent.action.PACKAGE_REMOVED` or permissions-change broadcast — the user toggles it in a Settings screen that does not fire any app-receivable intent. Polling every 3 seconds is the pragmatic industry-standard approach, matching how libraries like `react-native-overlay-permission` and similar handle it. 3 seconds means at most 3 seconds between revocation and graceful teardown, which is fine for a floating UI overlay; reducing it further would add unnecessary wakeup overhead.

---

## Step 2 — Wire `destroy()` and `onWindowStateChange` into the Expo Module

Update **`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`** — the full, final module definition for v1:

```kotlin
override fun definition() = ModuleDefinition {
    Name("PopScreen")

    Events("onPermissionResult", "onDragUpdate", "onResizeUpdate", "onWindowStateChange")

    // -- Permission (unchanged from Milestone 1) --
    AsyncFunction("hasOverlayPermission") {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(context) else true
    }
    AsyncFunction("requestOverlayPermission") {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            !Settings.canDrawOverlays(context)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${context.packageName}")
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        }
    }
    AsyncFunction("getReactArchitectureInfo") { ReactArchitectureDetector.detect(appContext) }

    // -- Battery optimization (NEW in Milestone 6) --
    AsyncFunction("hasBatteryOptimizationExemption") {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(android.os.PowerManager::class.java)
            pm?.isIgnoringBatteryOptimizations(context.packageName) ?: true
        } else true
    }
    AsyncFunction("requestBatteryOptimizationExemption") {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        // ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS (without the
        // package-specific data URI) is the Play-policy-safe approach —
        // it opens the general battery optimization list rather than
        // triggering a package-specific dialog (ACTION_REQUEST_IGNORE_BATTERY_
        // OPTIMIZATIONS with a package URI), which Play restricts to apps with
        // justified background execution needs and requires Play policy review.
        // Consumers who distribute outside Play may use the more direct intent.
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    // -- Overlay lifecycle (show/hide updated, destroy NEW in Milestone 6) --
    AsyncFunction("show") {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

        PopScreenOverlayService.hostProvider = object : PopScreenHostProvider {
            override fun getOldArchitectureInstanceManager() =
                ReactArchitectureDetector.detect(appContext)
                    .takeIf { it["architecture"] == "OLD_ARCHITECTURE" }
                    ?.let { appContext.currentActivity?.application }
                    ?.let { it as? com.facebook.react.ReactApplication }
                    ?.reactNativeHost?.reactInstanceManager

            override fun getNewArchitectureReactHost(): Any? {
                if (ReactArchitectureDetector.detect(appContext)["architecture"] != "NEW_ARCHITECTURE") return null
                val activity = appContext.currentActivity ?: return null
                return activity.application.javaClass.getMethod("getReactHost")
                    .invoke(activity.application)
            }
        }

        PopScreenOverlayService.dragEventListener = { eventName, payload ->
            sendEvent(eventName, payload)
        }
        // Milestone 6: route lifecycle events through the same module.
        PopScreenOverlayService.lifecycleEventListener = { eventName, payload ->
            sendEvent(eventName, payload)
        }

        val intent = Intent(context, PopScreenOverlayService::class.java)
        context.startForegroundService(intent)
    }

    AsyncFunction("hide") {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        context.stopService(Intent(context, PopScreenOverlayService::class.java))
    }

    // Milestone 6: destroy() — full teardown per main plan §6.
    // Difference from hide(): hide() removes the window but leaves the
    // Service in a state where show() could reattach cheaply. destroy()
    // fully tears down the Service, releases all native refs, and requires
    // a full show() cycle to resume. Use destroy() when the overlay is
    // genuinely no longer needed for the lifetime of this app session
    // (e.g. user explicitly dismisses it, or your app's screen requiring
    // the overlay is permanently left).
    AsyncFunction("destroy") {
        PopScreenOverlayService.activeInstance?.destroyCompletely()
            ?: run {
                // Service not running — nothing to destroy, no-op.
                android.util.Log.d("PopScreen", "destroy() called with no active overlay — no-op")
            }
    }

    // -- Window rect / constraints / handle dims (unchanged from Milestones 4-5) --
    AsyncFunction("setWindowRect") { x: Int?, y: Int?, width: Int?, height: Int? ->
        PopScreenOverlayService.activeInstance?.setWindowRect(x, y, width, height)
    }
    AsyncFunction("setSizeConstraints") { minW: Int?, minH: Int?, maxW: Int?, maxH: Int? ->
        PopScreenOverlayService.activeInstance?.setSizeConstraints(minW, minH, maxW, maxH)
    }
    AsyncFunction("setHandleDimensions") { dragH: Double?, resizeS: Double? ->
        PopScreenOverlayService.activeInstance?.setHandleDimensions(dragH, resizeS)
    }
}
```

---

## Step 3 — Document process-death behavior as a known v1 limitation

Per the main plan §9: "v1 ties overlay lifecycle to host process — accept as a known limitation." Create **`docs/known-limitations.md`** in the library repo:

```markdown
# PopScreen v1 — Known Limitations

## Overlay does not survive host app process death

**What this means:** if Android kills the host app's process (due to
memory pressure, or the user swiping the app from the Recents screen
on aggressive OEMs like Xiaomi/MIUI), the floating overlay also
disappears. The overlay will NOT automatically reappear when the user
relaunches the app.

**Why this is the correct v1 behavior:** implementing true process-death
survival would require running a standalone Hermes JS engine inside a
Service with no host React Native instance — a significantly harder
problem involving bundle distribution, JS engine lifecycle management
inside a Service, and IPC between the standalone Service and the
relaunched Activity. Most real-world chat-bubble and PiP libraries
behave the same way; process-death survival is a v2 consideration.

**What consumers should do:** treat PopScreen overlays as session-scoped.
Call `PopScreen.show()` at the appropriate point in your app's lifecycle
(after the user initiates the relevant feature) and call
`PopScreen.destroy()` when the feature session ends. Do not design UX
that depends on the overlay surviving a process kill.

## OEM background-kill behavior

On aggressive OEMs (Xiaomi/MIUI, Huawei/EMUI, some Samsung OneUI
configurations), the foreground service backing the overlay may be killed
by the OS's battery optimizer even with `FOREGROUND_SERVICE` declared,
unless the user explicitly grants "unrestricted battery usage" or adds
the app to the battery whitelist.

**Required user action on MIUI devices:** Settings → Battery & performance
→ App battery saver → [Your App] → set to "No restrictions".

For a full per-manufacturer guide, see: https://dontkillmyapp.com

## FLAG_NOT_FOCUSABLE and soft keyboard behavior

When the overlay contains a `TextInput`, receiving focus requires the
overlay window's `FLAG_NOT_FOCUSABLE` to be cleared. This is handled
automatically inside the library, but on some OEM skins the soft keyboard
may resize or shift the overlay window in unexpected ways when it appears.
If you observe this, set a fixed window size via `PopScreen.setSizeConstraints`
to prevent the window from being affected by the keyboard's inset changes.
```

---

## Step 4 — Update TypeScript types and public API

Update **`src/PopScreen.types.ts`**, adding the new event types:

```ts
export type WindowState = 'shown' | 'hidden' | 'destroyed';

export type WindowStateChangeEvent = {
  state: WindowState;
  reason?: 'permission_revoked' | 'not_granted' | string;
};

export type PermissionResultEvent = {
  granted: boolean;
  reason?: string;
};
```

Update **`src/PopScreenModule.ts`**:

```ts
import { NativeModule, requireNativeModule } from 'expo-modules-core';
import {
  ReactArchitectureInfo,
  DragUpdateEvent,
  ResizeUpdateEvent,
  WindowStateChangeEvent,
  PermissionResultEvent,
} from './PopScreen.types';

type PopScreenModuleEvents = {
  onDragUpdate: (event: DragUpdateEvent) => void;
  onResizeUpdate: (event: ResizeUpdateEvent) => void;
  onWindowStateChange: (event: WindowStateChangeEvent) => void;
  onPermissionResult: (event: PermissionResultEvent) => void;
};

declare class PopScreenModule extends NativeModule<PopScreenModuleEvents> {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
  hasBatteryOptimizationExemption(): Promise<boolean>;
  requestBatteryOptimizationExemption(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  destroy(): Promise<void>;
  setWindowRect(x?: number, y?: number, width?: number, height?: number): Promise<void>;
  setSizeConstraints(minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<void>;
  setHandleDimensions(dragHandleHeight?: number, resizeHandleSize?: number): Promise<void>;
}

export default requireNativeModule<PopScreenModule>('PopScreen');
```

Update **`src/index.ts`** to export the new functions and listener helpers:

```ts
// Add alongside existing exports:

export async function hasBatteryOptimizationExemption(): Promise<boolean> {
  return PopScreenModule.hasBatteryOptimizationExemption();
}

export async function requestBatteryOptimizationExemption(): Promise<void> {
  return PopScreenModule.requestBatteryOptimizationExemption();
}

export async function destroy(): Promise<void> {
  return PopScreenModule.destroy();
}

export function addWindowStateChangeListener(
  listener: (event: WindowStateChangeEvent) => void
) {
  return PopScreenModule.addListener('onWindowStateChange', listener);
}

export function addPermissionResultListener(
  listener: (event: PermissionResultEvent) => void
) {
  return PopScreenModule.addListener('onPermissionResult', listener);
}
```

---

## Step 5 — Update the example app with lifecycle and battery UX

Update **`example/App.tsx`** to wire up the new events and battery optimization controls:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as PopScreen from 'popscreen';
import { usePopScreen } from 'popscreen';
import CounterMainAppPanel from './demos/CounterMainAppPanel';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [hasBatteryExemption, setHasBatteryExemption] = useState<boolean | null>(null);
  const [windowState, setWindowState] = useState<string>('idle');
  const [permissionEvent, setPermissionEvent] = useState<string>('none');
  const [activeDemo, setActiveDemo] = usePopScreen<'counter' | 'inputSubmit'>('activeDemo', 'counter');

  useEffect(() => {
    PopScreen.hasOverlayPermission().then(setHasPermission);
    PopScreen.hasBatteryOptimizationExemption().then(setHasBatteryExemption);

    const windowSub = PopScreen.addWindowStateChangeListener((e) =>
      setWindowState(`${e.state}${e.reason ? ` (${e.reason})` : ''}`)
    );
    const permSub = PopScreen.addPermissionResultListener((e) => {
      setPermissionEvent(`granted=${e.granted}${e.reason ? ` reason=${e.reason}` : ''}`);
      setHasPermission(e.granted);
    });

    return () => {
      windowSub.remove();
      permSub.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 6 Verification</Text>
      <Text>Overlay permission: {String(hasPermission)}</Text>
      <Text>Battery exemption: {String(hasBatteryExemption)}</Text>
      <Text>Window state: {windowState}</Text>
      <Text>Permission event: {permissionEvent}</Text>

      <View style={styles.row}>
        <Button title="Counter Demo" onPress={() => setActiveDemo('counter')} />
        <Button title="Input Demo" onPress={() => setActiveDemo('inputSubmit')} />
      </View>

      {activeDemo === 'counter' && <CounterMainAppPanel />}

      <Button title="Request Overlay Permission" onPress={() => PopScreen.requestOverlayPermission()} />
      <Button title="Request Battery Exemption" onPress={() => PopScreen.requestBatteryOptimizationExemption()} />
      <Button title="Show Overlay" onPress={() => PopScreen.show()} />
      <Button title="Hide Overlay" onPress={() => PopScreen.hide()} />
      <Button title="Destroy Overlay" onPress={() => PopScreen.destroy()} />
      <Button title="Re-check permission" onPress={() =>
        PopScreen.hasOverlayPermission().then(setHasPermission)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
  title: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
});
```

---

## Step 6 — Build and run

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

Repeat for the old-architecture example app.

---

## Step 7 — Manual test sequence: POCO M3 (primary), then emulator/Samsung

Run all sequences below on the **POCO M3 first**, then repeat the most critical ones (tests 3 and 6) on a stock Android emulator or Pixel device.

**Permission revocation test:**

1. Grant overlay permission. Tap **Show Overlay**. Confirm the overlay appears and `Window state: shown`.
2. With the overlay still visible, go to Android Settings → Apps → [your app] → "Display over other apps" → toggle OFF.
3. Return to the example app. Within 3–4 seconds, confirm `Window state: destroyed (permission_revoked)` and `Permission event: granted=false reason=revoked` appear in the app, and the overlay window disappears without a crash.
4. Toggle the permission back ON. Tap **Show Overlay** again — confirm it reappears normally.

**`destroy()` test:**

5. Show the overlay. Tap **Destroy Overlay**. Confirm `Window state: destroyed`, the overlay disappears, and the foreground notification is cleared.
6. Tap **Show Overlay** again immediately after. Confirm a fresh overlay appears correctly — `destroy()` must not leave any state that prevents a subsequent `show()` from working.

**Battery optimization test (POCO M3):**

7. Tap **Request Battery Exemption**. Confirm this navigates to Android's battery optimization settings list (not a crash, not nothing). Manually add the app to "unrestricted" or "no restriction" status if possible on this device.
8. Confirm `Battery exemption: true` appears after granting exemption.

**OEM background-kill stress test (POCO M3 — the core of this milestone):**

9. Show the overlay. Lock the phone screen (power button). Wait 2 minutes. Unlock. Confirm the overlay is still visible.
10. Show the overlay. Open 5–8 other apps (to apply memory pressure). Then navigate back to the example app. Confirm the overlay is still visible, or if it was killed, confirm it was killed cleanly (no crash/ANR reported, and `show()` can re-launch it).
11. Show the overlay. Navigate to MIUI's "recent apps" screen. Swipe the example app from recents. Confirm the overlay also disappears (not an orphaned floating window that can't be dismissed). This is the "process-death: overlay must die with the host process" test.

**Config change / rotation test:**

12. Show the overlay. Rotate the device (or change font size via accessibility settings to trigger a config change). Confirm the overlay remains visible and correctly positioned after the config change, with no crash from the `onConfigurationChanged` path.

**`onWindowStateChange` event test:**

13. While monitoring `Window state:` in the app: `show()` → confirm `shown`, `hide()` → confirm `hidden`, `destroy()` → confirm `destroyed`. Confirm state transitions arrive in the correct order with no duplicate events.

---

## Step 8 — Pass / fail criteria

This milestone is a **PASS** only if all of the following are true, on **both architecture paths**, with the POCO M3 specifically cleared for tests 2–11:

- [ ] Permission revocation within a running session is detected within 3–4 seconds, triggers graceful teardown of the overlay window, fires `onPermissionResult` with `granted: false`, and fires `onWindowStateChange` with `state: destroyed` — all without a crash.
- [ ] `destroy()` fully tears down the Service and clears the notification, and a subsequent `show()` produces a fresh, correctly functioning overlay with no residual state from the destroyed session.
- [ ] Battery optimization exemption status is correctly reported by `hasBatteryOptimizationExemption()`, and `requestBatteryOptimizationExemption()` navigates to the correct system settings screen on the POCO M3.
- [ ] The overlay survives at least 2 minutes of the phone screen being locked (test 9), confirming the foreground service is not immediately killed on this OEM.
- [ ] Swiping the app from recents (test 11) causes the overlay to also disappear — no orphaned floating window — confirming the `START_NOT_STICKY` + process-death binding is working correctly on MIUI.
- [ ] Device rotation (test 12) does not crash the overlay or produce a blank window with stale layout dimensions.
- [ ] `onWindowStateChange` fires exactly once per state transition in the correct order (`shown` → `hidden` → `destroyed`), with no duplicate or out-of-order events.
- [ ] `docs/known-limitations.md` exists, accurately describes the process-death behavior and MIUI battery-kill issue, and links to `dontkillmyapp.com` for per-manufacturer guidance.

If test 9 or 10 reveals that MIUI immediately kills the foreground service after the screen is locked, **do not artificially work around it in code** (e.g. by adding a wake-lock, which has its own Play policy and battery implications) — document the specific MIUI battery optimization setting that resolves it and add it to `known-limitations.md`, since this is the expected v1 behavior for OEMs with aggressive battery management.

---

## What this milestone deliberately does NOT include (left for Milestone 7)

- Automated Jest unit test coverage for permission, lifecycle, or destroy paths.
- Automated instrumented tests on the Android emulator for the revocation or config-change sequences.
- The full API reference, README, or Play policy guidance document for consumers — those are all Milestone 7 deliverables.
- Snap-to-edge, process-death survival without the host process, or any other explicitly deferred v1.1/v2 feature.

---

*End of Milestone 6 guide. On a clean PASS, proceed to Milestone 7 in the main implementation plan (`docs/implementation-plan.md`), which covers full Jest + instrumented test coverage, the README, API reference, example app polish, and the Play policy guidance document for consumers.*
