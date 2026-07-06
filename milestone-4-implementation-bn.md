# PopScreen — Milestone 4: Resize, Minimize, Restore — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 4-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ বিল্ড গাইড, যেমনটি `docs/implementation-plan-bn.md` §২০-এ বর্ণিত আছে:

> Milestone 4 — Resize, Minimize, Restore
> উইন্ডো resizing (v1 স্কোপে নিশ্চিত), minimize/restore স্টেট মেশিন। Snap-to-edge স্পষ্টভাবে v1.1-এ defer করা — এখন বানানো হবে না, কিন্তু resize/minimize API ডিজাইন করতে হবে যাতে পরে breaking changes ছাড়াই snap-to-edge উপরে লেয়ার করা যায়।

**এই মাইলফলক প্রকৃতপক্ষে যা প্রদান করে:** Milestone 3-এ বানানো *একই* `PopScreenTouchInterceptorView`-এ যুক্ত করা একটি resize handle (নতুন, আলাদা একটি ইন্টারসেপ্টর ক্লাস না — এখানে ধারাবাহিকতা গুরুত্বপূর্ণ, কারণ Milestone 3 ইতিমধ্যেই ফ্ল্যাগ করেছিল যে resize handle drag handle-এর সাথে যুক্ত হলে stateful টাচ বাগ বিভ্রান্তিকরভাবে পুনরায় দেখা দেবে), একটি জেনেরিক `setWindowRect(x, y, width, height)` নেটিভ ফাংশন, এবং `minimize()`/`restore()` যা **JS-driven কল হিসেবে সেই একই জেনেরিক ফাংশন কল করে** বানানো হয়েছে, নেটিভ-সাইড, কনটেন্ট-সচেতন লজিক হিসেবে না — ঠিক মূল প্ল্যানের §১২ টেবিল অনুসারে: "নেটিভ জানে না কনটেন্টের আকার পরিবর্তন হয়েছে, এটি শুধু JS-এর `setWindowRect`-এর নির্দেশ অনুসারে উইন্ডো resize করেছে।"

**এই মাইলফলকটি যা *নয়়*:** কোনো snap-to-edge নেই (স্পষ্টভাবে v1.1-এ defer করা)। এই মাইলফলকের জন্য *কেন* এটি গুরুত্বপূর্ণ তা নিয়ে মূল প্ল্যান নির্দিষ্ট: `setWindowRect`/`minimize`/`restore` এখনই এমনভাবে ডিজাইন করতে হবে যাতে snap-to-edge পরে শুধুমাত্র একই `setWindowRect`-কে computed edge-aligned স্থানাঙ্ক দিয়ে কল করা নতুন JS লজিক হিসেবে যুক্ত করা যায়, কোনো নতুন নেটিভ ফাংশন বা এখানে বানানো ফাংশনগুলোতে breaking changes ছাড়াই। এটিকে আপনার API আকৃতির উপর একটি হার্ড কনস্ট্রেইন্ট হিসেবে গণ্য করুন, একটি অস্পষ্ট আকাঙ্ক্ষা না।

**প্রাইমারি টেস্ট ডিভাইস:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31)। Resize-handle টাচ টার্গেট স্বভাবতই ছোট; নিশ্চিত করুন এগুলো এই ডিভাইসের আসল স্ক্রিন density-তে আরামদায়কভাবে ধরা যায়, শুধু জ্যামিতিকভাবে উপস্থিত না।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

একই `popscreen` রিপোজিটরিতে চালিয়ে যান, দুটো example app-এই Milestone 3 পাস করা অবস্থায় — বিশেষ করে, নিশ্চিত করুন অন্তত একটি সম্পন্ন drag-এর *পরেও* কনটেন্ট-এরিয়া টাচ সঠিকভাবে কাজ করে, কারণ এটিই ছিল Milestone 3-এর সবচেয়ে গুরুত্বপূর্ণ রিগ্রেশন ঝুঁকি, এবং এই মাইলফলক এর উপরে আরও টাচ-হ্যান্ডলিং surface যুক্ত করে।

---

## Step 1 — `PopScreenTouchInterceptorView`-কে resize-handle ডিটেকশন দিয়ে প্রসারিত করুন

