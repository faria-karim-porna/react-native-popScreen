# PopScreen — Milestone 0: Spike / Validation — Full Implementation Guide

**Goal of this document:** a literal, step-by-step build guide for Milestone 0 only — the de-risking spike described in `docs/implementation-plan.md` §20. Nothing here is meant to be reused in the real PopScreen library; this is throwaway/minimal code whose only job is to answer one question with certainty before any "real" architecture work begins:

> **Can a live React Native surface render inside a `TYPE_APPLICATION_OVERLAY` system window, and do ordinary RN re-renders (state changes) flow into that window automatically, with zero native involvement per update?**

If this spike works, every architectural claim in the main implementation plan (generic Kotlin shell, RN-driven UI, no "push UI to native" RPC) is empirically validated. If it doesn't work as expected, we find out now, in a throwaway project, not three milestones deep into the real library.

**Primary test device:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31) — per the locked-in decision in the main plan. Run every step on this physical device first. If it works here — the most background-execution-hostile environment realistically available — later validation on emulators/other devices is low-risk by comparison.

**Scope boundaries for this spike (intentionally cut corners vs. the real library):**
- No Expo Modules API `ModuleDefinition` DSL yet — a minimal native module is enough to prove the concept.
- No generic/configurable API — everything is hardcoded (fixed window size, fixed position, fixed permission flow).
- No drag, resize, minimize, or touch interception — static window only.
- No dual old/new-architecture support — target whichever architecture the fresh Expo project defaults to.
- No config plugin — manifest changes are made by hand directly in the generated `android/` folder, since this project is never going to be published or re-prebuilt.

These cuts are deliberate. Anything not required to answer the core question above is out of scope for Milestone 0.

---

## Step 0 — Prerequisites

Before starting, confirm on your development machine:

```bash
node -v        # Node 18+ recommended
npm -v
java -version  # JDK 17 recommended for current Android Gradle Plugin versions
```

Install/confirm Android Studio is present (needed for the Android SDK, platform tools, and an easy way to inspect logs via `adb logcat`), and that `adb` is on your `PATH`:

```bash
adb --version
```

Connect the POCO M3 via USB, with Developer Options → USB Debugging enabled, and confirm it's visible:

```bash
adb devices
# should list your POCO M3's serial number with status "device"
```

---

## Step 1 — Create a throwaway Expo project with a dev client

```bash
npx create-expo-app@latest popscreen-spike
cd popscreen-spike
npx expo install expo-dev-client
```

This is a **separate, throwaway project** — not inside the real `popscreen` library repo. Keep it that way; it's disposable.

---

## Step 2 — Generate the native Android project (prebuild)

```bash
npx expo prebuild --platform android
```

This materializes an `android/` folder. From this point on, you'll be hand-editing files inside `android/` directly — that's fine for a spike (it would not be fine for the real library, which must drive all native config through a config plugin).

---

## Step 3 — Write the native Kotlin overlay code

Create the following file:

**`android/app/src/main/java/com/popscreenspike/OverlayService.kt`**

```kotlin
package com.popscreenspike

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.WindowManager
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.Arguments

class OverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var reactRootView: ReactRootView? = null

    companion object {
        const val CHANNEL_ID = "popscreen_spike_overlay_channel"
        const val NOTIFICATION_ID = 1001
        const val SURFACE_NAME = "PopScreenSpikeOverlay"

        // Holds a reference to the host app's existing ReactInstanceManager so
        // the overlay surface can share the same JS instance as the main app.
        // Set by MainApplication / a native module before startOverlay() is called.
        var reactInstanceManagerProvider: (() -> ReactInstanceManager?)? = null
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
        if (reactRootView != null) return // already shown

        val reactInstanceManager = reactInstanceManagerProvider?.invoke()
        if (reactInstanceManager == null) {
            android.util.Log.e("PopScreenSpike", "No ReactInstanceManager available — aborting overlay")
            return
        }

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val rootView = ReactRootView(this)
        reactRootView = rootView

        // Fixed, hardcoded size/position for the spike — no drag/resize yet.
        val layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY

        val params = WindowManager.LayoutParams(
            600,  // width in px — hardcoded for the spike
            400,  // height in px — hardcoded for the spike
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = android.view.Gravity.TOP or android.view.Gravity.START
        params.x = 100
        params.y = 300

        windowManager?.addView(rootView, params)

        // This is the key call: attach this ReactRootView to the SAME
        // ReactInstanceManager the main app is already running, but point it
        // at a DIFFERENT registered surface name ("PopScreenSpikeOverlay").
        rootView.startReactApplication(
            reactInstanceManager,
            SURFACE_NAME,
            Arguments.createMap()
        )
    }

    private fun removeOverlay() {
        reactRootView?.let { view ->
            windowManager?.removeView(view)
            view.unmountReactApplication()
        }
        reactRootView = null
    }

    private fun buildNotification(): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return builder
            .setContentTitle("PopScreen Spike")
            .setContentText("Overlay test service running")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
    }

    private fun createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "PopScreen Spike Overlay",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
```

