# PopScreen লাইব্রেরি — সম্পূর্ণ গাইড (বাংলা)

> এই গাইডটি নতুন ডেভেলপারদের জন্য লেখা হয়েছে। এখানে PopScreen লাইব্রেরিটি শুরু থেকে তৈরি করার পুরো প্রক্রিয়া, প্রতিটি ফাইলের কাজ, এবং কেন কোন জিনিস ব্যবহার করা হয়েছে — সব কিছু সহজ ভাষায় বলা আছে।

---

## ১. PopScreen কী এবং এটা কেন দরকার?

**PopScreen** হলো একটি Android-only React Native লাইব্রেরি যা দিয়ে তুমি যেকোনো React Native UI কে একটি **ভাসমান উইন্ডো (floating overlay)** হিসেবে দেখাতে পারবে — ঠিক YouTube-এর Picture-in-Picture (PiP) বা Facebook Messenger-এর chat bubble-এর মতো।

### এটা কীভাবে কাজ করে?

```
তোমার Main App (App.tsx)
         ↕  (একই JS process শেয়ার করে)
Floating Overlay Window (OverlaySwitcher.tsx)
         ↕
Android System (WindowManager + ForegroundService)
```

- Main App এবং Overlay **একই JavaScript process**-এ চলে
- তাই state বা data share করা খুব সহজ — কোনো extra network call বা event bus দরকার নেই
- Android-এর `WindowManager` ব্যবহার করে overlay-টি **সব app-এর উপরে** দেখায়

---

## ২. প্রথমে জানতে হবে — কিছু জরুরি কনসেপ্ট

### ২.১ NativeModule কী?
React Native-এ JavaScript থেকে সরাসরি Android native code চালানো যায় না। এজন্য **NativeModule** ব্যবহার করা হয় — এটি একটি সেতু (bridge) যা JS এবং native code-এর মধ্যে যোগাযোগ করায়।

### ২.২ ForegroundService কী?
Android-এ যখন একটি app background-এ থাকে, তখন সে কিছু কাজ করতে পারে না। কিন্তু **ForegroundService** দিয়ে app ব্যাকগ্রাউন্ডে গেলেও একটি ongoing notification দেখিয়ে কাজ চালিয়ে যাওয়া যায়। PopScreen এই ForegroundService ব্যবহার করে overlay উইন্ডো চালু রাখে।

### ২.৩ WindowManager কী?
Android-এর `WindowManager` হলো সেই system service যা screen-এ উইন্ডো তৈরি এবং নিয়ন্ত্রণ করে। `SYSTEM_ALERT_WINDOW` permission নিলে যেকোনো app-এর উপরে উইন্ডো দেখানো যায়।

### ২.৪ Expo Config Plugin কী?
Expo ব্যবহার করলে সাধারণত `android/` ফোল্ডারে সরাসরি হাত দেওয়া হয় না — Expo এটি `prebuild` করার সময় জেনারেট করে। **Config Plugin** হলো একটি function যা এই prebuild-এর সময় automatically `AndroidManifest.xml`, native Kotlin ফাইল, এবং `MainApplication.kt`-এ প্রয়োজনীয় কোড যোগ করে দেয়।

### ২.৫ ReactRootView কী?
`ReactRootView` হলো Android-এর একটি View যা React Native component tree render করতে পারে। OverlayService এই view-টি WindowManager-এ যোগ করে — এভাবেই floating window-এ React Native UI দেখায়।

### ২.৬ useSyncExternalStore কী?
React 18-এ আসা একটি hook যা React component-কে React-এর বাইরের (external) data store-এর সাথে connect করে এবং data বদলালে automatically re-render করে।

---

## ৩. প্রজেক্টের ফাইল কাঠামো (File Structure)

```
react-native-popScreen-deepseek/
│
├── src/                          ← লাইব্রেরির TypeScript source code
│   ├── PopScreen.types.ts        ← সব TypeScript type/interface
│   ├── PopScreenModule.ts        ← Native module wrapper (JS side)
│   ├── createOverlayStore.ts     ← Custom state store তৈরি করে
│   ├── useExternalStore.ts       ← Store-কে React-এর সাথে connect করে
│   ├── usePopScreen.ts           ← Main hook (useState-এর মতো কিন্তু shared)
│   ├── registerOverlaySurface.ts ← Overlay component register করে
│   ├── minimizeRestore.ts        ← Overlay minimize/restore করার logic
│   ├── PopScreenContent.tsx      ← Overlay-এর main container component
│   ├── PopScreenHeader.tsx       ← Overlay-এর header component
│   └── index.ts                  ← সব কিছু export করে (লাইব্রেরির entry point)
│
├── plugin/                       ← Expo Config Plugin
│   ├── src/index.ts              ← Plugin logic (AndroidManifest, MainApplication patch)
│   └── native/                   ← Kotlin template files
│       ├── PopScreenModule.kt    ← JS-to-Android bridge module
│       ├── OverlayService.kt     ← Floating overlay-এর engine
│       └── PopScreenPackage.kt   ← Module-কে React Native-এ register করে
│
├── demos/                        ← Example components (শিক্ষামূলক)
│   ├── CounterOverlayContent.tsx ← Overlay-এ counter দেখায়
│   ├── CounterMainAppPanel.tsx   ← Main app-এ counter দেখায়
│   ├── TodoOverlayContent.tsx    ← Overlay-এ todo list
│   ├── TodoMainAppPanel.tsx      ← Main app-এ todo list
│   ├── InputSubmitOverlayContent.tsx ← Local state demo
│   └── OverlayCustomizerPanel.tsx    ← Overlay customize করার UI
│
├── index.tsx                     ← App entry point
├── App.tsx                       ← Main app screen
├── OverlaySwitcher.tsx           ← Overlay-এ কোন demo দেখাবে তা নির্ধারণ করে
├── app.json                      ← Expo app configuration
├── expo-module.config.json       ← Expo module metadata
├── package.json                  ← Dependencies এবং scripts
├── tsconfig.build.json           ← Library build-এর জন্য TypeScript config
└── build/                        ← Compiled output (publish হয় এটা)
```

