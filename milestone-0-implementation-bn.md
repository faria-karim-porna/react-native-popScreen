# PopScreen — Milestone 0: স্পাইক / ভ্যালিডেশন — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 0-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ বিল্ড গাইড — `docs/implementation-plan-bn.md` §২০-এ বর্ণিত ডি-রিস্কিং স্পাইক। এখানে যা আছে তার কিছুই আসল PopScreen লাইব্রেরিতে পুনঃব্যবহারের জন্য নয়; এটি throwaway/মিনিমাল কোড, যার একমাত্র কাজ হলো "আসল" আর্কিটেকচার কাজ শুরুর আগে নিশ্চিতভাবে একটি প্রশ্নের উত্তর দেওয়া:

> **একটি লাইভ React Native সারফেস কি একটি `TYPE_APPLICATION_OVERLAY` সিস্টেম উইন্ডোর ভেতরে রেন্ডার করতে পারে, এবং স্বাভাবিক RN re-render (স্টেট পরিবর্তন) কি প্রতি আপডেটে শূন্য নেটিভ involvement-সহ স্বয়ংক্রিয়ভাবে ওই উইন্ডোতে প্রবাহিত হয়?**

এই স্পাইক যদি কাজ করে, তাহলে মূল implementation plan-এর প্রতিটি আর্কিটেকচারাল দাবি (জেনেরিক Kotlin shell, RN-নিয়ন্ত্রিত UI, "push UI to native"-এর জন্য কোনো RPC নেই) এমপিরিক্যালি ভ্যালিডেটেড হয়ে যায়। যদি এটি প্রত্যাশিতভাবে কাজ না করে, আমরা এখনই তা জানতে পারব, একটি throwaway প্রজেক্টে, আসল লাইব্রেরির তিন মাইলফলক গভীরে গিয়ে নয়।

**প্রাইমারি টেস্ট ডিভাইস:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31) — মূল প্ল্যানের নির্ধারিত সিদ্ধান্ত অনুসারে। প্রথমে এই ফিজিক্যাল ডিভাইসেই প্রতিটি স্টেপ চালান। যদি এখানে কাজ করে — বাস্তবিকভাবে উপলভ্য সবচেয়ে ব্যাকগ্রাউন্ড-এক্সিকিউশন-শত্রু এনভায়রনমেন্টে — তাহলে এমুলেটর/অন্য ডিভাইসে পরবর্তী ভ্যালিডেশন তুলনামূলকভাবে কম-ঝুঁকিপূর্ণ।

**এই স্পাইকের জন্য স্কোপ সীমা (আসল লাইব্রেরির তুলনায় ইচ্ছাকৃতভাবে শর্টকাট নেওয়া হয়েছে):**
- এখনও কোনো Expo Modules API `ModuleDefinition` DSL নেই — কনসেপ্টটি প্রমাণ করার জন্য একটি মিনিমাল নেটিভ মডিউলই যথেষ্ট।
- কোনো জেনেরিক/কনফিগারেবল API নেই — সবকিছু hardcoded (ফিক্সড উইন্ডো সাইজ, ফিক্সড পজিশন, ফিক্সড পারমিশন ফ্লো)।
- কোনো drag, resize, minimize, বা টাচ ইন্টারসেপশন নেই — শুধু স্ট্যাটিক উইন্ডো।
- পুরোনো/নতুন-আর্কিটেকচার দ্বৈত সাপোর্ট নেই (Milestone 1-এর প্রয়োজনীয়তা) — fresh Expo প্রজেক্ট যে আর্কিটেকচার ডিফল্ট হিসেবে নেয়, এই স্পাইক শুধু সেটাতেই টার্গেট করবে।
- কোনো config plugin নেই — manifest পরিবর্তনগুলো generated `android/` ফোল্ডারে সরাসরি হাতে করা হয়, কারণ এই প্রজেক্টটি কখনো পাবলিশ বা re-prebuild করা হবে না।

এই শর্টকাটগুলো ইচ্ছাকৃত। উপরের মূল প্রশ্নের উত্তর দেওয়ার জন্য যা প্রয়োজন নয়, তা Milestone 0-এর স্কোপের বাইরে।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

শুরু করার আগে, আপনার ডেভেলপমেন্ট মেশিনে নিশ্চিত করুন:

```bash
node -v        # Node 18+ recommended
npm -v
java -version  # JDK 17 recommended for current Android Gradle Plugin versions
```

Android Studio ইনস্টল/উপস্থিত আছে কিনা নিশ্চিত করুন (Android SDK, platform tools, এবং `adb logcat`-এর মাধ্যমে লগ দেখার সহজ উপায়ের জন্য প্রয়োজন), এবং `adb` আপনার `PATH`-এ আছে কিনা:

```bash
adb --version
```

POCO M3 USB-এর মাধ্যমে কানেক্ট করুন, Developer Options → USB Debugging enable করে, এবং নিশ্চিত করুন এটি দেখা যাচ্ছে:

```bash
adb devices
# should list your POCO M3's serial number with status "device"
```

---

## Step 1 — একটি throwaway Expo প্রজেক্ট তৈরি করুন dev client সহ

```bash
npx create-expo-app@latest popscreen-spike
cd popscreen-spike
npx expo install expo-dev-client
```

এটি একটি **আলাদা, throwaway প্রজেক্ট** — আসল `popscreen` লাইব্রেরি রিপোর ভেতরে না। এটিকে এভাবেই রাখুন; এটি disposable।

---

## Step 2 — নেটিভ Android প্রজেক্ট জেনারেট করুন (prebuild)

```bash
npx expo prebuild --platform android
```

এটি একটি `android/` ফোল্ডার তৈরি করে। এই পয়েন্ট থেকে, আপনি সরাসরি `android/`-এর ভেতরের ফাইলগুলো হাতে এডিট করবেন — একটি স্পাইকের জন্য এটি ঠিক আছে (আসল লাইব্রেরির জন্য এটি ঠিক হবে না, যেখানে সব নেটিভ কনফিগ একটি config plugin-এর মাধ্যমেই হতে হবে)।

---

## Step 3 — নেটিভ Kotlin ওভারলে কোড লিখুন

নিচের ফাইলটি তৈরি করুন:

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

> **কেন `reactInstanceManagerProvider`-কে একটি static lambda হিসেবে রাখা হলো?** এটি স্পাইক-শুধুমাত্র শর্টকাট। আসল লাইব্রেরি (মূল প্ল্যানের §৬/§৭) এটি Expo Modules API-এর `appContext.reactContext`/`appContext.currentActivity` accessor-এর মাধ্যমে সঠিকভাবে করবে (নোট: পুরোনো top-level `currentActivity` প্রপার্টি বর্তমান RN ভার্সনে deprecated/removed — সবসময় `reactApplicationContext.currentActivity` বা Expo-র `appContext` সমতুল্য ব্যবহার করুন)। Milestone 0-এর জন্য, `MainActivity` থেকে একটি static provider wire করাই সবচেয়ে দ্রুত উপায় একটি `ReactInstanceManager` রেফারেন্স `Service`-এ পৌঁছানোর, পুরো module DSL এখনও না বানিয়েই।

---

## Step 4 — JS থেকে service নিয়ন্ত্রণ করার জন্য একটি মিনিমাল নেটিভ মডিউল ওয়্যার করুন

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

**`android/app/src/main/java/com/popscreenspike/MainApplication.kt`**-এ প্যাকেজটি রেজিস্টার করুন — `getPackages()` override খুঁজুন এবং রিটার্ন হওয়া লিস্টে `OverlaySpikePackage()` যুক্ত করুন:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(OverlaySpikePackage())
    }