**`android/src/main/java/expo/modules/popscreen/PopScreenTouchInterceptorView.kt`** আপডেট করুন, Milestone 3-এর বিদ্যমান drag-handle ডোমেইনের পাশাপাশি একটি দ্বিতীয় টাচ ডোমেইন (resize) যুক্ত করে। ক্লাসটি এখন **তিনটি** অঞ্চল আলাদা করে: drag handle (উপরের স্ট্রিপ, Milestone 3 থেকে অপরিবর্তিত), একটি resize handle (নিচের-ডান কোণা, নতুন), এবং কনটেন্ট (বাকি সবকিছু, অপরিবর্তিত):

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

> **কেন দুটি স্বাধীন boolean ফ্ল্যাগ (`isDragging`/`isResizing`)-এর বদলে একটি single `ActiveGesture` enum:** একটি enum কাঠামোগতভাবে "ঠিক একটি gesture বা কোনোটিই না, কখনো দুটো একসাথে না" লঙ্ঘন করা অসম্ভব করে তোলে, যেখানে দুটি boolean পরস্পর-exclusive রাখার জন্য ম্যানুয়াল discipline প্রয়োজন করত — এবং Milestone 3 ইতিমধ্যেই প্রদর্শন করেছে যে এই ক্লাসে টাচ-স্টেট বাগ ঠিক সেই ব্যর্থতার মোড যার বিরুদ্ধে সাবধানে সতর্ক থাকতে হবে।

---

## Step 2 — `PopScreenOverlayService`-এ `setWindowRect`-driven resize হ্যান্ডলিং যুক্ত করুন

**`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`** আপডেট করুন। এখানেই resize ডেল্টা আসল `LayoutParams.width`/`height` পরিবর্তনে রূপান্তরিত হয়, এবং এখানেই নতুন জেনেরিক `setWindowRect` entry point থাকে — JS থেকে minimize/restore যে একই ফাংশন কল করবে:

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

> **খেয়াল করুন unified `onDragUpdate`/`onResizeUpdate` পেলোডে এখন `x`/`y`-এর পাশাপাশি `width`/`height`-ও অন্তর্ভুক্ত** — যে dimension পরিবর্তিত হয়েছে শুধু সেটি না, প্রতিটি ইভেন্টে সম্পূর্ণ rect পাঠানো নিশ্চিত করে JS-সাইড ইভেন্টের আকৃতি সামঞ্জস্যপূর্ণ থাকে, যে gesture-ই এটি উৎপাদন করুক না কেন, যা Milestone 5-এর `usePopScreen()` হুকের চূড়ান্ত state-merging লজিককে সরল করে দেয়।

---

## Step 3 — Expo Module-এর মাধ্যমে `setWindowRect`, `minimize`, এবং `restore` এক্সপোজ করুন

**`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`** আপডেট করুন, নতুন ফাংশন যুক্ত করে। গুরুত্বপূর্ণভাবে, **`minimize()` এবং `restore()` JS-এ ইমপ্লিমেন্ট করা হয় (Step 4), এখানে না** — নেটিভ সাইড শুধুমাত্র `setWindowRect` কল দেখে, মূল প্ল্যানের প্রয়োজনীয়তা অনুসারে যে নেটিভ "কনটেন্টের আকার পরিবর্তন হয়েছে তা জানে না":

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

## Step 4 — `setWindowRect`-এর উপরে JS-সাইড লজিক হিসেবে `minimize()`/`restore()` বানান

এই মাইলফলকের আর্কিটেকচারালি গুরুত্বপূর্ণ অংশ এটিই: মূল প্ল্যান অনুসারে, minimize/restore একটি নেটিভ কনসেপ্ট **না**। **`src/minimizeRestore.ts`** তৈরি করুন:

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