---

## ৪. ধাপে ধাপে লাইব্রেরি তৈরির প্রক্রিয়া

### ধাপ ১: প্রজেক্ট শুরু করা

```bash
npx create-expo-app my-overlay-lib --template blank-typescript
cd my-overlay-lib
npm install expo-build-properties
```

তোমার `package.json`-এ কিছু জরুরি জিনিস যোগ করতে হবে:

```json
{
  "name": "popscreen",
  "main": "index.tsx",
  "exports": {
    ".": {
      "import": "./build/index.js",
      "require": "./build/index.js",
      "types": "./build/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "build:plugin": "cd plugin && npx tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

> **কেন দুটো entry point?**
> - `"main": "index.tsx"` — Expo/Metro যখন app run করে তখন এটা ব্যবহার করে
> - `"exports"` এর `build/index.js` — অন্য প্রজেক্ট যখন এই লাইব্রেরি install করে তখন এটা ব্যবহার করে
> - এই দুটো আলাদা রাখাটা খুব জরুরি! `build/index.js`-কে main রাখলে app crash করবে কারণ সেটা `AppRegistry.registerComponent` call করে না।

---

### ধাপ ২: TypeScript Types তৈরি করা

📄 **ফাইল: `src/PopScreen.types.ts`**

এই ফাইলে সব TypeScript type রাখা হয়। এখানে কোনো logic নেই — শুধু type definitions।

```typescript
// Overlay-এর আকৃতি
export type OverlayShape = 'rectangle' | 'rounded' | 'circle' | 'square' | 'pill';

// Overlay কোথা থেকে drag করা যাবে
export type DragMode = 'handle' | 'header' | 'body';

// Drag event-এ কী data পাওয়া যাবে
export type DragUpdateEvent = {
  phase: 'start' | 'move' | 'end';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

// Overlay-এর current state
export type WindowState = 'shown' | 'hidden' | 'destroyed';
export type WindowStateChangeEvent = {
  state: WindowState;
  reason?: string;
};
```

---

### ধাপ ৩: State Store তৈরি করা

📄 **ফাইল: `src/createOverlayStore.ts`**

এটি লাইব্রেরির **হৃদয়**। এই ছোট্ট store-টি main app এবং overlay-এর মধ্যে state share করে।

```typescript
export function createOverlayStore<T extends Record<string, any>>(initialState: T) {
  let state = initialState;
  const subscribers = new Set<() => void>();

  function getState(): T {
    return state;
  }

  function setState(update: Partial<T> | ((prev: T) => Partial<T>)) {
    const changes = typeof update === 'function' ? update(state) : update;
    state = { ...state, ...changes };          // নতুন state তৈরি করো
    subscribers.forEach((notify) => notify()); // সবাইকে জানাও
  }

  function subscribe(listener: () => void): () => void {
    subscribers.add(listener);
    return () => subscribers.delete(listener); // cleanup function
  }

  return { getState, setState, subscribe };
}
```

> **এটা কেন কাজ করে?**
> JavaScript-এ module-level variables একবারই তৈরি হয় এবং সব import-এ একই instance শেয়ার করা হয়। যেহেতু main app এবং overlay একই JS process-এ চলে, তারা একই `state` variable দেখে!

---

### ধাপ ৪: Store-কে React-এর সাথে Connect করা

📄 **ফাইল: `src/useExternalStore.ts`**

```typescript
import { useSyncExternalStore } from 'react';
import { OverlayStore } from './createOverlayStore';

export function useExternalStore<T extends Record<string, any>, S>(
  store: OverlayStore<T>,
  selector: (state: T) => S
): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
  );
}
```

> **`useSyncExternalStore` কেন?**
> React 18-এ concurrent rendering-এর কারণে `useState` দিয়ে external store read করলে দুটো component দুটো আলাদা value দেখতে পারে (tearing বলে)। `useSyncExternalStore` guarantee করে সব component একই value দেখবে।

---

### ধাপ ৫: `usePopScreen` Hook তৈরি করা

📄 **ফাইল: `src/usePopScreen.ts`**

এটি হলো **user-facing hook** — লাইব্রেরির সবচেয়ে গুরুত্বপূর্ণ API।

```typescript
import { createOverlayStore } from './createOverlayStore';
import { useExternalStore } from './useExternalStore';