> **Why `reactInstanceManagerProvider` as a static lambda?** This is a spike-only shortcut. The real library (§6/§7 of the main plan) will do this properly through the Expo Modules API's `appContext.reactContext`/`appContext.currentActivity` accessors (note: the older top-level `currentActivity` property is deprecated/removed in current RN versions — always go through `reactApplicationContext.currentActivity` or the Expo `appContext` equivalents). For Milestone 0, wiring a static provider from `MainActivity` is the fastest way to get a `ReactInstanceManager` reference into the `Service` without building out the full module DSL yet.

---

## Step 4 — Wire up a minimal native module to control the service from JS

**`android/app/src/main/java/com/popscreenspike/OverlaySpikeModule.kt`**

```kotlin
package com.popscreenspike

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

class OverlaySpikeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "OverlaySpikeModule"

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(reactApplicationContext)
        } else true
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            !Settings.canDrawOverlays(reactApplicationContext)
        ) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${reactApplicationContext.packageName}")
            ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun startOverlay() {
        // Give the Service a way to reach back into THIS app's existing
        // ReactInstanceManager so the overlay shares the same JS instance.
        OverlayService.reactInstanceManagerProvider = {
            reactApplicationContext.currentActivity
                ?.let { it.application as? com.facebook.react.ReactApplication }
                ?.reactNativeHost
                ?.reactInstanceManager
        }
        val intent = Intent(reactApplicationContext, OverlayService::class.java)
        reactApplicationContext.startForegroundService(intent)
    }

    @ReactMethod
    fun stopOverlay() {
        val intent = Intent(reactApplicationContext, OverlayService::class.java)
        reactApplicationContext.stopService(intent)
    }
}
```

**`android/app/src/main/java/com/popscreenspike/OverlaySpikePackage.kt`**

```kotlin
package com.popscreenspike

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class OverlaySpikePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(OverlaySpikeModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

Register the package in **`android/app/src/main/java/com/popscreenspike/MainApplication.kt`** — find the `getPackages()` override and add `OverlaySpikePackage()` to the returned list:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(OverlaySpikePackage())
    }
```

> Note: depending on your Expo SDK version, `MainApplication.kt` may instead expose packages via a different autolinking mechanism (e.g. a generated `PackageList` with no manual `getPackages()` override visible). If you don't see a `getPackages()` override to edit, search the file for `ReactNativeHost` or `ReactHost` and add the package wherever the existing list of packages is constructed — the exact shape varies slightly by Expo SDK/RN version, but every bare Android RN project has one such list somewhere in `MainApplication.kt`.

---

## Step 5 — Declare permissions and the service in the manifest

Edit **`android/app/src/main/AndroidManifest.xml`**. Add these permissions as siblings of any existing `<uses-permission>` tags (outside the `<application>` tag):

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
```

Inside the `<application>` tag, add the service declaration:

```xml
<service
    android:name=".OverlayService"
    android:foregroundServiceType="specialUse"
    android:exported="false">
    <property
        android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
        android:value="floating_overlay_spike" />
</service>
```

---

## Step 6 — Register the overlay's RN surface (the JS side)

This is the part that actually proves the core hypothesis: a *second*, independently-registered RN root component, rendered into the overlay window, that re-renders on its own state changes with **zero native involvement**.

Edit **`index.js`** (the project root entry file Expo generates) to register a second component, in addition to the default app registration:

```js
import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';
import OverlayRoot from './OverlayRoot';

// Normal app registration (unchanged)
registerRootComponent(App);

// Second surface — this is what the OverlayService attaches to the
// system overlay window. Name must match OverlayService.SURFACE_NAME.
AppRegistry.registerComponent('PopScreenSpikeOverlay', () => OverlayRoot);
```

Create **`OverlayRoot.js`** at the project root:

```jsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OverlayRoot() {
  const [tick, setTick] = useState(0);

  // The whole point of this component: it updates itself on a timer,
  // entirely from JS, with NO native call telling Kotlin to "refresh."
  // If the overlay window visibly ticks once a second, the core
  // hypothesis is confirmed — RN re-renders flow into the overlay
  // window automatically once the surface is mounted.
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>PopScreen Spike</Text>
      <Text style={styles.tick}>Tick: {tick}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(20,20,30,0.92)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tick: {
    color: '#4ade80',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
});
```

Now edit the main **`App.js`** to add two buttons that call the native module — this is the control surface in the main app, separate from the overlay content itself:

```jsx
import React from 'react';
import { View, Text, Button, StyleSheet, NativeModules } from 'react-native';

