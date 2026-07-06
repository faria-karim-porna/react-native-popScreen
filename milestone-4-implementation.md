# PopScreen — Milestone 4: Resize, Minimize, Restore — Full Implementation Guide

**Goal of this document:** a literal, step-by-step build guide for Milestone 4 only, as described in `docs/implementation-plan.md` §20:

> Milestone 4 — Resize, Minimize, Restore
> Window resizing (confirmed in v1 scope), minimize/restore state machine. Snap-to-edge explicitly deferred to v1.1 — not built now, but resize/minimize APIs should be designed so snap-to-edge can be layered on top later without breaking changes.

**What this milestone delivers, concretely:** a resize handle added to the *same* `PopScreenTouchInterceptorView` built in Milestone 3 (not a new, separate interceptor class — continuity matters here, since Milestone 3 already flagged that stateful touch bugs would resurface confusingly once resize handles joined the drag handle), a generic `setWindowRect(x, y, width, height)` native function, and `minimize()`/`restore()` built as **JS-driven calls to that same generic function** rather than as native-side, content-aware logic — exactly matching the main plan's §12 table: "native doesn't know the content changed shape, it just resized the window to match what JS told it via `setWindowRect`."

**What this milestone is NOT:** no snap-to-edge (explicitly deferred to v1.1). The main plan is specific about *why* this matters for this milestone: `setWindowRect`/`minimize`/`restore` must be designed now so that snap-to-edge can be added later purely as new JS logic calling the same `setWindowRect`, without requiring new native functions or breaking changes to the ones built here. Treat this as a hard constraint on your API shape, not a vague aspiration.

**Primary test device:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31). Resize-handle touch targets are small by nature; verify they're comfortably grabbable on this device's actual screen density, not just geometrically present.

---

## Step 0 — Prerequisites

Continue in the same `popscreen` repository, with Milestone 3 passing on both example apps — in particular, confirm content-area touch still works correctly *after* at least one completed drag, since that was Milestone 3's most important regression risk and this milestone adds more touch-handling surface on top of it.

---

## Step 1 — Extend `PopScreenTouchInterceptorView` with resize-handle detection

Update **`android/src/main/java/expo/modules/popscreen/PopScreenTouchInterceptorView.kt`**, adding a second touch domain (resize) alongside the existing drag-handle domain from Milestone 3. The class now distinguishes **three** regions: the drag handle (top strip, unchanged from Milestone 3), a resize handle (bottom-right corner, new), and content (everything else, unchanged):