export type SharedState = Record<string, any>;

// এই store-টি module level-এ আছে
// Main app এবং overlay দুজনেই এই SAME instance দেখে
const store = createOverlayStore<SharedState>({});

export function usePopScreen<T = any>(
  key: string,
  defaultValue?: T
): [T, (value: T | ((prev: T) => T)) => void] {

  const value = useExternalStore(store, (state) =>
    key in state ? state[key] : defaultValue
  ) as T;

  function setValue(next: T | ((prev: T) => T)) {
    store.setState((prev) => {
      const current = key in prev ? prev[key] : defaultValue;
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(current) : next;
      return { [key]: resolved };
    });
  }

  return [value, setValue]; // React-এর useState-এর মতোই!
}
```

**ব্যবহারের উদাহরণ:**

```typescript
// Main App-এ:
const [count, setCount] = usePopScreen<number>('count', 0);

// Overlay-এ (একই key দিয়ে):
const [count, setCount] = usePopScreen<number>('count', 0);

// Overlay থেকে setCount(5) করলে Main App-এও count হবে 5!
```

---

### ধাপ ৬: Native Module Wrapper তৈরি করা

📄 **ফাইল: `src/PopScreenModule.ts`**

```typescript
import { NativeModules } from 'react-native';

const { PopScreen } = NativeModules;

