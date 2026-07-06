# PopScreen — Milestone 3: Touch Interaction — Full Implementation Guide

**Goal of this document:** a literal, step-by-step build guide for Milestone 3 only, as described in `docs/implementation-plan.md` §20:

> Milestone 3 — Touch Interaction
> Drag implementation (native window movement + JS event emission), content-area touch passthrough validated with real buttons/gestures inside the bubble.

**What this milestone delivers, concretely:** a native touch interceptor wrapped around whatever `View` Milestone 2's `PopScreenReactSurfaceHost` produced, capable of cleanly separating two touch domains, per the main plan's §11:

1. **Chrome-level touch (native-owned):** touches that land in a designated "drag handle" region move the actual system overlay window in real time via `WindowManager.updateViewLayout()`, with throttled `onDragUpdate` events emitted to JS.
2. **Content-level touch (RN-owned):** touches anywhere else pass through untouched to the RN surface, so real buttons, switches, and gestures inside the bubble's content continue to work exactly as they would on a normal screen.

**What this milestone is NOT:** no resize, no minimize/restore, no snap-to-edge (Milestone 4). The window's *size* remains the fixed constant from Milestone 2 — only its *position* becomes draggable in this milestone. The drag-handle region itself also remains a simple fixed-height strip for now; making it fully developer-configurable end-to-end is touched on here but finalized as part of Milestone 5's public API work.

**Primary test device:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31). Touch latency and frame pacing during drag can vary across devices, so validate that dragging feels smooth (not just "technically moves") on this specific hardware, not only on a more powerful emulator.

**Architectural reminder before starting:** per the main plan's §11, native handling of chrome-level touch is not optional or a convenience — it is the *only* way to move a system-level window. RN's gesture responder system operates entirely within a view's own bounds and has no access to `WindowManager`. This milestone's interceptor is therefore not "an alternative way" to implement drag; it is the only architecturally possible way, given the constraints established in Milestone 0.

---

## Step 0 — Prerequisites

Continue in the same `popscreen` repository, with Milestone 2 passing on both the New Architecture and old-architecture example apps. Confirm you can currently: request overlay permission, show a static overlay window with arbitrary `<PopScreenContent>`, and hide it again cleanly, on both example apps, before starting this milestone.

---

## Step 1 — Build the touch-interceptor container view

This is the central new class for this milestone. Create **`android/src/main/java/expo/modules/popscreen/PopScreenTouchInterceptorView.kt`**:

```kotlin
package expo.modules.popscreen

import android.content.Context
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout

/**
 * Wraps whatever View PopScreenReactSurfaceHost produced (a ReactRootView
 * on the old architecture, or a New Architecture ReactSurface's view —
 * this class is deliberately agnostic to which, consistent with the
 * "generic Kotlin shell" requirement from the main plan).
 *
 * Splits incoming touches into two domains:
 *  - Touches starting inside the top `dragHandleHeightPx` strip are
 *    intercepted here and drive window movement directly.
 *  - All other touches are left alone and fall through to the wrapped
 *    content view untouched, so RN's own gesture responder system
 *    handles them exactly as it would on a normal screen.
 */
class PopScreenTouchInterceptorView(
    context: Context,
    private val dragHandleHeightPx: Int,
    private val onDragListener: OnDragListener
) : FrameLayout(context) {

    interface OnDragListener {
        fun onDragStart()
        fun onDragMove(deltaX: Int, deltaY: Int)
        fun onDragEnd(finalX: Int, finalY: Int)
    }

    private var downRawX = 0f
    private var downRawY = 0f
    private var isDragging = false

    init {
        // This container itself draws nothing — it only exists to host the
        // content view and intercept touches in the drag-handle region.
        setWillNotDraw(true)
    }

    fun attachContentView(contentView: View) {
        removeAllViews()
        addView(
            contentView,
            ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
    }

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        return when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                // Only intercept (and therefore only start a potential drag)
                // if the DOWN event landed within the drag-handle strip,
                // measured in this view's own local coordinate space.
                val withinHandle = ev.y <= dragHandleHeightPx
                if (withinHandle) {
                    downRawX = ev.rawX
                    downRawY = ev.rawY
                    isDragging = false // not yet — only after real movement, see below
                }
                // Returning false here still lets onTouchEvent see ACTION_DOWN
                // later if a child doesn't consume it, but more importantly,
                // returning false means children (RN content) still get this
                // DOWN event normally when outside the handle. We decide
                // whether to truly steal the gesture in ACTION_MOVE below,
                // which is the standard Android pattern for "drag handles
                // co-existing with scrollable/tappable children."
                false
            }
            MotionEvent.ACTION_MOVE -> {
                val withinHandleAtDown = downRawY != 0f &&
                    (downRawY - top) <= dragHandleHeightPx + 24 // small slop buffer
                if (withinHandleAtDown) {
                    val dx = Math.abs(ev.rawX - downRawX)
                    val dy = Math.abs(ev.rawY - downRawY)
                    // Standard touch-slop style threshold: only claim the
                    // gesture once real movement is observed, so a simple
                    // tap on the handle (if it also doubles as, say, a
                    // minimize icon in a later milestone) isn't swallowed.
                    if (dx > 12 || dy > 12) {
                        isDragging = true
                    }
                }
                isDragging
            }
            else -> false
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (!isDragging) return false

        return when (event.actionMasked) {
            MotionEvent.ACTION_MOVE -> {
                val deltaX = (event.rawX - downRawX).toInt()
                val deltaY = (event.rawY - downRawY).toInt()
                if (downRawX == event.rawX && downRawY == event.rawY) {
                    onDragListener.onDragStart()
                }
                onDragListener.onDragMove(deltaX, deltaY)
                true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                val finalDeltaX = (event.rawX - downRawX).toInt()
                val finalDeltaY = (event.rawY - downRawY).toInt()
                onDragListener.onDragEnd(finalDeltaX, finalDeltaY)
                isDragging = false
                true
            }
            else -> false
        }
    }
}
```