> **কেন `restore()`-এর জন্য প্রয়োজন যে caller আগে `minimize()`-কে `currentRect` সরবরাহ করেছিল:** এটি একটি ইচ্ছাকৃত সীমানা, একটি ভুল না। এই মাইলফলক পর্যন্ত, নেটিভ drag/resize ইভেন্ট পেলোডের বাইরে সক্রিয়ভাবে উইন্ডোর বর্তমান rect JS-এ ফিরিয়ে রিপোর্ট করে না — তাই "minimize করার ঠিক আগে rect কী ছিল" ট্র্যাক করার দায়িত্ব JS সাইডের। Milestone 5-এর `usePopScreen()` হুক এটি সম্পূর্ণভাবে স্বয়ংক্রিয় করার স্বাভাবিক জায়গা (`onDragUpdate`/`onResizeUpdate`-এ সাবস্ক্রাইব করে সবসময় হাতের কাছে একটি সতেজ rect রাখার মাধ্যমে); এই মাইলফলকের জন্য, example app rect-টি স্পষ্টভাবে পাস করবে, যা underlying নেটিভ মেকানিজম এন্ড-টু-এন্ড ভ্যালিডেট করার জন্য যথেষ্ট।

**`src/index.ts`** আপডেট করুন:

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

**`src/PopScreen.types.ts`** আপডেট করুন, যোগ করুন:

```ts
export type ResizeUpdateEvent = {
  phase: 'start' | 'move' | 'end';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};
```

এবং `DragUpdateEvent`-কে নতুন ফিল্ড অন্তর্ভুক্ত করতে আপডেট করুন যা নেটিভ সাইড এখন সবসময় পাঠায়:

```ts
export type DragUpdateEvent = {
  phase: 'start' | 'move' | 'end';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};
```

**`src/PopScreenModule.ts`**-এর declared ইন্টারফেস আপডেট করুন নতুন ফাংশন এবং ইভেন্ট যুক্ত করে:

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

## Step 5 — resize এবং minimize/restore exercise করতে example app আপডেট করুন

**`example/OverlayDemo.tsx`** আপডেট করুন, একটি দৃশ্যমান resize handle যুক্ত করে (নেটিভ `RESIZE_HANDLE_SIZE_DP` অঞ্চলের সাথে মিলিয়ে) এবং minimize/restore কন্ট্রোল:

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

**`example/App.tsx`**-এ Milestone 3-এর বিদ্যমান drag readout-এর পাশাপাশি একটি resize-event readout যুক্ত করুন:

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

## Step 6 — POCO M3-এ বিল্ড এবং রান করুন, দুটো example app-ই

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

পুরোনো-আর্কিটেকচার example app-এর জন্যও একই পুনরাবৃত্তি করুন।

---

## Step 7 — ম্যানুয়াল টেস্ট সিকোয়েন্স (দুটো অ্যাপের জন্যই পুনরাবৃত্তি করুন)