export interface PopScreenNativeModule {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  hasBatteryOptimizationExemption(): Promise<boolean>;
  requestBatteryOptimizationExemption(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  destroy(): Promise<void>;
  openApp(): Promise<void>;
  getReactArchitectureInfo(): Promise<any>;
  setWindowRect(x?: number, y?: number, width?: number, height?: number): Promise<void>;
  setSizeConstraints(minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<void>;
  setHandleDimensions(dragHandleHeightDp?: number, resizeHandleSizeDp?: number): Promise<void>;
  setDragMode(mode?: number): Promise<void>;
}

// Test বা non-Android পরিবেশে fallback stub
const fallbackModule: PopScreenNativeModule = {
  hasOverlayPermission: async () => false,
  requestOverlayPermission: async () => {},
  hasBatteryOptimizationExemption: async () => false,
  requestBatteryOptimizationExemption: async () => {},
  show: async () => {},
  hide: async () => {},
  destroy: async () => {},
  openApp: async () => {},
  getReactArchitectureInfo: async () => ({ architecture: 'UNKNOWN', isNewArchitecture: false, reactNativeVersion: null }),
  setWindowRect: async () => {},
  setSizeConstraints: async () => {},
  setHandleDimensions: async () => {},
  setDragMode: async () => {},
};

const rawModule = PopScreen ?? fallbackModule;

const DEFAULT_MIN_SIZE_DP = 150;
const DEFAULT_DRAG_HANDLE_DP = 32;
const DEFAULT_RESIZE_HANDLE_DP = 24;

// Undefined values-এর জায়গায় default দেওয়া হয় Kotlin null safety রক্ষা করতে
export const PopScreenModule: PopScreenNativeModule = {
  ...rawModule,
  setWindowRect: (x, y, width, height) =>
    rawModule.setWindowRect?.(x ?? -1, y ?? -1, width ?? -1, height ?? -1) ?? Promise.resolve(),
  setSizeConstraints: (minWidth, minHeight, maxWidth, maxHeight) =>
    rawModule.setSizeConstraints?.(
      minWidth ?? DEFAULT_MIN_SIZE_DP,
      minHeight ?? DEFAULT_MIN_SIZE_DP,
      maxWidth ?? 0,
      maxHeight ?? 0
    ) ?? Promise.resolve(),
  setHandleDimensions: (dragHandleHeightDp, resizeHandleSizeDp) =>
    rawModule.setHandleDimensions?.(
      dragHandleHeightDp ?? DEFAULT_DRAG_HANDLE_DP,
      resizeHandleSizeDp ?? DEFAULT_RESIZE_HANDLE_DP
    ) ?? Promise.resolve(),
  setDragMode: (mode) => rawModule.setDragMode?.(mode ?? NATIVE_DRAG_MODE.BAND) ?? Promise.resolve(),
};

export const NATIVE_DRAG_MODE = { BAND: 1, BODY: 2 } as const;

export function resolveDragMode(mode?: string): number {
  return mode === 'body' ? NATIVE_DRAG_MODE.BODY : NATIVE_DRAG_MODE.BAND;
}
```

> **কেন `?? -1`?**
> Kotlin-এ `Int` type nullable নয়। JavaScript থেকে `undefined` পাঠালে Kotlin crash করবে (NullPointerException)। `-1` পাঠালে Kotlin side বুঝবে "এই parameter দেওয়া হয়নি, default ব্যবহার করো।"

---

### ধাপ ৭: Overlay Surface Register করা

📄 **ফাইল: `src/registerOverlaySurface.ts`**

```typescript
import { AppRegistry } from 'react-native';
import type { ComponentType } from 'react';

const OVERLAY_SURFACE_NAME = 'PopScreenOverlay'; // Kotlin-এও এই নামটি ব্যবহার হয়!

let alreadyRegistered = false;

export function registerOverlaySurface(component: ComponentType<any>) {
  if (alreadyRegistered) {
    console.warn('[PopScreen] registerOverlaySurface called more than once — ignoring.');
    return;
  }
  alreadyRegistered = true;
  AppRegistry.registerComponent(OVERLAY_SURFACE_NAME, () => component);
}
```

> **Kotlin side-এ কী হয়?**
> `OverlayService.kt`-এ `reactRootView.startReactApplication(reactInstanceManager, "PopScreenOverlay", null)` call হয়। এই `"PopScreenOverlay"` string-টি অবশ্যই হুবহু match করতে হবে।

---

### ধাপ ৮: Minimize/Restore Logic

📄 **ফাইল: `src/minimizeRestore.ts`**

```typescript
import { PopScreenModule } from './PopScreenModule';

type Rect = { x: number; y: number; width: number; height: number };

const DEFAULT_MINIMIZED_SIZE = { width: 64, height: 64 };

let savedRect: Rect | null = null; // minimize করার আগের size/position মনে রাখে
let minimized = false;

export async function minimize(currentRect?: Rect, options?: { width?: number; height?: number }) {
  if (minimized) return; // আগেই minimize হলে কিছু করো না
  if (currentRect) savedRect = currentRect;
  minimized = true;
  const width = options?.width ?? DEFAULT_MINIMIZED_SIZE.width;
  const height = options?.height ?? DEFAULT_MINIMIZED_SIZE.height;
  await PopScreenModule.setWindowRect(undefined, undefined, width, height);
}

export async function restore() {
  if (!minimized || !savedRect) return;
  minimized = false;
  await PopScreenModule.setWindowRect(savedRect.x, savedRect.y, savedRect.width, savedRect.height);
}

export function getIsMinimized() {
  return minimized;
}
```

---

### ধাপ ৯: PopScreenContent Component তৈরি করা

📄 **ফাইল: `src/PopScreenContent.tsx`**

এটি overlay-এর **main container** — ব্যবহারকারীর component এর ভেতরে wrap করে।

```typescript
export default function PopScreenContent({
  children,
  dragHandleHeight,
  resizeHandleSize,
  dragMode,
  showHeader = false,
  header,
  headerProps,
  shape,
  borderRadius,
  width, height,
  minWidth, minHeight, maxWidth, maxHeight,
  scrollable = true,
  style,
  contentContainerStyle,
}: PopScreenContentProps) {

  const effectiveDragHandleHeight =
    dragMode === 'header' ? (dragHandleHeight ?? 40) : dragHandleHeight;

  useEffect(() => {
    if (effectiveDragHandleHeight !== undefined || resizeHandleSize !== undefined) {
      PopScreenModule.setHandleDimensions(effectiveDragHandleHeight, resizeHandleSize);
    }
  }, [effectiveDragHandleHeight, resizeHandleSize]);

  useEffect(() => {
    if (dragMode !== undefined) PopScreenModule.setDragMode(resolveDragMode(dragMode));
  }, [dragMode]);

  useEffect(() => {
    if (width !== undefined || height !== undefined) {
      PopScreenModule.setWindowRect(undefined, undefined, width, height);
    }
  }, [width, height]);

  useEffect(() => {
    if (minWidth !== undefined || minHeight !== undefined || maxWidth !== undefined || maxHeight !== undefined) {
      PopScreenModule.setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight);
    }
  }, [minWidth, minHeight, maxWidth, maxHeight]);

  const getComputedShapeStyle = () => {
    const activeShape = shape ?? 'rounded';
    switch (activeShape) {
      case 'circle': return { borderRadius: 9999, aspectRatio: 1, overflow: 'hidden', paddingHorizontal: 12 };
      case 'pill':   return { borderRadius: 9999, overflow: 'hidden', paddingHorizontal: 12 };
      case 'square': return { borderRadius: 0, aspectRatio: 1, overflow: 'hidden' };
      case 'rectangle': return { borderRadius: 0, overflow: 'hidden' };
      default:       return { borderRadius: borderRadius ?? 16, overflow: 'hidden' };
    }
  };

  const renderBody = () => {
    if (!scrollable) return <View style={styles.body}>{children}</View>;
    return (
      <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
        <ScrollView horizontal contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
          {children}
        </ScrollView>
      </ScrollView>
    );
  };

  const renderHeader = () => {
    if (!showHeader && !header) return null;
    if (header) return header;
    return <PopScreenHeader {...headerProps} />;
  };

  return (
    <View style={[{ flex: 1 }, getComputedShapeStyle(), style]}>
      {renderHeader()}
      {renderBody()}
    </View>
  );
}
```

> **কেন nested ScrollView?**
> Content যদি overlay-এর চেয়ে বড় হয়, সেটা cut off না হয়ে scroll করবে। উপর-নিচ এবং বাম-ডান দুই দিকেই scroll করা যাবে।

---

### ধাপ ১০: PopScreenHeader Component তৈরি করা

📄 **ফাইল: `src/PopScreenHeader.tsx`**

Overlay-এর top bar — title, Cancel এবং Back to App button সহ।

```typescript
export default function PopScreenHeader({
  title = 'Overlay',
  onCancel,
  onBackToApp,
  showCancel = true,
  showBackToApp = true,
  cancelText = 'Cancel',
  backToAppText = 'Back to Main App',
  compact,
}: PopScreenHeaderProps) {

  const [headerWidth, setHeaderWidth] = useState<number | undefined>(undefined);

  const isNarrow = compact ?? (headerWidth !== undefined && headerWidth < 280);
  const isVeryNarrow = headerWidth !== undefined && headerWidth < 200;
  const displayBackText = isNarrow ? 'Back' : backToAppText;
  const displayCancelText = isNarrow && isVeryNarrow ? '✕' : cancelText;

  const handleCancelPress = () => {
    if (onCancel) onCancel();
    else PopScreenModule.hide();
  };

  const handleBackToAppPress = async () => {
    if (onBackToApp) onBackToApp();
    else {
      await PopScreenModule.openApp();
      await PopScreenModule.hide();
    }
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent?.layout?.width;
        if (w && w !== headerWidth) setHeaderWidth(w);
      }}
    >
      {showBackToApp ? (
        <Pressable onPress={handleBackToAppPress} testID="header-back-to-app-button">
          <Text>{displayBackText}</Text>
        </Pressable>
      ) : <View style={{ width: 44 }} />}

