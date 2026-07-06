# PopScreen — Milestone 1: Expo Module Scaffolding — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 1-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ বিল্ড গাইড, যেমনটি `docs/implementation-plan-bn.md` §২০-এ বর্ণিত আছে:

> Milestone 1 — Expo মডিউল স্ক্যাফোল্ডিং
> `create-expo-module` সেটআপ (standalone, npm-publishable — `--local` ফ্ল্যাগ ছাড়া), manifest পারমিশন/service declaration-এর জন্য config plugin, একটি dev-client example app থেকে এন্ড-টু-এন্ড কাজ করা বেসিক `requestOverlayPermission`/`hasOverlayPermission` ফাংশন।
> পুরোনো/নতুন-আর্কিটেকচার সারফেস-হোস্টিং দ্বৈত কোড পাথ (§৬ অনুসারে) দ্রুত স্থাপন করুন, কারণ পরে এটি retrofit করতে গেলে প্রায় প্রতিটি নেটিভ ফাইল ছুঁতে হবে।

**এই মাইলফলকটি যা *নয়়*:** এটি ওভারলে উইন্ডো, `WindowManager`, বা `ReactRootView` অ্যাটাচমেন্ট বানানোর জায়গা না — সেটি Milestone 2। Milestone 0-এর স্পাইক ইতিমধ্যেই একটি throwaway প্রজেক্টে মূল ওভারলে hypothesis কাজ করে তা প্রমাণ করেছে; এই মাইলফলকের কাজ হলো *আসল*, জেনেরিক, npm-publishable PopScreen প্যাকেজটি নিয়ে এর plumbing শক্তিশালী করা: Expo Modules API DSL-এর মাধ্যমে একটি যথাযথ Expo Module, হাতে-এডিট করা manifest-এর বদলে একটি config plugin, এন্ড-টু-এন্ড কাজ করা পারমিশন ফাংশন, এবং এমন একটি ভিত্তি যা মডিউলটিকে detect করতে দেয় consumer অ্যাপটি কোন RN আর্কিটেকচারে (পুরোনো bridge নাকি নতুন Fabric/Bridgeless) চলছে। এই মাইলফলকের শেষে স্ক্রিনে এখনও কোনো ওভারলে উইন্ডো দেখা যাবে না — এটিই প্রত্যাশিত এবং সঠিক।

**প্রাইমারি টেস্ট ডিভাইস:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31), মূল প্ল্যানের নির্ধারিত সিদ্ধান্ত অনুসারে। পারমিশন-ফ্লো UI (`ACTION_MANAGE_OVERLAY_PERMISSION` settings redirect) বিভিন্ন OEM স্কিনে সামান্য ভিন্নভাবে আচরণ করতে পারে, তাই শুধু এমুলেটরে না, এই ডিভাইসেই নির্দিষ্টভাবে পারমিশন round-trip ভেরিফাই করুন।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

Milestone 0-এর মতই একই baseline (Node 18+, JDK 17, Android SDK/`adb`, USB debugging enabled সহ কানেক্টেড POCO M3)। এর সাথে অতিরিক্ত:

```bash
npm install -g eas-cli   # not used yet, but worth confirming installs cleanly before later milestones
```

এখনই আপনার npm প্যাকেজের নাম ঠিক করুন, কারণ এটি ফোল্ডারের নাম, Android প্যাকেজ ID, এবং `package.json`-এ শুরু থেকেই বেক হয়ে যায়। এই গাইডে পুরোটা জুড়ে `popscreen` ব্যবহার করা হয়েছে — আপনার আসল নাম ভিন্ন হলে সেটি বসিয়ে নিন।

---

## Step 1 — স্ট্যান্ডঅ্যালোন Expo মডিউল স্ক্যাফোল্ড করুন

এবার এটিই আসল লাইব্রেরি রিপোজিটরি — এবার আর throwaway প্রজেক্ট না। আপনি যে ডিরেক্টরিতে `popscreen/` ফোল্ডারটি রাখতে চান, সেই parent ডিরেক্টরিতে এটি চালান:

```bash
npx create-expo-module@latest popscreen
```

এটি ইন্টারঅ্যাক্টিভভাবে প্রম্পট করবে। মূল প্ল্যানের নির্ধারিত সিদ্ধান্ত অনুসারে এভাবে উত্তর দিন:

- **What is the npm package name?** → `popscreen`
- **What is the native module name?** → `PopScreen`
- **What is the Android package name?** → যেমন `expo.modules.popscreen` (ডিফল্ট সাজেশন সাধারণত ঠিকঠাক)
- **Do you want to use Kotlin for Android?** → Yes
- বাকিগুলোর জন্য ডিফল্ট গ্রহণ করুন (iOS-ও স্ক্যাফোল্ড হবে — মূল প্ল্যান অনুসারে, iOS ওভারলে ফিচারের জন্য স্পষ্টভাবে আনসাপোর্টেড, কিন্তু স্ট্যান্ডার্ড স্ক্যাফোল্ডে এটি অন্তর্ভুক্ত থাকে; আপনি iOS মডিউলটিকে বেশিরভাগ খালি রাখতে পারেন বা পরে stub করতে পারেন)

**গুরুত্বপূর্ণ: `--local` পাস করবেন না।** npm-publishing সিদ্ধান্ত অনুসারে, এটি অবশ্যই একটি standalone module হতে হবে — নিজস্ব প্যাকেজ, নিজস্ব `package.json`, নিজস্ব example app — কোনো একক consumer অ্যাপের `modules/` ফোল্ডারে embedded একটি module না।

```bash
cd popscreen
```

কী জেনারেট হয়েছে তা পরীক্ষা করুন:

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

## Step 2 — স্ক্যাফোল্ডেড view মডিউল রিমুভ করুন (PopScreen-এর জন্য প্রয়োজন নেই)

ডিফল্ট টেমপ্লেটে একটি example নেটিভ *view* কম্পোনেন্ট (`PopScreenView`) থাকে, কারণ অনেক Expo মডিউল নেটিভ UI কম্পোনেন্ট এক্সপোজ করে। PopScreen-এর এটি প্রয়োজন নেই — ওভারলেটি একটি `Service`-হোস্টেড উইন্ডো, host অ্যাপের নিজস্ব view hierarchy-তে embedded একটি React-rendered নেটিভ ভিউ না। ভিউ প্রয়োজন নেই এমন মডিউলের জন্য Expo-র নিজস্ব গাইডেন্স অনুসারে, এটি পরিষ্কার করুন:

```bash
rm android/src/main/java/expo/modules/popscreen/PopScreenView.kt
rm src/PopScreenView.tsx
rm ios/PopScreenView.swift   # if present
```

**`src/index.ts`** এডিট করুন view export বাদ দিয়ে (শুধু module export রাখুন):

```ts
export { default } from './PopScreenModule';
export * from './PopScreen.types';
```

Step 5-এ আপনি যথাযথভাবে `PopScreen.types.ts` এবং `PopScreenModule.ts` সাজাবেন।

---

## Step 3 — Expo Modules API DSL ব্যবহার করে আসল `PopScreenModule.kt` লিখুন

**`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`**-এ জেনারেট হওয়া starter কনটেন্ট Milestone-1-এর স্কোপ দিয়ে রিপ্লেস করুন: পারমিশন ফাংশন এবং আর্কিটেকচার-ডিটেকশন ভিত্তি। (`show`/`hide`/`setWindowRect`-এর মতো উইন্ডো-মেকানিক্স ফাংশন আসবে Milestone 2-এ — এখনই এগুলো যোগ করবেন না, যাতে এই মাইলফলকের surface area তার আসল স্কোপের প্রতি সৎ থাকে।)

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

> খেয়াল করুন একটি bare `reactContext` প্রপার্টির বদলে `appContext.reactContext` ব্যবহার করা হয়েছে, এবং `Exceptions.ReactContextLost()` গার্ড — Android-এ Expo Modules-এর জন্য এটিই বর্তমান, সঠিক accessor প্যাটার্ন। একটি bare top-level `currentActivity` প্রপার্টির উপর নির্ভর করে এমন কোনো প্যাটার্ন এড়িয়ে চলুন; বর্তমান React Native ভার্সনে এটি deprecated/removed। সবসময় `appContext.reactContext` / `appContext.currentActivity`-এর মাধ্যমে যান।

---

## Step 4 — আর্কিটেকচার-ডিটেকশন হেল্পার বানান (দ্বৈত পুরোনো/নতুন-আর্কিটেকচার ভিত্তি)

একটি নতুন ফাইল তৈরি করুন, **`android/src/main/java/expo/modules/popscreen/ReactArchitectureDetector.kt`**:

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

