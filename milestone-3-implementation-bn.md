# PopScreen — Milestone 3: টাচ ইন্টারঅ্যাকশন — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 3-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ বিল্ড গাইড, যেমনটি `docs/implementation-plan-bn.md` §২০-এ বর্ণিত আছে:

> Milestone 3 — টাচ ইন্টারঅ্যাকশন
> Drag ইমপ্লিমেন্টেশন (নেটিভ উইন্ডো মুভমেন্ট + JS ইভেন্ট emission), bubble-এর ভেতরে আসল বাটন/gesture দিয়ে কনটেন্ট-এরিয়া টাচ পাসথ্রু ভ্যালিডেট করা।

**এই মাইলফলক প্রকৃতপক্ষে যা প্রদান করে:** Milestone 2-এর `PopScreenReactSurfaceHost` যে `View` উৎপাদন করেছিল তার চারপাশে wrap করা একটি নেটিভ টাচ ইন্টারসেপ্টর, যা মূল প্ল্যানের §১১ অনুসারে দুটি টাচ ডোমেইন পরিচ্ছন্নভাবে আলাদা করতে সক্ষম:

১. **Chrome-লেভেল টাচ (নেটিভ-মালিকানাধীন):** একটি নির্ধারিত "drag handle" অঞ্চলে যে টাচগুলো পড়ে, সেগুলো `WindowManager.updateViewLayout()`-এর মাধ্যমে রিয়েল-টাইমে আসল সিস্টেম ওভারলে উইন্ডো মুভ করে, JS-এ থ্রটলড `onDragUpdate` ইভেন্ট পাঠানোর সাথে।
২. **কনটেন্ট-লেভেল টাচ (RN-মালিকানাধীন):** অন্য যেকোনো জায়গার টাচ অপরিবর্তিতভাবে RN সারফেসে পাস হয়ে যায়, যাতে bubble-এর কনটেন্টের ভেতরের আসল বাটন, সুইচ, এবং gesture ঠিক স্বাভাবিক স্ক্রিনের মতই কাজ চালিয়ে যায়।

**এই মাইলফলকটি যা *নয়়*:** কোনো resize, কোনো minimize/restore, কোনো snap-to-edge নেই (Milestone 4)। উইন্ডোর *সাইজ* এখনও Milestone 2-এর ফিক্সড constant থেকেই আছে — শুধুমাত্র এর *পজিশন* এই মাইলফলকে draggable হয়ে ওঠে। drag-handle অঞ্চলটিও আপাতত একটি সাধারণ ফিক্সড-হাইট স্ট্রিপ হিসেবেই থাকে; একে সম্পূর্ণভাবে ডেভেলপার-কনফিগারেবল করা এখানে স্পর্শ করা হয়েছে কিন্তু চূড়ান্ত করা হবে Milestone 5-এর পাবলিক API কাজের অংশ হিসেবে।

**প্রাইমারি টেস্ট ডিভাইস:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31)। drag চলাকালীন টাচ লেটেন্সি এবং ফ্রেম পেসিং বিভিন্ন ডিভাইসে ভিন্ন হতে পারে, তাই dragging স্মুথ অনুভূত হয় (শুধু "টেকনিক্যালি মুভ করে" তা না) তা এই নির্দিষ্ট হার্ডওয়্যারে ভ্যালিডেট করুন, শুধু একটি বেশি শক্তিশালী এমুলেটরে না।

**শুরু করার আগে আর্কিটেকচারাল রিমাইন্ডার:** মূল প্ল্যানের §১১ অনুসারে, chrome-লেভেল টাচের নেটিভ হ্যান্ডলিং কোনো অপশনাল বা সুবিধাজনক বিষয় না — এটিই একটি সিস্টেম-লেভেল উইন্ডো মুভ করার *একমাত্র* উপায়। RN-এর gesture responder সিস্টেম সম্পূর্ণভাবে একটি ভিউয়ের নিজস্ব bounds-এর মধ্যে কাজ করে এবং এর কোনো অ্যাক্সেস নেই। তাই এই মাইলফলকের ইন্টারসেপ্টরটি drag ইমপ্লিমেন্ট করার "একটি বিকল্প উপায়" না; Milestone 0-এ প্রতিষ্ঠিত সীমাবদ্ধতা অনুসারে এটিই একমাত্র আর্কিটেকচারালি সম্ভব উপায়।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

