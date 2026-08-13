package __PACKAGE__

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * JS-facing bridge for the floating overlay.
 * Name must be "PopScreen" so `NativeModules.PopScreen` resolves.
 */
class PopScreenModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val EVENT_WINDOW_STATE = "onWindowStateChange"
    const val EVENT_PERMISSION_RESULT = "onPermissionResult"
    const val EVENT_DRAG_UPDATE = "onDragUpdate"
    const val EVENT_RESIZE_UPDATE = "onResizeUpdate"

    @Volatile
    private var eventSink: PopScreenModule? = null

    /** Static entry points used by [OverlayService] (same process). */
    fun emitWindowState(state: String, reason: String?) {
      eventSink?.emitWindowStateInternal(state, reason)
    }

    fun emitDragUpdate(phase: String, x: Int, y: Int, width: Int, height: Int) {
      eventSink?.emitDragUpdateInternal(phase, x, y, width, height)
    }

    fun emitResizeUpdate(phase: String, x: Int, y: Int, width: Int, height: Int) {
      eventSink?.emitResizeUpdateInternal(phase, x, y, width, height)
    }
  }

  private var lifecycleListenerAdded = false

  override fun getName(): String = "PopScreen"

  override fun initialize() {
    super.initialize()
    eventSink = this
  }

  override fun onCatalystInstanceDestroy() {
    eventSink = null
    super.onCatalystInstanceDestroy()
  }

  private fun hasOverlayPermission(): Boolean = Settings.canDrawOverlays(reactContext)

  @ReactMethod
  fun hasOverlayPermission(promise: Promise) {
    promise.resolve(hasOverlayPermission())
  }

  @ReactMethod
  fun requestOverlayPermission() {
    if (hasOverlayPermission()) return
    try {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${reactContext.packageName}")
      ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)

      // Re-check when the host activity resumes after the settings detour.
      if (!lifecycleListenerAdded) {
        lifecycleListenerAdded = true
        reactContext.addLifecycleEventListener(object : com.facebook.react.bridge.LifecycleEventListener {
          private var checkedOnce = false
          override fun onHostResume() {
            if (!checkedOnce) {
              checkedOnce = true
              return
            }
            emitPermissionResultInternal(hasOverlayPermission())
          }
          override fun onHostPause() {}
          override fun onHostDestroy() {}
        })
      }
    } catch (t: Throwable) {
      emitPermissionResultInternal(hasOverlayPermission())
    }
  }

  @ReactMethod
  fun hasBatteryOptimizationExemption(promise: Promise) {
    val pm = reactContext.getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
    promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))
  }

  @ReactMethod
  fun requestBatteryOptimizationExemption() {
    try {
      val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
    } catch (t: Throwable) {
      // Some devices don't expose the settings screen.
    }
  }

  @ReactMethod
  fun show() {
    val intent = Intent(reactContext, OverlayService::class.java).setAction(OverlayService.ACTION_SHOW)
    if (Build.VERSION.SDK_INT >= 26) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
  }

  @ReactMethod
  fun hide() {
    if (!OverlayService.isRunning()) return
    val intent = Intent(reactContext, OverlayService::class.java).setAction(OverlayService.ACTION_HIDE)
    reactContext.startService(intent)
  }

  @ReactMethod
  fun destroy() {
    if (!OverlayService.isRunning()) return
    val intent = Intent(reactContext, OverlayService::class.java).setAction(OverlayService.ACTION_DESTROY)
    reactContext.startService(intent)
  }

  @ReactMethod
  fun openApp() {
    try {
      val pm = reactContext.packageManager
      val intent = pm.getLaunchIntentForPackage(reactContext.packageName)
      if (intent != null) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        reactContext.startActivity(intent)
      }
    } catch (t: Throwable) {
      // Host app launch intent failed — ignore.
    }
  }

  @ReactMethod
  fun getReactArchitectureInfo(promise: Promise) {
    val version = com.facebook.react.modules.systeminfo.ReactNativeVersion.VERSION
    val map = Arguments.createMap().apply {
      putString("architecture", "Legacy")
      putBoolean("isNewArchitecture", false)
      putString("reactNativeVersion", "${version["major"]}.${version["minor"]}.${version["patch"]}")
    }
    promise.resolve(map)
  }

  @ReactMethod
  fun setWindowRect(x: Double?, y: Double?, width: Double?, height: Double?) {
    OverlayService.updateWindowRect(x?.toInt(), y?.toInt(), width?.toInt(), height?.toInt())
  }

  @ReactMethod
  fun setSizeConstraints(minWidth: Double?, minHeight: Double?, maxWidth: Double?, maxHeight: Double?) {
    OverlayService.setConstraints(
      minWidth?.toInt() ?: OverlayService.DEFAULT_MIN_SIZE,
      minHeight?.toInt() ?: OverlayService.DEFAULT_MIN_SIZE,
      maxWidth?.toInt() ?: 0,
      maxHeight?.toInt() ?: 0
    )
  }

  @ReactMethod
  fun setHandleDimensions(dragHandleHeightDp: Double?, resizeHandleSizeDp: Double?) {
    OverlayService.setHandleDimensions(
      dragHandleHeightDp?.toInt() ?: OverlayService.DEFAULT_DRAG_HANDLE_DP,
      resizeHandleSizeDp?.toInt() ?: OverlayService.DEFAULT_RESIZE_HANDLE_DP
    )
  }

  // ── Internal event emitters (also callable from OverlayService) ─────

  private fun emitWindowStateInternal(state: String, reason: String?) {
    val map = Arguments.createMap().apply {
      putString("state", state)
      reason?.let { putString("reason", it) }
    }
    sendEvent(EVENT_WINDOW_STATE, map)
  }

  private fun emitPermissionResultInternal(granted: Boolean) {
    val map = Arguments.createMap().apply {
      putBoolean("granted", granted)
      putString("reason", "permission_result")
    }
    sendEvent(EVENT_PERMISSION_RESULT, map)
  }

  private fun emitDragUpdateInternal(phase: String, x: Int, y: Int, width: Int, height: Int) {
    val map = Arguments.createMap().apply {
      putString("phase", phase)
      putDouble("x", x.toDouble())
      putDouble("y", y.toDouble())
      putDouble("width", width.toDouble())
      putDouble("height", height.toDouble())
    }
    sendEvent(EVENT_DRAG_UPDATE, map)
  }

  private fun emitResizeUpdateInternal(phase: String, x: Int, y: Int, width: Int, height: Int) {
    val map = Arguments.createMap().apply {
      putString("phase", phase)
      putDouble("x", x.toDouble())
      putDouble("y", y.toDouble())
      putDouble("width", width.toDouble())
      putDouble("height", height.toDouble())
    }
    sendEvent(EVENT_RESIZE_UPDATE, map)
  }

  private fun sendEvent(name: String, params: WritableMap) {
    try {
      reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(name, params)
    } catch (t: Throwable) {
      // Host JS may not be attached yet — ignore.
    }
  }
}
