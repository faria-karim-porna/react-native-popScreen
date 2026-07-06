# PopScreen — ইমপ্লিমেন্টেশন প্ল্যান

**React Native (Expo) অ্যাপের জন্য Android-only ফ্লোটিং ওভারলে লাইব্রেরি**
*(YouTube PiP / Messenger চ্যাট বাবল-এর মতো, জেনেরিক নেটিভ লেয়ার, RN-নিয়ন্ত্রিত UI)*

> **নির্ধারিত সিদ্ধান্তসমূহ (প্রজেক্ট মালিক কর্তৃক নিশ্চিত করা হয়েছে):**
> - **টার্গেট ডিভাইস:** `minSdkVersion 26` (Android 8.0), এবং `targetSdkVersion`/`compileSdkVersion` সবসময় লেটেস্ট স্টেবল Android-কে ফলো করবে। প্রাইমারি ডেভ/টেস্ট ডিভাইস হিসেবে Xiaomi POCO M3 (codename `citrus`) নিশ্চিত করা হয়েছে — এই ডিভাইসটি Android 10-এ লঞ্চ হয়েছিল এবং এর অফিসিয়াল ফাইনাল ভার্সন **MIUI 14 / Android 12 (API 31)** পর্যন্ত আপডেট পেয়েছে, এরপর এটি end-of-life হয়ে গেছে — আর কোনো OS আপডেট আসবে না। API 26+ এই ডিভাইসের জন্য নিচের দিকে যথেষ্ট ভালোভাবে কভার করে, তাই পুরোনো deprecated `TYPE_PHONE` fallback-এর প্রয়োজন নেই। এই ডিভাইসটি MIUI-ভিত্তিক বলে (যা ব্যাকগ্রাউন্ড/ব্যাটারি-কিল আচরণে সবচেয়ে আগ্রাসী OEM-গুলোর একটি), এটিকে §16 টেস্টিং স্ট্র্যাটেজি এবং §18 রিস্কের জন্য **"worst case" OEM টেস্ট ডিভাইস** হিসেবেও গ্রহণ করা হয়েছে।
> - **আর্কিটেকচার সাপোর্ট:** **পুরোনো এবং নতুন দুটো React Native আর্কিটেকচার-ই** সাপোর্ট করতে হবে (শুধু Fabric নয়), যাতে npm-এর মাধ্যমে আসা থার্ড-পার্টি কনজিউমারদের সর্বোচ্চ কম্প্যাটিবিলিটি দেওয়া যায়, যারা এখনও New Architecture-এ আসেনি।
> - **ডিস্ট্রিবিউশন:** থার্ড-পার্টি ব্যবহারের জন্য **npm-এ পাবলিশ করা হবে** — standalone module scaffold (`create-expo-module` ব্যবহার করে, `--local` ফ্ল্যাগ ছাড়া), জেনেরিক/কনফিগারেবল পাবলিক API, semver কম্প্যাটিবিলিটি ম্যাট্রিক্স।
> - **v1 ফিচার স্কোপ:** **Drag + resize + minimize/restore**, v1-এ snap-to-edge থাকবে না (v1.1-এর জন্য candidate)।
>
> এই সিদ্ধান্তগুলো নিচের পুরো ডকুমেন্টে প্রতিফলিত হয়েছে এবং শেষের open-questions লিস্ট থেকে বাদ দেওয়া হয়েছে।

---

## ১. ফিজিবিলিটি অ্যানালাইসিস (Feasibility Analysis)

**সিদ্ধান্ত: হ্যাঁ, এটি টেকনিক্যালি সম্ভব**, এবং আপনার প্রস্তাবিত আর্কিটেকচার (জেনেরিক Kotlin shell + RN-নিয়ন্ত্রিত UI) আসলে এটি বানানোর *সঠিক* এবং *একমাত্র* পরিচ্ছন্ন উপায়। এটি `react-native-android-overlay`-এর মতো লাইব্রেরিগুলোর একই প্যাটার্ন, এবং কনসেপ্টচুয়ালি Messenger-এর bubble যেভাবে কাজ করে তার সাথে অভিন্ন।

### মূল প্রশ্ন: RN কি সরাসরি একটি সিস্টেম ওভারলে উইন্ডোতে রেন্ডার করতে পারে?

**না — এবং এটি এই পুরো ডকুমেন্টের সবচেয়ে গুরুত্বপূর্ণ আর্কিটেকচারাল তথ্য।** React Native-এর এমন কোনো রেন্ডারিং মোড নেই যা JavaScript থেকে সরাসরি একটি `WindowManager` ওভারলে সারফেসকে টার্গেট করতে পারে। RN সবসময় একটি `View` সাবক্লাসে রেন্ডার করে:

- পুরোনো আর্কিটেকচার: `ReactRootView`
- নতুন আর্কিটেকচার (Fabric): একটি `ReactSurface` / `ReactSurfaceView`, যা শেষ পর্যন্ত একটি `View`-এর উপরেই দাঁড়িয়ে থাকে

যা সত্যি, তা হলো: **যেকোনো Android `View` — `ReactRootView`/Fabric সারফেস সহ — একটি সিস্টেম-লেভেল উইন্ডোতে অ্যাটাচ করা যায়**, এভাবে:

```kotlin
windowManager.addView(reactRootView, layoutParams)
```

যেখানে `layoutParams.type = TYPE_APPLICATION_OVERLAY` (API 26+) এবং অ্যাপটির কাছে `SYSTEM_ALERT_WINDOW` ("draw over other apps") পারমিশন থাকতে হবে।

তাহলে আসল আর্কিটেকচারটি হলো:

> **নেটিভ Kotlin একটি দ্বিতীয় উইন্ডো হোস্ট করে। React Native স্বাভাবিকভাবেই রেন্ডার করে (এটি জানে না বা মাথা ঘামায় না যে এটি একটি ওভারলে উইন্ডোতে আছে)। Kotlin শুধু RN view tree-র কন্টেইনারটিকে Activity-র উইন্ডোর বদলে ওই উইন্ডোতে রিলোকেট করে।**

এর মানে দাঁড়ায়:
- ✅ Kotlin লেয়ারটি সম্পূর্ণভাবে **জেনেরিক** থাকতে পারে — এটি কখনো RN-এর কম্পোনেন্ট ট্রি ইন্সপেক্ট করে না, কোনো বাটন বা বিজনেস লজিক বা অ্যাপ-স্পেসিফিক স্টেট জানে না। এটি শুধু একটি উইন্ডো + একটি ভিউ কন্টেইনার + তার চারপাশের লাইফসাইকেল/ড্র্যাগ/রিসাইজ chrome ম্যানেজ করে।
- ✅ সমস্ত UI লজিক, লেআউট, স্টাইলিং, অ্যানিমেশন, এবং ইন্টারঅ্যাকশন লজিক ১০০% React Native/JS-এ থাকে।
- ✅ Kotlin-এর একমাত্র "UI আপডেট" দায়িত্ব হলো: *"RN root view-র কনটেন্ট পরিবর্তন হয়েছে — উইন্ডোটি যাতে নতুন ফ্রেম আঁকে তা নিশ্চিত করা।"* প্র্যাকটিক্যালি এর জন্য Kotlin-এর কোনো অ্যাকশনের প্রয়োজনই হয় না, কারণ একবার একটি `ReactRootView` উইন্ডোতে অ্যাটাচ হয়ে গেলে, **RN-এর নিজস্ব UI আপডেট সরাসরি ওই উইন্ডোতে স্বয়ংক্রিয়ভাবে রেন্ডার হয়** — স্বাভাবিক re-render-এর জন্য আলাদা কোনো "push new UI to native" স্টেপ প্রয়োজন নেই। Kotlin-এর আসল কাজ উইন্ডো লাইফসাইকেল (create/destroy/resize/position), ফ্রেম-বাই-ফ্রেম UI diffing নয়।

### কী সম্ভব নয় / হার্ড কনস্ট্রেইন্ট

- **iOS এটি করতে পারে না।** iOS-এ থার্ড-পার্টি অ্যাপের জন্য `TYPE_APPLICATION_OVERLAY` / সিস্টেম অ্যালার্ট উইন্ডো API-এর কোনো সমতুল্য কিছু নেই। iOS-এ PiP OS-নিয়ন্ত্রিত (`AVPictureInPictureController`) এবং আপনার নিজের অ্যাপ প্রসেসের বাইরে থেকে আর্বিট্রারি RN UI হোস্ট করতে পারে না। এটি কনফার্ম করে যে আপনার Android-only স্কোপ সঠিক — এটি শুধু একটা পছন্দ নয়, বাস্তবিক সীমাবদ্ধতা।
- **Expo Go এটি কখনোই চালাতে পারবে না।** Expo Go একটি প্রি-কম্পাইলড বাইনারি যাতে শুধু Expo-র নিজস্ব নেটিভ মডিউলগুলো থাকে। একটি কাস্টম Kotlin মডিউল (এবং একটি কাস্টম পারমিশন, একটি `Service`, একটি সেকেন্ড `ReactRootView`) এতে সাইড-লোড করা সম্ভব নয়। **একটি কাস্টম ডেভেলপমেন্ট বিল্ড (`expo-dev-client` + `expo prebuild`/EAS Build) বাধ্যতামূলক।**
- **`SYSTEM_ALERT_WINDOW`-এর জন্য বিশেষ, ইউজার-ফেসিং পারমিশন গ্র্যান্ট ফ্লো লাগে** (`Settings.canDrawOverlays()` + `ACTION_MANAGE_OVERLAY_PERMISSION` intent) — এটি স্বাভাবিক runtime permission dialog-এর মাধ্যমে চাওয়া যায় না, এবং Google Play এই পারমিশন ব্যবহারকারী অ্যাপগুলোর উপর পলিসি স্ক্রুটিনি করে (অ্যাপের একটি স্পষ্টভাবে justified core use case থাকতে হবে)।
- **দুটি স্বাধীন JS/RN সারফেস সাবধানে ডিজাইন করতে হয়।** যেই মুহূর্তে আপনার একটি ফ্লোটিং উইন্ডোতে RN কনটেন্ট *এবং* আপনার মেইন অ্যাপ Activity-তে RN কনটেন্ট থাকবে, আপনাকে হয় (a) এক JS instance থেকে দুটি আলাদা RN সারফেস চালাতে হবে, বা (b) দুটি আলাদা JS instance চালাতে হবে। দুটোই করা সম্ভব কিন্তু এদের ট্রেডঅফ আলাদা — বিস্তারিত §৫-এ আছে।

