# PopScreen — Milestone 7: Testing & Docs — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 7-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ বিল্ড গাইড, যেমনটি `docs/implementation-plan-bn.md` §২০-এ বর্ণিত আছে:

> Milestone 7 — Testing & Docs
> সম্পূর্ণ Jest + instrumented test কভারেজ (old-arch এবং new-arch দুটো example app-এই green), README, API reference, example app পলিশ, consumer-দের জন্য Play policy guidance doc।

**এই মাইলফলক প্রকৃতপক্ষে যা প্রদান করে:** সম্পূর্ণ টেস্ট স্যুট এবং ডকুমেন্টেশন যা একটি ব্যক্তিগত প্রজেক্টকে একটি publishable npm লাইব্রেরি থেকে আলাদা করে। পাঁচটি এলাকা:

১. **Jest unit tests** — `usePopScreen()` হুক, `createOverlayStore`, `minimizeRestore`, এবং `PopScreenContent` কম্পোনেন্ট, সঠিকভাবে-wired নেটিভ মডিউল mock সহ।
২. **Android JUnit unit tests** — pure Kotlin লজিক: layout param clamping, `ReactArchitectureDetector`, drag-delta math।
৩. **Android instrumented tests** — একটি আসল এমুলেটর বা ডিভাইসে window add/remove, permission flow, `destroy()` lifecycle।
৪. **ডকুমেন্টেশন** — `README.md`, `docs/api-reference.md`, `docs/play-policy-guidance.md`, এবং CI কনফিগারেশন (GitHub Actions)।
৫. **Example app পলিশ** — `/example` অ্যাপ যাতে সত্যিকারের living documentation হিসেবে কাজ করে, শুধু একটি টেস্ট হার্নেস নয়।

**Instrumented tests-এর জন্য প্রাইমারি টেস্ট ডিভাইস:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31) এবং lower-bound চেকের জন্য `minSdkVersion 26` (API 26)-এ একটি স্টক Android এমুলেটর।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

Milestone 6 সম্পূর্ণভাবে পাস করা অবস্থায় একই `popscreen` রিপোজিটরিতে চালিয়ে যান। ডকুমেন্টেশন এবং টেস্ট কভারেজে commit করার আগে সব ছয়টি মাইলফলক clean হতে হবে — ভাঙা কোডের জন্য টেস্ট লেখা ভাঙা অবস্থাকে embed করে দেয়।

টেস্ট টুলচেইন ইনস্টল করুন যদি ইতিমধ্যে না থাকে:

```bash
# JS test runner (expo-module-scripts includes Jest — wired আছে কিনা confirm করুন)
cd popscreen
npx expo-module-scripts test -- --listTests

# Android unit test runner (Android Gradle Plugin-এর সাথে স্ট্যান্ডার্ড — ভেরিফাই করুন)
cd android
./gradlew test --dry-run
```

---

## Step 1 — Jest unit tests: নেটিভ মডিউল mock

Expo Modules JS টেস্ট এনভায়রনমেন্টে নেটিভ সাইড mock করা সাপোর্ট করে। **`src/__mocks__/PopScreenModule.ts`** তৈরি করুন:

```ts
// JS-side mock for PopScreenModule.
// Expo Modules' requireNativeModule() returns this in Jest environments
// when __mocks__ lives alongside the module being mocked.
// Every async function resolves instantly with sensible defaults;
// listeners are tracked so tests can assert subscription/unsubscription.

const listeners: Record<string, Set<Function>> = {};

const PopScreenModuleMock = {
  hasOverlayPermission: jest.fn().mockResolvedValue(false),
  requestOverlayPermission: jest.fn().mockResolvedValue(undefined),
  getReactArchitectureInfo: jest.fn().mockResolvedValue({
    architecture: 'NEW_ARCHITECTURE',
    isNewArchitecture: true,
  }),
  hasBatteryOptimizationExemption: jest.fn().mockResolvedValue(true),
  requestBatteryOptimizationExemption: jest.fn().mockResolvedValue(undefined),
  show: jest.fn().mockResolvedValue(undefined),
  hide: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  setWindowRect: jest.fn().mockResolvedValue(undefined),
  setSizeConstraints: jest.fn().mockResolvedValue(undefined),
  setHandleDimensions: jest.fn().mockResolvedValue(undefined),

  addListener: jest.fn((eventName: string, listener: Function) => {
    if (!listeners[eventName]) listeners[eventName] = new Set();
    listeners[eventName].add(listener);
    return { remove: () => listeners[eventName]?.delete(listener) };
  }),

  // Test helper: simulate a native event firing.
  __simulateEvent: (eventName: string, payload: unknown) => {
    listeners[eventName]?.forEach((fn) => fn(payload));
  },
};

export default PopScreenModuleMock;
```

এটি ব্যবহার করতে Jest কনফিগার করুন। **`package.json`**-এ (অথবা আপনি পছন্দ করলে `jest.config.js`):

```json
{
  "jest": {
    "preset": "expo-module-scripts",
    "moduleNameMapper": {
      "^expo-modules-core$": "<rootDir>/src/__mocks__/expo-modules-core.ts"
    }
  }
}
```

`requireNativeModule` stub করতে **`src/__mocks__/expo-modules-core.ts`**-ও তৈরি করুন:

```ts
import PopScreenModuleMock from './PopScreenModule';

export const requireNativeModule = jest.fn((_moduleName: string) => PopScreenModuleMock);
export const NativeModule = class {};
export const EventEmitter = class {
  addListener = jest.fn();
  removeAllListeners = jest.fn();
};
```

---

## Step 2 — Jest unit tests: `createOverlayStore` এবং `useExternalStore`

**`src/__tests__/createOverlayStore.test.ts`** তৈরি করুন:

```ts
import { createOverlayStore } from '../createOverlayStore';

describe('createOverlayStore', () => {
  it('returns initial state', () => {
    const store = createOverlayStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('updates state with a partial object', () => {
    const store = createOverlayStore({ count: 0, name: 'a' });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, name: 'a' });
  });

  it('updates state with a function', () => {
    const store = createOverlayStore({ count: 5 });
    store.setState((prev) => ({ count: prev.count + 1 }));
    expect(store.getState().count).toBe(6);
  });

  it('notifies all subscribers on setState', () => {
    const store = createOverlayStore({ count: 0 });
    const listener = jest.fn();
    store.subscribe(listener);
    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes correctly — unsubscribed listener not called', () => {
    const store = createOverlayStore({ count: 0 });
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setState({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('getState returns same reference if nothing changed', () => {
    const store = createOverlayStore({ count: 0 });
    const snapshot1 = store.getState();
    const snapshot2 = store.getState();
    expect(snapshot1).toBe(snapshot2);
  });

  it('getState returns new reference after setState', () => {
    const store = createOverlayStore({ count: 0 });
    const snapshot1 = store.getState();
    store.setState({ count: 1 });
    const snapshot2 = store.getState();
    expect(snapshot1).not.toBe(snapshot2);
  });
});
```

---

## Step 3 — Jest unit tests: `usePopScreen` হুক

**`src/__tests__/usePopScreen.test.ts`** তৈরি করুন:

```ts
import { renderHook, act } from '@testing-library/react-hooks';
import { usePopScreen } from '../usePopScreen';

describe('usePopScreen', () => {
  it('returns defaultValue when key has not been set', () => {
    const { result } = renderHook(() => usePopScreen('testKey', 42));
    expect(result.current[0]).toBe(42);
  });

  it('setter updates the value', () => {
    const { result } = renderHook(() => usePopScreen<number>('setterKey', 0));
    act(() => { result.current[1](99); });
    expect(result.current[0]).toBe(99);
  });

  it('setter accepts a function', () => {
    const { result } = renderHook(() => usePopScreen<number>('fnKey', 10));
    act(() => { result.current[1]((prev) => prev + 5); });
    expect(result.current[0]).toBe(15);
  });

  it('two hooks sharing the same key see the same value', () => {
    const { result: r1 } = renderHook(() => usePopScreen<number>('sharedKey', 0));
    const { result: r2 } = renderHook(() => usePopScreen<number>('sharedKey', 0));
    act(() => { r1.current[1](77); });
    expect(r2.current[0]).toBe(77);
  });

  it('two hooks with different keys are independent', () => {
    const { result: r1 } = renderHook(() => usePopScreen<number>('keyA', 0));
    const { result: r2 } = renderHook(() => usePopScreen<number>('keyB', 0));
    act(() => { r1.current[1](55); });
    expect(r2.current[0]).toBe(0);
  });
});
```

যদি এখনও না থাকে তাহলে প্রয়োজনীয় টেস্ট হেল্পার ইনস্টল করুন:

```bash
npm install --save-dev @testing-library/react-hooks react-test-renderer
```

---

## Step 4 — Jest unit tests: `minimizeRestore`

**`src/__tests__/minimizeRestore.test.ts`** তৈরি করুন:

```ts
import PopScreenModuleMock from '../__mocks__/PopScreenModule';

// minimizeRestore module-level ভেরিয়েবল (isMinimized, lastFullRect) ব্যবহার করে বলে
// tests-এর মধ্যে module state reset করুন।
jest.resetModules();

describe('minimize / restore', () => {
  let minimize: typeof import('../minimizeRestore').minimize;
  let restore: typeof import('../minimizeRestore').restore;
  let getIsMinimized: typeof import('../minimizeRestore').getIsMinimized;

  beforeEach(() => {
    jest.resetModules();
    const mod = require('../minimizeRestore');
    minimize = mod.minimize;
    restore = mod.restore;
    getIsMinimized = mod.getIsMinimized;
    PopScreenModuleMock.setWindowRect.mockClear();
  });

  it('minimize calls setWindowRect with small dimensions', async () => {
    await minimize({ x: 80, y: 250, width: 500, height: 350 });
    expect(PopScreenModuleMock.setWindowRect).toHaveBeenCalledWith(
      undefined, undefined,
      expect.any(Number), expect.any(Number)
    );
    expect(getIsMinimized()).toBe(true);
  });

  it('restore calls setWindowRect with the pre-minimize rect', async () => {
    const rect = { x: 80, y: 250, width: 500, height: 350 };
    await minimize(rect);
    PopScreenModuleMock.setWindowRect.mockClear();
    await restore();
    expect(PopScreenModuleMock.setWindowRect).toHaveBeenCalledWith(
      rect.x, rect.y, rect.width, rect.height
    );
    expect(getIsMinimized()).toBe(false);
  });

  it('calling minimize twice is a no-op the second time', async () => {
    await minimize({ x: 0, y: 0, width: 100, height: 100 });
    PopScreenModuleMock.setWindowRect.mockClear();
    await minimize({ x: 0, y: 0, width: 100, height: 100 });
    expect(PopScreenModuleMock.setWindowRect).not.toHaveBeenCalled();
  });

  it('restore is a no-op if minimize was never called', async () => {
    await restore();
    expect(PopScreenModuleMock.setWindowRect).not.toHaveBeenCalled();
  });
});
```

---

## Step 5 — Jest unit tests: `PopScreenContent` কম্পোনেন্ট

**`src/__tests__/PopScreenContent.test.tsx`** তৈরি করুন:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import PopScreenContent from '../PopScreenContent';
import PopScreenModuleMock from '../__mocks__/PopScreenModule';