      {title ? <Text testID="header-title">{title}</Text> : null}

      {showCancel ? (
        <Pressable onPress={handleCancelPress} testID="header-cancel-button">
          <Text>{displayCancelText}</Text>
        </Pressable>
      ) : <View style={{ width: 44 }} />}
    </View>
  );
}
```

---

### ধাপ ১১: Library Entry Point তৈরি করা

📄 **ফাইল: `src/index.ts`**

এটি library-র **public API** — এখানে যা export করা হয় তাই ব্যবহারকারীরা import করতে পারবে।

```typescript
export async function hasOverlayPermission(): Promise<boolean> {
  return PopScreenModule.hasOverlayPermission();
}
export async function requestOverlayPermission(): Promise<void> {
  return PopScreenModule.requestOverlayPermission();
}
export async function hasBatteryOptimizationExemption(): Promise<boolean> {
  return PopScreenModule.hasBatteryOptimizationExemption();
}
export async function requestBatteryOptimizationExemption(): Promise<void> {
  return PopScreenModule.requestBatteryOptimizationExemption();
}

export async function show(): Promise<void> { return PopScreenModule.show(); }
export async function hide(): Promise<void> { return PopScreenModule.hide(); }
export async function destroy(): Promise<void> { return PopScreenModule.destroy(); }
export async function openApp(): Promise<void> { return PopScreenModule.openApp(); }
export async function getReactArchitectureInfo() { return PopScreenModule.getReactArchitectureInfo(); }

const eventEmitter = PopScreen ? new NativeEventEmitter(PopScreen) : null;

export function addDragUpdateListener(listener: (event: DragUpdateEvent) => void) {
  const sub = eventEmitter?.addListener('onDragUpdate', listener);
  return { remove: () => sub?.remove() };
}
export function addResizeUpdateListener(listener: (event: ResizeUpdateEvent) => void) {
  const sub = eventEmitter?.addListener('onResizeUpdate', listener);
  return { remove: () => sub?.remove() };
}
export function addWindowStateChangeListener(listener: (event: WindowStateChangeEvent) => void) {
  const sub = eventEmitter?.addListener('onWindowStateChange', listener);
  return { remove: () => sub?.remove() };
}
export function addPermissionResultListener(listener: (event: PermissionResultEvent) => void) {
  const sub = eventEmitter?.addListener('onPermissionResult', listener);
  return { remove: () => sub?.remove() };
}

export async function setWindowRect(x?: number, y?: number, width?: number, height?: number) {
  return PopScreenModule.setWindowRect(x, y, width, height);
}
export async function setSizeConstraints(minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number) {
  return PopScreenModule.setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight);
}
export async function setDragMode(mode: DragMode): Promise<void> {
  return PopScreenModule.setDragMode(resolveDragMode(mode));
}

export { minimize, restore, getIsMinimized } from './minimizeRestore';
export { default as PopScreenContent } from './PopScreenContent';
export type { PopScreenContentProps } from './PopScreenContent';
export { default as PopScreenHeader } from './PopScreenHeader';
export type { PopScreenHeaderProps } from './PopScreenHeader';
export { registerOverlaySurface } from './registerOverlaySurface';
export { usePopScreen, getPopScreenState } from './usePopScreen';

export * from './PopScreen.types';
```

---

### ধাপ ১২: Kotlin Native Code তৈরি করা

#### ১২.১ PopScreenPackage.kt
📄 **ফাইল: `plugin/native/PopScreenPackage.kt`**

```kotlin
package __PACKAGE__

class PopScreenPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(PopScreenModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
```

#### ১২.২ PopScreenModule.kt
📄 **ফাইল: `plugin/native/PopScreenModule.kt`**

```kotlin
class PopScreenModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PopScreen"

  @ReactMethod
  fun hasOverlayPermission(promise: Promise) {
    promise.resolve(Settings.canDrawOverlays(reactContext))
  }

  @ReactMethod
  fun show(promise: Promise) {
    val intent = Intent(reactContext, OverlayService::class.java).apply {
      action = OverlayService.ACTION_SHOW
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun hide(promise: Promise) {
    val intent = Intent(reactContext, OverlayService::class.java).apply {
      action = OverlayService.ACTION_HIDE
    }
    reactContext.startService(intent)
    promise.resolve(null)
  }

  private fun emitWindowStateInternal(state: String, reason: String?) {
    val params = Arguments.createMap().apply {
      putString("state", state)
      reason?.let { putString("reason", it) }
    }
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onWindowStateChange", params)
  }
}
```

#### ১২.৩ OverlayService.kt (সারসংক্ষেপ)
📄 **ফাইল: `plugin/native/OverlayService.kt`**

```kotlin
class OverlayService : Service() {

  companion object {
    const val ACTION_SHOW = "popscreen.SHOW"
    const val ACTION_HIDE = "popscreen.HIDE"
    const val ACTION_DESTROY = "popscreen.DESTROY"
    const val DRAG_MODE_BAND = 1
    const val DRAG_MODE_BODY = 2
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_SHOW -> showOverlay()
      ACTION_HIDE -> hideOverlay()
      ACTION_DESTROY -> destroyOverlay()
    }
    return START_STICKY
  }

  private fun showOverlay() {
    startForeground(NOTIFICATION_ID, createNotification())

    val reactRootView = ReactRootView(this)
    val reactInstanceManager = (application as ReactApplication)
      .reactNativeHost.reactInstanceManager

    reactRootView.startReactApplication(reactInstanceManager, "PopScreenOverlay", null)

    val params = WindowManager.LayoutParams(
      width, height,
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT
    )
    windowManager.addView(overlayContainer, params)
  }
}
```

---

### ধাপ ১৩: Expo Config Plugin তৈরি করা

📄 **ফাইল: `plugin/src/index.ts`**

```typescript
const withPopScreenAndroidManifest: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.POST_NOTIFICATIONS',
    ]);

    mainApplication.service.push({
      $: {
        'android:name': '.OverlayService',
        'android:foregroundServiceType': 'specialUse',
        'android:exported': 'false',
      },
    });
    return config;
  });
};

const withPopScreenNativeSources: ConfigPlugin = (config) => {
  return withDangerousMod(config, ['android', async (config) => {
    const srcDir = path.join(androidRoot, 'app/src/main/java', ...packageName.split('.'));

    for (const file of kotlinFiles) {
      const source = fs.readFileSync(file, 'utf8');
      const rendered = source.replace(/__PACKAGE__/g, androidPackage);
      fs.writeFileSync(path.join(srcDir, file), rendered);
    }
    return config;
  }]);
};

const withPopScreenMainApplication: ConfigPlugin = (config) => {
  return withMainApplication(config, (config) => {
    contents = contents.replace(
      'return packages',
      `packages.add(PopScreenPackage());\n            return packages`
    );
    config.modResults.contents = contents;
    return config;
  });
};

const withPopScreen: ConfigPlugin = (config) => {
  config = withPopScreenAndroidManifest(config);
  config = withPopScreenNativeSources(config);
  config = withPopScreenMainApplication(config);
  return config;
};

export default withPopScreen;
```

---

### ধাপ ১৪: App Entry Point তৈরি করা

📄 **ফাইল: `index.tsx`**

```typescript
import { registerRootComponent } from 'expo';
import App from './App';
import OverlaySwitcher from './OverlaySwitcher';
import { registerOverlaySurface } from './src/registerOverlaySurface';

registerRootComponent(App);              // Main app register করো
registerOverlaySurface(OverlaySwitcher); // Overlay register করো
```

---

### ধাপ ১৫: OverlaySwitcher তৈরি করা

📄 **ফাইল: `OverlaySwitcher.tsx`**

```typescript
export default function OverlaySwitcher() {
  const [activeDemo] = usePopScreen<string>('activeDemo', 'counter');
  const [shape] = usePopScreen<OverlayShape>('overlayShape', 'rounded');
  const [borderRadius] = usePopScreen<number | undefined>('overlayRadius', undefined);
  const [width] = usePopScreen<number | undefined>('overlayWidth', undefined);
  const [height] = usePopScreen<number | undefined>('overlayHeight', undefined);
  const [dragMode] = usePopScreen<DragMode>('overlayDragMode', 'handle');

  if (activeDemo === 'inputSubmit') return <InputSubmitOverlayContent shape={shape} borderRadius={borderRadius} width={width} height={height} dragMode={dragMode} />;
  if (activeDemo === 'todo') return <TodoOverlayContent shape={shape} borderRadius={borderRadius} width={width} height={height} dragMode={dragMode} />;
  return <CounterOverlayContent shape={shape} borderRadius={borderRadius} width={width} height={height} dragMode={dragMode} />;
}
```

---

### ধাপ ১৬: TypeScript Build Config তৈরি করা

📄 **ফাইল: `tsconfig.build.json`**

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "commonjs",
    "outDir": "build",
    "rootDir": "src",
    "strict": true,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node10",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["src/__tests__", "src/__mocks__"]
}
```

---

## ৫. Demo Components কীভাবে কাজ করে

### Counter Demo — Cross-surface State Sync

