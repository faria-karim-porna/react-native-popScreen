# PopScreen — Milestone 2: জেনেরিক ওভারলে উইন্ডো + স্ট্যাটিক কনটেন্ট — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 2-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ বিল্ড গাইড, যেমনটি `docs/implementation-plan-bn.md` §২০-এ বর্ণিত আছে:

> Milestone 2 — জেনেরিক ওভারলে উইন্ডো + স্ট্যাটিক কনটেন্ট
> `PopScreenOverlayService` + `WindowManager` ইন্টিগ্রেশন যা ডেভেলপার-প্রদত্ত আর্বিট্রারি RN কনটেন্ট (`<PopScreenContent>`-এর মাধ্যমে) দেখানো একটি *স্ট্যাটিক* RN সারফেস হোস্ট করবে (এখনও drag/resize ছাড়া)। "জেনেরিক Kotlin, smart RN" সীমানা এন্ড-টু-এন্ড ভ্যালিডেট করে। একটি old-architecture এবং একটি new-architecture example app—দুটোতেই টেস্ট করুন।

**এই মাইলফলক প্রকৃতপক্ষে যা প্রদান করে:** আসল `PopScreenOverlayService` (Milestone 1-এর খালি প্লেসহোল্ডার প্রতিস্থাপন করে), একটি নির্দিষ্ট-সাইজ, নির্দিষ্ট-পজিশনের ওভারলে উইন্ডো দেখানো আসল `WindowManager` ইন্টিগ্রেশন, এবং — পুরো লাইব্রেরির আর্কিটেকচারালি সবচেয়ে কঠিন অংশ — একটি কার্যকরী `PopScreenReactSurfaceHost` যা সঠিকভাবে **New Architecture** (`ReactHost.createSurface`) এবং **পুরোনো আর্কিটেকচার** (`ReactRootView` + `ReactInstanceManager`) পাথের মধ্যে শাখা নেয়, Milestone 1-এ বানানো `ReactArchitectureDetector` ব্যবহার করে। এই মাইলফলকের শেষে, একজন ডেভেলপার *যেকোনো* RN কম্পোনেন্ট `<PopScreenContent>`-এ wrap করতে পারবেন এবং একটি ফ্লোটিং সিস্টেম উইন্ডোতে এটি লাইভ রেন্ডার হতে দেখতে পারবেন — শূন্য drag, শূন্য resize, এবং শূন্য টাচ ইন্টারসেপশন সহ। সেগুলো পরে আসবে।

**এই মাইলফলকটি যা *নয়়*:** কোনো dragging, resizing, minimize/restore, বেসিক click-through আচরণের বাইরে কোনো টাচ ইন্টারসেপশন নেই (Milestone ৩–৪)। এখনও কোনো শেয়ার্ড cross-surface স্টেট store নেই (Milestone 5)।

**প্রাইমারি টেস্ট ডিভাইস:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31)। এই মাইলফলকের manifest/service কাজ এবং MIUI-এর ব্যাকগ্রাউন্ড-এক্সিকিউশন বিচিত্রতা সরাসরি ইন্টারঅ্যাক্ট করে, তাই শুধু এমুলেটরে না, এখানেই ভেরিফাই করুন।

**এই মাইলফলকের জন্য নির্দিষ্টভাবে API স্টেবিলিটি সম্পর্কে একটি নোট:** New Architecture-এর `ReactHost.createSurface(...)` সারফেস-হোস্টিং API সাম্প্রতিক RN পয়েন্ট রিলিজগুলোতে পরিবর্তিত হয়েছে (method nullability, surface lifecycle হেল্পার, এবং `ReactFragment` bridgeless বাগ — সবই RN-এর নিজস্ব changelog অনুসারে রিলিজ-টু-রিলিজ পরিবর্তন দেখেছে)। মূল প্ল্যানের §১৮ রিস্ক টেবিল ইতিমধ্যেই এটি ফ্ল্যাগ করেছে। নিচের সঠিক method signature-গুলোকে একটি সাম্প্রতিক, আধুনিক RN/Expo SDK রিলিজের জন্য সঠিক হিসেবে গণ্য করুন, কিন্তু এই মাইলফলককে সম্পূর্ণ বলে গণ্য করার আগে **এখনই আপনার নির্দিষ্ট RN ভার্সন পিন করুন এবং সেই ভার্সনের আসল `ReactHost`/`ReactSurface` সোর্সের বিরুদ্ধে যাচাই করুন** — পুরো প্রজেক্টে "দেখতে ঠিক মনে হয়, কম্পাইল হয় না"-জাতীয় সারপ্রাইজের সবচেয়ে সম্ভাব্য জায়গা এটিই।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

