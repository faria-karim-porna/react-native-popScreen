package __PACKAGE__

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.FrameLayout
import com.facebook.react.ReactApplication
import com.facebook.react.ReactRootView

/**
 * Foreground service hosting the system-level floating overlay window.
 * Renders the RN surface registered as "PopScreenOverlay" into a
 * TYPE_APPLICATION_OVERLAY window, with a top drag-handle region and a
 * bottom-right resize handle. The overlay lives in the same process as
 * the host app, so it reuses the app's ReactInstanceManager.
 */
class OverlayService : Service() {

  companion object {
    private const val TAG = "PopScreenOverlay"
    private const val NOTIFICATION_ID = 4271
    private const val CHANNEL_ID = "popscreen_overlay"

    const val ACTION_SHOW = "popscreen.SHOW"
    const val ACTION_HIDE = "popscreen.HIDE"
    const val ACTION_DESTROY = "popscreen.DESTROY"

    const val DEFAULT_MIN_SIZE = 150
    const val DEFAULT_DRAG_HANDLE_DP = 32
    const val DEFAULT_RESIZE_HANDLE_DP = 24

    // Config pushed from the JS module (same process).
    private var pendingRect: Rect? = null
    private var minWidth = DEFAULT_MIN_SIZE
    private var minHeight = DEFAULT_MIN_SIZE
    private var maxWidth = 0
    private var maxHeight = 0
    private var dragHandleHeightDp = DEFAULT_DRAG_HANDLE_DP
    private var resizeHandleSizeDp = DEFAULT_RESIZE_HANDLE_DP

    @Volatile
    private var instance: OverlayService? = null

    fun isRunning(): Boolean = instance != null

    /** Called from [PopScreenModule.setWindowRect]. */
    fun updateWindowRect(x: Int?, y: Int?, width: Int?, height: Int?) {
      val current = pendingRect ?: instance?.paramsRect() ?: Rect(24, 24, 324, 424)
      pendingRect = Rect(
        x ?: current.left,
        y ?: current.top,
        (x ?: current.left) + (width ?: current.width()),
        (y ?: current.top) + (height ?: current.height())
      )
      instance?.mainHandler?.post {
        instance?.applyRectToWindow(pendingRect)
      }
    }

    fun setConstraints(minW: Int, minH: Int, maxW: Int, maxH: Int) {
      minWidth = minW
      minHeight = minH
      maxWidth = maxW
      maxHeight = maxH
      instance?.mainHandler?.post { instance?.syncGestureParams() }
    }

    fun setHandleDimensions(dragDp: Int, resizeDp: Int) {
      dragHandleHeightDp = dragDp
      resizeHandleSizeDp = resizeDp
      instance?.mainHandler?.post { instance?.syncGestureParams() }
    }
  }

  private lateinit var windowManager: WindowManager
  private var container: OverlayTouchContainer? = null
  private var rootView: ReactRootView? = null
  private var params: WindowManager.LayoutParams? = null
  private val mainHandler = Handler(Looper.getMainLooper())