### উপসংহার

আর্কিটেকচারটি ফিজিবল, প্ল্যাটফর্মের ক্যাপাবিলিটির সাথে সামঞ্জস্যপূর্ণ, এবং আপনার প্রস্তাবিত পৃথকীকরণ (dumb native window host, smart RN brain) আর্কিটেকচারালি সঠিক ডিজাইন — এটি নেটিভ মেইনটেনেন্সের পরিধি কমিয়ে আনে এবং লাইব্রেরি কনজিউমাররা Kotlin না ছুঁয়ে যতটা সম্ভব করতে পারে তা সর্বোচ্চ করে।

---

## ২. সম্পূর্ণ আর্কিটেকচার (Overall Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Native / JS Layer                    │
│                                                                   │
│  Host App                          PopScreen Library (JS)        │
│  ┌─────────────┐                  ┌──────────────────────────┐  │
│  │ App.tsx     │  renders into    │ <PopScreenProvider>       │  │
│  │ (main UI)   │ ─────────────►   │   <PopScreenContent>      │  │
│  └─────────────┘                  │     {/* arbitrary RN UI */}│ │
│                                    │   </PopScreenContent>     │  │
│                                    │ usePopScreen() hook       │  │
│                                    └────────────┬─────────────┘  │
└─────────────────────────────────────────────────┼────────────────┘
                                                   │ Expo Modules API
                                                   │ (JSI, no bridge)
┌──────────────────────────────────────────────────┼────────────────┐
│                    Native Android Layer (Kotlin)  │                │
│                                                    ▼                │
│  PopScreenModule (Expo Module)         PopScreenOverlayService     │
│  - requestOverlayPermission()          (foreground Service)        │
│  - show() / hide() / minimize()   ───► - owns WindowManager        │
│  - updateLayout(x,y,w,h)               - owns the overlay Window    │
│  - sendEvent("onDrag"/"onTap"/...)     - hosts a ReactRootView /    │
│                                            ReactSurface             │
│                                         - generic drag/resize chrome│
│                                         - NO knowledge of RN content│
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │ Android WindowManager   │
              │ TYPE_APPLICATION_OVERLAY│
              │ (system-level window,   │
              │  drawn above all apps)  │
              └────────────────────────┘