Milestone 1-এর একই `popscreen` standalone module রিপোজিটরিতে চালিয়ে যান। নিশ্চিত করুন Milestone 1-এর পাস/ফেইল চেকলিস্ট সম্পূর্ণভাবে সবুজ — বিশেষ করে, এই মাইলফলক শুরু করার আগে `getReactArchitectureInfo()`-কে নির্ভরযোগ্যভাবে `NEW_ARCHITECTURE` বা `OLD_ARCHITECTURE` রিপোর্ট করতে হবে (কখনো `UNKNOWN` না), কারণ এখানে সবকিছু সেই সিগন্যালের উপর নির্ভর করে।

এই মাইলফলকের জন্য আপনার **দুটি** আলাদা example/test অ্যাপ প্রয়োজন হবে (শুধু Milestone 1-এ স্ক্যাফোল্ড করা একটি `example/` অ্যাপ না):

১. React Native-এর **New Architecture** চালানো একটি অ্যাপ (বেশিরভাগ নতুন তৈরি Expo অ্যাপের বর্তমান ডিফল্ট)।
২. **পুরোনো আর্কিটেকচার/bridge** চালানো একটি অ্যাপ (আপনার টার্গেট করা Expo SDK ভার্সনের উপর নির্ভর করে, আপনাকে একটি দ্বিতীয় টেস্ট অ্যাপের `app.json` / `gradle.properties`-এ স্পষ্টভাবে New Architecture থেকে opt out করতে হতে পারে — আপনার SDK-র ডকুমেন্টেশনে বর্তমান টগলটি চেক করুন, কারণ এই ফ্ল্যাগের অবস্থান এবং নাম SDK ভার্সনের মধ্যে পরিবর্তিত হয়েছে)।

বিদ্যমান `example/` অ্যাপটিকে আপনার New Architecture টেস্ট টার্গেট হিসেবে ব্যবহার চালিয়ে যাওয়া এবং শুধুমাত্র পুরোনো-আর্কিটেকচার ভেরিফিকেশনের জন্য একটি দ্বিতীয়, throwaway `example-old-arch/` অ্যাপ তৈরি করা (পাবলিশড প্যাকেজের বাইরে, Milestone 0-এর throwaway প্রজেক্টের মতো) গ্রহণযোগ্য।

---

## Step 1 — Milestone 1-এর প্লেসহোল্ডারকে আসল `PopScreenOverlayService` দিয়ে রিপ্লেস করুন

প্লেসহোল্ডার কনটেন্ট মুছে ফেলুন এবং **`android/src/main/java/expo/modules/popscreen/PopScreenOverlayService.kt`** সম্পূর্ণভাবে রিপ্লেস করুন:

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

খেয়াল করুন এই `Service`-টি এখন মূল প্ল্যানের মূল প্রয়োজনীয়তা অনুসারে সম্পূর্ণভাবে জেনেরিক: এটি `<PopScreenContent>`-এর আসল কনটেন্ট সম্পর্কে কিছুই জানে না, শুধু জানে যে এটি একটি উইন্ডো এবং `PopScreenReactSurfaceHost` দ্বারা উৎপাদিত একটি `View`-এর মালিক।

---

## Step 2 — `PopScreenHostProvider` ইন্টারফেস ডিফাইন করুন

এটিই নেটিভ মডিউল (যা host অ্যাপের React instance(s)-এ পৌঁছানোর উপায় জানে) এবং `Service`/`SurfaceHost`-এর (যার *কীভাবে* সেই পৌঁছানোটা ঘটে তা জানার প্রয়োজন নেই, শুধু জানা দরকার যে এটি তার প্রয়োজনীয়তা চাইতে পারে) মধ্যে পরিচ্ছন্ন সীমানা।

