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
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
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

    // Each overlay session gets a fresh chance at the preferred non-focusable
    // keyboard path — a fallback in a previous session (or a transient blip)
    // must not permanently lock this device into the focusable mode.
    deviceNeedsFocusableInput = false

    val reactApp = application as? ReactApplication ?: return
    val reactInstanceManager = reactApp.reactNativeHost.reactInstanceManager ?: return

    val rect = pendingRect ?: defaultRect()
    val containerView = OverlayTouchContainer(this)
    val rv = ReactRootView(this)

    // FLAG_NOT_TOUCH_MODAL is a no-op while the window is non-focusable
    // (touches outside the panel already fall through), but it is what keeps
    // the app behind touchable in the rare focusable input-fallback mode:
    // without it, a focusable window consumes EVERY pointer event on screen
    // and the app behind becomes unresponsive while the keyboard is up.
    val lp = WindowManager.LayoutParams(
      rect.width(),
      rect.height(),
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
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
    containerView.onContentTouch = ::handleContentTouch
    containerView.onWindowFocusLost = ::handleWindowFocusLost

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

  // The overlay window stays FLAG_NOT_FOCUSABLE at all times so it never
  // steals focus from the app behind, and touches outside the panel fall
  // through to that app. A non-focusable window never AUTO-opens the soft
  // keyboard, so when the user taps a text field we request focus and force
  // the IME open explicitly — WITHOUT ever making the window focusable.
  //
  // A few OEMs/IMEs refuse to show the keyboard for a non-focusable window.
  // If the keyboard never appears we fall back to the focusable input mode.
  // The window keeps FLAG_NOT_TOUCH_MODAL, so even while focusable it never
  // consumes touches outside the panel — the app behind stays fully
  // interactive while the keyboard is up (and tapping it takes window focus,
  // which dismisses the keyboard and restores the non-focusable flags).
  private fun handleContentTouch(x: Float, y: Float) {
    // Only touch a text field when the tap actually lands on one. Tapping
    // anywhere else keeps the window non-focusable, so the app behind the
    // overlay keeps receiving touch events.
    val target = findEditTextViewAt(x, y) ?: return
    // Ask the IME to stay compact (bottom-anchored) rather than claiming the
    // whole screen — in fullscreen mode some IMEs cover the entire display
    // and eat touches meant for the app behind the overlay.
    target.imeOptions = target.imeOptions or EditorInfo.IME_FLAG_NO_FULLSCREEN
    if (deviceNeedsFocusableInput) {
      enterInputMode(target)
      return
    }
    startNonFocusableInput(target)
  }

  private var nonFocusableAttemptActive = false
  private var deviceNeedsFocusableInput = false
  private var inputAttemptEpoch = 0

  /**
   * Opens the soft keyboard while the window stays FLAG_NOT_FOCUSABLE.
   *
   * The tap is still being dispatched when [handleContentTouch] runs, so we
   * wait a moment for the view hierarchy / RN focus handling to settle
   * before requesting focus, then force the IME open. The window is never
   * made focusable in this path, so the app behind the overlay stays
   * touchable even while the keyboard is up.
   */
  private fun startNonFocusableInput(target: View) {
    if (nonFocusableAttemptActive) return
    nonFocusableAttemptActive = true
    val epoch = ++inputAttemptEpoch
    mainHandler.postDelayed({
      nonFocusableAttemptActive = false
      if (container == null || !target.isShown) return@postDelayed
      target.requestFocus()
      val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
      val accepted = imm?.showSoftInput(target, InputMethodManager.SHOW_FORCED) == true
      // If the IME outright rejected the request, don't wait long — fall
      // back to the focusable path almost immediately.
      watchNonFocusableActivation(target, imm, 0, accepted, epoch)
    }, 60)
  }

  /**
   * Polls whether the IME actually connected. If it never does, this device
   * refuses to show the keyboard for a non-focusable window — fall back to
   * the focusable input mode (which is proven to work on this device, at the
   * cost of blocking touches to the app behind while the keyboard is open).
   *
   * Note: a keyboard that shows and is dismissed within a single poll
   * interval (~100ms) is indistinguishable from "never showed" here — the
   * worst case is the keyboard briefly reopening after a lightning-fast back
   * press, which is a rare cosmetic annoyance, not a stuck state.
   */
  private fun watchNonFocusableActivation(
    target: View,
    imm: InputMethodManager?,
    attempts: Int,
    accepted: Boolean,
    epoch: Int
  ) {
    if (container == null) return
    // The visibility check can reflect a previous IME session (e.g. the app
    // behind's own text field) — acceptable approximation, the fallback is
    // the safety net either way.
    val active = isKeyboardVisible(imm)
    if (active) {
      // The keyboard is on screen — watch until it goes away, then clear focus.
      watchForKeyboardGone(imm, 0, epoch)
      return
    }
    val deadline = if (accepted) 5 else 2 // ~500ms if accepted, ~200ms if rejected
    if (attempts >= deadline) {
      // Only fall back if no newer input attempt has started meanwhile — a
      // stale chain must not yank the window into focusable mode while a
      // fresh attempt is in flight.
      if (epoch == inputAttemptEpoch) {
        fallbackToFocusableInput(target)
      }
      return
    }
    mainHandler.postDelayed(
      { watchNonFocusableActivation(target, imm, attempts + 1, accepted, epoch) },
      100
    )
  }

  private fun fallbackToFocusableInput(target: View) {
    deviceNeedsFocusableInput = true
    enterInputMode(target)
  }

  /**
   * Best-effort "is the soft keyboard actually on screen?" check.
   *
   * On API 30+ [InputMethodManager.getInputMethodWindowVisibleHeight] tells us
   * directly whether an IME window is up. This is the reliable signal for the
   * non-focusable path, where isActive/isAcceptingText can stay false even
   * while the keyboard is visibly showing (a FLAG_NOT_FOCUSABLE window has no
   * real input connection) — without this, such devices would be wrongly
   * flipped into the focusable fallback mode for no reason.
   *
   * The method is NOT present in the modern public SDK stubs (it has been
   * hidden/removed from compileSdk 34+), so it must not be referenced
   * directly: this file is injected into whatever host app consumes the
   * library and is compiled against that app's compileSdk. It still exists
   * at runtime on API 30+ devices, so we reach it via reflection and fall
   * back to the connection-based heuristic if anything goes wrong.
   *
   * On older APIs fall back to the connection-based heuristic.
   */
  private fun isKeyboardVisible(imm: InputMethodManager?): Boolean {
    if (imm == null) return false
    if (Build.VERSION.SDK_INT >= 30) {
      try {
        val method = InputMethodManager::class.java.getMethod("getInputMethodWindowVisibleHeight")
        return ((method.invoke(imm) as? Number)?.toInt() ?: 0) > 0
      } catch (t: Exception) {
        // Reflection failed — fall back to the connection-based heuristic.
      }
    }
    return imm.isActive || imm.isAcceptingText
  }

  /**
   * While typing in the non-focusable window the keyboard stays up until the
   * user presses back (taps on the app behind pass through but don't dismiss
   * it — the app behind never held focus to lose). Once the keyboard is
   * gone, drop the EditText's focus so the next tap starts clean.
   */
  private fun watchForKeyboardGone(imm: InputMethodManager?, goneStreak: Int = 0, epoch: Int = inputAttemptEpoch) {
    if (container == null) return
    val active = isKeyboardVisible(imm)
    if (active) {
      mainHandler.postDelayed({ watchForKeyboardGone(imm, 0, epoch) }, 150)
      return
    }
    if (goneStreak < 3) {
      mainHandler.postDelayed({ watchForKeyboardGone(imm, goneStreak + 1, epoch) }, 150)
      return
    }
    // Only clear focus if no newer input attempt has started since — a
    // stale chain must not steal focus from a freshly tapped field.
    if (epoch == inputAttemptEpoch) {
      rootView?.clearFocus()
    }
  }

  /** Deepest visible EditText under the given point, or null. */
  private fun findEditTextViewAt(x: Float, y: Float): EditText? {
    val rv = rootView ?: return null
    var best: EditText? = null
    var bestArea = Int.MAX_VALUE

    fun walk(v: View, px: Float, py: Float) {
      if (v.visibility != View.VISIBLE) return
      if (px < 0 || py < 0 || px > v.width || py > v.height) return
      if (v is EditText && v.isEnabled) {
        val area = v.width * v.height
        if (area < bestArea) {
          bestArea = area
          best = v
        }
      }
      if (v is ViewGroup) {
        for (i in v.childCount - 1 downTo 0) {
          val child = v.getChildAt(i)
          walk(child, px - child.left, py - child.top)
        }
      }
    }

    walk(rv, x, y)
    return best
  }

  /** Focusable fallback input mode (only used when the device refuses a non-focusable keyboard). */
  private fun enterInputMode(target: View) {
    setWindowInputFocusable(true)
    startInputModeWatcher()
    // updateViewLayout applies the new window flags on the next frame, so
    // requesting focus / showing the IME in the middle of the current touch
    // dispatch would silently fail. Ask again once the relayout has landed.
    mainHandler.postDelayed({
      val lp = params ?: return@postDelayed
      val inInputMode = lp.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE == 0
      if (inInputMode && target.isShown) {
        target.requestFocus()
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
        imm?.showSoftInput(target, InputMethodManager.SHOW_IMPLICIT)
      }
    }, 80)
  }

  private var inputModeWatchActive = false
  private var keyboardEverActive = false
  private var lastKeyboardActiveAt = 0L

  private fun startInputModeWatcher() {
    if (inputModeWatchActive) return
    inputModeWatchActive = true
    keyboardEverActive = false
    lastKeyboardActiveAt = SystemClock.uptimeMillis()
    mainHandler.postDelayed(::checkInputModeRestore, 200)
  }

  /**
   * Watches the soft keyboard while the window is in input mode and tears
   * input mode down (restoring FLAG_NOT_FOCUSABLE) as soon as the keyboard
   * has been gone for a while. This covers every dismissal path — tap
   * outside, back press, keyboard hide button — including ones that never
   * fire a focus-loss callback (back press while the overlay window itself
   * is focused).
   *
   * The check is time-based rather than streak-counted so that it stays
   * correct even if it runs from both the poller and the focus-loss
   * callback (two overlapping chains can't double-consume a counter).
   */
  private fun checkInputModeRestore() {
    if (!inputModeWatchActive) return
    val lp = params
    if (lp == null) {
      inputModeWatchActive = false
      return
    }
    val inInputMode = lp.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE == 0
    if (!inInputMode) {
      inputModeWatchActive = false
      return
    }
    val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
    // Ground truth is whether an IME window is actually on screen — the
    // connection-based isActive/isAcceptingText can stay true (or false)
    // independently of the visible keyboard.
    val keyboardActive = isKeyboardVisible(imm)
    val now = SystemClock.uptimeMillis()
    if (keyboardActive) {
      keyboardEverActive = true
      lastKeyboardActiveAt = now
      mainHandler.postDelayed(::checkInputModeRestore, 100)
      return
    }
    // The keyboard may not be visible yet (slow show animation), so give it
    // a generous grace period before input mode is torn down. Once it HAS
    // been seen, restore quickly after it goes away.
    val graceMs = if (keyboardEverActive) 150 else 400
    if (now - lastKeyboardActiveAt < graceMs) {
      mainHandler.postDelayed(::checkInputModeRestore, 100)
      return
    }
    setWindowInputFocusable(false)
    inputModeWatchActive = false
  }

  private fun handleWindowFocusLost() {
    // Window focus was lost (tap outside / back press / the keyboard briefly
    // taking focus while opening). onWindowFocusChanged runs on the main
    // thread, so run the same check directly — it restores input mode only
    // once the keyboard is truly gone, and restoring too early would close
    // the keyboard right after it opened.
    checkInputModeRestore()
  }

  private fun setWindowInputFocusable(focusable: Boolean) {
    val lp = params ?: return
    val cv = container ?: return
    val alreadyFocusable = lp.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE == 0
    if (focusable == alreadyFocusable) return
    if (focusable) {
      // Keep FLAG_NOT_TOUCH_MODAL set: a focusable window is otherwise
      // touch-modal and would swallow every touch on screen, freezing the
      // app behind while the keyboard is open.
      lp.flags = (lp.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL) and
        (WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM).inv()
      lp.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
    } else {
      lp.flags = lp.flags or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM
      lp.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING
    }
    try {
      windowManager.updateViewLayout(cv, lp)
    } catch (t: Throwable) {
      Log.w(TAG, "setWindowInputFocusable failed", t)
    }
  }

  private fun hideWindow() {
    removeWindow()
    PopScreenModule.emitWindowState("hidden", "hide")
  }

  private fun removeWindow() {
    val cv = container
    val rv = rootView
    val token = rv?.windowToken
    if (cv != null) {
      try {
        windowManager.removeView(cv)
      } catch (t: Throwable) {
        // Already removed.
      }
    }
    // Drop any soft keyboard that was opened for the overlay's input field.
    // No-op if no keyboard is associated with this window token.
    try {
      val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
      if (token != null) imm?.hideSoftInputFromWindow(token, 0)
    } catch (t: Throwable) {
      // ignore
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

  /** Invoked when a touch lands in the content area (outside the drag/resize handles). */
  var onContentTouch: ((x: Float, y: Float) -> Unit)? = null

  /** Invoked when the window loses window focus (tap outside / back press). */
  var onWindowFocusLost: (() -> Unit)? = null

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
          onContentTouch?.invoke(ev.x, ev.y)
          false
        }
      }
    }
    return false
  }

  // The window is permanently FLAG_NOT_FOCUSABLE. Only the focusable
  // fallback input mode (used when a device refuses a non-focusable
  // keyboard) makes the window focusable; when it then loses focus (tap
  // outside / back press), notify the service so it can restore the
  // non-focusable flags once the keyboard is actually gone.
  override fun onWindowFocusChanged(hasWindowFocus: Boolean) {
    super.onWindowFocusChanged(hasWindowFocus)
    if (!hasWindowFocus) onWindowFocusLost?.invoke()
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