```

> নোট: আপনার Expo SDK ভার্সনের উপর নির্ভর করে, `MainApplication.kt` হয়তো প্যাকেজগুলো একটি ভিন্ন autolinking মেকানিজমের মাধ্যমে এক্সপোজ করতে পারে (যেমন একটি generated `PackageList` যার কোনো ম্যানুয়াল `getPackages()` override দৃশ্যমান নেই)। যদি এডিট করার জন্য কোনো `getPackages()` override না দেখেন, ফাইলে `ReactNativeHost` বা `ReactHost` খুঁজুন এবং প্যাকেজগুলোর বিদ্যমান লিস্টটি যেখানে তৈরি হচ্ছে সেখানেই প্যাকেজটি যুক্ত করুন — সঠিক আকৃতি Expo SDK/RN ভার্সন অনুসারে কিছুটা ভিন্ন হয়, কিন্তু প্রতিটি bare Android RN প্রজেক্টের `MainApplication.kt`-এ এমন একটি লিস্ট কোথাও থাকেই।

---

## Step 5 — Manifest-এ পারমিশন এবং service ডিক্লেয়ার করুন

**`android/app/src/main/AndroidManifest.xml`** এডিট করুন। বিদ্যমান `<uses-permission>` ট্যাগগুলোর sibling হিসেবে এই পারমিশনগুলো যুক্ত করুন (`<application>` ট্যাগের বাইরে):

```xml
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
```

`<application>` ট্যাগের ভেতরে, service ডিক্লারেশনটি যুক্ত করুন:

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

## Step 6 — ওভারলের RN সারফেস রেজিস্টার করুন (JS সাইড)

এই অংশটিই মূল hypothesis-টি প্রকৃতপক্ষে প্রমাণ করে: একটি *দ্বিতীয়*, স্বাধীনভাবে-রেজিস্টার্ড RN root component, যা ওভারলে উইন্ডোতে রেন্ডার হয়, এবং নিজের স্টেট পরিবর্তনে **শূন্য নেটিভ involvement**-সহ re-render হয়।

প্রজেক্ট রুটে **`index.js`** (Expo যে entry ফাইল জেনারেট করে) এডিট করুন, ডিফল্ট app রেজিস্ট্রেশনের পাশাপাশি একটি দ্বিতীয় কম্পোনেন্ট রেজিস্টার করতে:

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

প্রজেক্ট রুটে **`OverlayRoot.js`** তৈরি করুন:

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

এখন মূল **`App.js`** এডিট করুন native module কল করা দুটি বাটন যুক্ত করতে — এটি মেইন অ্যাপের কন্ট্রোল সারফেস, ওভারলে কনটেন্ট থেকে আলাদা:

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

## Step 7 — POCO M3-এ বিল্ড এবং রান করুন

```bash
npx expo run:android --device
```

(একাধিক ডিভাইস/এমুলেটর কানেক্টেড থাকলে `--device` দিয়ে কানেক্টেড POCO M3-টি স্পষ্টভাবে বেছে নিতে পারবেন। এটিই যদি একমাত্র কানেক্টেড ডিভাইস হয়, ফ্ল্যাগটি বাদ দিতে পারেন।)

এটি dev client APK বিল্ড করবে, POCO M3-এ ইনস্টল করবে, এবং Metro bundler-এর সাথে কানেক্টেড হয়ে লঞ্চ করবে।

---

## Step 8 — ম্যানুয়াল টেস্ট সিকোয়েন্স

ডিভাইসে ঠিক এই সিকোয়েন্সটি অনুসরণ করুন:

১. অ্যাপটি খুলুন। নিশ্চিত করুন প্রাথমিকভাবে `Overlay permission granted: false` দেখাচ্ছে (যদি না এই ডিভাইসে আগে থেকেই এটি গ্র্যান্ট করা থাকে)।
২. **Request Overlay Permission**-এ ট্যাপ করুন। Android আপনাকে এই অ্যাপের জন্য সিস্টেমের "draw over other apps" সেটিংস স্ক্রিনে রিডাইরেক্ট করবে। এটি টগল অন করুন, তারপর অ্যাপে ফিরে আসুন (স্বাভাবিক পরিস্থিতিতে এই নেভিগেশনে Expo dev client কিল হয় না, অ্যাপটি ব্যাকগ্রাউন্ডে এখনও জীবিত থাকা উচিত)।
৩. **Start Overlay**-এ ট্যাপ করুন।
৪. **ডিভাইসের Home বাটন প্রেস করুন** (বা সম্পূর্ণ আলাদা একটি অ্যাপ খুলুন, যেমন ডিভাইসের Settings অ্যাপ) যাতে PopScreen Spike আর foreground-এ না থাকে।
৫. **নিশ্চিত করুন ফ্লোটিং উইন্ডোটি এখনও দৃশ্যমান**, এখন foreground-এ যে অ্যাপ/হোম স্ক্রিনই থাকুক তার উপরে আঁকা, hardcoded পজিশনে (বাম থেকে 100px, উপর থেকে 300px)।
৬. **ওই ফ্লোটিং উইন্ডোর ভেতরের "Tick: N" কাউন্টারটি লক্ষ্য করুন।** এটি প্রতি সেকেন্ডে একবার, ক্রমাগতভাবে বাড়তে হবে, যতক্ষণ আপনি হোম স্ক্রিনে বা অন্য একটি অ্যাপে থাকবেন — host অ্যাপ ব্যাকগ্রাউন্ডে থাকা অবস্থায়।
৭. PopScreen Spike অ্যাপে ফিরে যান (এটি এখনও চলমান থাকা উচিত)। **Stop Overlay**-এ ট্যাপ করুন। ফ্লোটিং উইন্ডোটি অদৃশ্য হয়ে যাওয়া উচিত।

---

## Step 9 — পাস / ফেইল মানদণ্ড

এই স্পাইকটি **PASS** হবে শুধুমাত্র যদি নিচের সবগুলো সত্য হয়:

- [ ] ওভারলে উইন্ডোটি হোম স্ক্রিন/অন্য অ্যাপের উপরে দৃশ্যমানভাবে রেন্ডার হয় (এই নির্দিষ্ট ডিভাইস/OS কম্বিনেশনে `TYPE_APPLICATION_OVERLAY` + `SYSTEM_ALERT_WINDOW` কাজ করে তা প্রমাণ করে)।
- [ ] ওভারলে উইন্ডোর ভেতরের "Tick: N" টেক্সট প্রতি সেকেন্ডে মোটামুটি একবার দৃশ্যমানভাবে বাড়ে, ক্রমাগতভাবে, **host অ্যাপ ব্যাকগ্রাউন্ডে থাকা অবস্থায়** (এটি প্রমাণ করে RN re-render স্বয়ংক্রিয়ভাবে ওভারলের `ReactRootView`-তে প্রবাহিত হয় — এর জন্য কখনো কোনো নেটিভ "refresh" কল করা হয়নি; দৃশ্যমান আপডেটটি চালাচ্ছে শুধুমাত্র JS-এর `setInterval`/`setState` লুপ)।
- [ ] host অ্যাপ ব্যাকগ্রাউন্ডে থাকা অবস্থায় ওভারলেটি অন্তত ২-৩ মিনিট টিকে থাকে, ফ্লোটিং উইন্ডো অদৃশ্য হয়ে না যায় বা tick কাউন্টার ফ্রিজ না হয় (এটি একটি বেসিক সংকেত যে এই ডিভাইসে MIUI-এর ব্যাকগ্রাউন্ড-কিল আচরণ অবিলম্বে foreground service ধ্বংস করে দিচ্ছে না — এর সম্পূর্ণ হার্ডেনিং Milestone 6-এর কাজ, এই স্পাইকের না, কিন্তু এখানেই একটি তাৎক্ষণিক ব্যর্থতা একটি গুরুত্বপূর্ণ প্রাথমিক সতর্কতা সংকেত হবে)।
- [ ] Step 8-এর পুরো সিকোয়েন্সে কোনো crash, ANR (Application Not Responding), বা silent failure ঘটে না।

উপরের কোনোটি ব্যর্থ হলে, **এখনই Milestone 1-এ অগ্রসর হবেন না।** `adb logcat | grep -i popscreen` ব্যবহার করুন (এবং `WindowManager`/`ReactRootView`-সংক্রান্ত stack trace খুঁজুন) ডায়াগনোসিসের জন্য, এবং মূল implementation plan-এর সংশ্লিষ্ট অংশ পুনরায় দেখুন (সবচেয়ে সম্ভাব্য কারণ: ওভারলে উইন্ডো দেখা গেলেও কনটেন্ট রেন্ডার না হলে একটি stale/incorrect `ReactInstanceManager` রেফারেন্স; বা উইন্ডোই দেখা না গেলে একটি manifest/permission সমস্যা)।

---

## এই স্পাইক ইচ্ছাকৃতভাবে যা প্রমাণ করে না (পরের মাইলফলকের জন্য রাখা হয়েছে)

- ওভারলে drag/resize করা যায় কিনা (Milestone 3/4)।
- পুরোনো-আর্কিটেকচার *এবং* নতুন-আর্কিটেকচার দুটো অ্যাপ-ই কাজ করে কিনা (Milestone 1-এর দ্বৈত-পাথ প্রয়োজনীয়তা) — fresh `create-expo-app` প্রজেক্ট যে আর্কিটেকচার ডিফল্ট হিসেবে নেয়, এই স্পাইকের শুধু সেটাতেই কাজ করা প্রয়োজন।
- একটি external store (Zustand/Redux)-এর মাধ্যমে মেইন অ্যাপ এবং ওভারলের মধ্যে cross-surface স্টেট সিঙ্ক কাজ করে কিনা (Milestone 5) — এই স্পাইকের "tick" কাউন্টারটি ওভারলের নিজস্ব কম্পোনেন্টের লোকাল, মেইন অ্যাপের সাথে শেয়ার্ড না, যা এখানে ইচ্ছাকৃতভাবে স্কোপের বাইরে।
- foreground service অনির্দিষ্টকালের জন্য, একটি ডিভাইস রিবুট, বা recents স্ক্রিন থেকে একটি সম্পূর্ণ app-process কিল সারভাইভ করে কিনা (Milestone 6)।
- ওভারলের ভেতরে টেক্সট ইনপুট/IME ফোকাস সম্পর্কে যেকোনো কিছু (Milestone 5-এর দ্বিতীয় example app)।

---

*Milestone 0 গাইডের সমাপ্তি। একটি ক্লিন PASS-এর পর, মূল implementation plan-এ (`docs/implementation-plan-bn.md`) Milestone 1-এ অগ্রসর হন।*