```kotlin
package expo.modules.popscreen

import android.content.Context
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout

class PopScreenTouchInterceptorView(
    context: Context,
    private val dragHandleHeightPx: Int,
    private val resizeHandleSizePx: Int, // Milestone 4: square hit-target in the bottom-right corner
    private val onDragListener: OnDragListener,
    private val onResizeListener: OnResizeListener
) : FrameLayout(context) {

    interface OnDragListener {
        fun onDragStart()
        fun onDragMove(deltaX: Int, deltaY: Int)
        fun onDragEnd(finalX: Int, finalY: Int)
    }

    interface OnResizeListener {
        fun onResizeStart()
        fun onResizeMove(deltaWidth: Int, deltaHeight: Int)
        fun onResizeEnd(finalDeltaWidth: Int, finalDeltaHeight: Int)
    }

    private enum class ActiveGesture { NONE, DRAG, RESIZE }

    private var downRawX = 0f
    private var downRawY = 0f
    private var activeGesture = ActiveGesture.NONE
    private var pendingGestureCandidate = ActiveGesture.NONE

    init {
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

    private fun isInDragHandle(ev: MotionEvent): Boolean = ev.y <= dragHandleHeightPx

    private fun isInResizeHandle(ev: MotionEvent): Boolean {
        // Bottom-right square region, sized resizeHandleSizePx, measured
        // against this view's current laid-out width/height.
        return ev.x >= (width - resizeHandleSizePx) && ev.y >= (height - resizeHandleSizePx)
    }

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        return when (ev.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downRawX = ev.rawX
                downRawY = ev.rawY
                activeGesture = ActiveGesture.NONE

                pendingGestureCandidate = when {
                    isInResizeHandle(ev) -> ActiveGesture.RESIZE
                    isInDragHandle(ev) -> ActiveGesture.DRAG
                    else -> ActiveGesture.NONE
                }
                // Same reasoning as Milestone 3: defer the actual claim to
                // ACTION_MOVE so a simple tap in either handle region isn't
                // swallowed before a child view could process it.
                false
            }
            MotionEvent.ACTION_MOVE -> {
                if (pendingGestureCandidate != ActiveGesture.NONE && activeGesture == ActiveGesture.NONE) {
                    val dx = Math.abs(ev.rawX - downRawX)
                    val dy = Math.abs(ev.rawY - downRawY)
                    if (dx > 12 || dy > 12) {
                        activeGesture = pendingGestureCandidate
                    }
                }
                activeGesture != ActiveGesture.NONE
            }
            else -> false
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (activeGesture == ActiveGesture.NONE) return false

        return when (event.actionMasked) {
            MotionEvent.ACTION_MOVE -> {
                val deltaX = (event.rawX - downRawX).toInt()
                val deltaY = (event.rawY - downRawY).toInt()
                when (activeGesture) {
                    ActiveGesture.DRAG -> {
                        if (downRawX == event.rawX && downRawY == event.rawY) onDragListener.onDragStart()
                        onDragListener.onDragMove(deltaX, deltaY)
                    }
                    ActiveGesture.RESIZE -> {
                        if (downRawX == event.rawX && downRawY == event.rawY) onResizeListener.onResizeStart()
                        // Resize uses the same raw deltas, but interpreted as
                        // width/height growth rather than position offset —
                        // the geometric meaning differs even though the
                        // underlying touch math (delta since gesture start)
                        // is identical to drag, per the main plan's §12
                        // table: "Same as drag, but adjusting width/height."
                        onResizeListener.onResizeMove(deltaX, deltaY)
                    }
                    ActiveGesture.NONE -> {}
                }
                true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                val deltaX = (event.rawX - downRawX).toInt()
                val deltaY = (event.rawY - downRawY).toInt()
                when (activeGesture) {
                    ActiveGesture.DRAG -> onDragListener.onDragEnd(deltaX, deltaY)
                    ActiveGesture.RESIZE -> onResizeListener.onResizeEnd(deltaX, deltaY)
                    ActiveGesture.NONE -> {}
                }
                activeGesture = ActiveGesture.NONE
                pendingGestureCandidate = ActiveGesture.NONE
                true
            }
            else -> false
        }
    }
}
```

> **Why a single `ActiveGesture` enum rather than two independent boolean flags (`isDragging`/`isResizing`):** an enum makes "exactly one gesture or none, never both simultaneously" structurally impossible to violate, whereas two booleans would require manual discipline to keep mutually exclusive — and Milestone 3 already demonstrated that touch-state bugs in this class are exactly the failure mode to guard against carefully.

---

## Step 2 — Add `setWindowRect`-driven resize handling to `PopScreenOverlayService`