**`android/src/main/java/expo/modules/popscreen/PopScreenHostProvider.kt`** তৈরি করুন:

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

> **কেন New Architecture host টাইপের জন্য `Any?`?** Bridgeless rollout-এর সময় RN ভার্সনগুলোর মধ্যে সঠিক `ReactHost` ক্লাসের অবস্থান এবং import পাথ পরিবর্তিত হয়েছে, এবং এখানে একটি নির্দিষ্ট import পিন করলে এই ইন্টারফেসটি নিজেই ভার্সন-ফ্র্যাজাইল হয়ে যেত। `PopScreenReactSurfaceHost` (Step 3) এই একমাত্র জায়গা যেখানে concrete টাইপটি জানা প্রয়োজন, এবং এটি reflection-guarded casting-এর মাধ্যমে এটি অ্যাক্সেস করে, Milestone 1-এ `ReactArchitectureDetector` যে একই প্র্যাকটিক্যাল অ্যাপ্রোচ ব্যবহার করেছিল তার সাথে সামঞ্জস্যপূর্ণ। আপনার সাপোর্টেড RN ভার্সন রেঞ্জ পিন করার পর এবং আপনার মিনিমাম সাপোর্টেড ভার্সনের জন্য সঠিক স্টেবল import পাথ নিশ্চিত করার পর এটি পুনর্বিবেচনা করুন।

---

## Step 3 — `PopScreenReactSurfaceHost` বানান (আর্কিটেকচারালি সবচেয়ে গুরুত্বপূর্ণ ক্লাস)

এই মাইলফলকের সবচেয়ে গুরুত্বপূর্ণ একক ফাইল এটিই — মূল প্ল্যানের "নেটিভ লেয়ারকে কি একটি RN root view হোস্ট করতে হবে" প্রশ্নের literal উত্তর, এবং যেখানে Milestone 1-এর দ্বৈত পুরোনো/নতুন-আর্কিটেকচার শাখাটি আসলেই প্রকৃতপক্ষে ব্যবহৃত হয়।

**`android/src/main/java/expo/modules/popscreen/PopScreenReactSurfaceHost.kt`** তৈরি করুন:

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

> **এই ফাইলটিই মূল প্ল্যানের §১৮ রিস্ক টেবিল যে আসল R&D সময় লাগবে বলে সতর্ক করেছিল।** যদি `createSurfaceMethod` reflection রানটাইমে `NoSuchMethodException` দিয়ে ব্যর্থ হয়, এটি একটি শক্তিশালী সংকেত যে টার্গেট করা RN ভার্সনের `ReactHost.createSurface` signature পরিবর্তিত হয়েছে — সেই ভার্সনের আসল সোর্স চেক করুন (এই method সাম্প্রতিক রিলিজগুলোতে সামঞ্জস্যপূর্ণভাবে `(context, appKey, launchOptions)` নিতে observed হয়েছে, কিন্তু এই গাইডকে অভ্রান্ত ধরে নেওয়ার বদলে সবসময় আপনার পিন করা ভার্সনের বিরুদ্ধে যাচাই করুন)।

---

## Step 4 — `ReactArchitectureDetector` ব্যবহার করে `PopScreenHostProvider` প্রকৃতপক্ষে ইমপ্লিমেন্ট করুন

এখন Milestone 1-এর detection লজিককে এই মাইলফলকের surface-hosting কোডের সাথে কানেক্ট করুন। **`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`** আপডেট করুন, একটি concrete provider ইমপ্লিমেন্টেশন এবং `show`/`hide` ফাংশন যুক্ত করে:

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

খেয়াল করুন `getOldArchitectureInstanceManager()` এবং `getNewArchitectureReactHost()` প্রতিটি কলার ইতিমধ্যেই জানে ধরে নেওয়ার বদলে আর্কিটেকচারটি **পুনরায়-চেক** করে non-null রিটার্ন করার আগে — এটি নিশ্চিত করে Step 3-এর `PopScreenReactSurfaceHost`-এর "exactly one must be non-null" invariant আসলেই বজায় থাকে, প্রতিটি কল সাইট স্বাধীনভাবে এটি সঠিক করবে এমন ভরসার বদলে।