```

### টু-সারফেস মডেল (প্রস্তাবিত)

PopScreen ব্যবহার করে **একটি JS engine instance, দুটি RN সারফেস**:

1. **মেইন সারফেস** — হোস্ট অ্যাপের স্বাভাবিক Activity-হোস্টেড RN root (অপরিবর্তিত, যেমন আছে তেমন)।
2. **ওভারলে সারফেস** — একটি দ্বিতীয় `ReactRootView`/`ReactSurface` যা *আলাদা* একটি RN কম্পোনেন্ট ট্রি রেন্ডার করে (ডেভেলপার `<PopScreenContent>`-এ যা wrap করেন), যা `PopScreenOverlayService`-এর উইন্ডোর ভেতরে হোস্ট হয়।

দুটো সারফেস একই JS রানটাইম, একই Redux/Zustand/Context স্টেট, একই মডিউল রেজিস্ট্রি শেয়ার করে। এটি React Native-এর `ReactInstanceManager` (পুরোনো আর্কিটেকচার) / `ReactHost` (নতুন আর্কিটেকচার)-এর মাধ্যমে সাপোর্টেড, যেগুলো ইতিমধ্যেই এক instance-এ একাধিক "সারফেস" সাপোর্ট করে — এটি ঠিক সেই মেকানিজম যা RN নিজেই Android widget বা একই bundle শেয়ার করা একাধিক activity-র জন্য ব্যবহার করে।

এটিই সবচেয়ে স্কেলেবল পছন্দ (কেন তা §৬-এ দেখুন, অন্য বিকল্পের সাথে তুলনাসহ)।

---

## ৩. Expo বনাম নেটিভ দায়িত্ব

| দায়িত্ব | মালিক | নোট |
|---|---|---|
| পারমিশন রিকোয়েস্ট UI ফ্লো | নেটিভ (Kotlin) + JS-এক্সপোজড মেথড | `Settings.canDrawOverlays`, `ACTION_MANAGE_OVERLAY_PERMISSION` |
| Foreground `Service` লাইফসাইকেল | নেটিভ (Kotlin) | হোস্ট অ্যাপ ব্যাকগ্রাউন্ডে গেলেও ওভারলে টিকে থাকার জন্য প্রয়োজনীয় |
| `WindowManager` উইন্ডো তৈরি/ধ্বংস | নেটিভ (Kotlin) | জেনেরিক — শুধু একটি উইন্ডো + কন্টেইনার ভিউ ম্যানেজ করে |
| ওই উইন্ডোর ভেতরে একটি `ReactRootView`/Surface হোস্ট করা | নেটিভ (Kotlin), Expo Modules API + RN-এর নিজস্ব `ReactHost`/`ReactInstanceManager` API-র মাধ্যমে | এটিই জেনেরিক shell এবং RN কনটেন্টের মধ্যে "ব্রিজ" |
| Drag, resize, snap-to-edge, minimize/restore **chrome মেকানিক্স** (অর্থাৎ raw টাচ ডেল্টাকে উইন্ডো পজিশন/সাইজ আপডেটে রূপান্তর করা) | নেটিভ (Kotlin) | নেটিভ হতেই হবে কারণ `WindowManager.updateViewLayout()`-ই একমাত্র উপায় একটি *সিস্টেম* উইন্ডো মুভ করার; RN gesture handler-রা এমন উইন্ডো মুভ করতে পারে না যা তাদের মালিকানায় নেই |
| Drag/resize/minimize *ভিজুয়ালি কী মানে দাঁড়ায়* তা সিদ্ধান্ত নেওয়া (যেমন, minimized bubble-টি কেমন দেখায়, অ্যানিমেশন ইজিং, স্ন্যাপ জোনের স্টাইলিং) | React Native (JS) | নেটিভ শুধু raw gesture ডেল্টা/স্টেট রিপোর্ট করে; JS চাইলে ফ্লোটিং ভিউর সাব-এলিমেন্টের জন্য নিজস্ব ইন্টার্নাল RN gesture handling-ও যুক্ত করতে পারে |
| সমস্ত আসল UI: বাটন, টেক্সট, ছবি, লিস্ট, অ্যানিমেশন, থিমিং | React Native (JS) | ১০০% — Kotlin এটি কখনো parse বা জানে না |
| সমস্ত বিজনেস লজিক, স্টেট, অ্যাপ-স্পেসিফিক আচরণ | React Native (JS) | ১০০% |
| কনফিগ (`AndroidManifest.xml`-এ পারমিশন, foreground service type) | Expo Config Plugin | `expo prebuild` সময়ে জেনারেট হয়, হাতে এডিট করা হয় না |
| বিল্ড অর্কেস্ট্রেশন | Expo (`expo-dev-client`, `eas build`) | raw `react-native init` ওয়ার্কফ্লোর প্রয়োজন নেই |

---

## ৪. React Native রেন্ডারিং স্ট্র্যাটেজি

- ওভারলে কনটেন্ট হলো **একটি স্বাভাবিক RN কম্পোনেন্ট ট্রি**, যা PopScreen লাইব্রেরির *কনজিউমার* লিখে — যেমন:

  ```tsx
  <PopScreenContent>
    <MyBubbleUI onExpand={...} progress={progress} />
  </PopScreenContent>
  ```

- এই ট্রিটি একটি **সেকেন্ড AppRegistry/RN সারফেস** হিসেবে রেজিস্টার্ড হয় তার নিজস্ব সারফেস নামে (যেমন `"PopScreenOverlay"`), যেভাবে একটি RN অ্যাপ একাধিক Activity/widget-এর জন্য একাধিক root component রেজিস্টার করতে পারে।
- স্টেট এতে ঠিক একইভাবে প্রবেশ করে যেভাবে কোনো RN ট্রিতে প্রবেশ করে: props, context, গ্লোবাল store (Redux/Zustand/Jotai/Recoil সব কাজ করে — এগুলো শুধু JS module-level singleton, যা দুই সারফেসেই শেয়ার হয় কারণ এটি একটিই JS রানটাইম)।
- সাধারণ re-render-এর জন্য JS এবং Kotlin-এর মধ্যে **কোনো বিশেষ "diffing" বা "serialization" প্রয়োজন নেই** — এটি ওভার-ইঞ্জিনিয়ার করা সহজ একটি অংশ। একবার Fabric/RootView ওভারলে উইন্ডোতে মাউন্ট হয়ে গেলে, RN-এর স্বাভাবিক Yoga layout + Fabric commit pipeline সরাসরি ওই উইন্ডোর সারফেসে আঁকে, ঠিক যেমনটা মেইন Activity-র উইন্ডোতে আঁকে। প্রতিটি স্টেট পরিবর্তনে Kotlin-কে "রিফ্রেশ করতে বলা" লাগে না।
- Kotlin-কে **শুধু** একটি ছোট, নির্দিষ্ট সেট *উইন্ডো-লেভেল* (UI-লেভেল না) ইভেন্ট জানাতে হয়:
  - "show now" / "hide now" / "destroy"
  - "উইন্ডো W×H সাইজে resize করো"
  - "উইন্ডো X,Y পজিশনে নিয়ে যাও"
  - "minimize to bubble" / "restore to full"
  - "উইন্ডোর টাচ-পাসথ্রু মোড সেট করো" (যেমন, পুরোপুরি click-through বা interactive)

  এগুলোই "UI আপডেট"-সংক্রান্ত JS↔Kotlin সীমানা পার হওয়া *একমাত্র* মেসেজ — এবং খেয়াল করুন, এগুলো **উইন্ডো** সম্পর্কে, **উইন্ডোর ভেতরের UI** সম্পর্কে নয়। এটিই Kotlin-কে জেনেরিক রাখে: এটি একটি black-box কন্টেইনার ম্যানিপুলেট করে, কখনো এর কনটেন্ট না।

---

## ৫. Android ওভারলে আর্কিটেকচার

### মূল বিল্ডিং ব্লকসমূহ

1. **`PopScreenOverlayService`** — একটি Android `Service` (foreground service, কারণ Android 8+ ব্যাকগ্রাউন্ড রেস্ট্রিকশন এবং Android 14-এর foreground service type enforcement যেকোনো long-lived ওভারলের জন্য এটি প্রয়োজনীয় করে তোলে), যা:
   - `WindowManager` রেফারেন্স এবং ওভারলে `View` hierarchy-র মালিক।
   - Expo মডিউলের কমান্ড অনুযায়ী start/stop হয়।
   - একবার অ্যাটাচ হয়ে গেলে `ReactRootView`/`ReactSurface` instance ধরে রাখে।
   - Android 14+ এর প্রয়োজনীয়তা অনুসারে `foregroundServiceType="specialUse"` (বা সবচেয়ে কাছাকাছি ম্যাচিং টাইপ) declare করতে হবে, একটি manifest justification string সহ।

2. **`PopScreenWindowManager`** (ইন্টার্নাল Kotlin helper ক্লাস, Android-এর `WindowManager` নয়) — `WindowManager.LayoutParams` সেটআপ wrap করে:
   ```kotlin
   WindowManager.LayoutParams(
       width, height,
       WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, // API 26+
       FLAG_NOT_FOCUSABLE or FLAG_LAYOUT_NO_LIMITS,          // toggled per mode
       PixelFormat.TRANSLUCENT
   )
   ```
   - `FLAG_NOT_FOCUSABLE` toggle করে নির্ভর করে bubble-এ টেক্সট ইনপুট ফোকাস লাগবে কিনা তার উপর (rare, কিন্তু ডেভেলপার যদি bubble-এ একটি editable field চান তখন এটি গুরুত্বপূর্ণ)।
   - "ghost"/click-through স্টেটের জন্য `FLAG_NOT_TOUCHABLE` toggle করে।

3. **`PopScreenReactSurfaceHost`** — যেই অংশটি RN-এর ইন্টার্নালের সাথে ব্রিজ করে:
   - নতুন আর্কিটেকচারে (Bridgeless/Fabric, যা এখন RN-এর ডিফল্ট), `ReactHost.createSurface(surfaceId, "PopScreenOverlay", initialProps)` ব্যবহার করে একটি `ReactSurface` পায়, যার `view` প্রপার্টিটি ওভারলে উইন্ডোতে অ্যাটাচ হয়।
   - পুরোনো আর্কিটেকচার fallback-এ, `ReactRootView` + `reactInstanceManager.attachRootViewToInstance(rootView)` ব্যবহার করে, সাথে `rootView.startReactApplication(reactInstanceManager, "PopScreenOverlay", initialProps)`।
   - যেভাবেই হোক, এই view object-টিই `windowManager.addView()`-তে যায়। **এটিই "নেটিভ লেয়ারকে কি একটি RN root view হোস্ট করতে হবে" — এই প্রশ্নের আসল উত্তর — হ্যাঁ, স্ট্রাকচারালি এটি করতেই হবে, কিন্তু ফাংশনালি এর জন্য প্রায় কোনো কাস্টম RN-aware কোডের প্রয়োজন নেই, কারণ RN-এর নিজস্ব ক্লাসগুলোই ভারী কাজটা করে দেয়।**

4. **Drag/resize টাচ ইন্টারসেপ্টর** — একটি পাতলা `View.OnTouchListener` (বা একটি কাস্টম `FrameLayout` যা `onInterceptTouchEvent` override করে) যা RN সারফেস ভিউয়ের *চারপাশে* wrap করা থাকে, এটি:
   - উইন্ডোর chrome/edge-এ raw `ACTION_DOWN/MOVE/UP` ডেল্টা ক্যাপচার করে।
   - সিস্টেম উইন্ডোটি আসলে মুভ/রিসাইজ করার জন্য `windowManager.updateViewLayout(view, updatedParams)` কল করে।
   - একটি লাইটওয়েট, জেনেরিক ইভেন্ট (`{ type: 'drag', dx, dy }` বা `{ type: 'resize', width, height }`) Expo Modules-এর `Events` মেকানিজমের মাধ্যমে JS-এ ফরোয়ার্ড করে — **না** যে "বাটন X চাপা হয়েছে", শুধু raw gesture টেলিমেট্রি, যা Kotlin-এর ভোকাবুলারিকে জেনেরিক রাখে।
   - কনটেন্ট bounds-এর *ভেতরের* কোনো টাচ (যদি drag handle-এ না হয়) RN সারফেসে অপরিবর্তিতভাবে পাস করে দেয়, যাতে ফ্লোটিং UI-এর ভেতরের বাটন/gesture RN-এর নিজস্ব gesture system দিয়ে স্বাভাবিকভাবে কাজ করে।

### নেটিভ লেয়ার যেসব লাইফসাইকেল স্টেট ম্যানেজ করে (জেনেরিক, UI-অজ্ঞাত)

```
UNINITIALIZED → PERMISSION_PENDING → READY → SHOWN ⇄ MINIMIZED → HIDDEN → DESTROYED
```

Kotlin এই স্টেটগুলোর মধ্যে ট্রানজিশন এক্সপোজ করে; JS সিদ্ধান্ত নেয় *কখন* এগুলো ট্রিগার করতে হবে এবং *ভিজুয়ালি প্রতিটি স্টেট কেমন দেখাবে* (যেভাবেই হোক, এটি RN কনটেন্টই — "minimized" শুধু আলাদা RN render tree props-সহ একটি ছোট উইন্ডো, যেমন `<PopScreenContent minimized={true}>`)।

---

## ৬. Kotlin নেটিভ মডিউল ডিজাইন

**Expo Modules API** দিয়ে তৈরি (লেগেসি bridge-style নেটিভ মডিউল না), কারণ এটি:
- আলাদা কোড পাথ ছাড়াই পুরোনো এবং নতুন দুটো RN আর্কিটেকচার সাপোর্ট করে — **নিশ্চিত প্রয়োজনীয়তা**, কারণ PopScreen থার্ড-পার্টি npm কনজিউমারদের টার্গেট করে যারা এখনও New Architecture (Fabric/Bridgeless)-এ নাও থাকতে পারে। মডিউলটি নিজে একটি একক Kotlin API সারফেসে লেখা হয়; Expo Modules-এর নিজস্ব abstraction-ই host অ্যাপটি যে আর্কিটেকচার ব্যবহার করছে তার দিকে রাউটিং সামলায়।
- সরাসরি JSI ব্যবহার করে — ঘন ঘন কলের (drag ডেল্টা, resize stream) জন্য JSON bridge-এর চেয়ে কম ওভারহেড।
- ফাংশন, async ফাংশন, ইভেন্ট, এবং প্রয়োজনে নেটিভ ভিউয়ের জন্যও একটি পরিচ্ছন্ন declarative DSL দেয়।

**`ReactSurfaceHost`-এর (উপরে §৫) জন্য প্র্যাকটিক্যাল প্রভাব:** দুই-আর্কিটেকচার সাপোর্ট প্রয়োজনীয় হওয়ায়, overlay-surface-mounting কোডে **দুটো** কোড পাথ লাগবে — New Architecture চালানো অ্যাপের জন্য `ReactHost.createSurface(...)`, এবং এখনও পুরোনো আর্কিটেকচার/bridge-এ থাকা অ্যাপের জন্য `ReactRootView` + `ReactInstanceManager.attachRootViewToInstance(...)`। মডিউল init-এর সময়, PopScreen ডিটেক্ট করে host অ্যাপ কোন `ReactInstanceManager`/`ReactHost` টাইপ এক্সপোজ করছে এবং তার মিলে যাওয়া পাথটি বেছে নেয়। এটি surface-hosting কোডকে মোটামুটি দ্বিগুণ করে দেয় (একটির বদলে দুটো ইমপ্লিমেন্টেশন), কিন্তু npm-publishing গোলের দিক থেকে এটিই সঠিক ট্রেডঅফ — বাস্তবে অনেক consumer অ্যাপ এখনও পুরোনো আর্কিটেকচার থেকে মাইগ্রেশনের মাঝপথে আছে।

### মডিউল সারফেস (`PopScreenModule.kt`)

```kotlin
class PopScreenModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PopScreen")

    Events("onWindowStateChange", "onDragUpdate", "onResizeUpdate", "onPermissionResult")

    AsyncFunction("hasOverlayPermission") { ... }
    AsyncFunction("requestOverlayPermission") { promise: Promise -> ... }

    AsyncFunction("show") { initialProps: Map<String, Any?>?, promise: Promise -> ... }
    AsyncFunction("hide") { ... }
    AsyncFunction("destroy") { ... }

    AsyncFunction("setWindowRect") { x: Int, y: Int, width: Int, height: Int -> ... }
    AsyncFunction("minimize") { ... }
    AsyncFunction("restore") { ... }
    AsyncFunction("setTouchMode") { mode: String -> ... } // "interactive" | "clickThrough"

    AsyncFunction("updateProps") { props: Map<String, Any?> -> ... }
    // ^ optional convenience: pushes new initialProps into the overlay's
    //   ReactSurface without the dev manually re-deriving it from shared
    //   state — still 100% generic, Kotlin just forwards an opaque map.
  }
}
```

**গুরুত্বপূর্ণ বিষয়:** এখানে প্রতিটি ফাংশনই **উইন্ডো মেকানিক্স বা opaque prop-passing** নিয়ে, "UI কী করছে" নিয়ে কখনোই নয়। `updateProps`-টাই "জেনেরিক UI আপডেট মেকানিজম"-এর সবচেয়ে কাছাকাছি, এবং সেটাও শুধু একটি আর্বিট্রারি serializable blob RN সারফেসের props-এ ফরোয়ার্ড করা — Kotlin কখনো এর কনটেন্ট ইন্সপেক্ট করে না।

### একটি `Activity`-bound ভিউয়ের বদলে কেন একটি `Service`

চ্যাট-বাবল-স্টাইল ওভারলেকে host অ্যাপ ব্যাকগ্রাউন্ডে গেলে বা এমনকি কিল হলেও (OS সীমার মধ্যে) টিকে থাকতে হবে — এটিই পুরো পয়েন্ট (Messenger bubble Messenger থেকে বের হয়ে গেলেও টিকে থাকে)। উইন্ডোর লাইফসাইকেলকে একটি `Service`-এর সাথে বাইন্ড করা (একটি `Activity`-র বদলে) এটিকে সম্ভব করে।

---

## ৭. React Native এবং Kotlin-এর মধ্যে কমিউনিকেশন

দুটি চ্যানেল, Expo Modules API-এর প্রিমিটিভের সাথে মিলে:

### JS → Native (কমান্ড)
JSI-এর মাধ্যমে সরাসরি async ফাংশন কল (স্বাভাবিক JS↔native marshalling-এর বাইরে কোনো অতিরিক্ত serialization overhead নেই):
```ts
await PopScreenModule.show({ minimized: false });
await PopScreenModule.setWindowRect(x, y, w, h);
await PopScreenModule.updateProps({ progress: 0.42, title: "Track 3" });
```

### Native → JS (ইভেন্ট)
Expo-র `Events()` + `sendEvent()`:
```kotlin
sendEvent("onDragUpdate", mapOf("dx" to dx, "dy" to dy, "x" to newX, "y" to newY))
```
```ts
PopScreenModule.addListener('onDragUpdate', (e) => { ... });
```

### ইচ্ছাকৃতভাবে যা *আলাদা চ্যানেল না*
এখানে **"push UI to native"-এর জন্য কোনো আলাদা RPC নেই।** একবার ওভারলে `ReactSurface` মাউন্ট হয়ে গেলে, স্বাভাবিক RN render pipeline (state change → re-render → Fabric commit → paint) স্বয়ংক্রিয়ভাবে ওভারলে উইন্ডো আপডেট করে দেয়, ঠিক যেমনটা যেকোনো RN স্ক্রিন আপডেট হয়। এখানে যে "কমিউনিকেশন"-টা গুরুত্বপূর্ণ তা হলো:
- উইন্ডো state/position/size সম্পর্কে কমান্ড (JS→Native)
- raw gesture/lifecycle টেলিমেট্রি (Native→JS)

এটিই সিস্টেমটিকে জেনেরিক *এবং* সহজ রাখে — "UI tree"-র জন্য কোনো কাস্টম সিরিয়ালাইজেশন ফরম্যাট আবিষ্কার বা মেইনটেইন করার প্রয়োজন নেই।

---

## ৮. জেনেরিক UI আপডেট মেকানিজম

মূল ডিজাইন কনস্ট্রেইন্টের সরাসরি উত্তর: **"নেটিভকে জানতে হবে না কী পরিবর্তন হয়েছে, শুধু জানতে হবে যে রিফ্রেশ করতে হবে।"**

মেকানিজম:
1. ডেভেলপার কনটেন্ট `<PopScreenContent>{...}</PopScreenContent>`-এ wrap করেন (লাইব্রেরির এক্সপোর্ট করা একটি ছোট RN কম্পোনেন্ট)।
2. এটি স্টার্টআপে **ওভারলে সারফেসের** root কম্পোনেন্ট হিসেবে রেজিস্টার হয় (`AppRegistry.registerComponent('PopScreenOverlay', () => PopScreenRoot)`)।
3. ডেভের অ্যাপের যেকোনো জায়গায় যেকোনো স্টেট পরিবর্তন (Redux dispatch, Context আপডেট, bubble UI-র ভেতরে local `useState`, ইত্যাদি) যা `<PopScreenContent>`-এর ভেতরে রেন্ডার হওয়া কিছুকে প্রভাবিত করে, তা RN-এর স্বাভাবিক re-render → Fabric commit ট্রিগার করে, যা **ওভারলে সারফেসে সীমাবদ্ধ**, মেইন অ্যাপ সারফেস থেকে স্বাধীন।
4. Kotlin-এর `ReactSurface`/`ReactRootView` আসলে *একপ্রকার* লাইভ উইন্ডো কনটেন্ট — "রিফ্রেশ" করার কিছু নেই কারণ এটি কোনো snapshot/screenshot সিস্টেম না, এটি একটি লাইভ মাউন্টেড ভিউ। যখনই এর নিচের সারফেস repaint হয়, উইন্ডোটিও নিজেই repaint করে নেয়, ঠিক যেমন যেকোনো Android view invalidation কাজ করে।
5. একমাত্র যে ক্ষেত্রে Kotlin-কে স্পষ্ট নির্দেশনা দিতে হয় তা হলো **non-rendering উইন্ডো প্রপার্টি** — সাইজ/পজিশন প্রোগ্র্যামেটিকভাবে (drag না হয়ে) resize হলে, বা visibility toggle হলে। এগুলো `setWindowRect` / `show` / `hide`-এর মাধ্যমে যায়, যেগুলো আবার জেনেরিক, opaque কমান্ড।

এটি আপনার প্রয়োজনীয়তা ঠিকঠাক পূরণ করে: Kotlin কখনো props parse করে না, কখনো "কোন বাটন" জানে না, কখনো বিজনেস লজিক এক্সিকিউট করে না — এটি একটি উইন্ডো এবং একটি লাইভ ভিউয়ের মালিক; React এর ভেতরে রেন্ডার হওয়া সবকিছুর মালিক।

---

## ৯. স্টেট সিনক্রোনাইজেশন স্ট্র্যাটেজি

§২-এর **একক JS রানটাইম, দুই-সারফেস** মডেল অনুসারে:

- মেইন অ্যাপ এবং bubble-এর মধ্যে শেয়ার্ড স্টেটের জন্য **কোনো cross-process/cross-runtime sync প্রয়োজন নেই** — এগুলো একই JS heap। একটি Zustand store, Redux store, বা React Context (যদি দুটো সারফেসের registration point-এর উপরে তোলা থাকে) তুচ্ছভাবেই শেয়ার্ড।
- **সতর্কতা:** Context provider-রা স্বয়ংক্রিয়ভাবে দুটো ইন্ডিপেন্ডেন্টলি-মাউন্টেড RN root tree-র মধ্যে span করে না (কারণ এরা সাহিত্যিকভাবেই আলাদা root-সহ আলাদা কম্পোনেন্ট ট্রি) — তাই Context-ভিত্তিক স্টেট প্রতিটি সারফেসের root-কে *আলাদাভাবে* একই `Provider`-এ wrap করে দিতে হয় (একই store instance পয়েন্ট করে, যেমন Zustand/Redux, যেগুলো এমনিতেই React-এর ট্রির বাইরে থাকে)। এটি লাইব্রেরির ডকুমেন্টেশনের জন্য একবারের সেটআপ বিষয়, runtime sync সমস্যা না।
- **প্রস্তাবিত প্যাটার্ন:** একটি ছোট external store (Zustand-style, Context প্রয়োজন নেই) দ্বারা backed একটি `usePopScreen()` হুক শিপ করা, যাতে provider-tree জটিলতা ছাড়াই দুটো সারফেসই একই source of truth-এ সাবস্ক্রাইব করতে পারে।
- **প্রসেস ডেথ:** যদি Android host অ্যাপ প্রসেসকে কিল করে দেয় ওভারলে `Service` টিকে থাকা অবস্থায় (foreground service সবচেয়ে শেষে কিল হয়, কিন্তু memory pressure-এ এখনও কিল হতে পারে), JS রানটাইম এর সাথেই মরে যায়, এবং ওভারলেটিকে হয় নিজেও মরে যেতে হবে অথবা নিজের embedded JS bundle restart করতে হবে। **v1-এর জন্য প্রস্তাবনা: ওভারলে Service-এর লাইফসাইকেলকে host প্রসেসের সাথে বাইন্ড করা** (অর্থাৎ, প্রসেস মরলে ওভারলেও অদৃশ্য হয়ে যায়) — এটি একটি Service-এর ভেতরে standalone JS engine restart করার অনেক কঠিন বাগের শ্রেণিকে এড়িয়ে যায়। এটিকে একটি জ্ঞাত সীমাবদ্ধতা হিসেবে ডকুমেন্ট করুন; এটি আজকের অধিকাংশ bubble লাইব্রেরির আচরণের সাথে মিলে যায়।

---

## ১০. ওভারলে লাইফসাইকেল ম্যানেজমেন্ট

| ট্রিগার | আচরণ |
|---|---|
| `PopScreen.show()` কল হলে | পারমিশন চেক → foreground `Service` স্টার্ট → উইন্ডো তৈরি → `ReactSurface` মাউন্ট/অ্যাটাচ → fade/scale in (JS-নিয়ন্ত্রিত অ্যানিমেশন, নেটিভ শুধু উইন্ডোটি visible করে) |
| অ্যাপ ব্যাকগ্রাউন্ডে গেলে | ওভারলে টিকে থাকে (এটি `Service`-এর মালিকানাধীন একটি আলাদা উইন্ডো, Activity লাইফসাইকেল থেকে স্বাধীন) |
| ইউজার অ্যাপ ফোর্স-কিল করলে (recents থেকে swipe) | OS/manufacturer-এর আগ্রাসিতার উপর নির্ভর করে `Service` টিকেও থাকতে পারে বা না-ও থাকতে পারে; Android-এর সাধারণ background-execution সীমাবদ্ধতা অনুসারে best-effort হিসেবে ডকুমেন্ট করুন, guaranteed নয় |
| সেশনের মাঝে ইউজার ওভারলে পারমিশন revoke করলে | পরের `show()`/resume-এ permission re-check-এর মাধ্যমে Kotlin এটি ডিটেক্ট করে, gracefully উইন্ডো ভেঙে দেয়, `onPermissionResult: revoked` ইভেন্ট পাঠায় |
| `PopScreen.hide()` | `WindowManager` থেকে উইন্ডো রিমুভ হয়, `ReactSurface` ডিট্যাচ হয় (ধ্বংস হয় না — সস্তায় আবার দেখানো যায়) |
| `PopScreen.destroy()` | সম্পূর্ণ teardown: সারফেস ধ্বংস হয়, `Service` থামে, সব নেটিভ রেফারেন্স রিলিজ হয় |
| ডিভাইস রোটেশন / কনফিগ পরিবর্তন | Service-হোস্টেড উইন্ডো Activity কনফিগ পরিবর্তনের সাথে বাঁধা নয়, কিন্তু DP→PX রূপান্তর ঠিক রাখতে `Configuration` পরিবর্তন শুনতে হবে |

---

## ১১. টাচ ইভেন্ট হ্যান্ডলিং

দুটি টাচ ডোমেইন যা পরিষ্কারভাবে আলাদা থাকতে হবে:

1. **Chrome-লেভেল টাচ (নেটিভ-মালিকানাধীন):** drag handle, resize handle, minimized bubble-এর "grab area"। Kotlin-এর টাচ ইন্টারসেপ্টর এটি হ্যান্ডল করে, যা সরাসরি `WindowManager.updateViewLayout()` কল করে — এটি *নেটিভ হতেই হবে*, কারণ একটি সিস্টেম-লেভেল উইন্ডোর স্ক্রিন পজিশন মুভ করা JS বা RN-এর gesture responder সিস্টেমের অ্যাক্সেসে নেই (RN gesture একটি ভিউয়ের নিজস্ব bounds/coordinate space-এর ভেতরে কাজ করে, OS window manager-এ না)।
2. **কনটেন্ট-লেভেল টাচ (RN-মালিকানাধীন):** ফ্লোটিং UI-এর কনটেন্ট এরিয়ার *ভেতরে* tap, scroll, swipe (যেমন bubble-এর ভেতরের একটি বাটন, একটি swipeable কার্ড)। এগুলো অপরিবর্তিতভাবে RN সারফেসে পাস হয়ে যায়, যেটি একটি স্বাভাবিক স্ক্রিনে যেমন করত একইভাবে RN-এর স্বাভাবিক gesture responder সিস্টেম / `react-native-gesture-handler` ব্যবহার করে।

ইমপ্লিমেন্টেশন ডিটেইল: নেটিভ কন্টেইনারটি সাধারণত RN সারফেস ভিউকে wrap করা একটি কাস্টম `FrameLayout`, যেখানে `onInterceptTouchEvent` চেক করে টাচটি একটি নির্ধারিত "drag handle" অঞ্চলে শুরু হয়েছে (JS থেকে কনফিগারেবল, যেমন `dragHandleHeight` prop) নাকি কনটেন্ট অঞ্চলে, এবং শুধু আগের ক্ষেত্রেই ইন্টারসেপ্ট করে।

---

## ১২. Dragging, Resizing, Minimizing, Restoring

| ফিচার | নেটিভ দায়িত্ব | RN দায়িত্ব |
|---|---|---|
| **Drag** | টাচ ডেল্টা ট্র্যাক করা, রিয়েল-টাইমে উইন্ডো মুভ করতে `updateViewLayout` কল করা, (থ্রটলড) `onDragUpdate` ইভেন্ট পাঠানো | drag চলাকালীন ভিজুয়াল ফিডব্যাক সিদ্ধান্ত নেওয়া (যেমন dim/scale), snap-to-edge টার্গেট জোন সিদ্ধান্ত নেওয়া এবং পজিশন finalize করতে `setWindowRect` কল করা, যেকোনো "drop zone" ইন্ডিকেটর UI রেন্ডার করা |
| **Resize** | Drag-এর মতই, কিন্তু `LayoutParams`-এ `width`/`height` অ্যাডজাস্ট করা | min/max সাইজ কনস্ট্রেইন্ট সিদ্ধান্ত নেওয়া (নেটিভে কনফিগ হিসেবে পাস হয়), resize handle ভিজুয়াল রেন্ডার করা |
| **Minimize** | `minimize()` কল রিসিভ করে → উইন্ডোকে একটি নির্দিষ্ট ছোট সাইজ/পজিশনে সংকুচিত করে (যেমন bottom-right corner) | `<PopScreenContent minimized={true}>` ছোট লেআউট দিয়ে re-render করে (যেমন শুধু একটি icon/avatar) — নেটিভ জানে না কনটেন্টের আকার পরিবর্তন হয়েছে, এটি শুধু JS-এর `setWindowRect`-এর নির্দেশ অনুসারে উইন্ডো resize করেছে |
| **Restore** | `restore()` কল রিসিভ করে → উইন্ডোকে আবার শেষ পূর্ণ সাইজ/পজিশনে বড় করে | `<PopScreenContent minimized={false}>` পূর্ণ লেআউট দিয়ে re-render করে |
| **Snap-to-edge** | Smoothness-এর জন্য অপশনালি নেটিভে ইমপ্লিমেন্ট করা যায় (`updateViewLayout` কল অ্যানিমেট করে), কিন্তু snap জোন কোথায় হবে তার *সিদ্ধান্ত* JS থেকে কনফিগ হিসেবে পাস করা যায় | উইন্ডো-এজ অ্যানিমেশন smoothness-এর margin of error গ্রহণযোগ্য হলে পুরোপুরি JS-এও করা যায় — প্রস্তাবনা: JS-নিয়ন্ত্রিত দিয়ে শুরু করা, jank দেখা গেলে তখনই নেটিভ অ্যানিমেশনে optimize করা |

---

## ১৩. পারফরম্যান্স বিবেচনা

- **দ্বিতীয় একটি সম্পূর্ণ JS engine তৈরি করা এড়িয়ে চলুন।** দুটো সারফেসের জন্য একটি `ReactHost`/`ReactInstanceManager` রিইউজ করা (§২ অনুসারে) JS heap, মডিউল রেজিস্ট্রি, এবং bundle parse cost ডুপ্লিকেট করা এড়িয়ে যায় — এটি এই প্রজেক্টের সবচেয়ে বড় পারফরম্যান্স সিদ্ধান্ত।
- **Drag/resize ইভেন্ট emission থ্রটল করুন** নেটিভ থেকে JS-এ (যেমন, প্রতি ~16ms-এ একবার `onDragUpdate` পাঠানো, বা JS-এর continuous tracking না লাগলে শুধু `ACTION_UP`-এ পাঠানো) — drag চলাকালীন আসল উইন্ডো মুভমেন্ট প্রতি পিক্সেলে JS-এ round-trip না করে নেটিভেই হওয়া উচিত, শুধু *ফাইনাল* পজিশনটি স্টেট প্রয়োজনের জন্য সিঙ্ক ব্যাক করা লাগবে।
- **ওভারলে সারফেস কনভেনশন অনুযায়ী লাইটওয়েট হওয়া উচিত** — ডকুমেন্ট করুন যে ফ্লোটিং UI ছোট, ফোকাসড উইজেটের জন্য (যেমন Messenger bubble/YT PiP), পুরো স্ক্রিনের জন্য না, যাতে Fabric layout/paint cost মেইন অ্যাপের সারফেসের সাথে JS thread time-এর জন্য প্রতিযোগিতা না করে (এখনও একটিই JS thread, দুই সারফেসের মধ্যে শেয়ার্ড)।
- **সারফেসগুলোর মধ্যে অপ্রয়োজনীয় re-render এড়িয়ে চলুন** — Zustand/Redux ব্যবহার করলে নিশ্চিত করুন selector-গুলো প্রতি-সারফেস স্কোপড, যাতে মেইন অ্যাপের জন্য রেলিভ্যান্ট একটি স্টেট পরিবর্তন bubble সারফেসের React ট্রিতে কাজ ট্রিগার না করে (এবং বিপরীতও)।
- **যেখানে সম্ভব `RNGestureHandlerEnabled` / Reanimated ব্যবহার করুন** কনটেন্ট-ভেতরের অ্যানিমেশনের জন্য (যেমন minimized bubble pulse) যাতে এগুলো JS thread-এর বাইরে UI thread-এ চলে, JS thread কখনো মেইন-অ্যাপের কাজে busy থাকলেও jank-এর ঝুঁকি কমায়।

---

## ১৪. সিকিউরিটি এবং প্রাইভেসি বিবেচনা

- **`SYSTEM_ALERT_WINDOW` একটি সেনসিটিভ পারমিশন** — Android গ্র্যান্ট করার সময় একটি সিস্টেম-লেভেল সতর্কতা দেখায়, এবং Play Store পলিসি এর ব্যবহার justify করতে বলে (এটি ঐতিহাসিকভাবে tapjacking/overlay-attack ম্যালওয়্যারে অপব্যবহৃত হয়েছে)। Play Store-এ শিপ করা লাইব্রেরি কনজিউমারদের জন্য এটি স্পষ্টভাবে ডকুমেন্ট করুন; তারা সম্ভবত Play Console পলিসি রিভিউ প্রশ্নের মুখোমুখি হবে।
- **Tapjacking মিটিগেশন:** নিশ্চিত করুন ওভারলে উইন্ডো নিচের অ্যাপের জন্য উদ্দিষ্ট সেনসিটিভ ট্যাপ নিঃশব্দে ক্যাপচার করে না — শুধু ডেভেলপার-নির্ধারিত কনটেন্ট এরিয়াই টাচ ইন্টারসেপ্ট করবে; এর বাইরে, উইন্ডো রিজিয়ন হয় থাকবেই না (সাইজ কনটেন্টের সাথে টাইট ম্যাচ করবে) অথবা non-interactive padding-এর জন্য স্পষ্টভাবে `FLAG_NOT_TOUCHABLE` ব্যবহার করবে।
- **স্বয়ংক্রিয় স্ক্রিন-কনটেন্ট ক্যাপচার নেই।** এই লাইব্রেরি *অন্য* অ্যাপ থেকে কনটেন্ট পড়া/মিরর করার চেষ্টা করে না, এবং করা উচিতও না (`MediaProjection`-ভিত্তিক স্ক্রিন-রেকর্ডিং ওভারলের মত না) — ডকুমেন্টে স্পষ্ট করুন এটি "আপনার নিজের RN UI উপরে আঁকা", "স্ক্রিনে কী আছে দেখা" ক্যাপাবিলিটি না, যা অনেক ভারী প্রাইভেসি/পারমিশন বোঝা এড়িয়ে যায় (`MediaProjection`-এ প্রতি-সেশনে ইউজার কনসেন্ট লাগে)।
- **Foreground service নোটিফিকেশন:** Android-এ foreground service চলাকালীন একটি persistent নোটিফিকেশন বাধ্যতামূলক — কেন ওভারলে অ্যাক্টিভ তা নিয়ে end user-দের কাছে স্বচ্ছ থাকুন (স্ট্যান্ডার্ড Android UX, এবং একটি Play পলিসি প্রত্যাশাও)।
- **`updateProps`-এর মাধ্যমে পাস হওয়া ডেটা** অন্য যেকোনো React Native ডেটার মতই একই JS↔native সীমানা পার হয় — host অ্যাপ তার নিজের স্টেটের জন্য যা আগে থেকেই করছে তার বাইরে আলাদা কোনো এনক্রিপশনের প্রয়োজন নেই, কিন্তু উচ্চ সংবেদনশীল ডেটা (auth token ইত্যাদি) অপ্রয়োজনে ওভারলে props-এ রাখবেন না, কারণ এটি এখন একটি দ্বিতীয় সারফেসের render tree-তেও ডুপ্লিকেট হচ্ছে (এখনও in-memory, একই প্রসেস, একই trust boundary — হার্ড সিকিউরিটি সমস্যা না, শুধু "যা এক্সপোজ করছেন তা মিনিমাইজ করুন" হাইজিন নোট)।

---

## ১৫. প্রয়োজনীয় Android পারমিশন

```xml
<!-- Required: draw the overlay window -->
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

