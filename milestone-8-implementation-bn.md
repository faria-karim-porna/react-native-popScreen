# PopScreen — Milestone 8: v1.0.0 Publish করুন — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 8-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ গাইড, যেমনটি `docs/implementation-plan-bn.md` §২০-এ বর্ণিত আছে:

> Milestone 8 — v1.0.0 Publish করুন
> npm publish, versioned compatibility matrix (Expo SDK / RN version, old vs. new architecture), changelog।

**এই মাইলফলক যা প্রদান করে:** npm-এ PopScreen v1.0.0 — যেকোনো Expo ডেভেলপার `npx expo install popscreen`-এর মাধ্যমে install করতে পারবে। মাইলফলকে কোনো নতুন কোড নেই; এটি সম্পূর্ণভাবে pre-publish ভেরিফিকেশন, `package.json` সঠিকতা, `.npmignore`, compatibility matrix, changelog, এবং `npm publish` invocation-এর বিষয়ে।

**অপরিবর্তনীয়তা সম্পর্কে একটি নোট:** একবার একটি version পাবলিক npm registry-তে publish হলে এটি unpublish করা যায় না (শুধু deprecate করা যায়)। এই গাইডের প্রতিটি স্টেপকে optional polish হিসেবে না, একটি pre-flight checklist হিসেবে গণ্য করুন।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

Milestone 7 অবশ্যই clean PASS হতে হবে:

- `main` branch-এ সব CI job green।
- সবতিনটি documentation file উপস্থিত (`README.md`, `docs/api-reference.md`, `docs/play-policy-guidance.md`, `docs/state-sync.md`, `docs/known-limitations.md`)।
- `popscreen` package নামে publish rights সহ একটি npm account (ব্যক্তিগত account বা আপনার নিয়ন্ত্রণে একটি organisation)। নামটি পাওয়া যাচ্ছে কিনা নিশ্চিত করুন:

```bash
npm info popscreen
# যদি নামটি unclaimed হয়, "npm error 404" দেখাবে।
# যদি ইতিমধ্যেই নেওয়া হয়ে থাকে, একটি বিকল্প বেছে নিন (যেমন "popscreen-rn",
# "@yourscope/popscreen") এবং চালিয়ে যাওয়ার আগে package.json,
# README, এবং docs-এ প্রতিটি রেফারেন্স আপডেট করুন।
```

আপনার machine-এ npm-এ log in করুন:

```bash
npm login
npm whoami   # সঠিক account নিশ্চিত করুন
```

---

## Step 1 — চূড়ান্ত `package.json` audit

Publish করার আগে `package.json` খুলুন এবং প্রতিটি field যাচাই করুন। এখানে একটি ভুল field consumer project-এ autolinking চুপচাপ ব্যর্থ করতে পারে।

```json
{
  "name": "popscreen",
  "version": "1.0.0",
  "description": "Android-only floating overlay library for React Native (Expo). Render any RN UI as a system-level floating window.",
  "main": "build/index.js",
  "module": "build/index.js",
  "types": "build/index.d.ts",
  "exports": {
    ".": {
      "import": "./build/index.js",
      "require": "./build/index.js",
      "types": "./build/index.d.ts"
    }
  },
  "scripts": {
    "build": "expo-module build",
    "build:plugin": "tsc --build plugin",
    "clean": "expo-module clean",
    "lint": "expo-module lint",
    "test": "expo-module test",
    "typecheck": "tsc --noEmit",
    "prepare": "expo-module prepare",
    "prepublishOnly": "expo-module prepublishOnly"
  },
  "keywords": [
    "react-native",
    "expo",
    "android",
    "overlay",
    "floating",
    "picture-in-picture",
    "bubble",
    "window-manager"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/popscreen.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/popscreen/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/popscreen#readme",
  "license": "MIT",
  "author": "YOUR NAME <your@email.com>",
  "peerDependencies": {
    "expo": "*",
    "react": "*",
    "react-native": "*"
  },
  "peerDependenciesMeta": {
    "expo": { "optional": true }
  },
  "devDependencies": {
    "expo-modules-core": "^X.Y.Z"
  },
  "expo-module": {
    "platforms": ["android"]
  }
}
```

audit করার মূল বিষয়গুলো:

- `"main"` এবং `"types"` অবশ্যই compiled `build/` output-এ পয়েন্ট করতে হবে, `src/`-এ **না**। যদি `build/index.js` এখনও না থাকে, প্রথমে `npm run build` এবং `npm run build:plugin` চালান।
- `"peerDependencies"` `expo`-এর জন্য `"*"` ব্যবহার করে (pinned version range না) — এটি Expo modules-এর স্ট্যান্ডার্ড কনভেনশন যাতে consumer project কোনো নির্দিষ্ট SDK release-এ locked না হয়।
- `"expo-modules-core"` শুধুমাত্র `devDependencies`-এ থাকে, `dependencies` বা `peerDependencies`-এ কখনো না। Consumer-এর নিজস্ব `expo` প্যাকেজ ইতিমধ্যেই একটি compatible version প্রদান করে।
- `"expo-module"."platforms"` শুধুমাত্র `"android"` ধারণ করে — iOS unsupported এবং এখানে listed হওয়া উচিত না, কারণ এটি autolinking-কে iOS pod integration attempt করতে বাধ্য করবে যা অস্তিত্বে নেই।
- `"app.plugin.js"` root-এ থাকতে হবে (`plugin/build/index.js`-এ routes করে)। না থাকলে `npm run build:plugin` চালান।

---

## Step 2 — `expo-module.config.json` ভেরিফাই করুন

`expo-module.config.json` খুলুন এবং নিশ্চিত করুন এটি single-platform Android scope-এর সাথে মিলে:

```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.popscreen.PopScreenModule"]
  }
}
```

এই ফাইলটিই Expo Autolinking মডিউল discover করতে ব্যবহার করে। `modules` array-তে একটি টাইপো (ভুল package নাম বা class নাম) native মডিউলকে চুপচাপ unlinked করে দেয় — একটি consumer app-এ `requireNativeModule('PopScreen')` runtime-এ throw করবে। `PopScreenModule.kt`-এর `definition()` block-এর ভেতরে `Name("PopScreen")` লাইনের সাথে cross-check করুন যে তারা ঠিকঠাক মিলছে।

---

## Step 3 — `.npmignore` audit করুন

`expo-module-scripts` কনভেনশন `package.json`-এর `files` field-এর বদলে `.npmignore` ব্যবহার করে publish হওয়া package থেকে ফাইল বাদ দিতে। ডিফল্ট scaffold একটি যুক্তিসঙ্গত শুরুর পয়েন্ট তৈরি করে; নিশ্চিত করুন এটি বাদ দেয়:

```
# Development / source files not needed at runtime
src/
android/src/test/
android/src/androidTest/
example/
.github/
docs/
*.md
!README.md
__tests__/
__mocks__/
*.test.*
*.spec.*

# Build tools
.eslintrc*
.prettierrc*
tsconfig*.json
babel.config.js
jest.config.*
```

**যা বাদ দেওয়া উচিত না** (published package-এ উপস্থিত থাকতে হবে):

- `build/` — compiled JS output
- `android/` — Kotlin source এবং Gradle ফাইল (Autolinking-এর জন্য প্রয়োজন)
- `plugin/build/` — compiled config plugin
- `app.plugin.js` — config plugin entry point
- `expo-module.config.json` — Autolinking-এর জন্য প্রয়োজন
- `README.md`

আসলে publish না করে ঠিক কী অন্তর্ভুক্ত হবে তা দেখতে `npm pack --dry-run` চালান:

```bash
npm pack --dry-run
```

ফাইল লিস্টটি সাবধানে পর্যালোচনা করুন। যদি `src/` ফাইলগুলো অন্তর্ভুক্ত দেখেন (অর্থাৎ source TypeScript compiled output-এর পাশাপাশি publish হচ্ছে), `.npmignore`-এ `src/` যুক্ত করুন। যদি `build/` না থাকে (অর্থাৎ compile স্টেপ চালানো হয়নি), `npm run build` এবং `npm run build:plugin` চালান তারপর পুনরায় চেক করুন।

---

## Step 4 — সব কিছু clean state থেকে build করুন

Published package current source reflect করে, stale cache নয়, তা নিশ্চিত করতে clean state থেকে সম্পূর্ণ build sequence চালান:

```bash
npm run clean
npm run build
npm run build:plugin
```

নিশ্চিত করুন এগুলো produce করে:

- `build/index.js` এবং `build/index.d.ts` (TypeScript compiled output)
- `build/PopScreenModule.js`, `build/PopScreenContent.js`, ইত্যাদি
- `plugin/build/index.js` (config plugin compiled output)

---

