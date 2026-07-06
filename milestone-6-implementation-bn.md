# PopScreen — Milestone 6: লাইফসাইকেল হার্ডেনিং — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 6-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ বিল্ড গাইড, যেমনটি `docs/implementation-plan-bn.md` §২০-এ বর্ণিত আছে:

> Milestone 6 — লাইফসাইকেল হার্ডেনিং
> পারমিশন revocation হ্যান্ডলিং, প্রসেস-ডেথ আচরণ, প্রাইমারি স্ট্রেস-টেস্ট ডিভাইস হিসেবে POCO M3 (MIUI 14)-এ OEM ব্যাকগ্রাউন্ড-কিল টেস্টিং, স্টক Android এবং সম্ভব হলে একটি Samsung ডিভাইস দিয়ে সাপ্লিমেন্ট করা, foreground service নোটিফিকেশন UX।

**এই মাইলফলক প্রকৃতপক্ষে যা প্রদান করে:** ছয়টি hardening এলাকা, প্রতিটি কোড এবং একটি ম্যানুয়াল ভেরিফিকেশন স্টেপ সহ:

১. **সেশনের মাঝে পারমিশন revocation** — অ্যাক্টিভ polling + ওভারলে রানিং থাকা অবস্থায় ইউজার ওভারলে পারমিশন revoke করলে `onPermissionResult` ইভেন্ট আসলেই fire হওয়া।
২. **`destroy()` পাবলিক API** — মূল প্ল্যানের §৬ module surface থেকে সম্পূর্ণ teardown ফাংশন, যা Milestone ২–৫-এ defer করা ছিল।
৩. **`onWindowStateChange` ইভেন্ট** — §৬ থেকেও সেই lifecycle-state ইভেন্ট, প্রকৃতপক্ষে wire করা।
৪. **প্রসেস-ডেথ binding** — overlay `Service` lifecycle-কে host process-এর সাথে explicit coupling, v1 known-limitation হিসেবে code comment এবং একটি নতুন `docs/known-limitations.md`-এ স্পষ্টভাবে ডকুমেন্ট করা।
৫. **ব্যাটারি অপ্টিমাইজেশন গাইডেন্স** — `hasBatteryOptimizationExemption()`/`requestBatteryOptimizationExemption()` নেটিভ ফাংশন, Play-policy-safe intent ব্যবহার এবং OEM-নির্দিষ্ট পদক্ষেপের জন্য `dontkillmyapp.com`-এ পয়েন্ট করা ডকুমেন্টেশন।
৬. **Config change হ্যান্ডলিং** — ডিভাইস রোটেশনের পরে DP→PX conversion সঠিক রাখতে `Service`-এ `onConfigurationChanged`।

**এই মাইলফলকটি যা *নয়়*:** automated টেস্ট কভারেজ (Milestone 7)। এই মাইলফলকের "টেস্টিং" মানে POCO M3-এ নির্দিষ্ট, লক্ষ্যভিত্তিক ম্যানুয়াল stress সিকোয়েন্স চালানো এবং v1 শিপ করার আগে ফলাফল ডকুমেন্ট করা — Jest বা instrumented test না, যা পরবর্তীতে আসবে।

**প্রাইমারি টেস্ট ডিভাইস:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31) — এই মাইলফলকের প্রতিটি concern-এর জন্য canonical worst-case OEM। স্টক Android এমুলেটর বা Pixel ডিভাইস এবং উপলভ্য হলে একটি Samsung OneUI ডিভাইস দিয়ে supplement করুন। অন্য যেকোনো ডিভাইস চেক করার আগে প্রথমে POCO M3-এ প্রতিটি ম্যানুয়াল টেস্ট চালান।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

একই `popscreen` রিপোজিটরিতে চালিয়ে যান, Milestone 5 সম্পূর্ণভাবে পাস করা অবস্থায়। Milestone ১–৫-এর প্রতিটি ফিচার শক্তিশালী হতে হবে hardening-এর আগে — show-এ crash করা একটি উইন্ডো permission-revocation handling থেকে উপকৃত হয় না। এই মাইলফলক শুরু করার আগে Counter এবং Input Submit দুটো ডেমোই দুটো আর্কিটেকচার পাথে কাজ করছে তা নিশ্চিত করুন।