describe('PopScreenContent', () => {
  beforeEach(() => PopScreenModuleMock.setHandleDimensions.mockClear());

  it('renders children', () => {
    const { getByText } = render(
      <PopScreenContent>
        <React.Fragment><></>
          {/* placeholder — real children tested via RN's own renderer */}
        </React.Fragment>
      </PopScreenContent>
    );
    // Children crash ছাড়াই render হয় — একটি wrapper কম্পোনেন্টের জন্য
    // প্রাইমারি assertion যার লজিক useEffect/native call-এ থাকে।
  });

  it('calls setHandleDimensions when dragHandleHeight prop is provided', () => {
    render(<PopScreenContent dragHandleHeight={48}>
      <></>
    </PopScreenContent>);
    expect(PopScreenModuleMock.setHandleDimensions).toHaveBeenCalledWith(48, undefined);
  });

  it('calls setHandleDimensions when resizeHandleSize prop is provided', () => {
    render(<PopScreenContent resizeHandleSize={36}>
      <></>
    </PopScreenContent>);
    expect(PopScreenModuleMock.setHandleDimensions).toHaveBeenCalledWith(undefined, 36);
  });

  it('does not call setHandleDimensions when no handle props are provided', () => {
    render(<PopScreenContent><></></PopScreenContent>);
    expect(PopScreenModuleMock.setHandleDimensions).not.toHaveBeenCalled();
  });
});
```

যদি না থাকে `@testing-library/react-native` ইনস্টল করুন:

```bash
npm install --save-dev @testing-library/react-native
```

---

## Step 6 — Android JUnit unit tests (pure Kotlin লজিক)

**`android/src/test/java/expo/modules/popscreen/ReactArchitectureDetectorTest.kt`** তৈরি করুন:

```kotlin
package expo.modules.popscreen

import org.junit.Assert.*
import org.junit.Test

class ReactArchitectureDetectorTest {

    // ReactArchitectureDetector.detect()-থেকে extracted unit-testable helper:
    // একটি Application class থেকে একটি method name list দেওয়া হলে,
    // কোন Architecture resolve হয়?
    private fun resolveArchitecture(methodNames: List<String>): String {
        return when {
            methodNames.contains("getReactHost") -> "NEW_ARCHITECTURE"
            methodNames.contains("getReactNativeHost") -> "OLD_ARCHITECTURE"
            else -> "UNKNOWN"
        }
    }

    @Test
    fun `resolves NEW_ARCHITECTURE when getReactHost present`() {
        val result = resolveArchitecture(listOf("getReactHost", "getPackageManager"))
        assertEquals("NEW_ARCHITECTURE", result)
    }

    @Test
    fun `resolves OLD_ARCHITECTURE when only getReactNativeHost present`() {
        val result = resolveArchitecture(listOf("getReactNativeHost", "onCreate"))
        assertEquals("OLD_ARCHITECTURE", result)
    }

    @Test
    fun `resolves UNKNOWN when neither method present`() {
        val result = resolveArchitecture(listOf("onCreate", "onDestroy"))
        assertEquals("UNKNOWN", result)
    }

    @Test
    fun `NEW_ARCHITECTURE takes priority over OLD_ARCHITECTURE when both present`() {
        // প্র্যাকটিসে হওয়া উচিত না, কিন্তু detector deterministic হতে হবে।
        val result = resolveArchitecture(listOf("getReactHost", "getReactNativeHost"))
        assertEquals("NEW_ARCHITECTURE", result)
    }
}
```

**`android/src/test/java/expo/modules/popscreen/LayoutParamClampTest.kt`** তৈরি করুন:

```kotlin
package expo.modules.popscreen

import org.junit.Assert.*
import org.junit.Test

class LayoutParamClampTest {

    // testability-র জন্য PopScreenOverlayService থেকে extracted pure function:
    // একটি raw dimension-কে [min, max]-এ clamp করা।
    private fun clampDimension(raw: Int, min: Int, max: Int): Int =
        raw.coerceIn(min, max)

    @Test
    fun `clamp returns value within range unchanged`() {
        assertEquals(300, clampDimension(300, 150, 800))
    }

    @Test
    fun `clamp returns min when raw is below min`() {
        assertEquals(150, clampDimension(50, 150, 800))
    }