Update **`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`**. This is where the resize delta gets turned into actual `LayoutParams.width`/`height` changes, and where the new generic `setWindowRect` entry point lives — the same function minimize/restore will call from JS:

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

    private var lastEmitTimeMs = 0L
    private val emitIntervalMs = 32L

    // Drag baseline (unchanged from Milestone 3)
    private var dragStartWindowX = 0
    private var dragStartWindowY = 0

    // Milestone 4 addition: resize baseline, same re-baselining principle
    // as drag's dragStartWindowX/Y, applied to width/height instead.
    private var resizeStartWidth = 0
    private var resizeStartHeight = 0

    // Milestone 4: minimum/maximum size constraints. Per main plan §12,
    // "decide min/max size constraints (passed to native as config)" is
    // explicitly RN's responsibility — these defaults are placeholders
    // until Milestone 5 wires them through as real configuration.
    private var minWidthPx = 150
    private var minHeightPx = 150
    private var maxWidthPx = Int.MAX_VALUE
    private var maxHeightPx = Int.MAX_VALUE

    companion object {
        const val CHANNEL_ID = "popscreen_overlay_channel"
        const val NOTIFICATION_ID = 2001
        const val SURFACE_NAME = "PopScreenOverlay"
        const val DRAG_HANDLE_HEIGHT_DP = 32
        const val RESIZE_HANDLE_SIZE_DP = 28 // Milestone 4 default

        var hostProvider: PopScreenHostProvider? = null
        var dragEventListener: ((eventName: String, payload: Map<String, Any?>) -> Unit)? = null

        // Milestone 4: a static command channel, mirroring the existing
        // hostProvider/dragEventListener pattern, lets PopScreenModule's
        // setWindowRect() reach a running Service instance without a
        // bound-Service connection. The Service sets this on creation;
        // PopScreenModule reads it to forward calls.
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
        return START_STICKY
    }

    override fun onDestroy() {
        if (activeInstance == this) activeInstance = null
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
        val resizeHandleSizePx = (RESIZE_HANDLE_SIZE_DP * resources.displayMetrics.density).toInt()

        val interceptor = PopScreenTouchInterceptorView(
            this,
            dragHandleHeightPx,
            resizeHandleSizePx,
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
                override fun onResizeMove(deltaWidth: Int, deltaHeight: Int) {
                    resizeWindowBy(deltaWidth, deltaHeight)
                    maybeEmitThrottled("onResizeUpdate", "move")
                }
                override fun onResizeEnd(finalDeltaWidth: Int, finalDeltaHeight: Int) {
                    resizeWindowBy(finalDeltaWidth, finalDeltaHeight)
                    resizeStartWidth = layoutParams?.width ?: resizeStartWidth
                    resizeStartHeight = layoutParams?.height ?: resizeStartHeight
                    emitNow("onResizeUpdate", "end")
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
        dragStartWindowX = params.x
        dragStartWindowY = params.y
        resizeStartWidth = params.width
        resizeStartHeight = params.height

        windowManager?.addView(interceptor, params)
    }

    private fun moveWindowBy(deltaXSinceDragStart: Int, deltaYSinceDragStart: Int) {
        val params = layoutParams ?: return
        val view = interceptorView ?: return
        params.x = dragStartWindowX + deltaXSinceDragStart
        params.y = dragStartWindowY + deltaYSinceDragStart
        applyLayout(view, params)
    }

    private fun resizeWindowBy(deltaWidthSinceResizeStart: Int, deltaHeightSinceResizeStart: Int) {
        val params = layoutParams ?: return
        val view = interceptorView ?: return
        val rawWidth = resizeStartWidth + deltaWidthSinceResizeStart
        val rawHeight = resizeStartHeight + deltaHeightSinceResizeStart
        params.width = rawWidth.coerceIn(minWidthPx, maxWidthPx)
        params.height = rawHeight.coerceIn(minHeightPx, maxHeightPx)
        applyLayout(view, params)
    }

    /**
     * Milestone 4's core generic primitive: an explicit, JS-callable
     * function that sets the window's full rect directly, independent of
     * any touch gesture. This is the SAME function minimize()/restore()
     * will call from the JS side (Step 4) — native has no separate
     * "minimize" concept; it only knows how to set a rect. This is also
     * the function snap-to-edge (v1.1) will call later, unmodified.
     */
    fun setWindowRect(x: Int?, y: Int?, w: Int?, h: Int?) {
        val params = layoutParams ?: return
        val view = interceptorView ?: return

        x?.let { params.x = it }
        y?.let { params.y = it }
        w?.let { params.width = it.coerceIn(minWidthPx, maxWidthPx) }
        h?.let { params.height = it.coerceIn(minHeightPx, maxHeightPx) }

        applyLayout(view, params)

        // Re-baseline both drag and resize gesture origins, so a touch
        // gesture started immediately after a programmatic setWindowRect
        // call (e.g. right after restore()) behaves correctly rather than
        // jumping back toward stale pre-call values.
        dragStartWindowX = params.x
        dragStartWindowY = params.y
        resizeStartWidth = params.width
        resizeStartHeight = params.height
    }

    fun setSizeConstraints(minW: Int?, minH: Int?, maxW: Int?, maxH: Int?) {
        minW?.let { minWidthPx = it }
        minH?.let { minHeightPx = it }
        maxW?.let { maxWidthPx = it }
        maxH?.let { maxHeightPx = it }
    }

    private fun applyLayout(view: android.view.View, params: WindowManager.LayoutParams) {
        try {
            windowManager?.updateViewLayout(view, params)
        } catch (e: IllegalArgumentException) {
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
        dragEventListener?.invoke(
            eventName,
            mapOf(
                "phase" to phase,
                "x" to (params?.x ?: 0),
                "y" to (params?.y ?: 0),
                "width" to (params?.width ?: 0),
                "height" to (params?.height ?: 0)
            )
        )
    }

    private fun removeOverlay() {
        interceptorView?.let { view ->
            try { windowManager?.removeView(view) } catch (e: IllegalArgumentException) { /* already removed */ }
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
                CHANNEL_ID, "PopScreen Overlay", NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }
}
```

> **Note the unified `onDragUpdate`/`onResizeUpdate` payload now includes `width`/`height` as well as `x`/`y`** — sending the full rect on every event (not just the dimension that changed) keeps the JS-side event shape consistent regardless of which gesture produced it, which simplifies the `usePopScreen()` hook's eventual state-merging logic in Milestone 5.

---

## Step 3 — Expose `setWindowRect`, `minimize`, and `restore` through the Expo Module

Update **`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`**, adding the new functions. Critically, **`minimize()` and `restore()` are implemented in JS (Step 4), not here** — the native side only ever sees `setWindowRect` calls, exactly matching the main plan's requirement that native "doesn't know the content changed shape."

```kotlin
override fun definition() = ModuleDefinition {
    Name("PopScreen")

    Events("onPermissionResult", "onDragUpdate", "onResizeUpdate")

    // ... hasOverlayPermission, requestOverlayPermission, getReactArchitectureInfo, show unchanged from Milestone 2-3 ...
    // (show() also still sets dragEventListener as in Milestone 3)

    AsyncFunction("hide") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val intent = Intent(context, PopScreenOverlayService::class.java)
      context.stopService(intent)
    }

    // ---- New in Milestone 4 ----

    AsyncFunction("setWindowRect") { x: Int?, y: Int?, width: Int?, height: Int? ->
      PopScreenOverlayService.activeInstance?.setWindowRect(x, y, width, height)
          ?: android.util.Log.w("PopScreen", "setWindowRect called with no active overlay")
    }

    AsyncFunction("setSizeConstraints") { minWidth: Int?, minHeight: Int?, maxWidth: Int?, maxHeight: Int? ->
      PopScreenOverlayService.activeInstance?.setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight)
    }
}
```

---

## Step 4 — Build `minimize()`/`restore()` as JS-side logic on top of `setWindowRect`

This is the architecturally important part of this milestone: per the main plan, minimize/restore is **not** a native concept. Create **`src/minimizeRestore.ts`**:

```ts
import PopScreenModule from './PopScreenModule';

// Module-level (not React state) so it survives across re-renders and is
// accessible from anywhere that imports this file — mirroring the "external
// store, not Context" pattern the main plan recommends in §9 for state that
// needs to be read by native-triggered logic, not just React components.
let lastFullRect: { x: number; y: number; width: number; height: number } | null = null;
let isMinimized = false;

const MINIMIZED_SIZE = { width: 64, height: 64 };
const MINIMIZED_MARGIN = 16;

/**
 * Shrinks the overlay window to a small fixed size/position (default:
 * bottom-right corner), remembering the pre-minimize rect so restore()
 * can return to the exact same place. This function is pure JS calling
 * the same generic setWindowRect the drag/resize gestures use — native
 * has no idea "minimize" as a concept exists.
 */
export async function minimize(currentRect?: { x: number; y: number; width: number; height: number }) {
  if (isMinimized) return;
  if (currentRect) {
    lastFullRect = currentRect;
  }
  isMinimized = true;

  // A real implementation would derive screen bounds (e.g. via
  // react-native's Dimensions API) to compute a true bottom-right corner;
  // kept as simple fixed offsets here for Milestone 4's scope. Refining
  // this against actual screen dimensions belongs to Milestone 5's
  // public API polish, alongside making minimized size/position
  // developer-configurable.
  await PopScreenModule.setWindowRect(
    undefined, // x: leaving x/y unset here is a placeholder — real builds
    undefined, // should compute true screen-relative coordinates.
    MINIMIZED_SIZE.width,
    MINIMIZED_SIZE.height
  );
}

/**
 * Grows the window back to the rect it had immediately before minimize()
 * was called — "last full size/position," per the main plan's §12 table,
 * not some other default. If minimize() was never called, this is a
 * no-op, since there is no "last" rect to restore to.
 */
export async function restore() {
  if (!isMinimized || !lastFullRect) return;
  isMinimized = false;

  await PopScreenModule.setWindowRect(
    lastFullRect.x,
    lastFullRect.y,
    lastFullRect.width,
    lastFullRect.height
  );
}

export function getIsMinimized() {
  return isMinimized;
}
```

> **Why `restore()` requires the caller to have previously supplied `currentRect` to `minimize()`:** this is a deliberate seam, not an oversight. As of this milestone, native doesn't proactively report the window's current rect back to JS outside of drag/resize event payloads — so the JS side is responsible for tracking "what was the rect right before I minimized." Milestone 5's `usePopScreen()` hook is the natural place to make this fully automatic (subscribing to `onDragUpdate`/`onResizeUpdate` to always have a fresh rect on hand); for this milestone, the example app will pass the rect explicitly, which is sufficient to validate the underlying native mechanism end-to-end.

Update **`src/index.ts`**:

```ts
import PopScreenModule from './PopScreenModule';
import { DragUpdateEvent, ResizeUpdateEvent } from './PopScreen.types';

// ... existing exports unchanged ...

export async function setWindowRect(
  x?: number,
  y?: number,
  width?: number,
  height?: number
): Promise<void> {
  return PopScreenModule.setWindowRect(x, y, width, height);
}

export async function setSizeConstraints(
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<void> {
  return PopScreenModule.setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight);
}

export function addResizeUpdateListener(listener: (event: ResizeUpdateEvent) => void) {
  return PopScreenModule.addListener('onResizeUpdate', listener);
}

export { minimize, restore, getIsMinimized } from './minimizeRestore';
```

Update **`src/PopScreen.types.ts`**, adding:

```ts
export type ResizeUpdateEvent = {
  phase: 'start' | 'move' | 'end';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};
```

And update `DragUpdateEvent` to include the new fields the native side now always sends:

```ts
export type DragUpdateEvent = {
  phase: 'start' | 'move' | 'end';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};
```

Update **`src/PopScreenModule.ts`**'s declared interface to add the new functions and event:

```ts
import { NativeModule, requireNativeModule } from 'expo-modules-core';
import { ReactArchitectureInfo, DragUpdateEvent, ResizeUpdateEvent } from './PopScreen.types';

type PopScreenModuleEvents = {
  onDragUpdate: (event: DragUpdateEvent) => void;
  onResizeUpdate: (event: ResizeUpdateEvent) => void;
};

declare class PopScreenModule extends NativeModule<PopScreenModuleEvents> {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
  show(): Promise<void>;
  hide(): Promise<void>;
  setWindowRect(x?: number, y?: number, width?: number, height?: number): Promise<void>;
  setSizeConstraints(minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<void>;
}

export default requireNativeModule<PopScreenModule>('PopScreen');
```

---

## Step 5 — Update the example app to exercise resize and minimize/restore

Update **`example/OverlayDemo.tsx`**, adding a visible resize handle (matching the native `RESIZE_HANDLE_SIZE_DP` region) and minimize/restore controls:

```tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PopScreenContent, minimize, restore, getIsMinimized } from 'popscreen';

const FULL_RECT = { x: 80, y: 250, width: 500, height: 350 };

export default function OverlayDemo() {
  const [tapCount, setTapCount] = useState(0);
  const [minimized, setMinimized] = useState(false);

  return (
    <PopScreenContent>
      <View style={styles.container}>
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>≡ drag here</Text>
        </View>

        {!minimized && (
          <View style={styles.content}>
            <Text style={styles.text}>Tap the button below:</Text>
            <Pressable style={styles.button} onPress={() => setTapCount((c) => c + 1)}>
              <Text style={styles.buttonText}>Tapped {tapCount} times</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.minimizeButton]}
              onPress={async () => {
                await minimize(FULL_RECT);
                setMinimized(true);
              }}
            >
              <Text style={styles.buttonText}>Minimize</Text>
            </Pressable>
          </View>
        )}

        {minimized && (
          <Pressable
            style={styles.minimizedIcon}
            onPress={async () => {
              await restore();
              setMinimized(false);
            }}
          >
            <Text style={styles.minimizedIconText}>🎈</Text>
          </Pressable>
        )}

        {/*
          Visual indicator for the resize handle region, matching
          RESIZE_HANDLE_SIZE_DP from the native side closely enough for
          manual testing to feel sensible. This view does not itself
          implement any touch logic — it's purely a visual cue; the
          actual resize gesture is intercepted natively, by coordinates,
          one layer up.
        */}
        {!minimized && (
          <View style={styles.resizeHandle}>
            <Text style={styles.resizeHandleText}>⤡</Text>
          </View>
        )}
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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 10 },
  text: { color: 'white', fontSize: 14 },
  button: { backgroundColor: '#4ade80', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  minimizeButton: { backgroundColor: '#60a5fa' },
  buttonText: { color: '#0a2e1a', fontWeight: '700' },
  minimizedIcon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizedIconText: { fontSize: 28 },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  resizeHandleText: { color: '#888', fontSize: 12 },
});
```

Add a resize-event readout to **`example/App.tsx`**, alongside the existing drag readout from Milestone 3:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as PopScreen from 'popscreen';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [archInfo, setArchInfo] = useState('checking...');
  const [lastDragEvent, setLastDragEvent] = useState('none yet');
  const [lastResizeEvent, setLastResizeEvent] = useState('none yet');

  useEffect(() => {
    PopScreen.hasOverlayPermission().then(setHasPermission);
    PopScreen.getReactArchitectureInfo().then((info) =>
      setArchInfo(`${info.architecture} (isNewArchitecture: ${info.isNewArchitecture})`)
    );
    const dragSub = PopScreen.addDragUpdateListener((e) => setLastDragEvent(JSON.stringify(e)));
    const resizeSub = PopScreen.addResizeUpdateListener((e) => setLastResizeEvent(JSON.stringify(e)));
    return () => {
      dragSub.remove();
      resizeSub.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 4 Verification</Text>
      <Text>Overlay permission: {String(hasPermission)}</Text>
      <Text>Architecture: {archInfo}</Text>
      <Text>Last drag event: {lastDragEvent}</Text>
      <Text>Last resize event: {lastResizeEvent}</Text>
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

1. Show the overlay. Confirm the resize handle (⤡) is visible in the bottom-right corner, distinct from the drag handle strip at top.
2. **Test resize:** press and drag from the resize handle. Confirm the window grows/shrinks smoothly, tracking your finger, while the top drag handle and content stay correctly laid out as the window resizes.
3. **Test min/max constraints:** drag the resize handle to make the window very small. Confirm it stops shrinking at the `minWidthPx`/`minHeightPx` floor (150px default) rather than collapsing to zero or negative size.
4. **Test resize doesn't break drag or content touch:** after resizing, drag the window via the top handle — confirm it still moves correctly. Tap the "Tapped N times" button — confirm it still increments. This is the direct regression check the main plan and Milestone 3 guide both flagged as the highest-risk area once a second gesture type shares the same interceptor.
5. **Test minimize:** tap the **Minimize** button. Confirm the window shrinks to the small fixed minimized size, the full content (drag handle, buttons, resize handle) disappears, and only the 🎈 icon remains, tappable.
6. **Test restore:** tap the 🎈 icon. Confirm the window grows back to the **exact same position and size it had before minimizing** — not a default/centered position, the literal last full rect.
7. **Test minimize → resize attempt:** while minimized, confirm there is no resize handle visible or interactable (since `OverlayDemo` conditionally hides it when `minimized` is true) — the minimized state should not be resizable in this milestone's scope.
8. **Test repeated minimize/restore cycles:** minimize and restore three times in a row. Confirm the window returns to the correct rect every time, including after the window was dragged or resized between minimize/restore cycles.
9. Background the host app while the overlay is minimized. Confirm the minimized state persists correctly (small icon, correct position) while backgrounded.

---

## Step 8 — Pass / fail criteria

This milestone is a **PASS** only if all of the following are true, **on both the New Architecture and old-architecture example apps**:

- [ ] Resize via the bottom-right handle works smoothly in real time, with no visible lag on the POCO M3.
- [ ] Resizing respects the configured minimum size and does not allow the window to collapse below it.
- [ ] After at least one resize, both the drag handle and content-area touches (button taps) continue to work correctly — no regression from Milestone 3's touch handling.
- [ ] `minimize()` and `restore()` are implemented entirely as JS calls to `setWindowRect` — confirm by inspecting that no new native function beyond `setWindowRect`/`setSizeConstraints` was added to support minimize/restore specifically. If you find yourself adding a native `minimize()` Kotlin function, stop — that's a sign the architecture has drifted from the main plan's explicit requirement.
- [ ] `restore()` returns the window to the exact rect it had immediately before the corresponding `minimize()` call, verified across at least three repeated minimize/restore cycles, including cycles where the window was dragged/resized in between.
- [ ] `onResizeUpdate` events arrive with the same `phase: start/move/end` shape as `onDragUpdate`, with correct final `width`/`height` values.
- [ ] No crash or `IllegalArgumentException` occurs across the full test sequence, including resizing all the way down to the minimum size repeatedly (a common place for off-by-one or boundary-condition bugs in `coerceIn`-style clamping logic).

If `minimize`/`restore` end up requiring native-side awareness of "what minimized means" beyond receiving a rect via `setWindowRect`, do not proceed to Milestone 5 until this is corrected — Milestone 5's `usePopScreen()` hook and the Counter/Input-Submit example apps depend on `setWindowRect` being the sole, truly generic primitive that all higher-level window-state concepts (including future snap-to-edge in v1.1) are built from.

---

## What this milestone deliberately does NOT include (left for later milestones)

- Snap-to-edge (explicitly deferred to v1.1) — but verify as a design sanity check that adding it later would only require new JS logic calling `setWindowRect` with computed edge-aligned coordinates, with zero new native functions or changes to the ones built in this milestone.
- Screen-bounds-aware minimize positioning (e.g. a true bottom-right corner computed from `Dimensions.get('window')`) — this milestone's `minimize()` uses simplified placeholder positioning; full polish is part of Milestone 5's public API work.
- Developer-configurable minimized size/position, drag-handle height, and resize-handle size as props flowing from `<PopScreenContent>` — these remain native/JS constants for this milestone; full configurability is Milestone 5's job.
- Animated transitions during minimize/restore (e.g. an easing curve rather than an instant jump) — per the main plan's §12 table, this kind of visual polish is squarely RN's responsibility and can be layered on top of the working `setWindowRect` mechanism without any native changes, but is not required for this milestone's pass criteria.

---

*End of Milestone 4 guide. On a clean PASS on both architecture paths, proceed to Milestone 5 in the main implementation plan (`docs/implementation-plan.md`), which builds the `usePopScreen()` hook, the shared cross-surface state store, and the two canonical example apps (Counter Floating App, Input Submit Floating App) on top of the window-mechanics primitives this milestone completed.*
