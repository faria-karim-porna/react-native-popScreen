# PopScreen — Milestone 2: Generic Overlay Window + Static Content — Full Implementation Guide

**Goal of this document:** a literal, step-by-step build guide for Milestone 2 only, as described in `docs/implementation-plan.md` §20:

> Milestone 2 — Generic Overlay Window + Static Content
> `PopScreenOverlayService` + `WindowManager` integration hosting a *static* RN surface (no drag/resize yet) showing arbitrary developer-provided RN content via `<PopScreenContent>`. Validates the "generic Kotlin, smart RN" boundary end-to-end. Test on both an old-architecture and new-architecture example app.

**What this milestone delivers, concretely:** the real `PopScreenOverlayService` (replacing Milestone 1's empty placeholder), real `WindowManager` integration showing a fixed-size, fixed-position overlay window, and — the architecturally hardest part of the whole library — a working `PopScreenReactSurfaceHost` that correctly branches between the **New Architecture** (`ReactHost.createSurface`) and **old architecture** (`ReactRootView` + `ReactInstanceManager`) paths, using the `ReactArchitectureDetector` built in Milestone 1. By the end of this milestone, a developer can wrap *any* RN component in `<PopScreenContent>` and see it rendered live in a floating system window — with zero drag, zero resize, and zero touch interception. Those come later.

**What this milestone is NOT:** no dragging, no resizing, no minimize/restore, no touch interception beyond basic click-through behavior (Milestones 3–4). No shared cross-surface state store yet (Milestone 5).

**Primary test device:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31). This milestone's manifest/service work and MIUI's background-execution quirks interact directly, so verify here, not only on emulator.

**A note on API stability for this milestone specifically:** the New Architecture's `ReactHost.createSurface(...)` surface-hosting API has changed across recent RN point releases (method nullability, surface lifecycle helpers, and `ReactFragment` bridgeless bugs have all seen changes release-to-release per RN's own changelogs). The main plan's §18 risk table already flags this. Treat the exact method signatures below as correct for a recent, modern RN/Expo SDK release, but **pin your exact RN version now and verify against that version's actual `ReactHost`/`ReactSurface` source** before treating this milestone as complete — this is the single most likely place in the whole project for "looks right, doesn't compile" surprises.

---

## Step 0 — Prerequisites

Continue in the same `popscreen` standalone module repository from Milestone 1. Confirm Milestone 1's pass/fail checklist is fully green — in particular, `getReactArchitectureInfo()` must reliably report `NEW_ARCHITECTURE` or `OLD_ARCHITECTURE` (never `UNKNOWN`) before starting this milestone, since everything here depends on that signal.

You will need **two** separate example/test apps for this milestone (not just the one `example/` app scaffolded in Milestone 1):

1. An app running React Native's **New Architecture** (the current default for most freshly-created Expo apps).
2. An app running the **old architecture/bridge** (you may need to explicitly opt out of the New Architecture in a second test app's `app.json` / `gradle.properties`, depending on your targeted Expo SDK version — check your SDK's docs for the current toggle, since this flag's location and name has moved between SDK versions).

It's acceptable to keep using the existing `example/` app as your New Architecture test target, and create a second, throwaway `example-old-arch/` app (outside the published package, similar in spirit to Milestone 0's throwaway project) purely for old-architecture verification.

---

## Step 1 — Replace the Milestone 1 placeholder with the real `PopScreenOverlayService`

Delete the placeholder content and replace **`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`** entirely:

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
import android.view.View
import android.view.WindowManager

class PopScreenOverlayService : Service() {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var surfaceHost: PopScreenReactSurfaceHost? = null

    companion object {
        const val CHANNEL_ID = "popscreen_overlay_channel"
        const val NOTIFICATION_ID = 2001
        const val SURFACE_NAME = "PopScreenOverlay"

        // Same pattern as Milestone 0's spike: a static bridge letting the
        // module reach into the host app's existing RN instance(s) without
        // requiring a bound Service connection. PopScreenModule.kt sets
        // this before starting the service.
        var hostProvider: PopScreenHostProvider? = null
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
        if (overlayView != null) return // already shown — idempotent by design

        val provider = hostProvider
        if (provider == null) {
            android.util.Log.e("PopScreen", "No PopScreenHostProvider set — aborting overlay")
            stopSelf()
            return
        }

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager

        val host = PopScreenReactSurfaceHost(this, provider)
        surfaceHost = host

        // Milestone 2 scope: fixed size and position. Drag/resize land in
        // Milestones 3-4 by replacing these hardcoded values with
        // dynamically updated ones via setWindowRect().
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

        val view = host.createAndAttachSurface(SURFACE_NAME, Bundle())
        overlayView = view
        windowManager?.addView(view, params)
    }