<!-- Required: keep the overlay alive via a foreground service -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- Required on Android 14+ (API 34+): must declare a specific foreground service type -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />

<service
  android:name=".PopScreenOverlayService"
  android:foregroundServiceType="specialUse"
  android:exported="false">
  <property
    android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
    android:value="floating_overlay_ui" />
</service>
```

- উপরের সবকিছু একটি **Expo Config Plugin**-এর মাধ্যমে inject করা উচিত (যাতে npm প্যাকেজের কনজিউমাররা হাতে `AndroidManifest.xml` এডিট না করে, এবং CNG/`expo prebuild` সঠিকভাবে regenerate করে)।
- `SYSTEM_ALERT_WINDOW`-এর জন্য আলাদাভাবে **runtime grant flow** লাগে (`Settings.canDrawOverlays()` চেক + `ACTION_MANAGE_OVERLAY_PERMISSION` settings-screen redirect) — এটি স্কিপ বা auto-grant করা যায় না; JS থেকে `PopScreenModule.requestOverlayPermission()` হিসেবে এক্সপোজড।

---

## ১৬. টেস্টিং স্ট্র্যাটেজি

| লেয়ার | পদ্ধতি |
|---|---|
| Kotlin মডিউল unit টেস্ট | pure logic-এর জন্য JVM-ভিত্তিক unit টেস্ট (layout param calculation, state machine ট্রানজিশন) স্ট্যান্ডার্ড Android instrumentation/JUnit ব্যবহার করে; `WindowManager` মক করা |
| Kotlin ইন্টিগ্রেশন টেস্ট | একটি এমুলেটর/ডিভাইসে Android instrumented টেস্ট (`androidTest`) উইন্ডো add/remove, পারমিশন ফ্লো, Service লাইফসাইকেল ভেরিফাই করার জন্য |
| JS/TS unit টেস্ট | `usePopScreen()` হুকের জন্য Jest, `<PopScreenContent>` কম্পোনেন্টের প্রপ হ্যান্ডলিং, মক করা নেটিভ মডিউল (টেস্ট এনভায়রনমেন্টে Expo Modules নেটিভ মডিউলের জন্য JS-সাইড মক সাপোর্ট করে) |
| End-to-end | ম্যানুয়াল + স্ক্রিপ্টেড (Maestro বা Detox, যদি Detox-এর Android সাপোর্ট Service-হোস্টেড উইন্ডো কভার করে — সত্যিকারের ওভারলে-উইন্ডো ইন্টারঅ্যাকশনের জন্য সম্ভবত `adb`-এর মাধ্যমে কাস্টম টেস্ট ট্যাপ লাগবে, কারণ স্ট্যান্ডার্ড E2E ফ্রেমওয়ার্কগুলো Activity-bound view hierarchy টার্গেট করে) |
| ডিভাইস/OEM ম্যাট্রিক্স টেস্টিং | ব্যাকগ্রাউন্ড এক্সিকিউশন নিয়ে Android ফ্র্যাগমেন্টেশনের কারণে এটি অত্যন্ত গুরুত্বপূর্ণ। **প্রাইমারি টেস্ট ডিভাইস: Xiaomi POCO M3 (MIUI 14 / Android 12, API 31)** — প্রজেক্টের রেফারেন্স হার্ডওয়্যার হিসেবে বেছে নেওয়া হয়েছে এবং এটিই একইসাথে canonical "worst case" OEM, কারণ ব্যাকগ্রাউন্ড সার্ভিস/ওভারলে কিল করার ক্ষেত্রে MIUI সবচেয়ে আগ্রাসী প্ল্যাটফর্মগুলোর একটি। এর সাথে একটি স্টক Android এমুলেটর/ডিভাইস (Pixel) যোগ করুন API 26 (নিচের সীমা) এবং লেটেস্ট স্টেবল API (উপরের সীমা) দুটোতেই, এবং সম্ভব হলে একটি Samsung OneUI ডিভাইস, যাতে তিনটি মূল ব্যাকগ্রাউন্ড-রেস্ট্রিকশন আচরণ প্রোফাইল কভার হয় |
| পারমিশন-ফ্লো টেস্টিং | স্পষ্টভাবে টেস্ট করুন: পারমিশন denied, সেশনের মাঝে পারমিশন revoked, denial-এর পর পারমিশন re-requested |
| উদাহরণ অ্যাপ | রিপোতে (`/example`) প্রতিটি পাবলিক API ব্যায়াম করা একটি সম্পূর্ণ Expo example app শিপ করুন, যার মূলে থাকবে Milestone 5-এ বানানো দুটি canonical ডেমো: **Counter Floating App** (increment/decrement বাটন, cross-surface স্টেট সিঙ্ক প্রমাণ করে) এবং **Input Submit Floating App** (`TextInput` + Submit বাটন + আগের সাবমিশনের লিস্ট, local overlay-surface স্টেট এবং ওভারলে উইন্ডোর ভেতরে টেক্সট-ইনপুট ফোকাস প্রমাণ করে)। এগুলো একইসাথে ম্যানুয়াল টেস্ট হার্নেস এবং লিভিং ডকুমেন্টেশন হিসেবে কাজ করে |

---

## ১৭. বিল্ড এবং ডিপ্লয়মেন্ট প্রক্রিয়া

1. **লাইব্রেরি রিপো স্ট্রাকচার** `create-expo-module` স্ক্যাফোল্ডিং ব্যবহার করে (standalone module, `--local` না), কারণ এটি npm-এ পাবলিশ করা/একাধিক কনজিউমার অ্যাপে ব্যবহারের জন্য বানানো।
2. **কনজিউমাররা ইনস্টল করবে এভাবে:**
   ```bash
   npx expo install popscreen
   npx expo prebuild   # materializes android/ with the config plugin applied
   ```
3. **Expo Go সাপোর্ট নেই** — README-তে স্পষ্টভাবে ডকুমেন্ট করুন যে `expo-dev-client` প্রয়োজনীয়:
   ```bash
   npx expo install expo-dev-client
   eas build --profile development --platform android
   ```
4. **লাইব্রেরির নিজস্ব CI:** GitHub Actions চালাবে:
   - TS typecheck + lint + Jest
   - Example app-এর Android `assembleDebug` বিল্ড (Kotlin compile error, manifest merge ইস্যু ধরার জন্য)
   - অপশনালি, Firebase Test Lab / এমুলেটর ম্যাট্রিক্সে instrumented টেস্ট
5. **পাবলিশিং:** `expo-module-scripts` বিল্ড টুলিং দিয়ে স্ট্যান্ডার্ড npm publish ফ্লো (TS কম্পাইলেশন, Gradle module-এর মাধ্যমে Kotlin AAR-সংলগ্ন প্যাকেজিং, autolinking মেটাডেটা সামলায়)।
6. **ভার্সনিং:** semver, changelog-এ minimum Expo SDK / RN ভার্সন কম্প্যাটিবিলিটি নিয়ে স্পষ্ট নোট, কারণ Expo Modules API + new-architecture সাপোর্টের আচরণ ভার্সন-নির্ভর।

---

## ১৮. সম্ভাব্য সীমাবদ্ধতা এবং রিস্ক

| রিস্ক | বিস্তারিত | মিটিগেশন |
|---|---|---|
| **Play Store পলিসি রিজেকশন রিস্ক** | `SYSTEM_ALERT_WINDOW` ব্যবহারকারী অ্যাপগুলো ম্যানুয়াল রিভিউর মুখোমুখি হয়; কিছু ক্যাটাগরির অ্যাপ সরাসরি রিজেক্ট হয়ে যায় | স্পষ্টভাবে ডকুমেন্ট করুন যে *কনজিউমারদের* তাদের নির্দিষ্ট use case-এর জন্য Play পলিসি দায়িত্ব বহন করতে হবে; লাইব্রেরিটি নিজে একটি নিরপেক্ষ টুল |
| **OEM ব্যাকগ্রাউন্ড-কিল আগ্রাসিতা** | Xiaomi/Huawei/Samsung ব্যাটারি অপ্টিমাইজার "foreground" স্ট্যাটাস থাকা সত্ত্বেও foreground service কিল করে দিতে পারে। প্রজেক্টের নিজস্ব রেফারেন্স ডিভাইস (POCO M3, MIUI 14) ঠিক এই রিস্ক ক্যাটাগরিতেই পড়ে, তাই এটি কোনো থিওরেটিক্যাল এজ-কেস না — এটি স্বাভাবিক ডেভেলপমেন্ট/টেস্টিং চলাকালীনই সামনে আসবে | ইউজারদের জন্য ম্যানুয়ালি "unrestricted battery usage" allow করা / অ্যাপের জন্য MIUI-এর "battery saver" disable করার প্রয়োজনীয়তা ডকুমেন্ট করুন; v1 শিপ করার আগে POCO M3-এ revoke→detect→graceful-teardown পাথটি ঠিক যেমনটা তেমনই টেস্ট করুন, কারণ এটি real-world Android ডিভাইসের একটি বড় অংশের প্রতিনিধিত্ব করে |
| **দুই-সারফেস শেয়ার্ড JS thread কনটেনশন** | একটি ভারী মেইন-অ্যাপ রেন্ডার bubble-কে দৃশ্যমানভাবে stutter করাতে পারে (দুটোর জন্যই একটি JS thread) | পারফরম্যান্স গাইডেন্স ডকুমেন্ট করুন (§১৩); এটি যদি আসল সমস্যা হয়ে দাঁড়ায় তাহলে (v2-এ) অপশনাল আলাদা Hermes instance বিবেচনা করুন — বড় জটিলতা, v1-এর পরে defer করুন |
| **মাল্টি-সারফেস হোস্টিংয়ের জন্য New Architecture / Fabric API সারফেস single-surface অ্যাপের তুলনায় কম পাবলিকলি ডকুমেন্টেড** | `ReactHost.createSurface`-এর জন্য RN-এর নিজস্ব ইন্টার্নাল API RN নিজেই ব্যবহার করে কিন্তু থার্ড-পার্টি লাইব্রেরিতে কম সাধারণ — RN রিলিজের মধ্যে কিছু trial-and-error এবং ভার্সন সেনসিটিভিটি প্রত্যাশা করুন | টেস্ট করা RN/Expo SDK ভার্সন রেঞ্জ স্পষ্টভাবে পিন করুন; Milestone 2-এ (§১৯) অতিরিক্ত R&D সময় বরাদ্দ রাখুন |
| **প্রসেস-ডেথ এজ-কেস** | OS দ্বারা ব্যাকগ্রাউন্ডেড অ্যাপ প্রসেস কিল হলে যখন Service "টিকে থাকে" সংক্ষিপ্ত সময়, তখন JS-নির্ভর ওভারলের রেন্ডার করার মতো কিছু থাকে না | v1 ওভারলে লাইফসাইকেলকে host প্রসেসের সাথে বাইন্ড করে (§৯) — সময়ের আগে একটি standalone-JS-in-Service সমাধান ওভার-ইঞ্জিনিয়ার করার বদলে এটিকে একটি জ্ঞাত সীমাবদ্ধতা হিসেবে গ্রহণ করুন |
| **সত্যিকারের সিস্টেম-ওয়াইড ওভারলের জন্য কখনোই iOS সাপোর্ট নেই** | প্ল্যাটফর্ম সীমাবদ্ধতা, লাইব্রেরির ঘাটতি না | সব ডক/ব্র্যান্ডিংয়ে স্পষ্টভাবে Android-only হিসেবে স্কোপ এবং মেসেজ করুন |
| **Android ভার্সন ফ্র্যাগমেন্টেশন** | `TYPE_APPLICATION_OVERLAY`-এর জন্য API 26+ লাগে; পুরোনো ফ্ল্যাগ (`TYPE_PHONE` ইত্যাদি) deprecated/removed | `minSdkVersion` যথাযথভাবে সেট করুন; এই ফিচারের জন্য API 26-এর নিচে backward compat-এর চেষ্টা করবেন না |

---

## ১৯. প্রস্তাবিত ফোল্ডার স্ট্রাকচার

```
popscreen/
├── android/                         # not committed pre-prebuild config, but the module's own native code lives here
│   └── src/main/java/expo/modules/popscreen/
│       ├── PopScreenModule.kt
│       ├── PopScreenOverlayService.kt
│       ├── PopScreenWindowManager.kt
│       ├── PopScreenReactSurfaceHost.kt
│       └── PopScreenTouchInterceptorView.kt
├── plugin/                          # Expo config plugin (TS, compiled to plugin/build)
│   └── src/
│       └── withPopScreenAndroidManifest.ts
├── src/                              # JS/TS public API
│   ├── index.ts
│   ├── PopScreenModule.ts            # requireNativeModule wrapper + types
│   ├── PopScreenProvider.tsx
│   ├── PopScreenContent.tsx
│   ├── usePopScreen.ts
│   ├── types.ts
│   └── internal/
│       └── overlaySurfaceRegistration.ts
├── example/                          # full Expo example/demo app
│   ├── App.tsx                       # app shell + navigation between demos
│   ├── demos/
│   │   ├── CounterFloatingApp.tsx    # Milestone 5 — increment/decrement, cross-surface state sync demo
│   │   └── InputSubmitFloatingApp.tsx # Milestone 5 — TextInput + Submit, local overlay-surface state + IME-in-overlay demo
│   └── app.json
├── docs/
│   └── implementation-plan.md        # this file
├── expo-module.config.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## ২০. ডেভেলপমেন্ট মাইলফলক