> **Why `onInterceptTouchEvent` defers the actual "claim" decision to `ACTION_MOVE` rather than claiming immediately on `ACTION_DOWN` within the handle region:** this is the standard, well-established Android pattern for views that need to both host scrollable/tappable children *and* support a drag gesture starting in a specific region. Claiming too early (on `ACTION_DOWN`) would make any child view inside the handle strip (e.g. a future minimize icon) unable to ever receive a clean tap, since the parent would always steal the gesture before the child sees `ACTION_UP`.

---

## Step 2 — Wire the interceptor into `PopScreenOverlayService`

Update **`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`**, replacing the direct `windowManager?.addView(view, params)` call with the interceptor wrapping pattern, and adding the drag-to-window-movement logic:

```kotlin
package expo.modules.popscreen

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.view.Gravity
import android.view.WindowManager

class PopScreenOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var interceptorView: PopScreenTouchInterceptorView? = null
    private var surfaceHost: PopScreenReactSurfaceHost? = null
    private var layoutParams: WindowManager.LayoutParams? = null

    // Throttling state for onDragUpdate emission (per main plan §13:
    // "throttle drag/resize event emission... only the final position
    // needs to sync back for state purposes").
    private var lastEmitTimeMs = 0L
    private val emitIntervalMs = 32L // roughly 30 events/sec — generous enough
                                      // for JS-side state to feel live without
                                      // flooding the bridge on every pixel.

    companion object {
        const val CHANNEL_ID = "popscreen_overlay_channel"
        const val NOTIFICATION_ID = 2001
        const val SURFACE_NAME = "PopScreenOverlay"
        const val DRAG_HANDLE_HEIGHT_DP = 32 // Milestone 3 default; becomes
                                              // configurable in Milestone 5.

        var hostProvider: PopScreenHostProvider? = null

        // Milestone 3 addition: lets PopScreenModule forward drag events to
        // JS without the Service needing to know anything about Expo
        // Modules' event-emission mechanics directly.
        var dragEventListener: ((eventName: String, payload: Map<String, Any?>) -> Unit)? = null
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannelIfNeeded()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        showOverlay()
        return START_STICKY
    }

    override fun onDestroy() {
        removeOverlay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun showOverlay() {
        if (interceptorView != null) return

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

        val dragHandleHeightPx = (DRAG_HANDLE_HEIGHT_DP * resources.displayMetrics.density).toInt()

        val interceptor = PopScreenTouchInterceptorView(
            this,
            dragHandleHeightPx,
            object : PopScreenTouchInterceptorView.OnDragListener {
                override fun onDragStart() {
                    dragEventListener?.invoke("onDragUpdate", mapOf("phase" to "start"))
                }

                override fun onDragMove(deltaX: Int, deltaY: Int) {
                    moveWindowBy(deltaX, deltaY)
                    maybeEmitDragUpdate(deltaX, deltaY, "move")
                }

                override fun onDragEnd(finalX: Int, finalY: Int) {
                    moveWindowBy(finalX, finalY)
                    commitDragOffset(finalX, finalY)
                    // Final position is always emitted, bypassing the
                    // throttle — per main plan §13, "only the final
                    // position needs to sync back for state purposes,"
                    // and that guarantee must not be dropped by throttling.
                    val params = layoutParams
                    dragEventListener?.invoke(
                        "onDragUpdate",
                        mapOf(
                            "phase" to "end",
                            "x" to (params?.x ?: 0),
                            "y" to (params?.y ?: 0)
                        )
                    )
                }
            }
        )
        interceptor.attachContentView(contentView)
        interceptorView = interceptor

        val params = WindowManager.LayoutParams(
            500,
            350,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 80
            y = 250
        }
        layoutParams = params

        windowManager?.addView(interceptor, params)
    }

    /**
     * Moves the actual system window in real time during an active drag.
     * This is the one piece of logic in this entire milestone that
     * absolutely cannot live in JS — WindowManager.updateViewLayout() is
     * the only API capable of repositioning a TYPE_APPLICATION_OVERLAY
     * window, and RN's gesture system has no access to it.
     *
     * Note this is called with deltas RELATIVE TO THE DRAG START, not
     * relative to the previous call — see commitDragOffset() below for
     * why this distinction matters and how it's reconciled.
     */
    private fun moveWindowBy(deltaXSinceDragStart: Int, deltaYSinceDragStart: Int) {
        val params = layoutParams ?: return
        val view = interceptorView ?: return

        params.x = dragStartWindowX + deltaXSinceDragStart
        params.y = dragStartWindowY + deltaYSinceDragStart

        try {
            windowManager?.updateViewLayout(view, params)
        } catch (e: IllegalArgumentException) {
            // View not currently attached (e.g. a stray late touch event
            // arriving just after hide() removed the view) — safe to ignore.
            android.util.Log.w("PopScreen", "updateViewLayout failed, view likely detached", e)
        }
    }

    private var dragStartWindowX = 0
    private var dragStartWindowY = 0

    private fun commitDragOffset(finalDeltaX: Int, finalDeltaY: Int) {
        // Once a drag ends, the "start position" baseline for the NEXT drag
        // must be the window's current (already-moved) position, not the
        // original Milestone-2 hardcoded constant. layoutParams.x/y already
        // reflect the latest moveWindowBy() call, so just re-baseline here.
        dragStartWindowX = layoutParams?.x ?: dragStartWindowX
        dragStartWindowY = layoutParams?.y ?: dragStartWindowY
    }

    private fun maybeEmitDragUpdate(deltaX: Int, deltaY: Int, phase: String) {
        val now = System.currentTimeMillis()
        if (now - lastEmitTimeMs < emitIntervalMs) return
        lastEmitTimeMs = now
        val params = layoutParams
        dragEventListener?.invoke(
            "onDragUpdate",
            mapOf("phase" to phase, "x" to (params?.x ?: 0), "y" to (params?.y ?: 0))
        )
    }

    private fun removeOverlay() {
        interceptorView?.let { view ->
            try {
                windowManager?.removeView(view)
            } catch (e: IllegalArgumentException) {
                // Already removed — safe to ignore.
            }
        }
        surfaceHost?.destroy()
        surfaceHost = null
        interceptorView = null
        layoutParams = null
    }

    private fun buildNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return builder
            .setContentTitle("PopScreen")
            .setContentText("Floating overlay active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
    }

    private fun createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "PopScreen Overlay",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
```