## Step 5 — `CHANGELOG.md` লিখুন

রিপোজিটরির root-এ **`CHANGELOG.md`** তৈরি করুন। এটিই versioned record যার উপর consumer-রা releases-এর মধ্যে কী পরিবর্তন হয়েছে তা বোঝার জন্য নির্ভর করে:

```markdown
# Changelog

All notable changes to PopScreen will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — YYYY-MM-DD

### Added
- Android-only floating overlay window via `TYPE_APPLICATION_OVERLAY` /
  `SYSTEM_ALERT_WINDOW`, hosted by a foreground `Service`.
- Dual old/new React Native architecture support (legacy bridge and
  Fabric/Bridgeless), auto-detected at runtime via `ReactArchitectureDetector`.
- `PopScreenModule` (Expo Modules API) with full function surface:
  `show`, `hide`, `destroy`, `setWindowRect`, `setSizeConstraints`,
  `setHandleDimensions`, `hasOverlayPermission`, `requestOverlayPermission`,
  `hasBatteryOptimizationExemption`, `requestBatteryOptimizationExemption`,
  `getReactArchitectureInfo`.
- `PopScreenContent` component — wraps arbitrary developer-provided RN UI
  as overlay content; accepts `dragHandleHeight` and `resizeHandleSize` props.
- `registerOverlaySurface(component)` — registers a RN component as the
  overlay's root surface (second `AppRegistry` surface on the same JS instance).
- `usePopScreen(key, defaultValue)` hook — cross-surface shared state via a
  minimal external store (`useSyncExternalStore`-based, no Context required).
- `minimize(currentRect?, options?)` / `restore()` / `getIsMinimized()` —
  JS-driven minimize/restore built entirely on `setWindowRect` with no
  native-side "minimize" concept.
- Native drag support (`PopScreenTouchInterceptorView`) — native window
  movement via `WindowManager.updateViewLayout()`, content-area touch
  passthrough to the RN surface, throttled `onDragUpdate` events to JS.
- Native resize support — bottom-right corner resize handle, min/max
  size constraints via `setSizeConstraints`, `onResizeUpdate` events.
- Permission revocation detection — 3-second poll, graceful window teardown
  on revocation, `onPermissionResult` event to JS.
- `onWindowStateChange` event — `shown`/`hidden`/`destroyed` lifecycle
  transitions emitted to JS.
- Config plugin (`withPopScreenAndroidManifest`) — auto-injects
  `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_SPECIAL_USE` permissions and the
  `PopScreenOverlayService` declaration into `AndroidManifest.xml` via
  `expo prebuild`.
- Device rotation / config change handling in the foreground Service.
- `docs/state-sync.md`, `docs/known-limitations.md`,
  `docs/api-reference.md`, `docs/play-policy-guidance.md`.

### Known limitations (v1.0.0)
- Overlay does not survive host app process death (see
  `docs/known-limitations.md`).
- Snap-to-edge deferred to v1.1.
- iOS is not supported (platform constraint — see
  `docs/known-limitations.md`).
- Expo Go is not supported; `expo-dev-client` required.
```

---

## Step 6 — Compatibility matrix লিখুন

একটি **`docs/compatibility.md`** ফাইল যুক্ত করুন। এটিই মূল প্ল্যানের দাবি করা "versioned compatibility matrix":

```markdown
# PopScreen Compatibility Matrix

## v1.0.0

| PopScreen | Expo SDK | React Native | RN Architecture | Android API | Status |
|-----------|----------|--------------|-----------------|-------------|--------|
| 1.0.0 | 52 | 0.76 | Old + New | 26–35 | ✅ Tested |
| 1.0.0 | 53 | 0.77 | Old + New | 26–35 | ✅ Tested |
| 1.0.0 | 54 | 0.78 | Old + New | 26–36 | ✅ Tested |

### v1.0.0-এর টেস্ট ডিভাইস ম্যাট্রিক্স

| ডিভাইস | OS | API | OEM skin | ফলাফল |
|--------|-----|-----|----------|--------|
| Xiaomi POCO M3 (primary) | Android 12 | 31 | MIUI 14 | ✅ Pass |
| Stock Android emulator | Android 8.0 | 26 | AOSP | ✅ Pass (API floor) |
| Stock Android emulator | Android 15 | 35 | AOSP | ✅ Pass (API ceiling) |

> **এই টেবিলটি কীভাবে পড়বেন:** "Tested" মানে সম্পূর্ণ Milestone 6
> ম্যানুয়াল টেস্ট সিকোয়েন্স (permission grant/revoke, show/hide/destroy,
> drag, resize, minimize/restore, ব্যাকগ্রাউন্ড persistence, MIUI
> battery-kill stress) সেই configuration-এ চালানো হয়েছে এবং পাস
> করেছে। এর মানে প্রতিটি সম্ভাব্য ডিভাইস টেস্ট করা হয়েছে তা না —
> Android fragmentation ব্যাপক টেস্টিং অপ্রায়োগিক করে তোলে। real-world
> OEM আচরণের জন্য conservative lower bound হিসেবে POCO M3 row ব্যবহার করুন।

## আপনার নিজের version যুক্ত করুন

যদি আপনি উপরে না থাকা কোনো combination-এ PopScreen টেস্ট করেন এবং
এটি পাস করে, অনুগ্রহ করে matrix-এ একটি row যুক্ত করে PR খুলুন।
যদি fail করে, exact failure mode এবং device/OS details সহ একটি issue
খুলুন।
```