**Milestone 0 — স্পাইক / ভ্যালিডেশন (ডি-রিস্কিং, ~১ সপ্তাহ)**
- মিনিমাল Kotlin POC: Expo Modules ছাড়া, একটি বেয়ার `Service`-এর মাধ্যমে একটি hardcoded `ReactRootView` (এখনও জেনেরিক না) একটি `TYPE_APPLICATION_OVERLAY` উইন্ডোতে অ্যাটাচ করা। লক্ষ্য: প্রমাণ করা যে একটি লাইভ RN সারফেস target ডিভাইসে একটি সিস্টেম ওভারলে উইন্ডোর ভেতরে রেন্ডার এবং আপডেট হতে পারে। **এই স্পাইকটি প্রথমে POCO M3-এ চালান** (সবচেয়ে সীমাবদ্ধ আসল ডিভাইস উপলভ্য) — সেখানে যদি কাজ করে, তাহলে এমুলেটর/অন্য ডিভাইসে ভ্যালিডেশন তুলনামূলকভাবে কম-ঝুঁকিপূর্ণ।

**Milestone 1 — Expo মডিউল স্ক্যাফোল্ডিং**
- `create-expo-module` সেটআপ (standalone, npm-publishable — `--local` ফ্ল্যাগ ছাড়া), manifest পারমিশন/service declaration-এর জন্য config plugin, একটি dev-client example app থেকে এন্ড-টু-এন্ড কাজ করা বেসিক `requestOverlayPermission`/`hasOverlayPermission` ফাংশন।
- **পুরোনো/নতুন-আর্কিটেকচার সারফেস-হোস্টিং দ্বৈত কোড পাথ** (§৬ অনুসারে) দ্রুত স্থাপন করুন, কারণ পরে এটি retrofit করতে গেলে প্রায় প্রতিটি নেটিভ ফাইল ছুঁতে হবে।