> **কেন reflection, এবং কেন এটি Milestone 1-এর জন্য "যথেষ্ট ভালো" কিন্তু Milestone 2-তে পুনর্বিবেচনার প্রয়োজন হবে:** বর্তমানে সাপোর্টেড সব RN ভার্সনে "আমি কি New Architecture-এ আছি?" জিজ্ঞাসা করার জন্য একটি single ছোট, স্টেবল, ভার্সন-স্বাধীন পাবলিক API নেই, একটি থার্ড-পার্টি নেটিভ মডিউলের ভেতর থেকে। `getReactHost()` বনাম `getReactNativeHost()`-এর জন্য host `Application` ক্লাসে reflect করা একটি প্র্যাকটিক্যাল, ডকুমেন্টেড কমিউনিটি প্যাটার্ন, কিন্তু মূল প্ল্যান ইতিমধ্যেই ফ্ল্যাগ করেছে (§১৮, Risks) যে multi-surface hosting API-গুলো কম পাবলিকলি ডকুমেন্টেড এবং ভার্সন-সেনসিটিভ — আপনি যে নির্দিষ্ট RN ভার্সনগুলো সাপোর্ট করতে চান তার বিরুদ্ধে এই detection-কে harden করার জন্য Milestone 2-তে আসল সময় বরাদ্দ রাখুন, এই Milestone 1 ভার্সনটিকে final হিসেবে গ্রহণ না করে।

---

## Step 5 — TypeScript wrapper এবং types লিখুন

**`src/PopScreen.types.ts`** এডিট করুন:

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

**`src/PopScreenModule.ts`** এডিট করুন:

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

**`src/index.ts`** এডিট করুন এই মাইলফলকের জন্য একটি পরিচ্ছন্ন পাবলিক সারফেস এক্সপোজ করতে (এখনও কোনো ওভারলে-উইন্ডো ফাংশন নেই — সেগুলো Milestone 2-তে এই একই ফাইলের আপডেটে আসবে):

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

## Step 6 — config plugin বানান (manifest পারমিশন + service declaration)

`Service` নিজে Milestone 2-এর আগে অস্তিত্বে আসে না, তবুও এখনই config plugin লিখুন, যাতে কোনো নেটিভ window কোড এর সঠিকতার উপর নির্ভর করার আগেই manifest wiring সঠিক এবং টেস্টেড থাকে। **`plugin/src/index.ts`** তৈরি করুন:

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

রিপোজিটরির রুটে **`app.plugin.js`** তৈরি করুন (Expo-র config সিস্টেম এই entry point খোঁজে, যখন কোনো consumer তাদের `app.json`/`app.config.js`-এর plugins array-তে নাম দিয়ে প্যাকেজটি রেফারেন্স করে):

```js
module.exports = require('./plugin/build');
```

**`package.json`**-এ plugin-এর TypeScript-এর জন্য একটি build script যোগ করুন (`create-expo-module` স্ক্যাফোল্ড সাধারণত `expo-module-scripts`-এর মাধ্যমে এর বেশিরভাগ অংশ আগে থেকেই wire করে রাখে, কিন্তু নিশ্চিত করুন একটি `plugin` build target আছে কিনা):

```json
{
  "scripts": {
    "build": "expo-module build",
    "build:plugin": "tsc --build plugin",
    "prepare": "expo-module prepare"
  }
}
```

এটি কম্পাইল হয় কিনা নিশ্চিত করতে একবার plugin বিল্ড করুন:

```bash
npm run build:plugin
```

---

## Step 7 — example app-এ plugin-টি wire করুন

**`example/app.json`** খুলুন (standalone module-এর ভেতরে শিপ হওয়া স্ক্যাফোল্ডেড example app) এবং plugin রেফারেন্স যোগ করুন:

```json
{
  "expo": {
    "name": "popscreen-example",
    "plugins": ["../app.plugin.js"]
  }
}
```

---

## Step 8 — Prebuild করুন এবং manifest আউটপুট ভেরিফাই করুন

```bash
cd example
npx expo prebuild --platform android --clean
```

জেনারেট হওয়া **`example/android/app/src/main/AndroidManifest.xml`** খুলুন এবং নিশ্চিত করুন:

- `<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />` উপস্থিত
- `<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />` উপস্থিত
- `<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />` উপস্থিত
- একটি `<service android:name=".PopScreenOverlayService" android:foregroundServiceType="specialUse" ...>` এন্ট্রি আছে, এর ভেতরে nested `PROPERTY_SPECIAL_USE_FGS_SUBTYPE` প্রপার্টি সহ

এর কোনোটি না থাকলে, সমস্যাটি প্রায় সবসময় এর একটি: plugin-টি `example/app.json`-এ সঠিকভাবে রেফারেন্স করা হয়নি, একটি TypeScript এডিটের পর plugin rebuild করা হয়নি (`npm run build:plugin`), অথবা Step 6-এর manifest manipulation কোডে একটি টাইপো।

**এই পয়েন্টে প্রত্যাশিত বিল্ড ফলাফল:** `expo prebuild` সফল হবে (manifest merging রেফারেন্সড ক্লাসগুলো অস্তিত্বে আছে কিনা validate করে না)। তবে, এখনই একটি সম্পূর্ণ app build-এর জন্য `expo run:android` চালাবেন **না** — প্রজেক্ট কম্পাইল করতে ব্যর্থ হবে, কারণ manifest-এ রেফারেন্স করা `PopScreenOverlayService.kt` এখনও অস্তিত্বে নেই (এটি Milestone 2)। এটিই প্রত্যাশিত; নিচের Step 9 শুধুমাত্র service-এর উপর নির্ভর না করা JS-callable ফাংশনগুলো ভ্যালিডেট করে।

---

## Step 9 — পারমিশন ফাংশন এবং আর্কিটেকচার ডিটেকশন এন্ড-টু-এন্ড ভ্যালিডেট করার জন্য একটি মিনিমাল example app স্ক্রিন বানান

**`example/App.tsx`** এডিট করুন:

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

যেহেতু এই প্রজেক্টে এখনও manifest-এ একটি `<service>` ডিক্লেয়ার করা আছে যা অস্তিত্বহীন একটি ক্লাসকে পয়েন্ট করছে, Milestone 1-এ অ্যাপটি কম্পাইল এবং চলার জন্য আপনার একটি সাময়িক স্ট্যান্ড-ইন প্রয়োজন। একটি মিনিমাল প্লেসহোল্ডার তৈরি করুন:

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

এখন POCO M3-এ example app চালান:

```bash
cd example
npx expo run:android --device
```

---

## Step 10 — ম্যানুয়াল টেস্ট সিকোয়েন্স

১. অ্যাপটি লঞ্চ করুন। নিশ্চিত করুন প্রাথমিকভাবে `Overlay permission granted: false` দেখাচ্ছে (যদি না এই ডিভাইসে আগে থেকেই গ্র্যান্ট করা থাকে)।
২. নিশ্চিত করুন `Detected architecture: ...` হয় `NEW_ARCHITECTURE` অথবা `OLD_ARCHITECTURE`-এ resolve হচ্ছে — `UNKNOWN` **না**। যদি এটি `UNKNOWN` দেখায়, Step 4-এর reflection-ভিত্তিক detection-এ এগোনোর আগে debug করতে হবে — এটিই এই মাইলফলকের সবচেয়ে গুরুত্বপূর্ণ চেক, কারণ Milestone 2 সম্পূর্ণভাবে এটি সঠিক হওয়ার উপর নির্ভর করে।
৩. **Request Overlay Permission**-এ ট্যাপ করুন। নিশ্চিত করুন Android এই অ্যাপের জন্য নির্দিষ্টভাবে "draw over other apps" সেটিংস স্ক্রিনে নেভিগেট করে (কোনো জেনেরিক সেটিংস লিস্ট না — সঠিক প্যাকেজের toggle দেখানো হচ্ছে কিনা ভেরিফাই করুন)।
৪. পারমিশনটি অন টগল করুন। অ্যাপে ফিরে যান।
৫. **Re-check Permission**-এ ট্যাপ করুন। নিশ্চিত করুন এটি এখন `true` দেখাচ্ছে।
৬. অ্যাপটি force-stop করুন এবং নতুন করে লঞ্চ করুন। নিশ্চিত করুন `hasOverlayPermission()` একটি cold start-এও সঠিকভাবে `true` দেখাচ্ছে (অর্থাৎ, পারমিশন স্টেট সঠিকভাবে persist করছে এবং ভুলভাবে re-derive হচ্ছে না)।
৭. Android Settings → Apps → [আপনার অ্যাপ] → "Display over other apps"-এর মাধ্যমে ম্যানুয়ালি পারমিশন revoke করুন → toggle off করুন। অ্যাপটি আবার লঞ্চ করুন এবং নিশ্চিত করুন `hasOverlayPermission()` এখন সঠিকভাবে `false` দেখাচ্ছে।