১. ওভারলে দেখান। নিশ্চিত করুন নিচের-ডান কোণায় resize handle (⤡) দৃশ্যমান, উপরের drag handle স্ট্রিপ থেকে আলাদা।
২. **resize টেস্ট করুন:** resize handle থেকে প্রেস করে drag করুন। নিশ্চিত করুন উইন্ডোটি স্মুথভাবে বড়/ছোট হয়, আপনার আঙুল ট্র্যাক করে, যখন উপরের drag handle এবং কনটেন্ট উইন্ডো resize হওয়ার সময় সঠিকভাবে layout হয়ে থাকে।
৩. **min/max constraint টেস্ট করুন:** উইন্ডোটিকে খুব ছোট করতে resize handle drag করুন। নিশ্চিত করুন এটি `minWidthPx`/`minHeightPx` floor-এ (ডিফল্ট 150px) থেমে যায়, শূন্য বা negative সাইজে collapse না হয়ে।
৪. **নিশ্চিত করুন resize drag বা কনটেন্ট টাচ ভাঙে না:** resize করার পর, উপরের handle-এর মাধ্যমে উইন্ডোটি drag করুন — নিশ্চিত করুন এটি এখনও সঠিকভাবে মুভ করে। "Tapped N times" বাটনে ট্যাপ করুন — নিশ্চিত করুন এটি এখনও বাড়ে। এটিই সেই সরাসরি রিগ্রেশন চেক যা মূল প্ল্যান এবং Milestone 3 গাইড দুটোই সর্বোচ্চ-ঝুঁকির এলাকা হিসেবে ফ্ল্যাগ করেছিল, একবার একই ইন্টারসেপ্টর দ্বিতীয় একটি gesture টাইপ শেয়ার করলে।
৫. **minimize টেস্ট করুন:** **Minimize** বাটনে ট্যাপ করুন। নিশ্চিত করুন উইন্ডোটি ছোট ফিক্সড minimized সাইজে সংকুচিত হয়, সম্পূর্ণ কনটেন্ট (drag handle, বাটন, resize handle) অদৃশ্য হয়ে যায়, এবং শুধু 🎈 আইকনটি থাকে, tappable।
৬. **restore টেস্ট করুন:** 🎈 আইকনে ট্যাপ করুন। নিশ্চিত করুন উইন্ডোটি minimize করার **ঠিক আগে যে পজিশন এবং সাইজ ছিল ঠিক সেখানেই** বড় হয়ে ফিরে আসে — কোনো ডিফল্ট/centered পজিশন না, literal শেষ পূর্ণ rect।
৭. **minimize → resize প্রচেষ্টা টেস্ট করুন:** minimized থাকা অবস্থায়, নিশ্চিত করুন কোনো resize handle দৃশ্যমান বা ইন্টারঅ্যাকটেবল না (যেহেতু `OverlayDemo` `minimized` true থাকলে শর্তসাপেক্ষে এটি লুকায়) — এই মাইলফলকের স্কোপে minimized স্টেট resizable হওয়া উচিত না।
৮. **পুনরাবৃত্ত minimize/restore সাইকেল টেস্ট করুন:** তিনবার পরপর minimize এবং restore করুন। নিশ্চিত করুন উইন্ডোটি প্রতিবার সঠিক rect-এ ফিরে আসে, minimize/restore সাইকেলের মাঝে উইন্ডোটি drag বা resize করা হলেও।
৯. ওভারলে minimized থাকা অবস্থায় host অ্যাপ ব্যাকগ্রাউন্ডে নিন। নিশ্চিত করুন minimized স্টেট সঠিকভাবে টিকে থাকে (ছোট আইকন, সঠিক পজিশন) ব্যাকগ্রাউন্ডে থাকা অবস্থায়।

---

## Step 8 — পাস / ফেইল মানদণ্ড

এই মাইলফলকটি **PASS** হবে শুধুমাত্র যদি নিচের সবগুলো সত্য হয়, **New Architecture এবং পুরোনো-আর্কিটেকচার দুটো example app-এই**:

- [ ] নিচের-ডান হ্যান্ডলের মাধ্যমে resize রিয়েল-টাইমে স্মুথভাবে কাজ করে, POCO M3-এ কোনো দৃশ্যমান lag ছাড়াই।
- [ ] Resize কনফিগার করা মিনিমাম সাইজকে সম্মান করে এবং উইন্ডোকে এর নিচে collapse হতে দেয় না।
- [ ] অন্তত একটি resize-এর পরে, drag handle এবং কনটেন্ট-এরিয়া টাচ (বাটন ট্যাপ) দুটোই সঠিকভাবে কাজ করা চালিয়ে যায় — Milestone 3-এর টাচ হ্যান্ডলিং থেকে কোনো রিগ্রেশন না।
- [ ] `minimize()` এবং `restore()` সম্পূর্ণভাবে `setWindowRect`-এ JS কল হিসেবে ইমপ্লিমেন্টেড — নিশ্চিত করুন পরীক্ষা করে যে minimize/restore সাপোর্ট করার জন্য `setWindowRect`/`setSizeConstraints`-এর বাইরে নির্দিষ্টভাবে কোনো নতুন নেটিভ ফাংশন যোগ করা হয়নি। যদি আপনি একটি নেটিভ `minimize()` Kotlin ফাংশন যোগ করছেন দেখতে পান, থামুন — এটি একটি সংকেত যে আর্কিটেকচারটি মূল প্ল্যানের স্পষ্ট প্রয়োজনীয়তা থেকে drift করেছে।
- [ ] সংশ্লিষ্ট `minimize()` কলের ঠিক আগে উইন্ডোর যে rect ছিল `restore()` ঠিক সেখানেই উইন্ডোটি ফিরিয়ে আনে, অন্তত তিনটি পুনরাবৃত্ত minimize/restore সাইকেলে ভেরিফাইড, যার মধ্যে এমন সাইকেলও আছে যেখানে মাঝখানে উইন্ডোটি drag/resize করা হয়েছিল।
- [ ] `onResizeUpdate` ইভেন্ট `onDragUpdate`-এর মতই একই `phase: start/move/end` আকৃতি নিয়ে আসে, সঠিক ফাইনাল `width`/`height` ভ্যালুসহ।
- [ ] পুরো টেস্ট সিকোয়েন্স জুড়ে কোনো crash বা `IllegalArgumentException` ঘটে না, যার মধ্যে বারবার মিনিমাম সাইজ পর্যন্ত পুরোপুরি resize করাও অন্তর্ভুক্ত (`coerceIn`-style clamping লজিকে off-by-one বা boundary-condition বাগের একটি সাধারণ জায়গা)।

