# PopScreen — Milestone 1: Expo Module Scaffolding — Full Implementation Guide

**Goal of this document:** a literal, step-by-step build guide for Milestone 1 only, as described in `docs/implementation-plan.md` §20:

> Milestone 1 — Expo Module Scaffolding
> `create-expo-module` setup (standalone, npm-publishable — no `--local` flag), config plugin for manifest permissions/service declaration, basic `requestOverlayPermission`/`hasOverlayPermission` functions working end-to-end from a dev-client example app.
> Stand up the dual old/new-architecture surface-hosting code path (per §6) early, since retrofitting it later would touch nearly every native file.

**What this milestone is NOT:** this is not where the overlay window, `WindowManager`, or `ReactRootView` attachment gets built — that's Milestone 2. Milestone 0's spike already proved the core overlay hypothesis works in a throwaway project; this milestone's job is to take the *real*, generic, npm-publishable PopScreen package and get its plumbing solid: a proper Expo Module via the Expo Modules API DSL, a config plugin instead of hand-edited manifests, working permission functions end-to-end, and the groundwork that lets the module detect which RN architecture (old bridge vs. new Fabric/Bridgeless) the consuming app is running. No overlay window appears on screen yet at the end of this milestone — that's expected and correct.

**Primary test device:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31), per the locked-in decision in the main plan. Permission-flow UI (the `ACTION_MANAGE_OVERLAY_PERMISSION` settings redirect) can behave slightly differently across OEM skins, so verify the permission round-trip on this device specifically, not just an emulator.

---

## Step 0 — Prerequisites

Same baseline as Milestone 0 (Node 18+, JDK 17, Android SDK/`adb`, the POCO M3 connected via USB with debugging enabled). Additionally:

```bash
npm install -g eas-cli   # not used yet, but worth confirming installs cleanly before later milestones
```

Decide on your npm package name now, since it gets baked into folder names, Android package IDs, and `package.json` early. This guide uses `popscreen` throughout — substitute your real name if different.

---

## Step 1 — Scaffold the standalone Expo module

This is the actual library repository — not a throwaway project this time. Run this in the parent directory where you want the `popscreen/` folder to live:

```bash
npx create-expo-module@latest popscreen
```

This prompts interactively. Answer as follows, matching the locked-in decisions from the main plan:

- **What is the npm package name?** → `popscreen`
- **What is the native module name?** → `PopScreen`
- **What is the Android package name?** → e.g. `expo.modules.popscreen` (default suggestion is usually fine)
- **Do you want to use Kotlin for Android?** → Yes
- Accept defaults for the rest (iOS will scaffold too — per the main plan, iOS is explicitly unsupported for the overlay feature itself, but the standard scaffold includes it; you'll leave the iOS module mostly empty or stub it later)

**Crucially: do not pass `--local`.** Per the npm-publishing decision, this must be a standalone module — its own package, own `package.json`, own example app — not a module embedded inside a single consuming app's `modules/` folder.

```bash
cd popscreen
```

Inspect what was generated:

```
popscreen/
├── android/
│   └── src/main/java/expo/modules/popscreen/
│       ├── PopScreenModule.kt        # auto-generated starter module
│       └── PopScreenView.kt          # auto-generated starter view (you'll likely delete this)
├── ios/                              # scaffolded but not the focus of this project
├── src/
│   ├── index.ts
│   ├── PopScreenModule.ts
│   ├── PopScreenView.tsx
│   └── PopScreen.types.ts
├── example/                          # a full Expo app for testing the module live
├── expo-module.config.json
├── package.json
└── README.md
```

---

## Step 2 — Remove the scaffolded view module (not needed for PopScreen)

The default template includes an example native *view* component (`PopScreenView`), since many Expo modules expose native UI components. PopScreen doesn't need this — the overlay is a `Service`-hosted window, not a React-rendered native view embedded in the host app's own view hierarchy. Per Expo's own guidance for modules that don't need a view, clean it up:

```bash
rm android/src/main/java/expo/modules/popscreen/PopScreenView.kt
rm src/PopScreenView.tsx
rm ios/PopScreenView.swift   # if present
```

Edit **`src/index.ts`** to remove the view export (keep only the module export):

```ts
export { default } from './PopScreenModule';
export * from './PopScreen.types';
```

You'll flesh out `PopScreen.types.ts` and `PopScreenModule.ts` properly in Step 5.

---

## Step 3 — Write the real `PopScreenModule.kt` using the Expo Modules API DSL

Replace the generated starter content in **`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`** with the Milestone-1 scope: permission functions plus the architecture-detection groundwork. (Overlay window functions like `show`/`hide`/`setWindowRect` come in Milestone 2 — don't add them yet, to keep this milestone's surface area honest to its actual scope.)

```kotlin
package expo.modules.popscreen

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
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

    // Milestone 1 groundwork: lets JS (and our own later native code) know
    // which RN architecture this consuming app is running under, since
    // Milestone 2's ReactSurfaceHost needs two different code paths
    // (ReactHost.createSurface for New Architecture vs. ReactRootView +
    // ReactInstanceManager for old architecture/bridge apps).
    AsyncFunction("getReactArchitectureInfo") {
      ReactArchitectureDetector.detect(appContext)
    }
  }
}
```

> Note the use of `appContext.reactContext` rather than a bare `reactContext` property, and the `Exceptions.ReactContextLost()` guard — this is the current, correct accessor pattern for Expo Modules on Android. Avoid any pattern relying on a bare top-level `currentActivity` property; that has been deprecated/removed in current React Native versions. Always go through `appContext.reactContext` / `appContext.currentActivity`.

---

## Step 4 — Build the architecture-detection helper (the dual old/new-arch groundwork)

Create a new file, **`android/src/main/java/expo/modules/popscreen/ReactArchitectureDetector.kt`**:

```kotlin
package expo.modules.popscreen

import expo.modules.kotlin.AppContext

/**
 * Milestone 1 groundwork only: detects whether the consuming app is running
 * on React Native's New Architecture (Fabric/Bridgeless, exposing a
 * ReactHost) or the old architecture/bridge (exposing a
 * ReactInstanceManager via ReactNativeHost).
 *
 * This module does NOT yet attach any surface to a window — that's
 * Milestone 2's PopScreenReactSurfaceHost. This class's only job in
 * Milestone 1 is to answer the question "which path will Milestone 2 need
 * to take?" so the detection logic can be written, tested, and trusted
 * before any window-hosting code depends on it.
 */
object ReactArchitectureDetector {

  enum class Architecture {
    NEW_ARCHITECTURE,  // ReactHost / Bridgeless / Fabric
    OLD_ARCHITECTURE,  // ReactInstanceManager / bridge
    UNKNOWN
  }

  data class Info(
    val architecture: Architecture,
    val reactNativeVersion: String?
  )

  fun detect(appContext: AppContext): Map<String, Any?> {
    val architecture = try {
      val reactContext = appContext.reactContext
      val application = reactContext?.applicationContext

      // ReactHost-bearing apps (New Architecture) expose a getReactHost()
      // method on their Application class; old-architecture apps expose
      // getReactNativeHost() returning a ReactInstanceManager via
      // .reactInstanceManager. We probe for the New Architecture entry
      // point first via reflection, since there is no stable public
      // interface guaranteed across RN versions for this check yet.
      val hasReactHostMethod = application?.javaClass?.methods?.any {
        it.name == "getReactHost"
      } ?: false

      if (hasReactHostMethod) {
        Architecture.NEW_ARCHITECTURE
      } else {
        val hasReactNativeHostMethod = application?.javaClass?.methods?.any {
          it.name == "getReactNativeHost"
        } ?: false
        if (hasReactNativeHostMethod) Architecture.OLD_ARCHITECTURE else Architecture.UNKNOWN
      }
    } catch (e: Exception) {
      Architecture.UNKNOWN
    }

    return mapOf(
      "architecture" to architecture.name,
      "isNewArchitecture" to (architecture == Architecture.NEW_ARCHITECTURE)
    )
  }
}
```

> **Why reflection, and why this is "good enough" for Milestone 1 but will need revisiting in Milestone 2:** there is no single small, stable, version-independent public API across all currently-supported RN versions to ask "am I on the New Architecture?" from inside a third-party native module. Reflecting on the host `Application` class for `getReactHost()` vs `getReactNativeHost()` is a pragmatic, documented community pattern, but the main plan already flags (§18, Risks) that the multi-surface hosting APIs are less publicly documented and version-sensitive — budget real time in Milestone 2 to harden this detection against the specific RN versions you choose to support, rather than treating this Milestone 1 version as final.

---

## Step 5 — Write the TypeScript wrapper and types

Edit **`src/PopScreen.types.ts`**:

```ts
export type ReactArchitecture = 'NEW_ARCHITECTURE' | 'OLD_ARCHITECTURE' | 'UNKNOWN';

export type ReactArchitectureInfo = {
  architecture: ReactArchitecture;
  isNewArchitecture: boolean;
};

export type PermissionResultEvent = {
  granted: boolean;
};
```

Edit **`src/PopScreenModule.ts`**:

```ts
import { NativeModule, requireNativeModule } from 'expo-modules-core';
import { ReactArchitectureInfo } from './PopScreen.types';

declare class PopScreenModule extends NativeModule {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
}

export default requireNativeModule<PopScreenModule>('PopScreen');
```

Edit **`src/index.ts`** to expose a clean public surface for this milestone (no overlay-window functions yet — those arrive in Milestone 2's update to this same file):

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

export * from './PopScreen.types';
```

---

## Step 6 — Build the config plugin (manifest permissions + service declaration)

Even though the `Service` itself doesn't exist until Milestone 2, write the config plugin now so the manifest wiring is correct and tested before any native window code depends on it being right. Create **`plugin/src/index.ts`**:

```ts
import {
  ConfigPlugin,
  withAndroidManifest,
  AndroidConfig,
} from 'expo/config-plugins';

const OVERLAY_SERVICE_NAME = '.PopScreenOverlayService';

const withPopScreenAndroidManifest: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Step 6a — permissions (per docs/implementation-plan.md §15)
    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
    ]);

    // Step 6b — service declaration.
    // The <service> tag itself has no high-level AndroidConfig helper the
    // way permissions do, so we manipulate the manifest's application
    // node directly. Note: OverlayService.kt does not exist until
    // Milestone 2 — this declaration is forward-looking, written now so
    // the manifest plumbing is validated before the native class exists.
    // expo prebuild does not fail on a <service android:name> that
    // doesn't yet resolve to a class at config-plugin-evaluation time,
    // since manifest merging and Kotlin compilation happen as separate
    // build steps — but the app WILL fail to build once compiled, until
    // the Kotlin class exists. That's expected and is resolved in
    // Milestone 2, not a bug in this plugin.
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const alreadyDeclared = mainApplication.service.some(
      (s) => s.$['android:name'] === OVERLAY_SERVICE_NAME
    );

    if (!alreadyDeclared) {
      mainApplication.service.push({
        $: {
          'android:name': OVERLAY_SERVICE_NAME,
          'android:foregroundServiceType': 'specialUse',
          'android:exported': 'false',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'floating_overlay_ui',
            },
          },
        ],
      } as any);
    }

    return config;
  });
};