```typescript
// demos/CounterOverlayContent.tsx (Overlay-এ)
export default function CounterOverlayContent({ shape, dragMode }: OverlayDemoProps) {
  const [count, setCount] = usePopScreen<number>('count', 0);

  return (
    <PopScreenContent shape={shape} dragMode={dragMode}>
      <Text style={{ color: 'white', fontSize: 36 }}>{count}</Text>
      <Pressable onPress={() => setCount(c => c + 1)}><Text style={{ color: 'white' }}>+</Text></Pressable>
      <Pressable onPress={() => setCount(c => c - 1)}><Text style={{ color: 'white' }}>-</Text></Pressable>
    </PopScreenContent>
  );
}

// demos/CounterMainAppPanel.tsx (Main App-এ)
export default function CounterMainAppPanel() {
  const [count] = usePopScreen<number>('count', 0);
  return <Text style={{ fontSize: 24 }}>{count}</Text>;
}
```

### Todo Demo — Shared Array State

```typescript
const DEFAULT_TODOS: TodoItem[] = []; // Stable reference to avoid infinite loops

export default function TodoOverlayContent({ shape, dragMode }: OverlayDemoProps) {
  const [todos, setTodos] = usePopScreen<TodoItem[]>('todos', DEFAULT_TODOS);
  const [draft, setDraft] = useState('');

  const addTodo = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setTodos(prev => [...prev, { id: `${Date.now()}`, text: trimmed, done: false }]);
    setDraft('');
  };
}
```

---

## ৬. Data Flow — পুরো System-এ কীভাবে data চলে

```
ব্যবহারকারী Overlay-এ "+" press করে
              ↓
setCount(c => c + 1)   [usePopScreen hook]
              ↓
store.setState({count: 1})   [createOverlayStore]
              ↓
সব subscribers-কে notify করে
              ↓
Main App-এ useExternalStore re-render করে
              ↓
CounterMainAppPanel নতুন count দেখায় ✓
```

```
PopScreenContent-এ dragMode prop change হলে
              ↓
useEffect: PopScreenModule.setDragMode(1)   [JS side]
              ↓
NativeModule Bridge (@ReactMethod)
              ↓
PopScreenModule.kt: OverlayService.dragMode update করে
              ↓
পরবর্তী touch event নতুন mode-এ handle হয় ✓
```

---

## ৭. Event Flow — Native থেকে JavaScript-এ

```
ব্যবহারকারী Overlay drag করে
              ↓
OverlayService.kt: onTouchEvent() ধরে
              ↓
PopScreenModule.emitDragUpdate("move", x, y, w, h) call করে
              ↓
RCTDeviceEventEmitter.emit("onDragUpdate", params)
              ↓
JavaScript Bridge
              ↓
App.tsx: eventEmitter.addListener('onDragUpdate', handler)
              ↓
handler(event) call হয় ✓
```

---

## ৮. Build এবং Run করার প্রক্রিয়া

### ৮.১ Library Build

```bash
npm run build        # src/ → build/ (TypeScript compile)
npm run build:plugin # plugin/src/ → plugin/build/
npm run typecheck    # Error check — কোনো output নেই মানে সব ঠিক আছে
npm test             # Jest tests চালাও
```

### ৮.২ Android App Build

```bash
# শুধু একবার করতে হয় — Config Plugin চলে এবং android/ folder তৈরি হয়
npx expo prebuild --platform android

# App run করো (device বা emulator লাগবে)
npx expo run:android
```

### ৮.৩ EAS Build (Real APK)

```bash
eas login
eas build --platform android --profile production
```

---

## ৯. Test লেখার পদ্ধতি

Native module Jest-এ test করা যায় না, তাই mock দরকার।

📄 **ফাইল: `src/__mocks__/PopScreenModule.ts`**

```typescript
export const PopScreenModule = {
  show: jest.fn().mockResolvedValue(undefined),
  hide: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  openApp: jest.fn().mockResolvedValue(undefined),
  hasOverlayPermission: jest.fn().mockResolvedValue(false),
  hasBatteryOptimizationExemption: jest.fn().mockResolvedValue(false),
  requestOverlayPermission: jest.fn().mockResolvedValue(undefined),
  requestBatteryOptimizationExemption: jest.fn().mockResolvedValue(undefined),
  getReactArchitectureInfo: jest.fn().mockResolvedValue({
    architecture: 'UNKNOWN', isNewArchitecture: false, reactNativeVersion: null
  }),
  setWindowRect: jest.fn().mockResolvedValue(undefined),
  setSizeConstraints: jest.fn().mockResolvedValue(undefined),
  setHandleDimensions: jest.fn().mockResolvedValue(undefined),
  setDragMode: jest.fn().mockResolvedValue(undefined),
};

export const NATIVE_DRAG_MODE = { BAND: 1, BODY: 2 };
export const resolveDragMode = (mode?: string) => mode === 'body' ? 2 : 1;
```

---

## ১০. সাধারণ ভুল এবং সমাধান

### ভুল ১: "PopScreenOverlay has not been registered"
**কারণ:** `registerOverlaySurface()` call হয়নি বা দেরিতে হয়েছে।
**সমাধান:** `index.tsx`-এ `registerRootComponent()` এর ঠিক পরেই `registerOverlaySurface()` call করো।