---

## Step 5 — TypeScript পাবলিক API আপডেট করুন

**`src/PopScreenModule.ts`** এডিট করুন:

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

**`src/index.ts`** এডিট করুন:

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

## Step 6 — `<PopScreenContent>` বানান এবং ওভারলের RN সারফেস রেজিস্টার করুন

এটিই JS-সাইডের counterpart যা "জেনেরিক Kotlin, smart RN" সীমানাকে বাস্তবিক করে তোলে। **`src/PopScreenContent.tsx`** তৈরি করুন:

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

**`src/registerOverlaySurface.ts`** তৈরি করুন:

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

**`src/index.ts`** আরেকবার আপডেট করুন এগুলো export করতে:

```ts
export { default as PopScreenContent } from './PopScreenContent';
export { registerOverlaySurface } from './registerOverlaySurface';
```

---

## Step 7 — config plugin-এর service declaration আপডেট করুন (sanity check, সম্ভবত অপরিবর্তিত)

Milestone 1-এর config plugin-এ (`plugin/src/index.ts`) ডিক্লেয়ার করা service নাম, টাইপ, এবং প্রপার্টি ইতিমধ্যেই `PopScreenOverlayService`-এর সাথে ঠিকঠাক মিলে যাওয়া উচিত — এখন ক্লাসটিতে একটি খালি প্লেসহোল্ডার না হয়ে আসল লজিক আছে বলে এটি পুনরায় নিশ্চিত করুন:

```ts
const OVERLAY_SERVICE_NAME = '.PopScreenOverlayService'; // must match the Kotlin class name exactly
```

Milestone 1 সঠিকভাবে সম্পন্ন হলে এখানে কোনো পরিবর্তনের প্রয়োজন হওয়া উচিত না — এই স্টেপটি একটি চেকপয়েন্ট, নতুন কাজ না।

---

## Step 8 — দুটো example app-ই wire করুন

### New Architecture example app (`example/`)

**`example/index.js`** এডিট করুন (অথবা example app-এর entry point যেখানেই থাকুক):

```js
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import OverlayDemo from './OverlayDemo';

registerRootComponent(App);
registerOverlaySurface(OverlayDemo);
```

**`example/OverlayDemo.tsx`** তৈরি করুন — ইচ্ছাকৃতভাবে আর্বিট্রারি কনটেন্ট, প্রমাণ করার জন্য যে নেটিভ সাইড সত্যিই পরোয়া করে না এর ভেতরে কী আছে:

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

কন্ট্রোল যুক্ত করতে **`example/App.tsx`** এডিট করুন:

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

### পুরোনো-আর্কিটেকচার টেস্ট অ্যাপ (`example-old-arch/` বা সমতুল্য)

New Architecture স্পষ্টভাবে disable করা একটি দ্বিতীয় টেস্ট অ্যাপ তৈরি করুন (পাবলিশড প্যাকেজের বাইরে, যেমন একটি sibling ডিরেক্টরি), আপনার টার্গেট করা Expo SDK-র সেই টগলের জন্য বর্তমান কনভেনশন অনুসারে। এতে আপনার লোকাল `popscreen` প্যাকেজ ইনস্টল করুন (যেমন `npm link`, একটি লোকাল `file:` dependency, বা সাময়িকভাবে built প্যাকেজ কপি করার মাধ্যমে — যেটা আপনার ওয়ার্কফ্লোর সাথে মানানসই), এবং উপরে দেখানো একই `App.tsx`/`OverlayDemo.tsx`/`index.js` wiring পুনরাবৃত্তি করুন। JS কোডটি অভিন্ন; শুধু underlying RN আর্কিটেকচারটি ভিন্ন, যা ঠিক পয়েন্টটি — `<PopScreenContent>` এবং `registerOverlaySurface`-এর কোন আর্কিটেকচারে চলছে তা নিয়ে সচেতন হওয়ার প্রয়োজন থাকা উচিত না।