export default withPopScreenAndroidManifest;
```

Create **`app.plugin.js`** at the repository root (this is the entry point Expo's config system looks for when a consumer references the package by name in their `app.json`/`app.config.js` plugins array):

```js
module.exports = require('./plugin/build');
```

Add a build script for the plugin's TypeScript in **`package.json`** (the `create-expo-module` scaffold typically already wires most of this via `expo-module-scripts`, but confirm a `plugin` build target exists):

```json
{
  "scripts": {
    "build": "expo-module build",
    "build:plugin": "tsc --build plugin",
    "prepare": "expo-module prepare"
  }
}
```

Build the plugin once to confirm it compiles:

```bash
npm run build:plugin
```

---

## Step 7 — Wire the plugin into the example app

Open **`example/app.json`** (the scaffolded example app that ships inside the standalone module) and add the plugin reference:

```json
{
  "expo": {
    "name": "popscreen-example",
    "plugins": ["../app.plugin.js"]
  }
}
```

---

## Step 8 — Prebuild and verify the manifest output

```bash
cd example
npx expo prebuild --platform android --clean
```

Open the generated **`example/android/app/src/main/AndroidManifest.xml`** and confirm:

- `<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />` is present
- `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />` is present
- `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />` is present
- A `<service android:name=".PopScreenOverlayService" android:foregroundServiceType="specialUse" ...>` entry exists, with the `PROPERTY_SPECIAL_USE_FGS_SUBTYPE` property nested inside it

If any of these are missing, the issue is almost always one of: the plugin not referenced correctly in `example/app.json`, the plugin not rebuilt after a TypeScript edit (`npm run build:plugin`), or a typo in the manifest manipulation code in Step 6.

**Expected build outcome at this point:** `expo prebuild` succeeds (manifest merging doesn't validate that referenced classes exist). However, do **not** yet run `expo run:android` to a full app build — the project will fail to compile, because `PopScreenOverlayService.kt` referenced in the manifest doesn't exist yet (that's Milestone 2). This is expected; Step 9 below validates only the JS-callable functions that don't depend on the service.

---

## Step 9 — Build a minimal example app screen to validate the permission functions and architecture detection end-to-end

Edit **`example/App.tsx`**:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as PopScreen from 'popscreen';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [archInfo, setArchInfo] = useState<string>('checking...');

  useEffect(() => {
    PopScreen.hasOverlayPermission().then(setHasPermission);
    PopScreen.getReactArchitectureInfo().then((info) => {
      setArchInfo(`${info.architecture} (isNewArchitecture: ${info.isNewArchitecture})`);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 1 Verification</Text>
      <Text>Overlay permission granted: {String(hasPermission)}</Text>
      <Text>Detected architecture: {archInfo}</Text>
      <Button
        title="Request Overlay Permission"
        onPress={() => PopScreen.requestOverlayPermission()}
      />
      <Button
        title="Re-check Permission"
        onPress={() => PopScreen.hasOverlayPermission().then(setHasPermission)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
});
```