---

### ভুল ২: "NativeModules.PopScreen is null"
**কারণ:** `expo prebuild` করা হয়নি, বা Config Plugin ঠিকমতো চলেনি।
**সমাধান:**
```bash
npx expo prebuild --platform android --clean
npx expo run:android
```

---

### ভুল ৩: Overlay দেখাচ্ছে না
**কারণ:** `SYSTEM_ALERT_WINDOW` permission নেওয়া হয়নি।
**সমাধান:** App-এ `requestOverlayPermission()` call করো এবং ব্যবহারকারীকে settings-এ permission দিতে বলো।

---

### ভুল ৪: Main App crash হচ্ছে ("main has not been registered")
**কারণ:** `package.json`-এর `"main"` field `build/index.js` এ set করা আছে।
**সমাধান:**
```json
{
  "main": "index.tsx"
}
```

---

### ভুল ৫: State sync কাজ করছে না
**কারণ:** দুটো জায়গায় আলাদা key ব্যবহার করা হচ্ছে।
**সমাধান:**
```typescript
// সঠিক — দুই জায়গায় একই 'count' key
const [count] = usePopScreen<number>('count', 0); // Overlay
const [count] = usePopScreen<number>('count', 0); // Main App
```

---

### ভুল ৬: Infinite re-render loop
**কারণ:** `usePopScreen`-এ default value হিসেবে inline `[]` বা `{}` দেওয়া হয়েছে।
**সমাধান:**
```typescript
// সঠিক — module scope-এ constant রাখো
const DEFAULT_TODOS: TodoItem[] = [];
const [todos] = usePopScreen<TodoItem[]>('todos', DEFAULT_TODOS);
```

---

## ১১. Android Permissions এবং তাদের কারণ

| Permission | কেন দরকার |
|---|---|
| `SYSTEM_ALERT_WINDOW` | অন্য app-এর উপরে window দেখানোর জন্য |
| `FOREGROUND_SERVICE` | ForegroundService চালানোর জন্য |
| `FOREGROUND_SERVICE_SPECIAL_USE` | Android 14+ এ specialUse type service-এর জন্য |
| `POST_NOTIFICATIONS` | Notification দেখানোর জন্য (Android 13+ এ mandatory) |

---

## ১২. Architecture সারসংক্ষেপ

```
┌──────────────────────────────────────────────┐
│               JavaScript Layer               │
│                                              │
│  App.tsx  ←→  usePopScreen(key)  ←→  Overlay │
│                      ↕                       │
│           createOverlayStore                 │
│        (module-scoped singleton)             │
│                      ↕                       │
│        PopScreenModule.ts (TS wrapper)       │
└──────────────────────┬───────────────────────┘
                       │ NativeModule Bridge (@ReactMethod)
┌──────────────────────┴───────────────────────┐
│                 Kotlin Layer                  │
│                                              │
│  PopScreenPackage.kt                         │
│  (ReactPackage — module register করে)        │
│          ↕                                   │
│  PopScreenModule.kt                          │
│  (ReactContextBaseJavaModule)                │
│          ↕                                   │
│  OverlayService.kt                           │
│  (ForegroundService + WindowManager)         │
│          ↕                                   │
│  ReactRootView → "PopScreenOverlay" surface  │
└──────────────────────────────────────────────┘
```

---

## ১৩. গুরুত্বপূর্ণ শিক্ষা — কেন কোন জিনিস ব্যবহার হলো

| জিনিস | কেন ব্যবহার হলো |
|---|---|
| `useSyncExternalStore` | React 18 concurrent mode-এ safe, tearing-free state reading |
| `module-scoped store` | JS process share করে বলে অটোমেটিক state sync |
| `ForegroundService` | Background-এ overlay চালু রাখতে |
| `TYPE_APPLICATION_OVERLAY` | System-wide floating window |
| `ReactRootView` | Native Android window-এ React Native UI render করতে |
| `AppRegistry.registerComponent` | Overlay-এর জন্য আলাদা React component tree |
| `Config Plugin + withDangerousMod` | EAS build-এ native Kotlin code survive করাতে |
| `?? -1` fallback | Kotlin null safety রক্ষা করতে |
| `nested ScrollView` | Overlay content cut off না হতে, উভয় দিকে scroll |
| `__PACKAGE__` placeholder | একই Kotlin template বিভিন্ন package নামে ব্যবহার করতে |
| `module-scope DEFAULT_TODOS` | useSyncExternalStore-এ stable reference |
| `alreadyRegistered` flag | registerOverlaySurface একবারের বেশি call হলে warning দিতে |

---

> **শেষ কথা:** PopScreen লাইব্রেরিটি দেখায় কীভাবে React Native-এর JavaScript এবং Android-এর native world একসাথে কাজ করে। সবচেয়ে চমৎকার অংশ হলো **shared state** — কোনো extra infrastructure ছাড়াই শুধু module scope ব্যবহার করে দুটো আলাদা React tree-র মধ্যে data instant sync করা যায়। এটা সম্ভব হয়েছে কারণ React Native একটি **single JavaScript process** ব্যবহার করে — main app এবং overlay উভয়েই একই process-এ চলে।