const { OverlaySpikeModule } = NativeModules;

export default function App() {
  const [hasPermission, setHasPermission] = React.useState(false);

  React.useEffect(() => {
    OverlaySpikeModule.hasOverlayPermission().then(setHasPermission);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen Spike — Host App</Text>
      <Text>Overlay permission granted: {String(hasPermission)}</Text>
      <Button
        title="Request Overlay Permission"
        onPress={() => OverlaySpikeModule.requestOverlayPermission()}
      />
      <Button
        title="Start Overlay"
        onPress={() => OverlaySpikeModule.startOverlay()}
      />
      <Button
        title="Stop Overlay"
        onPress={() => OverlaySpikeModule.stopOverlay()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
});
```

---

## Step 7 — Build and run on the POCO M3

```bash
npx expo run:android --device
```

(`--device` lets you pick the connected POCO M3 explicitly if multiple devices/emulators are attached. If this is the only connected device, you can omit the flag.)

This will build the dev client APK, install it on the POCO M3, and launch it connected to the Metro bundler.

---

## Step 8 — Manual test sequence

Walk through this exact sequence on the device:

1. Open the app. Confirm `Overlay permission granted: false` shows initially (unless you've already granted it on this device before).
2. Tap **Request Overlay Permission**. Android should redirect you to the system "draw over other apps" settings screen for this app. Toggle it on, then navigate back to the app (the app should still be alive in the background — Expo dev client doesn't get killed by this navigation under normal circumstances).
3. Tap **Start Overlay**.
4. **Press the device Home button** (or open a different app entirely, e.g. the device's Settings app) so PopScreen Spike is no longer in the foreground.
5. **Confirm the floating window is still visible**, drawn on top of whatever app/home screen is now in the foreground, at the hardcoded position (100px from left, 300px from top).
6. **Watch the "Tick: N" counter inside that floating window.** It must increment once per second, continuously, while you remain on the home screen or inside a different app — with the host app backgrounded.
7. Switch back to the PopScreen Spike app (it should still be running). Tap **Stop Overlay**. The floating window should disappear.

---

## Step 9 — Pass / fail criteria

This spike is a **PASS** only if all of the following are true:

- [ ] The overlay window renders visibly on top of the home screen / other apps (proves `TYPE_APPLICATION_OVERLAY` + `SYSTEM_ALERT_WINDOW` works on this exact device/OS combo).
- [ ] The "Tick: N" text inside the overlay window visibly increments roughly once per second, continuously, **while the host app is backgrounded** (proves RN re-renders flow into the overlay's `ReactRootView` automatically — no native "refresh" call was ever made for this; the JS `setInterval`/`setState` loop is the only thing driving the visible update).
- [ ] The overlay survives at least 2–3 minutes of the host app being backgrounded, without the floating window disappearing or the tick counter freezing (a basic signal that MIUI's background-kill behavior isn't immediately destroying the foreground service on this device — full hardening of this is Milestone 6's job, not this spike's, but an immediate failure here would be a significant early warning).
- [ ] No crash, ANR (Application Not Responding), or silent failure occurs across the full sequence in Step 8.

If any of the above fails, **do not proceed to Milestone 1 yet.** Use `adb logcat | grep -i popscreen` (and look for `WindowManager`/`ReactRootView`-related stack traces) to diagnose, and revisit the relevant section of the main implementation plan (most likely culprits: a stale/incorrect `ReactInstanceManager` reference if the overlay window appears but never renders content, or a manifest/permission issue if the window never appears at all).

---

## What this spike deliberately does NOT prove (left for later milestones)

- Whether the overlay can be dragged/resized (Milestone 3/4).
- Whether old-architecture *and* new-architecture apps both work (Milestone 1's dual-path requirement) — this spike only needs to work on whichever architecture the fresh `create-expo-app` project defaults to.
- Whether cross-surface state sync via an external store (Zustand/Redux) works between the main app and the overlay (Milestone 5) — this spike's "tick" counter is local to the overlay's own component, not shared with the main app, which is intentionally out of scope here.
- Whether the foreground service survives indefinitely, a device reboot, or a full app-process kill from the recents screen (Milestone 6).
- Anything about text input/IME focus inside the overlay (Milestone 5's second example app).

---

*End of Milestone 0 guide. On a clean PASS, proceed to Milestone 1 in the main implementation plan (`docs/implementation-plan.md`).*