  private val density: Float get() = resources.displayMetrics.density
  private fun dp(v: Int): Int = (v * density).toInt()

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    createNotificationChannel()
  }

  override fun onDestroy() {
    instance = null
    removeWindow()
    super.onDestroy()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_HIDE -> hideWindow()
      ACTION_DESTROY -> {
        removeWindow()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
      else -> {
        if (Build.VERSION.SDK_INT < 26 || !Settings.canDrawOverlays(this)) {
          stopSelf()
          return START_NOT_STICKY
        }
        startAsForeground()
        showWindow()
      }
    }
    return START_STICKY
  }

  private fun paramsRect(): Rect? {
    val lp = params ?: return null
    return Rect(lp.x, lp.y, lp.x + lp.width, lp.y + lp.height)
  }

  private fun startAsForeground() {
    val notification = buildNotification()
    try {
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        )
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (t: Throwable) {
      Log.w(TAG, "startForeground failed", t)
    }
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < 26) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "PopScreen overlay",
      NotificationManager.IMPORTANCE_MIN
    )
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.createNotificationChannel(channel)
  }

  @Suppress("DEPRECATION")
  private fun buildNotification(): Notification {
    val builder = if (Build.VERSION.SDK_INT >= 26) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      Notification.Builder(this)
    }
    return builder
      .setContentTitle("PopScreen")
      .setContentText("Floating overlay is active")
      .setSmallIcon(android.R.drawable.ic_menu_view)
      .setOngoing(true)
      .build()
  }

  private fun showWindow() {
    if (container != null) return
    if (Build.VERSION.SDK_INT < 26 || !Settings.canDrawOverlays(this)) return

    val reactApp = application as? ReactApplication ?: return
    val reactInstanceManager = reactApp.reactNativeHost.reactInstanceManager ?: return

    val rect = pendingRect ?: defaultRect()
    val containerView = OverlayTouchContainer(this)
    val rv = ReactRootView(this)

    val lp = WindowManager.LayoutParams(
      rect.width(),
      rect.height(),
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = rect.left
      y = rect.top
      softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
    }

    container = containerView
    rootView = rv
    params = lp
    containerView.addView(
      rv,
      FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.MATCH_PARENT
      )
    )
    containerView.setGestureParams(
      dragHandlePx = dp(dragHandleHeightDp),
      resizeHandlePx = dp(resizeHandleSizeDp),
      minWidthPx = dp(minWidth),
      minHeightPx = dp(minHeight),
      maxWidthPx = if (maxWidth > 0) dp(maxWidth) else 0,
      maxHeightPx = if (maxHeight > 0) dp(maxHeight) else 0
    )
    containerView.onDrag = ::handleDragMove
    containerView.onResize = ::handleResizeMove
    containerView.onGestureEnd = ::emitGestureEnd

    try {
      windowManager.addView(containerView, lp)
      rv.startReactApplication(reactInstanceManager, "PopScreenOverlay", null)
      PopScreenModule.emitWindowState("shown", null)
    } catch (t: Throwable) {
      Log.e(TAG, "showWindow failed", t)
      removeWindow()
      stopSelf()
    }
  }

  private fun defaultRect(): Rect {
    val dm = resources.displayMetrics
    val w = (dm.widthPixels * 0.8f).toInt()
    val h = (dm.heightPixels * 0.45f).toInt()
    val x = (dm.widthPixels - w) / 2
    val y = (dm.heightPixels - h) / 4
    return Rect(x, y, x + w, y + h)
  }

  private fun applyRectToWindow(rect: Rect?) {
    val lp = params ?: return
    val cv = container ?: return
    if (rect == null) return
    lp.x = rect.left
    lp.y = rect.top
    lp.width = rect.width()
    lp.height = rect.height()
    try {
      windowManager.updateViewLayout(cv, lp)
    } catch (t: Throwable) {
      Log.w(TAG, "applyRectToWindow failed", t)
    }
  }

  private fun handleDragMove(dx: Int, dy: Int) {
    val lp = params ?: return
    val out = android.graphics.Point()
    windowManager.defaultDisplay.getRealSize(out)
    lp.x = (lp.x + dx).coerceIn(-lp.width + dp(48), out.x - dp(48))
    lp.y = (lp.y + dy).coerceIn(0, out.y - dp(24))
    try {
      windowManager.updateViewLayout(container, lp)
      PopScreenModule.emitDragUpdate("move", lp.x, lp.y, lp.width, lp.height)
    } catch (t: Throwable) {
      Log.w(TAG, "drag failed", t)
    }
  }

  private fun handleResizeMove(dw: Int, dh: Int) {
    val lp = params ?: return
    val newWidth = (lp.width + dw).coerceAtLeast(dp(minWidth)).let {
      if (maxWidth > 0) it.coerceAtMost(dp(maxWidth)) else it
    }
    val newHeight = (lp.height + dh).coerceAtLeast(dp(minHeight)).let {
      if (maxHeight > 0) it.coerceAtMost(dp(maxHeight)) else it
    }
    lp.width = newWidth
    lp.height = newHeight
    try {
      windowManager.updateViewLayout(container, lp)
      PopScreenModule.emitResizeUpdate("move", lp.x, lp.y, lp.width, lp.height)
    } catch (t: Throwable) {
      Log.w(TAG, "resize failed", t)
    }
  }

  private fun emitGestureEnd() {
    val lp = params ?: return
    PopScreenModule.emitDragUpdate("end", lp.x, lp.y, lp.width, lp.height)
    PopScreenModule.emitResizeUpdate("end", lp.x, lp.y, lp.width, lp.height)
  }

  private fun hideWindow() {
    removeWindow()
    PopScreenModule.emitWindowState("hidden", "hide")
  }

  private fun removeWindow() {
    val cv = container
    val rv = rootView
    if (cv != null) {
      try {
        windowManager.removeView(cv)
      } catch (t: Throwable) {
        // Already removed.
      }
    }
    rv?.unmountReactApplication()
    container = null
    rootView = null
    params = null
  }

  private fun syncGestureParams() {
    val cv = container ?: return
    cv.setGestureParams(
      dragHandlePx = dp(dragHandleHeightDp),
      resizeHandlePx = dp(resizeHandleSizeDp),
      minWidthPx = dp(minWidth),
      minHeightPx = dp(minHeight),
      maxWidthPx = if (maxWidth > 0) dp(maxWidth) else 0,
      maxHeightPx = if (maxHeight > 0) dp(maxHeight) else 0
    )
  }
}