একই `popscreen` রিপোজিটরিতে চালিয়ে যান, New Architecture এবং পুরোনো-আর্কিটেকচার দুটো example app-এই Milestone 2 পাস করা অবস্থায়। এই মাইলফলক শুরু করার আগে নিশ্চিত করুন আপনি বর্তমানে দুটো example app-এই: ওভারলে পারমিশন রিকোয়েস্ট করতে পারেন, আর্বিট্রারি `<PopScreenContent>`-সহ একটি স্ট্যাটিক ওভারলে উইন্ডো দেখাতে পারেন, এবং এটি আবার পরিচ্ছন্নভাবে hide করতে পারেন।

---

## Step 1 — টাচ-ইন্টারসেপ্টর কন্টেইনার ভিউ বানান

এই মাইলফলকের কেন্দ্রীয় নতুন ক্লাস এটিই। **`android/src/main/java/expo/modules/popscreen/PopScreenTouchInterceptorView.kt`** তৈরি করুন:

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

> **কেন `onInterceptTouchEvent` আসল "claim" সিদ্ধান্তটি handle অঞ্চলের ভেতরে `ACTION_DOWN`-এ তাৎক্ষণিকভাবে claim না করে `ACTION_MOVE`-এ পিছিয়ে দেয়:** scrollable/tappable child-দের host করার পাশাপাশি একটি নির্দিষ্ট অঞ্চলে শুরু হওয়া drag gesture-ও সাপোর্ট করতে হয় এমন ভিউয়ের জন্য এটিই স্ট্যান্ডার্ড, সুপ্রতিষ্ঠিত Android প্যাটার্ন। খুব তাড়াতাড়ি claim করলে (`ACTION_DOWN`-এ) handle স্ট্রিপের ভেতরের যেকোনো child ভিউ (যেমন ভবিষ্যতের একটি minimize icon) কখনো একটি পরিচ্ছন্ন tap পেতে পারবে না, কারণ child `ACTION_UP` দেখার আগেই parent সবসময় gesture-টি চুরি করে নেবে।

---

## Step 2 — `PopScreenOverlayService`-এ ইন্টারসেপ্টরটি wire করুন

**`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`** আপডেট করুন, সরাসরি `windowManager?.addView(view, params)` কলটি ইন্টারসেপ্টর wrapping প্যাটার্ন দিয়ে রিপ্লেস করে, এবং drag-to-window-movement লজিক যুক্ত করে:

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

> **কেন প্রতিটি `ACTION_MOVE` ইভেন্টে incrementally না করে drag-শুরুর সাপেক্ষে ডেল্টা ট্র্যাক করা হয়:** প্রতিবার drag-এর শুরুর পয়েন্ট থেকে absolute অফসেট হিসাব করা (ছোট ছোট per-event ডেল্টা accumulate করার বদলে) অনেক দ্রুত `ACTION_MOVE` ইভেন্ট জুড়ে floating-point/integer drift এড়িয়ে যায়, যা drag ইমপ্লিমেন্টেশনে সূক্ষ্ম position-creep বাগের একটি সাধারণ উৎস। `dragStartWindowX`/`dragStartWindowY` শুধুমাত্র একবার re-baseline হয়, প্রতিটি সম্পন্ন drag gesture-এর শেষে।

---

## Step 3 — Expo Module-এর মাধ্যমে ইভেন্ট emission wire করুন

**`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`** আপডেট করুন, `onDragUpdate` ইভেন্ট declaration যুক্ত করে এবং `PopScreenOverlayService.dragEventListener`-কে এর সাথে কানেক্ট করে:

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

## Step 4 — নতুন ইভেন্টের জন্য TypeScript types এবং পাবলিক API আপডেট করুন

**`src/PopScreen.types.ts`** এডিট করুন, যোগ করুন:

```ts
export type DragUpdatePhase = 'start' | 'move' | 'end';

export type DragUpdateEvent = {
  phase: DragUpdatePhase;
  x?: number;
  y?: number;
};
```

**`src/PopScreenModule.ts`** এডিট করুন যাতে মডিউলের event-emitter typing এই ইভেন্ট সম্পর্কে জানে (সঠিক typing অ্যাপ্রোচ আপনার Expo Modules ভার্সনের event-typing কনভেনশনের উপর নির্ভর করে — সর্বনিম্নে, ইভেন্টের নাম এবং পেলোড আকৃতি স্পষ্টভাবে ডকুমেন্ট করুন):

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

**`src/index.ts`** এডিট করুন একটি সাধারণ subscription হেল্পার এক্সপোজ করতে:

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

## Step 5 — দুটো টাচ ডোমেইনই কাজ করে তা প্রমাণ করতে example app-এর ওভারলে কনটেন্ট আপডেট করুন

এই অংশটিই মাইলফলকের মূল দাবি প্রকৃতপক্ষে ভ্যালিডেট করে। **`example/OverlayDemo.tsx`** আপডেট করুন একটি drag-handle-আকৃতির হেডার স্ট্রিপ *এবং* এর নিচে একটি আসল, tappable বাটন অন্তর্ভুক্ত করতে:

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

**`example/App.tsx`**-এ একটি drag-event readout যুক্ত করুন, যাতে আপনি drag চলাকালীন রিয়েল-টাইমে host অ্যাপের নিজস্ব স্ক্রিনেই drag টেলিমেট্রি আসতে দেখতে পারেন:

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

## Step 6 — POCO M3-এ বিল্ড এবং রান করুন, দুটো example app-ই

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

পুরোনো-আর্কিটেকচার example app-এর জন্যও একই পুনরাবৃত্তি করুন।

---

## Step 7 — ম্যানুয়াল টেস্ট সিকোয়েন্স (দুটো অ্যাপের জন্যই পুনরাবৃত্তি করুন)

১. ওভারলে পারমিশন গ্র্যান্ট করুন, **Show Overlay**-এ ট্যাপ করুন। নিশ্চিত করুন ওভারলেটি উপরে "≡ drag here" স্ট্রিপ এবং নিচে tappable বাটন সহ দেখা যাচ্ছে।
২. **প্রথমে কনটেন্ট-এরিয়া টাচ পাসথ্রু টেস্ট করুন:** **"Tapped N times"** বাটনে কয়েকবার ট্যাপ করুন। নিশ্চিত করুন প্রতিবার কাউন্ট সঠিকভাবে বাড়ে। এটি প্রমাণ করে যে ইন্টারসেপ্টরটি non-handle টাচ সঠিকভাবে অপরিবর্তিত রেখে দিচ্ছে।
৩. **chrome-লেভেল drag টেস্ট করুন:** "≡ drag here" স্ট্রিপে প্রেস করে ধরে রাখুন, তারপর আপনার আঙুল স্ক্রিনের আড়াআড়ি drag করুন। নিশ্চিত করুন সম্পূর্ণ ওভারলে উইন্ডো (স্ট্রিপ এবং বাটন দুটোই) স্মুথভাবে মুভ করে, রিয়েল-টাইমে আপনার আঙুল ফলো করে।
৪. drag করার সময়, ওভারলের পেছনে/সামনে host অ্যাপের দিকে আপনার মনোযোগ সুইচ করুন (যদি দৃশ্যমান হয়) অথবা **পরে** চেক করুন — নিশ্চিত করুন drag চলাকালীন "Last drag event" `phase: "move"` ইভেন্টে আপডেট হয়েছে এবং রিলিজের পর resulting `x`/`y` স্থানাঙ্কসহ একটি ফাইনাল `phase: "end"` ইভেন্ট।
৫. **boundary case টেস্ট করুন:** drag handle স্ট্রিপের একদম ভেতরে একটি টাচ শুরু করুন, কিন্তু রিলিজ করার আগে আপনার আঙুল খুব সামান্য (কয়েক পিক্সেল) সরান — নিশ্চিত করুন এটি একটি tap-জাতীয় gesture হিসেবে গণ্য হচ্ছে (কোনো উইন্ডো মুভমেন্ট না), drag হিসেবে না, যা Step 1-এর touch-slop থ্রেশহোল্ড ভ্যালিডেট করে।
৬. **নিশ্চিত করুন dragging পরে কনটেন্ট ইন্টারঅ্যাকশন ভাঙে না:** উইন্ডোটিকে একটি নতুন পজিশনে drag করার পর, বাটনে আবার ট্যাপ করুন এবং নিশ্চিত করুন এটি এখনও সঠিকভাবে বাড়ছে — এটি প্রমাণ করে যে ইন্টারসেপ্টরের `isDragging` স্টেট `ACTION_UP`-এর পরে সঠিকভাবে রিসেট হয় এবং পরবর্তী অসম্পর্কিত টাচগুলোতে leak করে না।
৭. উইন্ডোটি আবার drag করুন, দ্বিতীয় এবং তৃতীয়বার, নিশ্চিত করুন প্রতিটি পরবর্তী drag উইন্ডোর আসল বর্তমান পজিশন থেকে শুরু হয় (Milestone 2-এর আসল hardcoded পজিশনে snap back না করে) — এটি Step 2-এর `dragStartWindowX`/`dragStartWindowY` re-baselining লজিক ভ্যালিডেট করে।
৮. ওভারলেটি drag করা পজিশনে থাকা অবস্থায় host অ্যাপ ব্যাকগ্রাউন্ডে নিন (Home প্রেস করুন)। নিশ্চিত করুন ব্যাকগ্রাউন্ডে থাকা অবস্থায় ওভারলেটি drag করা পজিশনেই থাকে, আসল পজিশনে রিসেট হয়ে যায় না।