যদি `minimize`/`restore`-এর জন্য `setWindowRect`-এর মাধ্যমে একটি rect পাওয়ার বাইরে "minimize মানে কী" সম্পর্কে নেটিভ-সাইড সচেতনতার প্রয়োজন হয়ে দাঁড়ায়, এটি সংশোধন না হওয়া পর্যন্ত Milestone 5-এ অগ্রসর হবেন না — Milestone 5-এর `usePopScreen()` হুক এবং Counter/Input-Submit example app-গুলো নির্ভর করে `setWindowRect` একমাত্র, সত্যিকারের জেনেরিক প্রিমিটিভ হওয়ার উপর, যা থেকে সব higher-level উইন্ডো-স্টেট কনসেপ্ট (v1.1-এর ভবিষ্যৎ snap-to-edge সহ) তৈরি হয়।

---

## এই মাইলফলক ইচ্ছাকৃতভাবে যা অন্তর্ভুক্ত করে না (পরবর্তী মাইলফলকের জন্য রাখা হয়েছে)

- Snap-to-edge (স্পষ্টভাবে v1.1-এ defer করা) — কিন্তু একটি ডিজাইন sanity check হিসেবে যাচাই করুন যে পরে এটি যোগ করার জন্য শুধুমাত্র computed edge-aligned স্থানাঙ্ক দিয়ে `setWindowRect` কল করা নতুন JS লজিকের প্রয়োজন হবে, এই মাইলফলকে বানানো ফাংশনগুলোতে শূন্য নতুন নেটিভ ফাংশন বা পরিবর্তনের প্রয়োজন ছাড়াই।
- Screen-bounds-সচেতন minimize positioning (যেমন `Dimensions.get('window')` থেকে computed একটি আসল নিচের-ডান কোণা) — এই মাইলফলকের `minimize()` সরলীকৃত প্লেসহোল্ডার পজিশনিং ব্যবহার করে; সম্পূর্ণ পলিশ Milestone 5-এর পাবলিক API কাজের অংশ।
- `<PopScreenContent>` থেকে প্রবাহিত props হিসেবে ডেভেলপার-কনফিগারেবল minimized সাইজ/পজিশন, drag-handle উচ্চতা, এবং resize-handle সাইজ — এই মাইলফলকের জন্য এগুলো নেটিভ/JS constant হিসেবেই থাকে; সম্পূর্ণ কনফিগারেবিলিটি Milestone 5-এর কাজ।
- minimize/restore চলাকালীন অ্যানিমেটেড ট্রানজিশন (যেমন একটি instant jump-এর বদলে একটি easing curve) — মূল প্ল্যানের §১২ টেবিল অনুসারে, এই ধরনের ভিজুয়াল পলিশ স্পষ্টভাবে RN-এর দায়িত্ব এবং কার্যকরী `setWindowRect` মেকানিজমের উপরে কোনো নেটিভ পরিবর্তন ছাড়াই লেয়ার করা যায়, কিন্তু এই মাইলফলকের pass criteria-র জন্য প্রয়োজনীয় না।

---

*Milestone 4 গাইডের সমাপ্তি। দুটো আর্কিটেকচার পাথেই একটি ক্লিন PASS-এর পর, মূল implementation plan-এ (`docs/implementation-plan-bn.md`) Milestone 5-এ অগ্রসর হন, যা `usePopScreen()` হুক, শেয়ার্ড cross-surface স্টেট store, এবং দুটো canonical example app (Counter Floating App, Input Submit Floating App) বানাবে এই মাইলফলক সম্পন্ন করা window-mechanics প্রিমিটিভের উপরে।*