/**
 * Touch interceptor that turns the top drag-handle band into a window-drag
 * gesture and the bottom-right corner into a resize gesture. Touches outside
 * those regions fall through to the React Native content underneath.
 */
class OverlayTouchContainer(context: Context) : FrameLayout(context) {

  private var dragHandlePx = 0
  private var resizeHandlePx = 0
  private var minWidthPx = 0
  private var minHeightPx = 0
  private var maxWidthPx = 0
  private var maxHeightPx = 0

  var onDrag: ((dx: Int, dy: Int) -> Unit)? = null
  var onResize: ((dw: Int, dh: Int) -> Unit)? = null
  var onGestureEnd: (() -> Unit)? = null

  private var mode = 0 // 0 none, 1 drag, 2 resize
  private var lastX = 0f
  private var lastY = 0f
  private var started = false

  fun setGestureParams(
    dragHandlePx: Int,
    resizeHandlePx: Int,
    minWidthPx: Int,
    minHeightPx: Int,
    maxWidthPx: Int,
    maxHeightPx: Int
  ) {
    this.dragHandlePx = dragHandlePx
    this.resizeHandlePx = resizeHandlePx
    this.minWidthPx = minWidthPx
    this.minHeightPx = minHeightPx
    this.maxWidthPx = maxWidthPx
    this.maxHeightPx = maxHeightPx
  }

  // Only the ACTION_DOWN decides interception. Once intercepted, Android
  // routes the rest of the gesture (MOVE/UP) straight to onTouchEvent —
  // onInterceptTouchEvent is NOT called again for the same gesture.
  override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
    if (ev.actionMasked == MotionEvent.ACTION_DOWN) {
      val x = ev.x
      val y = ev.y
      val w = width
      val h = height
      return when {
        dragHandlePx > 0 && y <= dragHandlePx -> {
          mode = 1
          lastX = x
          lastY = y
          started = false
          true
        }
        resizeHandlePx > 0 && x >= w - resizeHandlePx && y >= h - resizeHandlePx -> {
          mode = 2
          lastX = x
          lastY = y
          started = false
          true
        }
        else -> {
          mode = 0
          false
        }
      }
    }
    return false
  }

  override fun onTouchEvent(ev: MotionEvent): Boolean {
    if (mode == 0) return false
    when (ev.actionMasked) {
      MotionEvent.ACTION_MOVE -> {
        val dx = (ev.x - lastX).toInt()
        val dy = (ev.y - lastY).toInt()
        if (!started &&
          (Math.abs(ev.x - lastX) > touchSlop() || Math.abs(ev.y - lastY) > touchSlop())
        ) {
          started = true
        }
        if (started) {
          if (mode == 1) onDrag?.invoke(dx, dy) else onResize?.invoke(dx, dy)
        }
        lastX = ev.x
        lastY = ev.y
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        onGestureEnd?.invoke()
        mode = 0
      }
      else -> Unit
    }
    return true
  }

  private fun touchSlop(): Int = ViewConfiguration.get(context).scaledTouchSlop
}