> **Why deltas are tracked relative to drag-start rather than incrementally per `ACTION_MOVE` event:** computing the absolute offset from the drag's starting point each time (rather than accumulating small per-event deltas) avoids floating-point/integer drift across many rapid `ACTION_MOVE` events, which is a common source of subtle position-creep bugs in drag implementations. `dragStartWindowX`/`dragStartWindowY` re-baseline only once, at the end of each completed drag gesture.

---

## Step 3 — Wire the event emission through the Expo Module

Update **`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`**, adding the `onDragUpdate` event declaration and connecting `PopScreenOverlayService.dragEventListener` to it:

```kotlin
override fun definition() = ModuleDefinition {
    Name("PopScreen")

    Events("onPermissionResult", "onDragUpdate")

    // ... hasOverlayPermission, requestOverlayPermission, getReactArchitectureInfo unchanged from Milestone 2 ...

    AsyncFunction("show") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

      PopScreenOverlayService.hostProvider = object : PopScreenHostProvider {
        // ... unchanged from Milestone 2 ...
      }

      // Milestone 3 addition: route native drag events to this module's
      // JS-facing event emitter. Note this lambda captures `this@PopScreenModule`
      // implicitly via sendEvent — keep this registration inside show(),
      // re-set on every show() call, since the Service may be recreated.
      PopScreenOverlayService.dragEventListener = { eventName, payload ->
        sendEvent(eventName, payload)
      }

      val intent = Intent(context, PopScreenOverlayService::class.java)
      context.startForegroundService(intent)
    }

    AsyncFunction("hide") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val intent = Intent(context, PopScreenOverlayService::class.java)
      context.stopService(intent)
    }
}
```