---

## Step 8 — পাস / ফেইল মানদণ্ড

এই মাইলফলকটি **PASS** হবে শুধুমাত্র যদি নিচের সবগুলো সত্য হয়, **New Architecture এবং পুরোনো-আর্কিটেকচার দুটো example app-এই**:

- [ ] drag-handle স্ট্রিপের টাচ আসল সিস্টেম উইন্ডোকে স্মুথভাবে এবং রিয়েল-টাইমে মুভ করে, বিশেষভাবে POCO M3-এ কোনো দৃশ্যমান lag বা stutter ছাড়াই।
- [ ] drag handle-এর নিচের বাটনের টাচ সঠিকভাবে ইন্টারসেপ্ট হয় না, এবং উইন্ডো অন্তত একবার drag হওয়ার আগে এবং পরে—দুটোতেই বাটনের `onPress` প্রতিটি ট্যাপে নির্ভরযোগ্যভাবে ফায়ার করে।
- [ ] অ্যাক্টিভ drag চলাকালীন JS-এ `phase: "move"` সহ `onDragUpdate` ইভেন্ট আসে (থ্রটলড, অগত্যা প্রতি পিক্সেলে একটি না) এবং প্রতিটি সম্পন্ন drag gesture-এর জন্য ঠিক একটি `phase: "end"` ইভেন্ট, সঠিক ফাইনাল `x`/`y` ভ্যালুসহ।
- [ ] drag handle-এ একটি ছোট দুর্ঘটনাজনিত টাচ-এন্ড-রিলিজ (slop থ্রেশহোল্ডের নিচে) উইন্ডোকে একদমই মুভ করে না।
- [ ] পুনরাবৃত্ত drag সঠিকভাবে compound হয় — ভিন্ন ভিন্ন শুরুর পয়েন্ট থেকে উইন্ডোটিকে পরপর তিনবার drag করলে প্রতিবারই উইন্ডোটি দৃশ্যমানভাবে সঠিক ফাইনাল পজিশনে থামে, কোনো drift বা আগের পজিশনে snap back না করে।
- [ ] পুরো টেস্ট সিকোয়েন্স জুড়ে কোনো crash, `updateViewLayout` থেকে `IllegalArgumentException`, বা ANR ঘটে না, এর মধ্যে `hide()` কল হওয়ার সময় একটি drag gesture এখনও চলমান থাকার edge case-ও অন্তর্ভুক্ত (এটি স্পষ্টভাবে টেস্ট করুন: একটি drag শুরু করুন, তারপর সম্ভব হলে দ্বিতীয় একটি ডিভাইস ইনপুট পদ্ধতি থেকে Hide-এ ট্যাপ করুন, অথবা যদি ম্যানুয়ালি ট্রিগার করা অস্বস্তিকর হয় তবে এটিকে পুনরায় দেখার জন্য একটি জ্ঞাত edge case হিসেবে গ্রহণ করুন — কিন্তু অন্তত একবার এটি চেষ্টা না করে Milestone 3 শিপ করবেন না)।