**Milestone 2 — জেনেরিক ওভারলে উইন্ডো + স্ট্যাটিক কনটেন্ট**
- `PopScreenOverlayService` + `WindowManager` ইন্টিগ্রেশন যা ডেভেলপার-প্রদত্ত আর্বিট্রারি RN কনটেন্ট (`<PopScreenContent>`-এর মাধ্যমে) দেখানো একটি *স্ট্যাটিক* RN সারফেস হোস্ট করবে (এখনও drag/resize ছাড়া)। "জেনেরিক Kotlin, smart RN" সীমানা এন্ড-টু-এন্ড ভ্যালিডেট করে। একটি old-architecture এবং একটি new-architecture example app—দুটোতেই টেস্ট করুন।

**Milestone 3 — টাচ ইন্টারঅ্যাকশন**
- Drag ইমপ্লিমেন্টেশন (নেটিভ উইন্ডো মুভমেন্ট + JS ইভেন্ট emission), bubble-এর ভেতরে আসল বাটন/gesture দিয়ে কনটেন্ট-এরিয়া টাচ পাসথ্রু ভ্যালিডেট করা।

**Milestone 4 — Resize, Minimize, Restore**
- উইন্ডো resizing (v1 স্কোপে নিশ্চিত), minimize/restore স্টেট মেশিন। Snap-to-edge স্পষ্টভাবে v1.1-এ defer করা — এখন বানানো হবে না, কিন্তু resize/minimize API ডিজাইন করতে হবে যাতে পরে breaking changes ছাড়াই snap-to-edge উপরে লেয়ার করা যায়।