---

## Step 4 — Update the TypeScript types and public API for the new event

Edit **`src/PopScreen.types.ts`**, adding:

```ts
export type DragUpdatePhase = 'start' | 'move' | 'end';

export type DragUpdateEvent = {
  phase: DragUpdatePhase;
  x?: number;
  y?: number;
};
```

Edit **`src/PopScreenModule.ts`** so the module's event-emitter typing knows about this event (the exact typing approach depends on your Expo Modules version's event-typing conventions — at minimum, document the event name and payload shape clearly):

```ts
import { NativeModule, requireNativeModule } from 'expo-modules-core';
import { ReactArchitectureInfo, DragUpdateEvent } from './PopScreen.types';

type PopScreenModuleEvents = {
  onDragUpdate: (event: DragUpdateEvent) => void;
};

declare class PopScreenModule extends NativeModule<PopScreenModuleEvents> {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
  show(): Promise<void>;
  hide(): Promise<void>;
}

export default requireNativeModule<PopScreenModule>('PopScreen');
```

Edit **`src/index.ts`** to expose a simple subscription helper:

```ts
import PopScreenModule from './PopScreenModule';
import { DragUpdateEvent } from './PopScreen.types';

// ... hasOverlayPermission, requestOverlayPermission, getReactArchitectureInfo, show, hide unchanged ...

export function addDragUpdateListener(
  listener: (event: DragUpdateEvent) => void
) {
  return PopScreenModule.addListener('onDragUpdate', listener);
}

export * from './PopScreen.types';
export { default as PopScreenContent } from './PopScreenContent';
export { registerOverlaySurface } from './registerOverlaySurface';
```

---

## Step 5 — Update the example app's overlay content to prove BOTH touch domains work

This is the part that actually validates the milestone's core claim. Update **`example/OverlayDemo.tsx`** to include both a drag-handle-shaped header strip *and* a real, tappable button beneath it:

```tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PopScreenContent } from 'popscreen';

export default function OverlayDemo() {
  const [tapCount, setTapCount] = useState(0);

  return (
    <PopScreenContent>
      <View style={styles.container}>
        {/*
          This top strip visually represents the drag-handle region.
          Its height here is illustrative only — it does not control the
          native dragHandleHeightPx constant in Milestone 3 (that's still
          a fixed native constant; making this fully developer-driven via
          props is part of Milestone 5). Keep this view's height roughly
          matching DRAG_HANDLE_HEIGHT_DP from the Kotlin side for the
          visual and the actual interactive region to line up sensibly
          during manual testing.
        */}
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>≡ drag here</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.text}>Tap the button below:</Text>
          <Pressable
            style={styles.button}
            onPress={() => setTapCount((c) => c + 1)}
          >
            <Text style={styles.buttonText}>Tapped {tapCount} times</Text>
          </Pressable>
        </View>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 45, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  dragHandle: {
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleText: { color: '#888', fontSize: 11 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: { color: 'white', fontSize: 14, marginBottom: 10 },
  button: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: { color: '#0a2e1a', fontWeight: '700' },
});
```