---

## Step 7 — Git দিয়ে release tag করুন

Publish হবে এমন exact commit-টি tag করুন। tag-টি npm release এবং source-এর মধ্যে একটি permanent, auditable link তৈরি করে:

```bash
git add -A
git commit -m "chore: prepare v1.0.0 release"
git tag v1.0.0
git push origin main --tags
```

`npm publish` চালানোর আগে এই tagged commit-এ CI এক শেষবার green কিনা নিশ্চিত করুন।

---

## Step 8 — Dry-run publish

আসল publish-এর আগে সবসময় একটি dry run করুন। এটি file-list সমস্যা, missing build artifact, এবং registry auth সমস্যা আসলে publish না করেই ধরে ফেলে:

```bash
npm publish --dry-run
```

output সাবধানে পড়ুন:

- নিশ্চিত করুন `build/index.js`, `build/index.d.ts`, `android/`, `plugin/build/`, `app.plugin.js`, এবং `expo-module.config.json` সবগুলো listed।
- নিশ্চিত করুন `src/`, `example/`, `docs/`, `.github/`, এবং test ফাইলগুলো listed **নয়**।
- নিশ্চিত করুন `package` size যুক্তিসঙ্গত (এই ধরনের module-এর জন্য সাধারণত 200KB–2MB — যদি 5MB-এর বেশি হয়, accidentally-included বড় ফাইলের জন্য `.npmignore` পুনরায় চেক করুন)।

---

## Step 9 — Publish করুন

```bash
npm publish --access public
```

scoped package-এর (`@yourscope/popscreen`) জন্য `--access public` প্রয়োজন। unscoped package-এর জন্য এটি harmless (no-op) কিন্তু উভয় ক্ষেত্রেই include করা safe।

Publication নিশ্চিত করুন:

```bash
npm info popscreen
# দেখাবে version: 1.0.0, dist-tags: { latest: '1.0.0' }
```

---

## Step 10 — একটি নতুন consumer project-এ smoke test করুন

Publish করার পরপরই, end-to-end consumer installation flow কাজ করে তা নিশ্চিত করতে একটি সম্পূর্ণ নতুন Expo project তৈরি করুন:

```bash
npx create-expo-app@latest popscreen-smoke-test
cd popscreen-smoke-test
npx expo install popscreen
npx expo install expo-dev-client
npx expo prebuild --platform android
```

`popscreen-smoke-test/android/app/src/main/AndroidManifest.xml` খুলুন এবং নিশ্চিত করুন:

- `SYSTEM_ALERT_WINDOW` পারমিশন উপস্থিত।
- `FOREGROUND_SERVICE` পারমিশন উপস্থিত।
- `FOREGROUND_SERVICE_SPECIAL_USE` পারমিশন উপস্থিত।
- `PopScreenOverlayService` service declaration উপস্থিত।

এটি নিশ্চিত করে config plugin আপনার local workspace থেকে না, published package থেকে সঠিকভাবে চলেছে। যদি manifest-এ এগুলোর কোনোটি না থাকে, config plugin চলেনি — চেক করুন `app.plugin.js` published package-এ অন্তর্ভুক্ত ছিল কিনা (Step 8 dry-run output) এবং এটি সঠিকভাবে `plugin/build/index.js`-এ routes করছে কিনা।

---

## Step 11 — GitHub release তৈরি করুন

GitHub-এ repository-তে যান → Releases → "Draft a new release":