---

## Step 1 — পারমিশন revocation ডিটেকশন এবং graceful teardown

মূল প্ল্যানের §১০ lifecycle টেবিল specify করে: "User revokes overlay permission mid-session → Kotlin detects via permission re-check on next `show()`/resume, tears down window gracefully, emits `onPermissionResult: revoked` event."

`onPermissionResult` ইভেন্ট Milestone 1-এর module definition-এ declare করা হয়েছিল কিন্তু কোনো detection কোড দ্বারা আসলে কখনো fire করা হয়নি। এখন তা ঠিক করুন।

### 1a — `PopScreenOverlayService`-এর ভেতরে একটি periodic পারমিশন re-check যুক্ত করুন

**`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`** আপডেট করুন, একটি `Handler`-ভিত্তিক poll যুক্ত করে যা ওভারলে অ্যাক্টিভ থাকা অবস্থায় প্রতি কয়েক সেকেন্ডে `Settings.canDrawOverlays()` চেক করে। এটি `SYSTEM_ALERT_WINDOW` revocation-এর জন্য সবচেয়ে reliable detection প্যাটার্ন, কারণ Android এই নির্দিষ্ট পারমিশন পরিবর্তন হলে কোনো intent broadcast করে না — বেশিরভাগ runtime permission-এর মত না, এটিকে `registerReceiver` বা `PackageManager.addOnPermissionsChangeListener`-এর মাধ্যমে monitor করা যায় না কারণ এটি একটি standard runtime permission নয়:

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

    // Milestone 6: ডিভাইস রোটেশন / কনফিগারেশন পরিবর্তন হ্যান্ডেল করুন।
    // Service-হোস্টেড উইন্ডোগুলো Activity-এর মতো কনফিগ পরিবর্তনে recreate হয় না —
    // Service টিকে থাকে, কিন্তু creation সময়ে computed DP→PX conversion stale হয়ে যায়।
    // কনফিগ পরিবর্তিত হলে interceptor-এর handle dimension পুনরায় apply করুন।
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

        // Milestone 6: JS call site-এ শুধু নয়, show সময়েই পারমিশন চেক করুন,
        // কারণ edge case-এ Service restart হতে পারে যখন JS call এবং
        // Service intent পাওয়ার মাঝে পারমিশন revoke হয়ে যায়।
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

        // ওভারলে দৃশ্যমান হওয়ার পরে পারমিশন poll শুরু করুন।
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

> **কেন broadcast receiver-এর বদলে poll?** `SYSTEM_ALERT_WINDOW` revocation একটি standard `android.intent.action.PACKAGE_REMOVED` বা permissions-change broadcast trigger করে না — ইউজার এটি Settings স্ক্রিনে toggle করে যা কোনো app-receivable intent fire করে না। প্রতি 3 সেকেন্ডে polling হলো প্র্যাকটিক্যাল industry-standard অ্যাপ্রোচ, `react-native-overlay-permission`-এর মতো লাইব্রেরিগুলো এটি কীভাবে handle করে তার সাথে মিলে। 3 সেকেন্ড মানে revocation এবং graceful teardown-এর মধ্যে সর্বোচ্চ 3 সেকেন্ড, যা একটি ফ্লোটিং UI ওভারলের জন্য ঠিক আছে।

---

## Step 2 — `destroy()` এবং `onWindowStateChange` Expo Module-এ wire করুন