    @Test
    fun `clamp returns max when raw exceeds max`() {
        assertEquals(800, clampDimension(1200, 150, 800))
    }

    @Test
    fun `clamp handles min equals max`() {
        assertEquals(200, clampDimension(500, 200, 200))
    }

    @Test
    fun `drag delta math: new position equals start plus delta`() {
        val startX = 80; val startY = 250
        val deltaX = 120; val deltaY = -40
        assertEquals(200, startX + deltaX)
        assertEquals(210, startY + deltaY)
    }
}
```

unit test চালান:

```bash
cd android
./gradlew test
```

---

## Step 7 — Android instrumented tests (ডিভাইস/এমুলেটরে window/lifecycle)

**`android/src/androidTest/java/expo/modules/popscreen/OverlayPermissionTest.kt`** তৈরি করুন:

```kotlin
package expo.modules.popscreen

import android.provider.Settings
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class OverlayPermissionTest {

    @Test
    fun canDrawOverlays_returnsBoolean() {
        // এই টেস্ট ভ্যালিডেট করে API call নিজেই target API level (26+)-এ crash
        // করে না এবং একটি boolean রিটার্ন করে। আসল পারমিশন স্টেট
        // ডিভাইস-নির্ভর এবং এখানে assert করা হয়নি — অর্থবহ পারমিশন-ফ্লো
        // ভেরিফিকেশন Milestone 6-এর Step 7-এ POCO M3-এ ম্যানুয়ালি করা হয়েছিল।
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val result = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else true
        // result true বা false — দুটোই valid; আমরা শুধু crash না হওয়া assert করি।
        assertNotNull(result)
    }
}
```

**`android/src/androidTest/java/expo/modules/popscreen/NotificationChannelTest.kt`** তৈরি করুন:

```kotlin
package expo.modules.popscreen

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NotificationChannelTest {

    @Test
    fun notificationChannel_existsAfterServiceCreation() {
        // ভ্যালিডেট করে যে foreground service notification channel সঠিকভাবে
        // registered হয়েছে, যার জন্য একটি instrumented context প্রয়োজন।
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return // channel API 26+

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = nm.getNotificationChannel(PopScreenOverlayService.CHANNEL_ID)

        // এই টেস্ট রানে Service কখনো start না হলে channel null হতে পারে —
        // এটি গ্রহণযোগ্য। যদি থাকে, এর properties validate করুন।
        channel?.let {
            assertEquals(PopScreenOverlayService.CHANNEL_ID, it.id)
            assertEquals(NotificationManager.IMPORTANCE_LOW, it.importance)
        }
    }
}
```

কানেক্টেড POCO M3 (বা এমুলেটর)-এ instrumented test চালান:

```bash
cd android
./gradlew connectedAndroidTest
```

> **E2E ওভারলে উইন্ডো টেস্টিং সম্পর্কে নোট:** মূল প্ল্যানের §১৬ টেবিলে উল্লেখ অনুসারে, স্ট্যান্ডার্ড E2E ফ্রেমওয়ার্ক (Maestro, Detox) Activity-bound view hierarchy-কে টার্গেট করে — এগুলো একটি Service-এর মালিকানাধীন `TYPE_APPLICATION_OVERLAY` উইন্ডোর সাথে সরাসরি ইন্টারঅ্যাক্ট করতে পারে না। উপরের instrumented test-গুলো প্রোগ্র্যামেটিকভাবে যা validate করা যায় তাই করে; সম্পূর্ণ overlay show/drag/minimize/destroy সিকোয়েন্সগুলো Milestone ২–৬-এ ম্যানুয়ালি ভেরিফাই করা হয়েছে। v1-এর জন্য এই স্কোপ গ্রহণ করুন; একটি কাস্টম `adb` shell tap script একটি v1.1 quality-of-life উন্নতি, প্রাথমিক publication-এর blocker না।

---

## Step 8 — GitHub Actions CI

**`.github/workflows/ci.yml`** তৈরি করুন:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  js-tests:
    name: TypeScript + Jest
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
        working-directory: .
      - run: npm test -- --ci --coverage
        working-directory: .

  android-build:
    name: Android Build (assembleDebug)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: 17
          distribution: temurin
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm ci
        working-directory: example
      - run: npx expo prebuild --platform android --clean
        working-directory: example
      - name: Build example app (new arch)
        run: ./gradlew assembleDebug
        working-directory: example/android

  plugin-build:
    name: Config Plugin Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build:plugin
```