- Tag: `v1.0.0` (Step 7-এ তৈরি tag select করুন)
- Title: `v1.0.0`
- Body: `CHANGELOG.md` থেকে `[1.0.0]` section paste করুন
- "Set as the latest release" চেক করুন

GitHub release publish করুন। এটি changelog-কে GitHub browse করা consumer-দের কাছে discoverable করে তোলে, এবং git tag ও একটি human-readable release page-এর মধ্যে association তৈরি করে।

---

## Step 12 — Post-publish checklist

Publish করার পরে, announce করার আগে এই items নিশ্চিত করুন:

- [ ] `npm info popscreen` `version: 1.0.0` এবং `dist-tags.latest: 1.0.0` দেখায়।
- [ ] Fresh consumer project smoke test (Step 10) manifest ভেরিফিকেশন পাস করে।
- [ ] সঠিক tag-এ GitHub release publish হয়েছে।
- [ ] `CHANGELOG.md` সঠিক তারিখ দিয়ে committed এবং pushed (`YYYY-MM-DD` প্রকৃত publish তারিখ দিয়ে প্রতিস্থাপন করুন)।
- [ ] `docs/compatibility.md` committed এবং accurate।
- [ ] `README.md` install command (`npx expo install popscreen`) smoke-test project-এ error ছাড়াই কাজ করে।

---

## ভবিষ্যৎ releases-এর জন্য versioning guidance

- **Patch (`1.0.1`):** শুধু bug fix, কোনো নতুন API surface নেই, কোনো নতুন native কোড পাথ নেই। config plugin অপরিবর্তিত হলে consumer-রা `expo prebuild` পুনরায় না চালিয়েও update করতে পারবেন (যদিও সবসময় এটি সুপারিশ করুন)।
- **Minor (`1.1.0`):** backward compatible নতুন ফিচার — যেমন snap-to-edge (v1.1-এর জন্য পরিকল্পিত), অতিরিক্ত event, নতুন configuration option। Consumer-দের manifest পরিবর্তন pick up করতে `expo prebuild` চালানো উচিত।
- **Major (`2.0.0`):** breaking API পরিবর্তন, `minSdkVersion` bump, বা `expo-module.config.json` module class list-এ পরিবর্তন যার জন্য consumer-দের re-link করতে হবে। `CHANGELOG.md`-এ সবসময় একটি migration guide post করুন।

যখন Expo SDK একটি নতুন major version release করে যার জন্য পরিবর্তন প্রয়োজন (যেমন নতুন RN architecture API breaking change), minor বা major version increment করুন, `docs/compatibility.md` আপডেট করুন, এবং changelog entry-তে প্রভাবিত Expo SDK version-গুলো স্পষ্টভাবে উল্লেখ করুন।

---

## v1.0.0-এর পরে কী আসবে

মূল প্ল্যানের খোলা clarification প্রশ্ন এবং v1.1 roadmap অনুসারে:

- **Snap-to-edge** — একটি v1.1 minor হিসেবে শূন্য native পরিবর্তনে যোগ করা যাবে: `minimizeRestore.ts`-এ নতুন JS লজিক যা বিদ্যমান `setWindowRect`-কে computed edge-aligned স্থানাঙ্ক দিয়ে কল করে।
- **Screen-bounds-aware minimize positioning** — `minimizeRestore.ts`-এ `Dimensions.get('window')`-ভিত্তিক coordinate computation, আবার শূন্য native পরিবর্তন।
- **একাধিক একযোগী bubble** — native পরিবর্তন প্রয়োজন (`activeInstance` singleton pattern-কে একটি collection হতে হবে); v2 হিসেবে পরিকল্পনা করুন।
- **Host process death সারভাইভ করা overlay** — একটি Service-এর ভেতরে IPC সহ standalone Hermes engine প্রয়োজন; v2 হিসেবে পরিকল্পনা করুন।
- **iOS PiP support** — এই আর্কিটেকচারের সাথে সম্ভব না; `AVPictureInPictureController` ব্যবহার করে সম্পূর্ণ আলাদা একটি ফিচার হবে, এবং arbitrary RN UI নয়, শুধুমাত্র playback content-এর জন্য scoped হবে।

---

*Milestone 8 গাইডের সমাপ্তি। PopScreen v1.0.0 এখন publish হয়েছে। সবতিনটি মাইলফলক সম্পন্ন করার জন্য অভিনন্দন।*