**Milestone 5 — স্টেট সিঙ্ক এবং হুক API**
- `usePopScreen()` হুক, শেয়ার্ড-স্টোর প্যাটার্ন ডকুমেন্টেড এবং টেস্টেড।
- **Example app 1 — Counter Floating App:** ওভারলে উইন্ডোতে একটি কাউন্ট ভ্যালু দেখাবে দুটি বাটনসহ, **Increment (+)** এবং **Decrement (−)**। প্রতিটি বাটন (§৯ অনুসারে) শেয়ার্ড external store-এ একটি আপডেট dispatch করে; কাউন্টটি একইসাথে মেইন অ্যাপ স্ক্রিন এবং ফ্লোটিং ওভারলে — দুই জায়গাতেই লাইভ re-render হয়। এটিই cross-surface স্টেট সিঙ্ক (§৯) আসলেই প্র্যাকটিক্যালি কাজ করে কিনা তার canonical এন্ড-টু-এন্ড প্রমাণ — দুটি বাটনই সম্পূর্ণভাবে RN/JS-এ থাকে, Kotlin কখনো জানে না কোনো বাটন চাপা হয়েছে, এটি শুধু দেখে যে উইন্ডোটি একই সাইজ/পজিশনে থেকে যাচ্ছে আর এর কনটেন্ট repaint হচ্ছে।
- **Example app 2 — Input Submit Floating App:** ওভারলে উইন্ডোতে একটি single-line `TextInput` এবং একটি **Submit** বাটন দেখাবে; বাটনের নিচে, একটি লিস্ট প্রতিটি আগের সাবমিট করা ভ্যালু রেন্ডার করবে (সবচেয়ে নতুনটি উপরে বা নিচে — ইমপ্লিমেন্টারের পছন্দ), যা সবই local overlay-surface স্টেটে (`useState`/`useReducer`) সংরক্ষিত থাকবে, শেয়ার্ড cross-surface store-এ না, কারণ সাবমিশনগুলো bubble-এর নিজের মধ্যেই সীমাবদ্ধ। এই example দুটো কাজ একসাথে করে: এটি (a) main-app-এর কোনো involvement ছাড়াই সম্পূর্ণভাবে overlay `ReactSurface`-এর ভেতরে থাকা local React স্টেটের প্রথম আসল exercise, এবং (b) **`TYPE_APPLICATION_OVERLAY` উইন্ডোর ভেতরে টেক্সট ইনপুট ফোকাস**-এর প্রথম concrete টেস্ট — অর্থাৎ `FLAG_NOT_FOCUSABLE` toggle এবং IME (সফট কীবোর্ড) আচরণের প্রথম বাস্তবিক পরীক্ষা, যা খোলা প্রশ্ন হিসেবে রেফারেন্স করা হয়েছে (§ খোলা স্পষ্টীকরণ প্রশ্ন, "টেক্সট ইনপুট ফোকাস")। Milestone 5-এর মধ্যেই এই অ্যাপটি যথেষ্ট আগে বানান, যাতে IME-over-overlay সংক্রান্ত কোনো surprise Milestone 6-এর লাইফসাইকেল হার্ডেনিং কাজের আগেই সামনে আসে, পরে না।

**Milestone 6 — লাইফসাইকেল হার্ডেনিং**
- পারমিশন revocation হ্যান্ডলিং, প্রসেস-ডেথ আচরণ, **প্রাইমারি স্ট্রেস-টেস্ট ডিভাইস হিসেবে POCO M3 (MIUI 14)-এ OEM background-kill টেস্টিং**, স্টক Android এবং সম্ভব হলে একটি Samsung ডিভাইস দিয়ে সাপ্লিমেন্ট করা, foreground service নোটিফিকেশন UX।