---

## Step 11 — পাস / ফেইল মানদণ্ড

এই মাইলফলকটি **PASS** হবে শুধুমাত্র যদি নিচের সবগুলো সত্য হয়:

- [ ] `npx create-expo-module` একটি standalone (non-`--local`) module তৈরি করেছে যার নিজস্ব `package.json` আছে, নীতিগতভাবে পরে `npm publish`-এর জন্য প্রস্তুত।
- [ ] POCO M3-এ example app থেকে `hasOverlayPermission()` এবং `requestOverlayPermission()` সঠিকভাবে এন্ড-টু-এন্ড কাজ করে, Step 10.7-এর revoke→re-check পাথ সহ।
- [ ] আপনি বর্তমানে যে Expo SDK ভার্সন টার্গেট করছেন তাতে স্ক্যাফোল্ড করা example app-এ `getReactArchitectureInfo()` সঠিকভাবে `NEW_ARCHITECTURE` বা `OLD_ARCHITECTURE` রিপোর্ট করে (কখনো `UNKNOWN` না)।
- [ ] manifest-এর পারমিশন এবং service declaration-এর জন্য হাতে-এডিট করা XML না, শুধুমাত্র config plugin-ই দায়ী — পুনরায় `expo prebuild --clean` চালিয়ে এবং কোনো ম্যানুয়াল হস্তক্ষেপ ছাড়াই manifest-এ এখনও সব প্রয়োজনীয় এন্ট্রি আছে কিনা পুনরায় চেক করে নিশ্চিত করা হয়েছে।
- [ ] `PopScreenOverlayService` একটি ইচ্ছাকৃতভাবে খালি প্লেসহোল্ডার হওয়া সত্ত্বেও, example app crash ছাড়াই বিল্ড এবং রান করে।

যদি `getReactArchitectureInfo()` `UNKNOWN` রিটার্ন করে, Milestone 2-তে অগ্রসর হবেন না — এই detection-টি পুরো দ্বৈত-আর্কিটেকচার সারফেস-হোস্টিং স্ট্র্যাটেজির ভিত্তি, এবং Milestone 2-এর `PopScreenReactSurfaceHost` একটি অনির্ভরযোগ্য সিগন্যালের উপর ভিত্তি করে সঠিকভাবে বানানো যাবে না।

---

## এই মাইলফলক ইচ্ছাকৃতভাবে যা অন্তর্ভুক্ত করে না (Milestone 2 এবং পরবর্তীর জন্য রাখা হয়েছে)

- কোনো `WindowManager` কোড, কোনো `ReactRootView`/`ReactSurface` অ্যাটাচমেন্ট, বা স্ক্রিনে একটি দৃশ্যমান ওভারলে উইন্ডো রাখে এমন কিছুই না।
- মূল প্ল্যানের §৬ মডিউল সারফেস থেকে `show()`, `hide()`, `destroy()`, `setWindowRect()`, বা অন্যান্য উইন্ডো-মেকানিক্স ফাংশন — সেগুলো Milestone 2+।
- Drag, resize, minimize, টাচ ইন্টারসেপশন (Milestone ৩–৪)।
- আসল `PopScreenContent` / `usePopScreen()` JS API সারফেস (Milestone 5)।
- PopScreen যে সব RN ভার্সন সাপোর্ট করতে চায় তার বিরুদ্ধে আর্কিটেকচার-ডিটেকশন reflection লজিক harden করা — Step 4-এর ইমপ্লিমেন্টেশনটি একটি কার্যকর প্রথম পাস, ফাইনাল ভার্সন না।

---

*Milestone 1 গাইডের সমাপ্তি। একটি ক্লিন PASS-এর পর, মূল implementation plan-এ (`docs/implementation-plan-bn.md`) Milestone 2-তে অগ্রসর হন, যা প্রকৃতপক্ষে `PopScreenOverlayService` বানাবে এবং Step 9-এর প্লেসহোল্ডারটি প্রতিস্থাপন করবে।*