**`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`** আপডেট করুন — v1-এর জন্য সম্পূর্ণ, চূড়ান্ত module definition:

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

    // -- Battery optimization (Milestone 6-এ নতুন) --
    AsyncFunction("hasBatteryOptimizationExemption") {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = context.getSystemService(android.os.PowerManager::class.java)
            pm?.isIgnoringBatteryOptimizations(context.packageName) ?: true
        } else true
    }
    AsyncFunction("requestBatteryOptimizationExemption") {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        // ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS (package-specific data
        // URI ছাড়া) হলো Play-policy-safe অ্যাপ্রোচ — এটি সাধারণ battery
        // optimization তালিকা খোলে বরং একটি package-specific dialog trigger
        // করার পরিবর্তে (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS package URI
        // সহ), যা Play justified background execution প্রয়োজনীয়তার অ্যাপে
        // restrict করে। Play-এর বাইরে distribute করা consumers আরও সরাসরি
        // intent ব্যবহার করতে পারে।
        val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    // -- Overlay lifecycle --
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
        // Milestone 6: lifecycle ইভেন্টগুলো একই module-এর মাধ্যমে route করুন।
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

    // Milestone 6: destroy() — মূল প্ল্যান §৬ অনুসারে সম্পূর্ণ teardown।
    // hide() থেকে পার্থক্য: hide() উইন্ডো সরায় কিন্তু Service-কে এমন অবস্থায়
    // রাখে যেখানে show() সস্তায় পুনরায় attach করতে পারে। destroy() Service
    // সম্পূর্ণভাবে tear down করে, সব নেটিভ ref release করে, এবং resume করতে
    // একটি সম্পূর্ণ show() cycle প্রয়োজন। destroy() ব্যবহার করুন যখন ওভারলে
    // এই app session-এর জন্য আর প্রয়োজন নেই।
    AsyncFunction("destroy") {
        PopScreenOverlayService.activeInstance?.destroyCompletely()
            ?: run {
                android.util.Log.d("PopScreen", "destroy() called with no active overlay — no-op")
            }
    }

    // -- Window rect / constraints / handle dims (Milestone 4-5 থেকে অপরিবর্তিত) --
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

## Step 3 — প্রসেস-ডেথ আচরণকে জ্ঞাত v1 সীমাবদ্ধতা হিসেবে ডকুমেন্ট করুন

মূল প্ল্যান §৯ অনুসারে: "v1 overlay lifecycle-কে host process-এর সাথে বাইন্ড করে — জ্ঞাত সীমাবদ্ধতা হিসেবে গ্রহণ করুন।" লাইব্রেরি রিপোতে **`docs/known-limitations.md`** তৈরি করুন:

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

## Step 4 — TypeScript types এবং পাবলিক API আপডেট করুন

**`src/PopScreen.types.ts`** আপডেট করুন, নতুন ইভেন্ট types যুক্ত করে:

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

**`src/PopScreenModule.ts`** আপডেট করুন:

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

**`src/index.ts`** আপডেট করুন নতুন ফাংশন এবং listener helper export করতে:

```ts
// বিদ্যমান exports-এর পাশাপাশি যুক্ত করুন:

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

## Step 5 — lifecycle এবং battery UX দিয়ে example app আপডেট করুন

**`example/App.tsx`** আপডেট করুন নতুন ইভেন্ট এবং battery optimization কন্ট্রোল wire করতে:

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

## Step 6 — বিল্ড এবং রান করুন

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

পুরোনো-আর্কিটেকচার example app-এর জন্যও একই পুনরাবৃত্তি করুন।

---

## Step 7 — ম্যানুয়াল টেস্ট সিকোয়েন্স: POCO M3 (প্রাইমারি), তারপর emulator/Samsung

নিচের সব সিকোয়েন্স **প্রথমে POCO M3-এ** চালান, তারপর সবচেয়ে গুরুত্বপূর্ণগুলো (টেস্ট ৩ এবং ৬) স্টক Android এমুলেটর বা Pixel ডিভাইসে পুনরাবৃত্তি করুন।

**পারমিশন revocation টেস্ট:**

১. ওভারলে পারমিশন গ্র্যান্ট করুন। **Show Overlay**-এ ট্যাপ করুন। নিশ্চিত করুন ওভারলে দেখা যাচ্ছে এবং `Window state: shown`।
২. ওভারলে এখনও দৃশ্যমান থাকা অবস্থায়, Android Settings → Apps → [আপনার অ্যাপ] → "Display over other apps" → toggle OFF যান।
৩. example app-এ ফিরে আসুন। ৩–৪ সেকেন্ডের মধ্যে, নিশ্চিত করুন `Window state: destroyed (permission_revoked)` এবং `Permission event: granted=false reason=revoked` অ্যাপে দেখা যাচ্ছে, এবং ওভারলে উইন্ডোটি কোনো crash ছাড়াই অদৃশ্য হয়ে যাচ্ছে।
৪. পারমিশনটি আবার ON করুন। আবার **Show Overlay**-এ ট্যাপ করুন — নিশ্চিত করুন এটি স্বাভাবিকভাবে পুনরায় আবির্ভূত হয়।

**`destroy()` টেস্ট:**

৫. ওভারলে দেখান। **Destroy Overlay**-এ ট্যাপ করুন। নিশ্চিত করুন `Window state: destroyed`, ওভারলে অদৃশ্য হয়, এবং foreground নোটিফিকেশন cleared হয়।
৬. অবিলম্বে **Show Overlay**-এ আবার ট্যাপ করুন। নিশ্চিত করুন একটি নতুন ওভারলে সঠিকভাবে দেখা যাচ্ছে — `destroy()` অবশ্যই এমন কোনো স্টেট রেখে যাবে না যা পরবর্তী `show()`-কে কাজ করা থেকে বাধা দেয়।

**Battery optimization টেস্ট (POCO M3):**

৭. **Request Battery Exemption**-এ ট্যাপ করুন। নিশ্চিত করুন এটি Android-এর battery optimization settings তালিকায় নেভিগেট করে (crash না, কিছুই না এমন না)। সম্ভব হলে ম্যানুয়ালি অ্যাপটিকে "unrestricted" বা "no restriction" স্ট্যাটাসে যুক্ত করুন।
৮. exemption গ্র্যান্ট করার পরে `Battery exemption: true` দেখা যাচ্ছে তা নিশ্চিত করুন।

**OEM ব্যাকগ্রাউন্ড-কিল stress টেস্ট (POCO M3 — এই মাইলফলকের মূল):**

৯. ওভারলে দেখান। ফোনের স্ক্রিন lock করুন (power বাটন)। ২ মিনিট অপেক্ষা করুন। Unlock করুন। নিশ্চিত করুন ওভারলেটি এখনও দৃশ্যমান।
১০. ওভারলে দেখান। মেমরি চাপ প্রয়োগ করতে ৫–৮টি অন্য অ্যাপ খুলুন। তারপর example app-এ ফিরে যান। নিশ্চিত করুন ওভারলেটি এখনও দৃশ্যমান, বা যদি কিল হয়ে থাকে, নিশ্চিত করুন এটি cleanly কিল হয়েছে (কোনো crash/ANR রিপোর্ট করা হয়নি, এবং `show()` পুনরায় launch করতে পারে)।
১১. ওভারলে দেখান। MIUI-এর "recent apps" স্ক্রিনে যান। Recents থেকে example app swipe করুন। নিশ্চিত করুন ওভারলেটিও অদৃশ্য হয়ে যায় (dismiss করা যাচ্ছে না এমন orphaned ফ্লোটিং উইন্ডো না)। এটিই "process-death: overlay must die with the host process" টেস্ট।

**Config change / rotation টেস্ট:**

১২. ওভারলে দেখান। ডিভাইস rotate করুন (বা config change trigger করতে accessibility settings-এর মাধ্যমে font size পরিবর্তন করুন)। নিশ্চিত করুন config change-এর পরে ওভারলে দৃশ্যমান এবং সঠিকভাবে positioned থাকে, `onConfigurationChanged` পাথ থেকে কোনো crash ছাড়াই।

**`onWindowStateChange` ইভেন্ট টেস্ট:**

১৩. অ্যাপে `Window state:` monitor করতে করতে: `show()` → নিশ্চিত করুন `shown`, `hide()` → নিশ্চিত করুন `hidden`, `destroy()` → নিশ্চিত করুন `destroyed`। নিশ্চিত করুন state transitions সঠিক ক্রমে arrive করে কোনো duplicate ইভেন্ট ছাড়াই।

---

## Step 8 — পাস / ফেইল মানদণ্ড

এই মাইলফলকটি **PASS** হবে শুধুমাত্র যদি নিচের সবগুলো সত্য হয়, **দুটো আর্কিটেকচার পাথে**, POCO M3-এ বিশেষভাবে টেস্ট ২–১১ cleared অবস্থায়:

- [ ] চলমান session-এ পারমিশন revocation ৩–৪ সেকেন্ডের মধ্যে detected হয়, ওভারলে উইন্ডোর graceful teardown trigger করে, `granted: false` সহ `onPermissionResult` fire করে, এবং `state: destroyed` সহ `onWindowStateChange` fire করে — সবই crash ছাড়াই।
- [ ] `destroy()` Service সম্পূর্ণভাবে tear down করে এবং নোটিফিকেশন clear করে, এবং পরবর্তী `show()` কোনো destroyed session থেকে residual স্টেট ছাড়াই একটি নতুন, সঠিকভাবে কার্যকরী ওভারলে produce করে।
- [ ] `hasBatteryOptimizationExemption()` দ্বারা battery optimization exemption status সঠিকভাবে রিপোর্ট হয়, এবং `requestBatteryOptimizationExemption()` POCO M3-এ সঠিক system settings স্ক্রিনে navigate করে।
- [ ] ফোনের স্ক্রিন locked থাকা অবস্থায় ওভারলেটি অন্তত ২ মিনিট টিকে থাকে (টেস্ট ৯), এই OEM-এ foreground service অবিলম্বে কিল না হওয়া নিশ্চিত করে।
- [ ] Recents থেকে অ্যাপ swipe করা (টেস্ট ১১) ওভারলেকেও অদৃশ্য করে — কোনো orphaned ফ্লোটিং উইন্ডো না — নিশ্চিত করে `START_NOT_STICKY` + process-death binding MIUI-তে সঠিকভাবে কাজ করছে।
- [ ] ডিভাইস rotation (টেস্ট ১২) ওভারলে crash করে না বা stale layout dimensions-সহ একটি blank উইন্ডো produce করে না।
- [ ] `onWindowStateChange` প্রতিটি state transition-এ সঠিক ক্রমে (`shown` → `hidden` → `destroyed`) ঠিক একবার fire হয়, কোনো duplicate বা out-of-order ইভেন্ট ছাড়াই।
- [ ] `docs/known-limitations.md` উপস্থিত, process-death আচরণ এবং MIUI battery-kill issue সঠিকভাবে বর্ণনা করে, এবং per-manufacturer guidance-এর জন্য `dontkillmyapp.com`-এ link করে।

যদি টেস্ট ৯ বা ১০ প্রকাশ করে যে MIUI স্ক্রিন lock হওয়ার পরে foreground service অবিলম্বে কিল করে দেয়, **code-এ কৃত্রিমভাবে workaround করবেন না** (যেমন wake-lock যোগ করা, যার নিজস্ব Play policy এবং battery implications আছে) — সেই নির্দিষ্ট MIUI battery optimization সেটিং ডকুমেন্ট করুন যা এটি সমাধান করে এবং `known-limitations.md`-এ যুক্ত করুন, কারণ aggressive battery management সহ OEM-দের জন্য এটিই প্রত্যাশিত v1 আচরণ।

---

## এই মাইলফলক ইচ্ছাকৃতভাবে যা অন্তর্ভুক্ত করে না (Milestone 7-এর জন্য রাখা হয়েছে)

- পারমিশন, lifecycle, বা destroy পাথের জন্য automated Jest unit test কভারেজ।
- revocation বা config-change সিকোয়েন্সের জন্য Android emulator-এ automated instrumented tests।
- consumer-দের জন্য সম্পূর্ণ API reference, README, বা Play policy guidance document — এগুলো সবই Milestone 7-এর deliverables।
- Snap-to-edge, host process ছাড়া process-death survival, বা অন্য যেকোনো স্পষ্টভাবে deferred v1.1/v2 ফিচার।

---

*Milestone 6 গাইডের সমাপ্তি। একটি ক্লিন PASS-এর পর, মূল implementation plan-এ (`docs/implementation-plan-bn.md`) Milestone 7-এ অগ্রসর হন, যা সম্পূর্ণ Jest + instrumented test কভারেজ, README, API reference, example app polish, এবং consumer-দের জন্য Play policy guidance document কভার করে।*