Since this project still has a `<service>` declared in the manifest pointing at a class that doesn't exist, you need a temporary stand-in so the app compiles and runs in Milestone 1. Create a minimal placeholder:

**`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`**

```kotlin
package expo.modules.popscreen

import android.app.Service
import android.content.Intent
import android.os.IBinder

/**
 * Placeholder only for Milestone 1, so the app referencing this class in
 * AndroidManifest.xml (via the config plugin, Step 6) compiles and runs.
 * Real WindowManager/ReactRootView overlay logic is built in Milestone 2 —
 * do not add window-hosting code here yet; keep this milestone's scope to
 * "the manifest declaration is correct and the app builds," nothing more.
 */
class PopScreenOverlayService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null
}
```

Now run the example app on the POCO M3:

```bash
cd example
npx expo run:android --device
```

---

## Step 10 — Manual test sequence

1. Launch the app. Confirm `Overlay permission granted: false` initially (unless already granted on this device).
2. Confirm `Detected architecture: ...` resolves to either `NEW_ARCHITECTURE` or `OLD_ARCHITECTURE` — **not** `UNKNOWN`. If it shows `UNKNOWN`, the reflection-based detection in Step 4 needs debugging before continuing — this is the single most important check in this milestone, since Milestone 2 depends entirely on this being correct.
3. Tap **Request Overlay Permission**. Confirm Android navigates to the "draw over other apps" settings screen specifically for this app (not a generic settings list — verify the correct package's toggle is shown).
4. Toggle the permission on. Navigate back to the app.
5. Tap **Re-check Permission**. Confirm it now reads `true`.
6. Force-stop the app and relaunch it fresh. Confirm `hasOverlayPermission()` correctly reads `true` on a cold start too (i.e., the permission state persists correctly and isn't being re-derived incorrectly).
7. Manually revoke the permission via Android Settings → Apps → [your app] → "Display over other apps" → toggle off. Relaunch the app and confirm `hasOverlayPermission()` now correctly reads `false`.

---

## Step 11 — Pass / fail criteria

This milestone is a **PASS** only if all of the following are true:

- [ ] `npx create-expo-module` produced a standalone (non-`--local`) module with its own `package.json`, ready in principle for `npm publish` later.
- [ ] `hasOverlayPermission()` and `requestOverlayPermission()` work correctly end-to-end from the example app on the POCO M3, including the revoke→re-check path from Step 10.7.
- [ ] `getReactArchitectureInfo()` correctly reports `NEW_ARCHITECTURE` or `OLD_ARCHITECTURE` (never `UNKNOWN`) on the example app as scaffolded by the current Expo SDK version you're targeting.
- [ ] The config plugin, not hand-edited XML, is solely responsible for the manifest's permissions and service declaration — confirmed by running `expo prebuild --clean` again and re-checking the manifest still has all required entries with zero manual intervention.
- [ ] The example app builds and runs without crashing, despite `PopScreenOverlayService` being an intentionally empty placeholder.

If `getReactArchitectureInfo()` returns `UNKNOWN`, do not proceed to Milestone 2 — this detection is foundational to the entire dual-architecture surface-hosting strategy, and Milestone 2's `PopScreenReactSurfaceHost` cannot be built correctly on top of an unreliable signal.

---

## What this milestone deliberately does NOT include (left for Milestone 2 and later)

- Any `WindowManager` code, any `ReactRootView`/`ReactSurface` attachment, or anything that puts a visible overlay window on screen.
- `show()`, `hide()`, `destroy()`, `setWindowRect()`, or any of the other window-mechanics functions from the main plan's §6 module surface — those are Milestone 2+.
- Drag, resize, minimize, touch interception (Milestones 3–4).
- The real `PopScreenContent` / `usePopScreen()` JS API surface (Milestone 5).
- Hardening the architecture-detection reflection logic against every RN version PopScreen intends to support — Step 4's implementation is a working first pass, not the final version.

---

*End of Milestone 1 guide. On a clean PASS, proceed to Milestone 2 in the main implementation plan (`docs/implementation-plan.md`), which builds `PopScreenOverlayService` for real and replaces the Step 9 placeholder.*