Add a drag-event readout to **`example/App.tsx`**, so you can see drag telemetry arriving in real time on the host app's own screen while you drag the overlay:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as PopScreen from 'popscreen';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [archInfo, setArchInfo] = useState('checking...');
  const [lastDragEvent, setLastDragEvent] = useState('none yet');

  useEffect(() => {
    PopScreen.hasOverlayPermission().then(setHasPermission);
    PopScreen.getReactArchitectureInfo().then((info) =>
      setArchInfo(`${info.architecture} (isNewArchitecture: ${info.isNewArchitecture})`)
    );
    const subscription = PopScreen.addDragUpdateListener((event) => {
      setLastDragEvent(JSON.stringify(event));
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 3 Verification</Text>
      <Text>Overlay permission: {String(hasPermission)}</Text>
      <Text>Architecture: {archInfo}</Text>
      <Text>Last drag event: {lastDragEvent}</Text>
      <Button title="Request Overlay Permission" onPress={() => PopScreen.requestOverlayPermission()} />
      <Button title="Show Overlay" onPress={() => PopScreen.show()} />
      <Button title="Hide Overlay" onPress={() => PopScreen.hide()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
});
```

---

## Step 6 — Build and run on the POCO M3, both example apps

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

Repeat for the old-architecture example app.

---

## Step 7 — Manual test sequence (repeat for both apps)

1. Grant overlay permission, tap **Show Overlay**. Confirm the overlay appears with the "≡ drag here" strip visible at the top and the tappable button below it.
2. **Test content-area touch passthrough first:** tap the **"Tapped N times"** button several times. Confirm the count increments correctly each time. This proves the interceptor is correctly leaving non-handle touches alone.
3. **Test chrome-level drag:** press and hold on the "≡ drag here" strip, then drag your finger across the screen. Confirm the entire overlay window (strip and button both) moves smoothly, following your finger in real time.
4. While dragging, switch your attention to the host app behind/before the overlay (if visible) or check **after** releasing — confirm "Last drag event" updated with `phase: "move"` events during the drag and a final `phase: "end"` event with the resulting `x`/`y` coordinates after release.
5. **Test the boundary case:** start a touch just barely inside the drag handle strip, but move your finger very little (a few pixels) before releasing — confirm this is treated as a tap-like gesture (no window movement), not a drag, validating the touch-slop threshold from Step 1.
6. **Test that dragging doesn't break content interaction afterward:** after dragging the window to a new position, tap the button again and confirm it still increments correctly — this proves the interceptor's `isDragging` state correctly resets after `ACTION_UP` and doesn't leak into subsequent unrelated touches.
7. Drag the window again, a second and third time, confirming each subsequent drag starts from the window's actual current position (not snapping back to the Milestone 2 original hardcoded position) — this validates the `dragStartWindowX`/`dragStartWindowY` re-baselining logic from Step 2.
8. Background the host app (press Home) while the overlay is in its dragged position. Confirm the overlay remains at the dragged position, not reset to the original position, while backgrounded.

---

## Step 8 — Pass / fail criteria

This milestone is a **PASS** only if all of the following are true, **on both the New Architecture and old-architecture example apps**:

- [ ] Touches on the drag-handle strip move the actual system window smoothly and in real time, with no visible lag or stutter on the POCO M3 specifically.
- [ ] Touches on the button below the drag handle are correctly NOT intercepted, and the button's `onPress` fires reliably on every tap, both before and after the window has been dragged at least once.
- [ ] `onDragUpdate` events arrive in JS with `phase: "move"` during an active drag (throttled, not necessarily one per pixel) and exactly one `phase: "end"` event per completed drag gesture, with correct final `x`/`y` values.
- [ ] A small accidental touch-and-release on the drag handle (below the slop threshold) does not move the window at all.
- [ ] Repeated drags compound correctly — dragging the window three times in a row from different starting points each lands the window at the visually correct final position, with no drift or snapping back to earlier positions.
- [ ] No crash, `IllegalArgumentException` from `updateViewLayout`, or ANR occurs across the full test sequence, including the edge case of a drag gesture still in progress when `hide()` is called (test this explicitly: start a drag, then tap Hide from a second device input method if possible, or accept this as a known edge case to revisit if it's awkward to trigger manually — but do not ship Milestone 3 without at least attempting it once).

If content-area touches stop working correctly after the first successful drag (a common bug class in this kind of interceptor code, caused by `isDragging` or down-coordinate state not being fully reset), do not proceed to Milestone 4 — resizing in the next milestone will compound on top of this same interceptor class, and a stateful touch-handling bug here will become significantly harder to isolate once resize handles are added alongside the drag handle.

---

## What this milestone deliberately does NOT include (left for later milestones)

- Resizing via drag handles on the window's edges/corners (Milestone 4).
- Minimize/restore, and the visual/behavioral transition between them (Milestone 4).
- Snap-to-edge behavior during or after a drag (explicitly deferred to v1.1 per the main plan's locked-in decisions).
- A fully developer-configurable `dragHandleHeight` prop flowing from JS into the native constant used in Step 2 — this milestone uses a fixed native constant (`DRAG_HANDLE_HEIGHT_DP`); wiring this through `<PopScreenContent>`'s props end-to-end is part of Milestone 5's public API finalization.
- Visual feedback during drag (e.g. dimming or scaling the bubble while dragging) — per the main plan's §12 division of responsibility, this is explicitly an RN/JS-side concern the example app's demo content can add later, not something this milestone's native code needs to support beyond emitting the raw `onDragUpdate` events JS would need to drive such feedback.

---

*End of Milestone 3 guide. On a clean PASS on both architecture paths, proceed to Milestone 4 in the main implementation plan (`docs/implementation-plan.md`), which adds resize handles to this same interceptor and builds the minimize/restore state machine on top of the window-movement primitives this milestone established.*