প্রথম সফল drag-এর পরে কনটেন্ট-এরিয়া টাচ কাজ করা বন্ধ করে দিলে (এই ধরনের ইন্টারসেপ্টর কোডে একটি সাধারণ বাগ শ্রেণি, `isDragging` বা down-coordinate স্টেট সম্পূর্ণভাবে রিসেট না হওয়ার কারণে ঘটে), Milestone 4-এ অগ্রসর হবেন না — পরবর্তী মাইলফলকে resizing এই একই ইন্টারসেপ্টর ক্লাসের উপরেই compound হবে, এবং এখানে একটি stateful টাচ-হ্যান্ডলিং বাগ resize handle drag handle-এর পাশাপাশি যুক্ত হলে আইসোলেট করা যথেষ্ট কঠিন হয়ে যাবে।

---

## এই মাইলফলক ইচ্ছাকৃতভাবে যা অন্তর্ভুক্ত করে না (পরবর্তী মাইলফলকের জন্য রাখা হয়েছে)

- উইন্ডোর প্রান্ত/কোণায় drag handle-এর মাধ্যমে Resizing (Milestone 4)।
- Minimize/restore, এবং এর মধ্যকার ভিজুয়াল/আচরণগত ট্রানজিশন (Milestone 4)।
- drag চলাকালীন বা পরে snap-to-edge আচরণ (মূল প্ল্যানের নির্ধারিত সিদ্ধান্ত অনুসারে স্পষ্টভাবে v1.1-এ defer করা)।
- Step 2-এ ব্যবহৃত নেটিভ constant-এ JS থেকে প্রবাহিত একটি সম্পূর্ণভাবে ডেভেলপার-কনফিগারেবল `dragHandleHeight` prop — এই মাইলফলক একটি ফিক্সড নেটিভ constant (`DRAG_HANDLE_HEIGHT_DP`) ব্যবহার করে; `<PopScreenContent>`-এর props-এর মাধ্যমে এটি এন্ড-টু-এন্ড wire করা Milestone 5-এর পাবলিক API চূড়ান্তকরণের অংশ।
- drag চলাকালীন ভিজুয়াল ফিডব্যাক (যেমন drag করার সময় bubble-কে dim বা scale করা) — মূল প্ল্যানের §১২-এর দায়িত্ব বিভাজন অনুসারে, এটি স্পষ্টভাবে একটি RN/JS-সাইড বিষয়, যা example app-এর demo কনটেন্ট পরে যুক্ত করতে পারে, এই মাইলফলকের নেটিভ কোডের raw `onDragUpdate` ইভেন্ট emit করার বাইরে এমন ফিডব্যাক সাপোর্ট করার প্রয়োজন নেই, যা JS-এর এমন ফিডব্যাক চালাতে প্রয়োজন হবে।

---

*Milestone 3 গাইডের সমাপ্তি। দুটো আর্কিটেকচার পাথেই একটি ক্লিন PASS-এর পর, মূল implementation plan-এ (`docs/implementation-plan-bn.md`) Milestone 4-এ অগ্রসর হন, যা এই একই ইন্টারসেপ্টরে resize handle যুক্ত করবে এবং এই মাইলফলক প্রতিষ্ঠিত window-movement প্রিমিটিভের উপরে minimize/restore স্টেট মেশিন বানাবে।*