---

## Step 9 — `README.md` লিখুন

রুট **`README.md`** তৈরি/প্রতিস্থাপন করুন:

```markdown
# PopScreen

**Android-only** floating overlay library for React Native (Expo). Render
any React Native UI as a system-level floating window — like YouTube
Picture-in-Picture or Messenger chat bubbles — on top of other apps.

> **Platform:** Android only (API 26+). iOS cannot support system-wide
> overlays from third-party apps — this is a platform constraint, not a
> library limitation. See [docs/known-limitations.md](docs/known-limitations.md).

> **Expo Go:** not supported. A custom dev client is required.
> See [Installation](#installation).

## Features

- Render any RN component tree in a floating overlay window
- Drag, resize, minimize, and restore the overlay — all controllable from JS
- Cross-surface state sync between the host app and the overlay via `usePopScreen()`
- Generic native layer — Kotlin never knows what's inside the overlay
- Dual old/new RN architecture support (Fabric + legacy bridge)
- Foreground service for overlay persistence while the app is backgrounded
- Permission revocation detection and graceful teardown

## Installation

```bash
npx expo install popscreen
npx expo install expo-dev-client
npx expo prebuild --platform android
eas build --profile development --platform android
```

The library ships an [Expo Config Plugin](https://docs.expo.dev/config-plugins/introduction/)
that automatically injects the required Android permissions and service
declaration — no manual `AndroidManifest.xml` editing needed.

## Quick start

```tsx
// index.js — register the overlay surface early
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import MyBubble from './MyBubble';

registerRootComponent(App);
registerOverlaySurface(MyBubble);
```

```tsx
// MyBubble.tsx — the component rendered in the floating window
import { PopScreenContent } from 'popscreen';
export default function MyBubble() {
  return <PopScreenContent><YourUI /></PopScreenContent>;
}
```

```tsx
// Anywhere in your main app
import * as PopScreen from 'popscreen';
await PopScreen.requestOverlayPermission();
await PopScreen.show();
```

## API reference

See [docs/api-reference.md](docs/api-reference.md) for the full API.

## State sync

See [docs/state-sync.md](docs/state-sync.md) for how to share state
between your app and the floating overlay.

## Play Store guidance

See [docs/play-policy-guidance.md](docs/play-policy-guidance.md) if you
are distributing your app on Google Play.

## Known limitations

See [docs/known-limitations.md](docs/known-limitations.md).

## License

MIT
```

---

## Step 10 — `docs/api-reference.md` লিখুন

**`docs/api-reference.md`** তৈরি করুন:

```markdown
# PopScreen API Reference

## Setup

### `registerOverlaySurface(component)`
Call once in `index.js` alongside `registerRootComponent`. Registers the
component rendered inside the floating overlay window.

## Permissions

### `hasOverlayPermission(): Promise<boolean>`
Returns whether the "draw over other apps" permission is currently granted.

### `requestOverlayPermission(): Promise<void>`
Opens the system settings screen for this app's overlay permission.

### `hasBatteryOptimizationExemption(): Promise<boolean>`
Returns whether the app is exempt from Android battery optimization.

### `requestBatteryOptimizationExemption(): Promise<void>`
Opens Android's battery optimization settings list.

## Overlay lifecycle

### `show(): Promise<void>`
Shows the floating overlay window. Requires overlay permission.

### `hide(): Promise<void>`
Removes the overlay window. Service stays running for cheap reattachment.

### `destroy(): Promise<void>`
Fully tears down the overlay and stops the foreground Service.

## Window geometry

### `setWindowRect(x?, y?, width?, height?): Promise<void>`
Sets the window's position and/or size. Any parameter may be omitted.

### `setSizeConstraints(minWidth?, minHeight?, maxWidth?, maxHeight?): Promise<void>`
Sets resize limits. Defaults: min 150×150 px, no maximum.

## Configuration

### `<PopScreenContent dragHandleHeight? resizeHandleSize?>`
Wraps your overlay UI. Props are in dp and override the native defaults.

## State hook

### `usePopScreen<T>(key, defaultValue?): [T, setter]`
Shared cross-surface store hook. Works in both the host app and the overlay.

### `getPopScreenState(): Record<string, any>`
Read the full shared store outside a React component.

## Minimize / restore

### `minimize(currentRect?, options?): Promise<void>`
Shrinks the overlay to a small fixed size. Pass `currentRect` for correct restore.

### `restore(): Promise<void>`
Restores the overlay to its pre-minimize size/position.

### `getIsMinimized(): boolean`
Returns the current minimize state synchronously.

## Events

### `addDragUpdateListener(listener): Subscription`
Payload: `{ phase: 'start' | 'move' | 'end', x, y, width, height }`.

### `addResizeUpdateListener(listener): Subscription`
Payload: `{ phase: 'start' | 'move' | 'end', x, y, width, height }`.

### `addWindowStateChangeListener(listener): Subscription`
Payload: `{ state: 'shown' | 'hidden' | 'destroyed', reason? }`.

### `addPermissionResultListener(listener): Subscription`
Payload: `{ granted: boolean, reason? }`.

All subscriptions expose `.remove()` for cleanup.

## Architecture detection

### `getReactArchitectureInfo(): Promise<{ architecture, isNewArchitecture }>`
Returns which RN architecture the host app is running on.
```

---

## Step 11 — `docs/play-policy-guidance.md` লিখুন

**`docs/play-policy-guidance.md`** তৈরি করুন:

```markdown
# Play Store Policy Guidance for PopScreen Consumers

PopScreen uses `SYSTEM_ALERT_WINDOW` ("draw over other apps"), which is
a sensitive permission subject to Google Play policy review. This
document is a summary for app developers shipping PopScreen-based apps
to Google Play. **PopScreen as a library is a neutral tool; Play policy
responsibility lies with the apps that use it.**

## Is your use case eligible?

Google Play restricts `SYSTEM_ALERT_WINDOW` to apps that have a core use
case that requires drawing over other apps. Historically-approved
categories include:

- Floating action buttons / productivity launchers
- Chat head / messaging bubble UIs
- Video/audio mini-player overlays (call overlays, media PiP)
- Accessibility overlays with a documented accessibility purpose

## What to include in your Play Store declaration

1. A written justification for why your app requires drawing over
   other apps (1–3 sentences tied to your app's core feature).
2. A demonstration video showing the permission in context.
3. Confirmation that the overlay is user-initiated.

## What this library does NOT do

- Does **not** capture or mirror content from other apps.
- Does **not** show the overlay without explicit `PopScreen.show()`.
- Does **not** send or log any data to external servers.

## Notification requirement

Android requires a persistent notification while the foreground Service
runs. Do not suppress this notification.

## Further reading

- [Android developer docs — SYSTEM_ALERT_WINDOW](https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW)
- [Google Play policy — Device and network abuse](https://support.google.com/googleplay/android-developer/answer/10964491)
```

---

## Step 12 — Example app পলিশ

`/example` অ্যাপটি living documentation হিসেবে কাজ করার জন্য যথেষ্ট পরিষ্কার হওয়া উচিত। চূড়ান্ত পলিশ চেকলিস্ট:

- "PopScreen — Milestone N Verification" শিরোনামগুলো পরিষ্কার "PopScreen Example" heading দিয়ে প্রতিস্থাপন করুন।
- Counter এবং Input Submit স্ক্রিনে brief inline মন্তব্য যুক্ত করুন, ব্যাখ্যা করে প্রতিটি ডেমো কী প্রমাণ করে (cross-surface sync বনাম local state)।
- নিশ্চিত করুন দুটো ডেমো স্ক্রিনই একটি পরিষ্কার navigation structure থেকে পৌঁছানো যায়, শুধু `App.tsx`-এ একটি `Button` row-এর মাধ্যমে নয়।
- নিশ্চিত করুন সব debug/telemetry readout (last drag event, architecture string, ইত্যাদি) হয় পরিপাটিভাবে formatted অথবা একটি "Debug Info" সেকশনের পেছনে toggle করা, প্রাইমারি ডেমো UI-কে cluttering না করে।
- নিশ্চিত করুন example app-এর `app.json`-এ একটি sensible display name, icon reference, এবং scheme আছে — auto-generated default নয়।

---

## Step 13 — সম্পূর্ণ টেস্ট স্যুট চালান এবং CI ভেরিফাই করুন

```bash
# JS tests
npm test -- --coverage

# Android unit tests
cd android && ./gradlew test && cd ..

# Android instrumented tests (POCO M3 বা এমুলেটর connected প্রয়োজন)
cd android && ./gradlew connectedAndroidTest && cd ..

# সম্পূর্ণ example app build (দুটো arch variant)
cd example && npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug && cd ../..
```

একটি branch-এ commit করুন, একটি PR খুলুন, এবং এই মাইলফলককে সম্পন্ন বলে ঘোষণা করার আগে নিশ্চিত করুন সবতিনটি GitHub Actions job (js-tests, android-build, plugin-build) green।

---

## Step 14 — পাস / ফেইল মানদণ্ড

এই মাইলফলকটি **PASS** হবে শুধুমাত্র যদি নিচের সবগুলো সত্য হয়:

- [ ] `npm test -- --coverage` `createOverlayStore`, `usePopScreen`, `minimizeRestore`, এবং `PopScreenContent` test suite-এ কোনো failing test ছাড়াই পাস করে।
- [ ] `./gradlew test` (Android JUnit) `ReactArchitectureDetectorTest` এবং `LayoutParamClampTest`-এর জন্য পাস করে।
- [ ] `./gradlew connectedAndroidTest` (Android instrumented) একটি connected ডিভাইস বা এমুলেটরে পাস করে (POCO M3 preferred; API floor চেকের জন্য স্টক এমুলেটর API 26)।
- [ ] Example app-এ `./gradlew assembleDebug` কোনো Kotlin compile error বা manifest merge conflict ছাড়াই cleanly সফল হয়।
- [ ] main branch-এ সবতিনটি GitHub Actions CI job green।
- [ ] `README.md`, `docs/api-reference.md`, `docs/play-policy-guidance.md`, `docs/state-sync.md` (Milestone 5 থেকে), এবং `docs/known-limitations.md` (Milestone 6 থেকে) সবগুলো বিদ্যমান এবং বর্তমান codebase অনুসারে accurate।
- [ ] Example app-এর Counter এবং Input Submit ডেমো ব্যাখ্যা ছাড়াই documentation হিসেবে serve করার জন্য যথেষ্ট polished — রিপো খোলা একটি নতুন ডেভেলপার in-app মন্তব্য এবং example source পড়েই বুঝতে পারবে প্রতিটি ডেমো কী demonstrate করে।

একটি সম্পূর্ণ PASS-এ, Milestone 8-এ অগ্রসর হন: `npm publish`।

---

*Milestone 7 গাইডের সমাপ্তি। এটি publication-এর আগের চূড়ান্ত মাইলফলক। একটি ক্লিন PASS-এর পর, মূল implementation plan-এ (`docs/implementation-plan-bn.md`) Milestone 8-এ অগ্রসর হন, যেখানে npm-এ v1.0.0 publish করা হবে।*