**Milestone 7 — টেস্টিং এবং ডকুমেন্টেশন**
- সম্পূর্ণ Jest + instrumented টেস্ট কভারেজ (old-arch এবং new-arch দুটো example app-এই গ্রিন), README, API রেফারেন্স, example app পলিশিং, কনজিউমারদের জন্য Play পলিসি গাইডেন্স ডক।

**Milestone 8 — v1.0.0 পাবলিশ**
- npm publish, ভার্সনড কম্প্যাটিবিলিটি ম্যাট্রিক্স (Expo SDK / RN ভার্সন, পুরোনো বনাম নতুন আর্কিটেকচার), চেঞ্জলগ।

---

## আপনার নাম্বার করা প্রশ্নগুলোর সরাসরি উত্তর

১. **যে অংশগুলো সম্পূর্ণভাবে React Native-এ ইমপ্লিমেন্ট করা যায়:** সব UI রেন্ডারিং, স্টাইলিং, অ্যানিমেশন, বিজনেস লজিক, স্টেট ম্যানেজমেন্ট, কনটেন্ট-এরিয়া gesture হ্যান্ডলিং (bubble-এর ভেতরে tap/swipe), minimized বনাম restored কেমন দেখাবে তার সিদ্ধান্ত, snap-zone ভিজুয়াল, এবং সব অ্যাপ-স্পেসিফিক আচরণ। আসল "প্রোডাক্ট" কোডের বিশাল অধিকাংশই এটি।

২. **যে অংশগুলোর জন্য নেটিভ Kotlin লাগবে:** ওভারলে পারমিশন রিকোয়েস্ট ফ্লো, `WindowManager` উইন্ডো তৈরি/মুভমেন্ট/রিসাইজিং (সিস্টেম-লেভেল উইন্ডো পজিশনিং JS/RN থেকে করা যায় না), persistence-এর জন্য foreground `Service`, ওই উইন্ডোর ভেতরে `ReactRootView`/`ReactSurface` হোস্ট করা, RN-এর gesture system-এ হ্যান্ডওভার করার আগে "drag chrome" বনাম "কনটেন্ট" আলাদা করার জন্য লো-লেভেল টাচ ইন্টারসেপশন।

৩. **Expo Go সাপোর্ট:** **কোনো অবস্থাতেই সম্ভব নয়।** এর জন্য একটি কাস্টম নেটিভ মডিউল, কাস্টম পারমিশন, এবং কাস্টম `Service` প্রয়োজন বলে `expo-dev-client` + `expo prebuild`/EAS Build-এর মাধ্যমে একটি কাস্টম ডেভেলপমেন্ট বিল্ড বাধ্যতামূলক।

৪. **Android-নির্দিষ্ট সীমাবদ্ধতা:** `SYSTEM_ALERT_WINDOW` বিশেষ পারমিশন ফ্লো + Play পলিসি স্ক্রুটিনি; Android 14+ foreground service type declaration প্রয়োজনীয়তা; OEM-নির্দিষ্ট ব্যাকগ্রাউন্ড/ব্যাটারি রেস্ট্রিকশন (বিশেষত Xiaomi, Samsung, Huawei) যা "foreground" স্ট্যাটাস থাকা সত্ত্বেও ওভারলে কিল করতে পারে; `TYPE_APPLICATION_OVERLAY`-এর জন্য `minSdkVersion 26` প্রয়োজনীয়তা; iOS-এ এই সমতুল্য ক্যাপাবিলিটি একদমই নেই।

৫. **RN কি সরাসরি একটি সিস্টেম ওভারলেতে রেন্ডার করতে পারে, নাকি নেটিভকে একটি RN root view হোস্ট করতে হবে?** নেটিভকে **অবশ্যই** একটি RN root view (`ReactRootView`/`ReactSurface`) হোস্ট করতে হবে — একটি `WindowManager` উইন্ডোকে সরাসরি টার্গেট করার মতো কোনো JS-লেভেল API নেই। তবে, এই প্রয়োজনীয়তাটি প্রায় সম্পূর্ণভাবে একবারের boilerplate — সারফেসটি উইন্ডোতে অ্যাটাচ হয়ে গেলে, স্বাভাবিক RN re-render আর কোনো নেটিভ involvement ছাড়াই স্বয়ংক্রিয়ভাবে প্রবাহিত হয়, যা "জেনেরিক Kotlin লেয়ার" লক্ষ্যকে অর্জনযোগ্য করে তোলে।

৬. **অ্যাপের সাথে ফ্লোটিং UI সিঙ্কে রাখার সবচেয়ে স্কেলেবল আর্কিটেকচার:** একটি JS রানটাইম (`ReactHost`/`ReactInstanceManager`), দুটি RN সারফেস (মেইন অ্যাপ + ওভারলে), শুধু React Context-এর বদলে একটি external store (Zustand/Redux-style, React-এর Context tree-র বাইরে)-এর মাধ্যমে স্টেট শেয়ার করা — এটি JS engine ডুপ্লিকেট করা এড়িয়ে যায়, একটি কাস্টম cross-process sync প্রোটোকল আবিষ্কার করা এড়িয়ে যায়, এবং bubble UI জটিল হতে থাকলেও পরিচ্ছন্নভাবে স্কেল করে।

---

## খোলা স্পষ্টীকরণ প্রশ্ন (ইমপ্লিমেন্টেশন শুরুর আগে অনুগ্রহ করে উত্তর দিন)

মূল প্রশ্নগুলোর তিনটি এখন সমাধান হয়ে গেছে (টার্গেট API/ডিভাইস, npm ডিস্ট্রিবিউশন, drag+resize+minimize v1 স্কোপ — এই ডকুমেন্টের শুরুর "নির্ধারিত সিদ্ধান্তসমূহ" ব্যানারটি দেখুন)। বাকি খোলা বিষয়গুলো:

**v1-এর জন্য ফাংশনাল স্কোপ**
১. v1-এ **snap-to-edge** আচরণ (Messenger bubble-এর মতো স্ক্রিন এজে snap করা) থাকা উচিত কি? *(নির্ধারিত স্কোপ অনুসারে এখন v1.1-এ defer করা — এটি গ্রহণযোগ্য কিনা কনফার্ম করুন, বা প্রাথমিক রিলিজের জন্য গুরুত্বপূর্ণ হলে v1-এই নিয়ে আসুন।)*
২. ফ্লোটিং উইন্ডোতে **টেক্সট ইনপুট ফোকাস** সাপোর্ট করা উচিত কি (যেমন bubble-এর ভেতরে একটি চ্যাট-স্টাইল টেক্সট ফিল্ড)? এটি `FLAG_NOT_FOCUSABLE` হ্যান্ডলিং পরিবর্তন করে এবং ওভারলে উইন্ডোর সাথে IME (কীবোর্ড) ইন্টারঅ্যাকশন জটিলতা যুক্ত করে, যা Android-এ একটি পরিচিত কঠিন এলাকা।
৩. আপনি কি ওভারলেতে **একইসাথে একাধিক bubble** সাপোর্ট চান (একাধিক Messenger চ্যাট হেডের মতো), নাকি v1-এর জন্য একটি একক ফ্লোটিং উইন্ডোই যথেষ্ট?

**Persistence এবং লাইফসাইকেল প্রত্যাশা**
৪. ইউজার যখন **host অ্যাপ পুরোপুরি কিল করে দেয়** (recents থেকে swipe করে) তখন প্রত্যাশিত আচরণ কী? Bubble কি সাথে সাথে অদৃশ্য হয়ে যাবে (সরল, v1-এর জন্য প্রস্তাবিত — এবং POCO M3 রেফারেন্স ডিভাইসের MIUI-এর আগ্রাসী প্রসেস ম্যানেজমেন্টের দিক থেকে বিশেষভাবে রেলিভ্যান্ট), নাকি এটি স্বাধীনভাবে টিকে থাকার চেষ্টা করবে (যথেষ্ট কঠিন, একটি standalone-JS-in-Service অ্যাপ্রোচ লাগবে)?
৫. ওভারলেটি কি **ডিভাইস রিবুট সারভাইভ** করার প্রয়োজন (boot-এ স্বয়ংক্রিয়ভাবে restart), নাকি শুধু অ্যাক্টিভ সেশনে টিকে থাকলেই হবে?

**ডিস্ট্রিবিউশন এবং কমপ্লায়েন্স**
৬. এটি npm-এ থার্ড-পার্টি ব্যবহারের জন্য যাচ্ছে বলে: কনজিউমারদের জন্য **Google Play কম্প্যাটিবিলিটি** কি একটি হার্ড রিকোয়ারমেন্ট (অর্থাৎ README/config plugin-কে Play পলিসি কমপ্লায়েন্সের জন্য জোরালোভাবে অপ্টিমাইজ করা উচিত), নাকি লাইব্রেরিটির sideloaded/enterprise/internal-distribution কনজিউমারদেরও স্পষ্টভাবে সাপোর্ট করা উচিত যাদের কনস্ট্রেইন্ট ভিন্ন হতে পারে?
৭. প্রথম কনজিউমার/example অ্যাপের জন্য আপনার মনে কি কোনো নির্দিষ্ট **প্রাইমারি use case** আছে (যেমন music mini-player, চ্যাট bubble, কল ওভারলে, ভিডিও PiP)? এটি জেনেরিক আর্কিটেকচার পরিবর্তন করে না, কিন্তু এটি প্রথমে কোন example app বানাবেন তা প্রায়োরিটাইজ করতে এবং একটি আসল use case-এর বিরুদ্ধে API ergonomics sanity-check করতে সাহায্য করবে।

**ডিজাইন/UX ডিফল্ট**
৮. PopScreen-এর কি কোনো **ডিফল্ট ভিজুয়াল chrome** শিপ করা উচিত (যেমন একটি ডিফল্ট drag handle, ডিফল্ট minimize বাটন স্টাইলিং), নাকি সাহিত্যিকভাবে ১০০% ভিজুয়াল — drag handle সহ — কনজিউমিং ডেভেলপারের RN কোডে ছেড়ে দেওয়া উচিত, নেটিভ শুধু কনফিগারেশনের মাধ্যমে raw gesture জোন এক্সপোজ করবে (যেমন `dragHandleHeight`)?

---

*প্ল্যানের সমাপ্তি। বাকি স্পষ্টীকরণ প্রশ্নগুলোর উত্তর এবং চূড়ান্ত অনুমোদনের জন্য অপেক্ষা করছি, ইমপ্লিমেন্টেশন শুরু করার আগে।*