---

## Step 9 — POCO M3-এ বিল্ড এবং রান করুন, দুটো কনফিগারেশনেই

**New Architecture অ্যাপ:**

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

**পুরোনো-আর্কিটেকচার অ্যাপ:**

```bash
cd example-old-arch
npx expo prebuild --platform android --clean
npx expo run:android --device
```

(এগুলো ডিভাইসে দুটো আলাদা install/সেশন হিসেবে চালান — দুটোই একসাথে ইনস্টল রাখার প্রয়োজন নেই, শুধু পালাক্রমে দুটোই ভেরিফাই করা প্রয়োজন।)

---

## Step 10 — ম্যানুয়াল টেস্ট সিকোয়েন্স (দুটো অ্যাপের জন্যই পুনরাবৃত্তি করুন)

১. অ্যাপটি লঞ্চ করুন। নিশ্চিত করুন `Architecture:` New Architecture অ্যাপের জন্য সঠিকভাবে `NEW_ARCHITECTURE` এবং পুরোনো-আর্কিটেকচার অ্যাপের জন্য `OLD_ARCHITECTURE` দেখাচ্ছে — যেকোনোটি ভুল হলে, থামুন এবং চালিয়ে যাওয়ার আগে detection ঠিক করুন; অন্যথায় বাকি টেস্টটি অর্থহীন।
২. **Request Overlay Permission**-এর মাধ্যমে ওভারলে পারমিশন গ্র্যান্ট করুন।
৩. **Show Overlay**-এ ট্যাপ করুন। নিশ্চিত করুন ফ্লোটিং উইন্ডোটি ফিক্সড পজিশনে দেখা যাচ্ছে (বাম থেকে 80px, উপর থেকে 250px), `OverlayDemo`-এর "🎈 Hello from the overlay!" কনটেন্ট দেখাচ্ছে।
৪. Home প্রেস করুন / অন্য একটি অ্যাপে সুইচ করুন। নিশ্চিত করুন ওভারলে উইন্ডো দৃশ্যমান থাকে, উপরে আঁকা, host অ্যাপ ব্যাকগ্রাউন্ডে থাকা অবস্থায়।
৫. **Hide Overlay**-এ ট্যাপ করুন (প্রথমে host অ্যাপে ফিরে যান)। নিশ্চিত করুন উইন্ডোটি পরিচ্ছন্নভাবে অদৃশ্য হয়ে যায়, কোনো crash এবং কোনো অবশিষ্ট ভিউ ছাড়াই।
৬. আবার **Show Overlay**-এ ট্যাপ করুন। নিশ্চিত করুন এটি সঠিকভাবে পুনরায় আবির্ভূত হয় — এটি ভ্যালিডেট করে যে `removeOverlay()`/`destroy()` surface host-কে একটি ভাঙা one-shot স্টেটের বদলে একটি পরিষ্কার, পুনরায়-দেখানো যায় এমন স্টেটে রেখে গেছে।

---

## Step 11 — পাস / ফেইল মানদণ্ড

এই মাইলফলকটি **PASS** হবে শুধুমাত্র যদি নিচের সবগুলো সত্য হয়, **New Architecture এবং পুরোনো-আর্কিটেকচার দুটো example app-এই**:

- [ ] ওভারলে উইন্ডোটি `<PopScreenContent>`-এর ঠিক আর্বিট্রারি কনটেন্ট রেন্ডার করে — কোনো প্লেসহোল্ডার টেক্সট না, কোনো খালি উইন্ডো না — নিশ্চিত করে যে "জেনেরিক Kotlin, smart RN" সীমানাটি আসলেই এন্ড-টু-এন্ড বজায় থাকে।
- [ ] `PopScreenReactSurfaceHost` সঠিকভাবে New Architecture অ্যাপে New Architecture পাথ এবং পুরোনো-আর্কিটেকচার অ্যাপে পুরোনো-আর্কিটেকচার পাথ নির্বাচন করে, দুটোতেই কোনো ambiguous provider result সম্পর্কে `IllegalStateException` ছাড়াই।
- [ ] Show → Hide → আবার Show কোনো crash, কোনো `WindowManager.BadTokenException`, এবং কোনো ডুপ্লিকেটেড/orphaned ভিউ ছাড়াই পরিচ্ছন্নভাবে কাজ করে।
- [ ] host অ্যাপ ব্যাকগ্রাউন্ডে থাকা অবস্থায় ওভারলেটি সঠিকভাবে টিকে থাকে, এই নির্দিষ্ট ডিভাইসে Milestone 0-এর ফলাফলের সাথে সামঞ্জস্যপূর্ণ।
- [ ] `PopScreenReactSurfaceHost`-এর New Architecture পাথের reflection কলগুলো থেকে কোনো `NoSuchMethodException` থ্রো হয় না। যদি হয়, এটি মূল প্ল্যানের রিস্ক টেবিল যে প্রত্যাশিত ব্যর্থতার মোড সম্পর্কে সতর্ক করেছিল ঠিক সেটিই — অগ্রসর হওয়ার আগে আপনার পিন করা RN ভার্সনের আসল `ReactHost`/`ReactSurface` সোর্স পরীক্ষা করে এটি সমাধান করুন।

যদি New Architecture এবং পুরোনো-আর্কিটেকচার পাথ দৃশ্যমানভাবে ভিন্ন আচরণ তৈরি করে (যেমন একটি কাজ করে এবং অন্যটি নিঃশব্দে ব্যর্থ হয়), দুটোই শক্তিশালী না হওয়া পর্যন্ত Milestone 3-এ অগ্রসর হবেন না — Milestone 3-এর drag ইমপ্লিমেন্টেশন এই মাইলফলক যে `View` উৎপাদন করেছে তার উপর সরাসরি বানানো হয়, যে আর্কিটেকচারই এটি উৎপাদন করুক না কেন, এবং এখানে একটি আর্কিটেকচার-নির্দিষ্ট বাগ অন্যথায় দুই মাইলফলক পরে বিভ্রান্তিকরভাবে পুনরায় দেখা দেবে।

---

## এই মাইলফলক ইচ্ছাকৃতভাবে যা অন্তর্ভুক্ত করে না (পরবর্তী মাইলফলকের জন্য রাখা হয়েছে)

- Drag, resize, snap-to-edge (Milestone ৩–৪) — উইন্ডোর পজিশন এবং সাইজ এখনও `showOverlay()`-তে hardcoded constant।
- Minimize/restore স্টেট মেশিন (Milestone 4)।
- "chrome" বনাম "content" আলাদা করা টাচ ইন্টারসেপশন (Milestone 3) — এই মুহূর্তে `FLAG_NOT_FOCUSABLE`-ই একমাত্র টাচ-সংক্রান্ত ফ্ল্যাগ সেট করা আছে, অর্থাৎ ওভারলের ভেতরের কনটেন্ট এখনও টাচ রিসিভ করতে পারে, কিন্তু এখনও কোনো drag-handle/content-area পার্থক্য নেই।
- একটি external store-এর মাধ্যমে শেয়ার্ড cross-surface স্টেট, এবং `usePopScreen()` হুক (Milestone 5)।
- একাধিক নির্দিষ্ট RN ভার্সনের বিরুদ্ধে reflection-ভিত্তিক New Architecture সারফেস ক্রিয়েশন harden করা — এই মাইলফলক ভ্যালিডেট করে যে এটি *আপনার* বর্তমানে পিন করা ভার্সনের জন্য কাজ করে; বৃহত্তর ভার্সন কম্প্যাটিবিলিটি টেস্টিং Milestone 7 (Testing & Docs)-এর অন্তর্গত।

---

*Milestone 2 গাইডের সমাপ্তি। দুটো আর্কিটেকচার পাথেই একটি ক্লিন PASS-এর পর, মূল implementation plan-এ (`docs/implementation-plan-bn.md`) Milestone 3-এ অগ্রসর হন, যা এই মাইলফলক উৎপাদিত স্ট্যাটিক উইন্ডোর উপরে drag/touch-interceptor লেয়ার যুক্ত করবে।*