    private fun removeOverlay() {
        overlayView?.let { view ->
            windowManager?.removeView(view)
        }
        surfaceHost?.destroy()
        surfaceHost = null
        overlayView = null
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

Notice this `Service` is now fully generic, per the main plan's core requirement: it knows nothing about `<PopScreenContent>`'s actual contents, only that it owns a window and a `View` produced by `PopScreenReactSurfaceHost`.

---

## Step 2 — Define the `PopScreenHostProvider` interface

This is the clean seam between the native module (which knows how to reach the host app's React instance(s)) and the `Service`/`SurfaceHost` (which shouldn't need to know *how* that reaching-in happens, only that it can ask for what it needs).

Create **`android/src/main/java/expo/modules/popscreen/PopScreenHostProvider.kt`**:

```kotlin
package expo.modules.popscreen

import com.facebook.react.ReactInstanceManager

/**
 * Abstracts over the two RN architectures so PopScreenReactSurfaceHost
 * doesn't need to know how the calling app's module obtained these
 * references — it just asks the provider for whichever one applies.
 *
 * Exactly one of these two methods will return non-null for a given app,
 * matching the architecture reported by ReactArchitectureDetector in
 * Milestone 1. Both being null, or both being non-null, indicates a bug
 * in the detection logic and should be treated as a hard error rather
 * than silently picking one.
 */
interface PopScreenHostProvider {
    fun getOldArchitectureInstanceManager(): ReactInstanceManager?
    fun getNewArchitectureReactHost(): Any? // typed as Any? deliberately — see Step 3 note
}
```

> **Why `Any?` for the New Architecture host type?** The exact `ReactHost` class location and import path has moved between RN versions during the Bridgeless rollout, and pinning a specific import here would make this interface itself version-fragile. `PopScreenReactSurfaceHost` (Step 3) is the one place that needs to know the concrete type, and it accesses it via reflection-guarded casting, consistent with the same pragmatic approach `ReactArchitectureDetector` used in Milestone 1. Revisit this once you've pinned your supported RN version range and confirmed the exact stable import path for your minimum supported version.

---

## Step 3 — Build `PopScreenReactSurfaceHost` (the architecturally critical class)

This is the single most important file in this milestone — the literal answer to "must the native layer host a RN root view" from the main plan, and the place where the dual old/new-architecture branch from Milestone 1 actually gets used for real.

Create **`android/src/main/java/expo/modules/popscreen/PopScreenReactSurfaceHost.kt`**:

```kotlin
package expo.modules.popscreen

import android.content.Context
import android.os.Bundle
import android.view.View
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView

class PopScreenReactSurfaceHost(
    private val context: Context,
    private val provider: PopScreenHostProvider
) {
    // Held so destroy() can clean up the correct path later.
    private var oldArchRootView: ReactRootView? = null
    private var newArchSurface: Any? = null // concrete type resolved via reflection — see below

    fun createAndAttachSurface(surfaceName: String, initialProps: Bundle): View {
        val newArchHost = provider.getNewArchitectureReactHost()
        val oldArchManager = provider.getOldArchitectureInstanceManager()

        return when {
            newArchHost != null && oldArchManager == null ->
                createNewArchitectureSurface(newArchHost, surfaceName, initialProps)

            oldArchManager != null && newArchHost == null ->
                createOldArchitectureSurface(oldArchManager, surfaceName, initialProps)

            else -> throw IllegalStateException(
                "PopScreenHostProvider returned an ambiguous result " +
                    "(newArchHost=$newArchHost, oldArchManager=$oldArchManager). " +
                    "Exactly one must be non-null — check ReactArchitectureDetector " +
                    "and your provider implementation from Milestone 1."
            )
        }
    }

    // ---- New Architecture path (ReactHost / Bridgeless / Fabric) ----
    private fun createNewArchitectureSurface(
        reactHost: Any,
        surfaceName: String,
        initialProps: Bundle
    ): View {
        // ReactHost.createSurface(context, moduleName, launchOptions) returns
        // a ReactSurface; .getView() yields the attachable Android View, and
        // .start() actually starts it. This mirrors the pattern used inside
        // RN's own ReactFragment for bridgeless mode. Reflection is used here
        // because the exact ReactHost/ReactSurface import path is version-
        // sensitive — once you've pinned your supported RN version range,
        // strongly consider replacing this with a direct, typed call against
        // your minimum supported version's actual API for compile-time safety.
        val createSurfaceMethod = reactHost.javaClass.getMethod(
            "createSurface",
            Context::class.java,
            String::class.java,
            Bundle::class.java
        )
        val surface = createSurfaceMethod.invoke(reactHost, context, surfaceName, initialProps)
            ?: throw IllegalStateException("ReactHost.createSurface() returned null")

        newArchSurface = surface

        val getViewMethod = surface.javaClass.getMethod("getView")
        val view = getViewMethod.invoke(surface) as View

        val startMethod = surface.javaClass.getMethod("start")
        startMethod.invoke(surface)

        return view
    }

    // ---- Old architecture path (ReactInstanceManager / bridge) ----
    private fun createOldArchitectureSurface(
        reactInstanceManager: ReactInstanceManager,
        surfaceName: String,
        initialProps: Bundle
    ): View {
        val rootView = ReactRootView(context)
        oldArchRootView = rootView

        // This is the exact same call shape validated in Milestone 0's
        // spike — startReactApplication(manager, registeredSurfaceName,
        // initialProps) — now routed through the generic dual-path host
        // instead of being hardcoded inline in the Service.
        rootView.startReactApplication(reactInstanceManager, surfaceName, initialProps)

        return rootView
    }

    fun destroy() {
        oldArchRootView?.unmountReactApplication()
        oldArchRootView = null

        newArchSurface?.let { surface ->
            try {
                val stopMethod = surface.javaClass.getMethod("stop")
                stopMethod.invoke(surface)
            } catch (e: Exception) {
                android.util.Log.w("PopScreen", "Error stopping new-architecture surface", e)
            }
        }
        newArchSurface = null
    }
}
```

> **This is exactly the file the main plan's §18 risk table warned would need real R&D time.** If `createSurfaceMethod` reflection fails at runtime with a `NoSuchMethodException`, that's a strong signal the targeted RN version's `ReactHost.createSurface` signature has shifted — check that version's actual source (the method has been observed taking `(context, appKey, launchOptions)` consistently across recent releases, but always verify against your pinned version rather than trusting this guide as gospel).

---

## Step 4 — Implement `PopScreenHostProvider` for real, using `ReactArchitectureDetector`

Now connect Milestone 1's detection logic to this milestone's surface-hosting code. Update **`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`**, adding a concrete provider implementation and the `show`/`hide` functions:

```kotlin
package expo.modules.popscreen

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PopScreenModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("PopScreen")

    Events("onPermissionResult")

    AsyncFunction("hasOverlayPermission") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        Settings.canDrawOverlays(context)
      } else {
        true
      }
    }

    AsyncFunction("requestOverlayPermission") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
        !Settings.canDrawOverlays(context)
      ) {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${context.packageName}")
        ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
      }
    }

    AsyncFunction("getReactArchitectureInfo") {
      ReactArchitectureDetector.detect(appContext)
    }

    // ---- New in Milestone 2 ----

    AsyncFunction("show") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

      PopScreenOverlayService.hostProvider = object : PopScreenHostProvider {
        override fun getOldArchitectureInstanceManager(): ReactInstanceManager? {
          val info = ReactArchitectureDetector.detect(appContext)
          if (info["architecture"] != "OLD_ARCHITECTURE") return null
          val activity = appContext.currentActivity ?: return null
          val app = activity.application as? ReactApplication ?: return null
          return app.reactNativeHost.reactInstanceManager
        }

        override fun getNewArchitectureReactHost(): Any? {
          val info = ReactArchitectureDetector.detect(appContext)
          if (info["architecture"] != "NEW_ARCHITECTURE") return null
          val activity = appContext.currentActivity ?: return null
          // getReactHost() is the New Architecture equivalent of
          // getReactNativeHost(), surfaced via reflection for the same
          // version-stability reasons noted in ReactArchitectureDetector.
          val method = activity.application.javaClass.getMethod("getReactHost")
          return method.invoke(activity.application)
        }
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
}
```

Notice that `getOldArchitectureInstanceManager()` and `getNewArchitectureReactHost()` each **re-check** the architecture before returning non-null, rather than assuming the caller already knows — this guarantees `PopScreenReactSurfaceHost`'s "exactly one must be non-null" invariant from Step 3 actually holds, rather than relying on every call site getting it right independently.

---

## Step 5 — Update the TypeScript public API

Edit **`src/PopScreenModule.ts`**:

```ts
import { NativeModule, requireNativeModule } from 'expo-modules-core';
import { ReactArchitectureInfo } from './PopScreen.types';

declare class PopScreenModule extends NativeModule {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
  show(): Promise<void>;
  hide(): Promise<void>;
}

export default requireNativeModule<PopScreenModule>('PopScreen');
```

Edit **`src/index.ts`**:

```ts
import PopScreenModule from './PopScreenModule';

export async function hasOverlayPermission(): Promise<boolean> {
  return PopScreenModule.hasOverlayPermission();
}

export async function requestOverlayPermission(): Promise<void> {
  return PopScreenModule.requestOverlayPermission();
}

export async function getReactArchitectureInfo() {
  return PopScreenModule.getReactArchitectureInfo();
}

export async function show(): Promise<void> {
  return PopScreenModule.show();
}

export async function hide(): Promise<void> {
  return PopScreenModule.hide();
}

export * from './PopScreen.types';
```

---

## Step 6 — Build `<PopScreenContent>` and register the overlay's RN surface

This is the JS-side counterpart that makes the "generic Kotlin, smart RN" boundary real. Create **`src/PopScreenContent.tsx`**:

```tsx
import React from 'react';

type PopScreenContentProps = {
  children: React.ReactNode;
};

/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. This component itself does nothing clever — its
 * importance is purely structural: it's the component registered as the
 * root of the "PopScreenOverlay" surface (see registerOverlaySurface
 * below), separating the developer's overlay UI from the main app's UI
 * by registration, not by any special native awareness of this
 * component's existence.
 */
export default function PopScreenContent({ children }: PopScreenContentProps) {
  return <>{children}</>;
}
```

Create **`src/registerOverlaySurface.ts`**:

```ts
import { AppRegistry } from 'react-native';
import React from 'react';

const SURFACE_NAME = 'PopScreenOverlay';

let registered = false;

/**
 * Call once, early in the host app's lifecycle (e.g. at the top of
 * index.js, alongside the main app's registerRootComponent call), passing
 * the component tree to render inside the floating overlay window.
 *
 * This must match PopScreenOverlayService.SURFACE_NAME (Kotlin side) and
 * PopScreenReactSurfaceHost's surfaceName parameter exactly, or the
 * native side will attach to a surface name nothing has registered,
 * resulting in a blank overlay window.
 */
export function registerOverlaySurface(component: React.ComponentType<any>) {
  if (registered) {
    console.warn('[PopScreen] registerOverlaySurface called more than once — ignoring.');
    return;
  }
  registered = true;
  AppRegistry.registerComponent(SURFACE_NAME, () => component);
}
```

Update **`src/index.ts`** once more to export these:

```ts
export { default as PopScreenContent } from './PopScreenContent';
export { registerOverlaySurface } from './registerOverlaySurface';
```

---

## Step 7 — Update the config plugin's service declaration (sanity check, likely unchanged)

The service name, type, and property declared in Milestone 1's config plugin (`plugin/src/index.ts`) should already match `PopScreenOverlayService` exactly — re-confirm this now that the class has real logic instead of being an empty placeholder:

```ts
const OVERLAY_SERVICE_NAME = '.PopScreenOverlayService'; // must match the Kotlin class name exactly
```

No changes should be needed here if Milestone 1 was completed correctly — this step is a checkpoint, not new work.

---

## Step 8 — Wire up both example apps

### New Architecture example app (`example/`)

Edit **`example/index.js`** (or wherever the example app's entry point lives):

```js
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import OverlayDemo from './OverlayDemo';

registerRootComponent(App);
registerOverlaySurface(OverlayDemo);
```

Create **`example/OverlayDemo.tsx`** — deliberately arbitrary content, to prove the native side really doesn't care what's inside:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PopScreenContent } from 'popscreen';

export default function OverlayDemo() {
  return (
    <PopScreenContent>
      <View style={styles.box}>
        <Text style={styles.text}>🎈 Hello from the overlay!</Text>
        <Text style={styles.subtext}>This is arbitrary RN content.</Text>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: 'rgba(30, 30, 45, 0.95)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: { color: 'white', fontSize: 16, fontWeight: '600' },
  subtext: { color: '#a3a3a3', fontSize: 12, marginTop: 6 },
});
```

Edit **`example/App.tsx`** to add controls:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as PopScreen from 'popscreen';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [archInfo, setArchInfo] = useState('checking...');

  useEffect(() => {
    PopScreen.hasOverlayPermission().then(setHasPermission);
    PopScreen.getReactArchitectureInfo().then((info) =>
      setArchInfo(`${info.architecture} (isNewArchitecture: ${info.isNewArchitecture})`)
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 2 Verification</Text>
      <Text>Overlay permission: {String(hasPermission)}</Text>
      <Text>Architecture: {archInfo}</Text>
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

### Old-architecture test app (`example-old-arch/` or equivalent)

Create a second test app (outside the published package, e.g. a sibling directory) with the New Architecture explicitly disabled, per your targeted Expo SDK's current convention for that toggle. Install your local `popscreen` package into it (e.g. via `npm link`, a local `file:` dependency, or by temporarily copying the built package — whichever fits your workflow), and replicate the same `App.tsx`/`OverlayDemo.tsx`/`index.js` wiring shown above. The JS code is identical; only the underlying RN architecture differs, which is exactly the point — `<PopScreenContent>` and `registerOverlaySurface` should not need any awareness of which architecture they're running under.

---

## Step 9 — Build and run on the POCO M3, both configurations

**New Architecture app:**

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

**Old-architecture app:**

```bash
cd example-old-arch
npx expo prebuild --platform android --clean
npx expo run:android --device
```

(Run these as two separate installs/sessions on the device — you don't need both installed simultaneously, just both verified in turn.)

---

## Step 10 — Manual test sequence (repeat for both apps)

1. Launch the app. Confirm `Architecture:` correctly reads `NEW_ARCHITECTURE` for the New Architecture app and `OLD_ARCHITECTURE` for the old-architecture app — if either is wrong, stop and fix detection before continuing; the rest of this test is meaningless otherwise.
2. Grant overlay permission via **Request Overlay Permission**.
3. Tap **Show Overlay**. Confirm the floating window appears at the fixed position (80px from left, 250px from top), displaying the "🎈 Hello from the overlay!" content from `OverlayDemo`.
4. Press Home / switch to a different app. Confirm the overlay window remains visible, drawn on top, with the host app backgrounded.
5. Tap **Hide Overlay** (switch back to the host app first). Confirm the window disappears cleanly, with no crash and no lingering view.
6. Tap **Show Overlay** again. Confirm it reappears correctly — this validates that `removeOverlay()`/`destroy()` left the surface host in a clean, re-showable state rather than a broken one-shot.

---

## Step 11 — Pass / fail criteria

This milestone is a **PASS** only if all of the following are true, **on both the New Architecture and old-architecture example apps**:

- [ ] The overlay window renders the exact arbitrary content from `<PopScreenContent>` — not placeholder text, not an empty window — confirming the "generic Kotlin, smart RN" boundary actually holds end-to-end.
- [ ] `PopScreenReactSurfaceHost` correctly selects the New Architecture path on the New Architecture app and the old-architecture path on the old-architecture app, with no `IllegalStateException` about an ambiguous provider result on either.
- [ ] Show → Hide → Show again works cleanly with no crash, no `WindowManager.BadTokenException`, and no duplicated/orphaned views.
- [ ] The overlay persists correctly while the host app is backgrounded, consistent with Milestone 0's findings on this exact device.
- [ ] No `NoSuchMethodException` is thrown from the reflection calls in `PopScreenReactSurfaceHost`'s New Architecture path. If one is, this is the expected failure mode the main plan's risk table warned about — resolve it by inspecting your pinned RN version's actual `ReactHost`/`ReactSurface` source before proceeding.

If the New Architecture and old-architecture paths produce visibly different behavior (e.g. one works and the other silently fails), do not proceed to Milestone 3 until both are solid — Milestone 3's drag implementation builds directly on top of whichever `View` this milestone produces, regardless of which architecture produced it, and an architecture-specific bug here will otherwise resurface confusingly two milestones later.

---

## What this milestone deliberately does NOT include (left for later milestones)

- Drag, resize, snap-to-edge (Milestone 3–4) — the window's position and size are still hardcoded constants in `showOverlay()`.
- Minimize/restore state machine (Milestone 4).
- Touch interception distinguishing "chrome" from "content" (Milestone 3) — right now `FLAG_NOT_FOCUSABLE` is the only touch-related flag set, meaning content inside the overlay can still receive touches, but there's no drag-handle/content-area distinction yet.
- Shared cross-surface state via an external store, and the `usePopScreen()` hook (Milestone 5).
- Hardening the reflection-based New Architecture surface creation against multiple specific RN versions — this milestone validates it works for *your* currently pinned version; broader version compatibility testing belongs in Milestone 7 (Testing & Docs).

---

*End of Milestone 2 guide. On a clean PASS on both architecture paths, proceed to Milestone 3 in the main implementation plan (`docs/implementation-plan.md`), which adds the drag/touch-interceptor layer on top of the static window this milestone produced.*
