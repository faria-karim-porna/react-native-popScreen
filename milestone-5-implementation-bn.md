# PopScreen — Milestone 5: স্টেট সিঙ্ক এবং হুক API — সম্পূর্ণ ইমপ্লিমেন্টেশন গাইড

**এই ডকুমেন্টের লক্ষ্য:** শুধুমাত্র Milestone 5-এর জন্য একটি literal, স্টেপ-বাই-স্টেপ বিল্ড গাইড, যেমনটি `docs/implementation-plan-bn.md` §২০-এ বর্ণিত আছে:

> Milestone 5 — স্টেট সিঙ্ক এবং হুক API
> `usePopScreen()` হুক, শেয়ার্ড-স্টোর প্যাটার্ন ডকুমেন্টেড এবং টেস্টেড।
> Example app 1 — Counter Floating App: increment/decrement বাটন, cross-surface স্টেট সিঙ্ক ডেমো।
> Example app 2 — Input Submit Floating App: TextInput + Submit, local overlay-surface স্টেট + IME-in-overlay ডেমো।

**এই মাইলফলক প্রকৃতপক্ষে যা প্রদান করে:** পাবলিক-ফেসিং ডেভেলপার API, যার জন্য Milestone ১–৪-এর সবকিছুই ছিল ভিত্তি। তিনটি deliverable: (১) একটি ছোট external store এবং একটি `usePopScreen()` হুক যা মূল প্ল্যানের §৯-এর "Zustand-style, no Context needed" প্যাটার্ন ইমপ্লিমেন্ট করে, দুটো স্বাধীনভাবে-মাউন্টেড RN সারফেস জুড়ে সঠিকভাবে কাজ করে তা প্রমাণিত; (২) **Counter Floating App**, যা প্রমাণ করে cross-surface স্টেট সিঙ্ক প্রকৃতপক্ষে এন্ড-টু-এন্ড কাজ করে; (৩) **Input Submit Floating App**, যা বিপরীত কেসটি প্রমাণ করে — local, শুধু-ওভারলে স্টেট — *এবং* `TYPE_APPLICATION_OVERLAY` উইন্ডোর ভেতরে টেক্সট ইনপুট ফোকাসের প্রথম আসল টেস্ট হিসেবে কাজ করে, যা Milestone 2 থেকে অব্যবহৃত পড়ে থাকা `FLAG_NOT_FOCUSABLE` toggle exercise করে।

**এই মাইলফলকটি যা *নয়়*:** drag-handle height, resize-handle size, বা minimized সাইজ/পজিশন এখানে শুধু একটি afterthought হিসেবে ডেভেলপার-কনফিগারেবল হয়ে ওঠে না — মূল প্ল্যান স্পষ্টভাবে "সম্পূর্ণ কনফিগারেবিলিটি Milestone 5-এর কাজ" এগুলোর জন্য নির্ধারণ করেছে, এবং এই গাইড এটিকে একটি আসল deliverable (Step 6) হিসেবে গণ্য করে, অপশনাল পলিশ না।

**প্রাইমারি টেস্ট ডিভাইস:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31)। এই মাইলফলকের সবচেয়ে ডিভাইস-সংবেদনশীল ঝুঁকি হলো ওভারলে উইন্ডোর সাথে IME (সফট কীবোর্ড) ইন্টারঅ্যাকশন — একটি `TYPE_APPLICATION_OVERLAY` উইন্ডোর উপরে কীবোর্ড show/hide আচরণ বিভিন্ন OEM স্কিনে ভিন্ন হতে পারে বলে জানা যায়, তাই Step 9-এর ম্যানুয়াল টেস্ট সিকোয়েন্স এখানেই চালাতে হবে, এমুলেটর আচরণ থেকে ধরে নেওয়া যাবে না।

---

## Step 0 — প্রয়োজনীয়তা (Prerequisites)

একই `popscreen` রিপোজিটরিতে চালিয়ে যান, দুটো example app-এই Milestone 4 পাস করা অবস্থায়। শুরু করার আগে নিশ্চিত করুন `setWindowRect`, `minimize()`, এবং `restore()` সবগুলো সঠিকভাবে কাজ করে, কারণ Counter এবং Input Submit অ্যাপগুলো বিদ্যমান ডেমো কনটেন্টের পাশাপাশি নতুন স্ক্রিন হিসেবে বানানো হবে, এর প্রতিস্থাপন হিসেবে না।

---

## Step 1 — মিনিমাল external store প্রিমিটিভ বানান

মূল প্ল্যানের §৯ অনুসারে, এটি "Zustand-style, no Context needed" হতে হবে — আসল `zustand` প্যাকেজ না (লাইব্রেরির জন্য একটি অতিরিক্ত রানটাইম dependency এড়িয়ে), কিন্তু একই underlying প্যাটার্ন: React-এর বাইরে স্টেট ধরে রাখা একটি plain JS closure, `subscribe`/`getSnapshot`/`setState` এক্সপোজ করে, React-এর নিজস্ব `useSyncExternalStore`-এর মাধ্যমে consumed (React 18 থেকে natively উপলভ্য, যা বর্তমানে সাপোর্টেড যেকোনো RN/Expo ভার্সনের জন্য বাস্তবিক মিনিমাম)।

**`src/createOverlayStore.ts`** তৈরি করুন:

```ts
/**
 * A minimal external store, deliberately modeled on the same
 * subscribe/getSnapshot/setState shape Zustand's vanilla store and
 * Redux both use internally — see main plan §9: "ship a usePopScreen()
 * hook backed by a tiny external store (Zustand-style, no Context
 * needed) so both surfaces subscribe to the same source of truth
 * without provider-tree gymnastics."
 *
 * Critically, this store lives at MODULE scope, not inside any React
 * component or Context — that's what makes it trivially shared between
 * the main app's RN surface and the overlay's RN surface: both surfaces
 * run in the same JS heap (per main plan §2's "single JS runtime,
 * two-surface model"), so importing this module from either surface's
 * component tree yields the exact same store instance.
 */
export function createOverlayStore<T extends Record<string, any>>(initialState: T) {
  let state = initialState;
  const listeners = new Set<() => void>();

  function getState(): T {
    return state;
  }

  function setState(partial: Partial<T> | ((prev: T) => Partial<T>)) {
    const next = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}

export type OverlayStore<T> = ReturnType<typeof createOverlayStore<T>>;
```

এটিকে React-এ ব্রিজ করা হুকটি তৈরি করুন, **`src/useExternalStore.ts`**:

```ts
import { useSyncExternalStore, useCallback } from 'react';
import { OverlayStore } from './createOverlayStore';

/**
 * Subscribes a component to a slice of an OverlayStore. Uses React's
 * native useSyncExternalStore (React 18+) rather than a manual
 * useEffect+useState subscription pattern, since useSyncExternalStore
 * is specifically designed to avoid "tearing" during concurrent
 * rendering — meaning both the main app surface and the overlay
 * surface reading from this store during the same render pass are
 * guaranteed to see a consistent snapshot, not stale or mismatched data.
 */
export function useExternalStore<T extends Record<string, any>, S>(
  store: OverlayStore<T>,
  selector: (state: T) => S
): S {
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);
  return useSyncExternalStore(store.subscribe, getSnapshot);
}
```

> **কেন আসল `zustand` npm প্যাকেজের উপর নির্ভর করা হলো না?** যেকোনো পছন্দই যুক্তিসঙ্গত, কিন্তু npm-এ পাবলিশ হতে যাওয়া এবং আর্বিট্রারি consumer অ্যাপের ভেতরে ব্যবহৃত হতে যাওয়া একটি লাইব্রেরির জন্য, PopScreen-এর নিজস্ব dependency footprint মিনিমাইজ করা consuming অ্যাপ ইতিমধ্যেই তার নিজস্ব স্টেটের জন্য যে state library (Zustand, Redux, Jotai, বা কিছুই না) ব্যবহার করছে তার সাথে ভার্সন-conflict ঝুঁকি এড়িয়ে যায়। আপনার টিম যদি সরাসরি `zustand`-এর উপর নির্ভর করতে পছন্দ করে, underlying মেকানিজমটি একই — Zustand-এর নিজস্ব vanilla store, তার নিজস্ব সোর্স অনুসারে, এই একই `subscribe`/`getState`/`setState` closure প্যাটার্ন যা `useSyncExternalStore`-এর চারপাশে wrap করা।

---

## Step 2 — একটি ডিফল্ট শেয়ার্ড স্টোরের চারপাশে `usePopScreen()` হুক বানান

**`src/usePopScreen.ts`** তৈরি করুন:

```ts
import { createOverlayStore } from './createOverlayStore';
import { useExternalStore } from './useExternalStore';
import * as PopScreenAPI from './index';

export type PopScreenSharedState = Record<string, any>;

/**
 * The default shared store both surfaces import. Library consumers can
 * read/write arbitrary keys here via usePopScreen(), without needing to
 * know this module exists — it's an implementation detail behind the
 * hook's public surface.
 *
 * Per main plan §9's caveat: this works correctly across both RN
 * surfaces NOT because of anything React-Context-like, but simply
 * because both surfaces' JS bundles import this same module instance
 * from the same JS heap. There is no provider to wrap either surface's
 * root in for this to work — that's the entire point of the "no
 * Context needed" pattern.
 */
const sharedStore = createOverlayStore<PopScreenSharedState>({});

/**
 * Subscribe to (and optionally update) a single key in the shared
 * cross-surface store. Re-renders the calling component whenever that
 * specific key's value changes, on EITHER surface — this is what makes
 * the Counter Floating App's two buttons (rendered in the overlay) able
 * to update a value the main app screen also displays, and vice versa.
 */
export function usePopScreen<T = any>(
  key: string,
  defaultValue?: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const value = useExternalStore(sharedStore, (state) =>
    key in state ? state[key] : defaultValue
  ) as T;

  const setValue = (next: T | ((prev: T) => T)) => {
    sharedStore.setState((prev) => {
      const prevValue = key in prev ? prev[key] : defaultValue;
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prevValue) : next;
      return { [key]: resolved };
    });
  };

  return [value, setValue];
}

/**
 * Escape hatch for reading/writing the shared store outside of a React
 * component — e.g. from PopScreenOverlayService event listeners, or
 * from minimizeRestore.ts (Milestone 4) if you choose to migrate its
 * module-level lastFullRect/isMinimized variables onto this same shared
 * store rather than their own separate closure. Not required for this
 * milestone's pass criteria, but worth being aware the option exists.
 */
export function getPopScreenState(): PopScreenSharedState {
  return sharedStore.getState();
}
```

**`src/index.ts`** থেকে এটি export করুন:

```ts
export { usePopScreen, getPopScreenState } from './usePopScreen';
```

---

## Step 3 — Counter Floating App বানান (Example app 1)

মূল প্ল্যান অনুসারে: "ওভারলে উইন্ডোতে একটি কাউন্ট ভ্যালু দেখাবে দুটি বাটনসহ, Increment (+) এবং Decrement (−)... কাউন্টটি একইসাথে মেইন অ্যাপ স্ক্রিন এবং ফ্লোটিং ওভারলে — দুই জায়গাতেই লাইভ re-render হয়।" **`example/demos/CounterFloatingApp.tsx`** তৈরি করুন:

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PopScreenContent, usePopScreen } from 'popscreen';

/**
 * This component is registered as the overlay's root content (see Step
 * 5). Both this component AND CounterMainAppPanel (rendered in the host
 * app's own screen, also Step 5) call usePopScreen('count', 0) against
 * the exact same shared store from Milestone 5 Step 2 — proving they
 * are genuinely the same piece of state, not two copies kept in sync
 * by some message-passing mechanism. There is no message-passing here
 * at all; that's the point.
 */
export default function CounterOverlayContent() {
  const [count, setCount] = usePopScreen<number>('count', 0);

  return (
    <PopScreenContent>
      <View style={styles.container}>
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>≡ Counter</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.countText}>{count}</Text>
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.decrementButton]}
              onPress={() => setCount((c) => c - 1)}
            >
              <Text style={styles.buttonText}>−</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.incrementButton]}
              onPress={() => setCount((c) => c + 1)}
            >
              <Text style={styles.buttonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(30,30,45,0.95)', borderRadius: 20, overflow: 'hidden' },
  dragHandle: { height: 32, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  dragHandleText: { color: '#888', fontSize: 11 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  countText: { color: 'white', fontSize: 40, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 16 },
  button: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  decrementButton: { backgroundColor: '#f87171' },
  incrementButton: { backgroundColor: '#4ade80' },
  buttonText: { color: 'white', fontSize: 24, fontWeight: '700' },
});
```

main-app-সাইডের counterpart তৈরি করুন, **`example/demos/CounterMainAppPanel.tsx`** — ইচ্ছাকৃতভাবে একটি আলাদা ফাইল/কম্পোনেন্ট, host অ্যাপের নিজস্ব স্ক্রিনে রেন্ডার করা, টেস্টিংয়ের সময় সিঙ্কের cross-surface প্রকৃতি স্পষ্ট করার জন্য:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePopScreen } from 'popscreen';

export default function CounterMainAppPanel() {
  const [count] = usePopScreen<number>('count', 0);

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Main app sees count as:</Text>
      <Text style={styles.value}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', padding: 10, backgroundColor: '#1e293b', borderRadius: 10 },
  label: { color: '#94a3b8', fontSize: 12 },
  value: { color: 'white', fontSize: 24, fontWeight: '700' },
});
```

---

## Step 4 — Input Submit Floating App বানান (Example app 2)

মূল প্ল্যান অনুসারে: "একটি single-line `TextInput` এবং একটি Submit বাটন; বাটনের নিচে, একটি লিস্ট প্রতিটি আগের সাবমিট করা ভ্যালু রেন্ডার করবে... যা সবই local overlay-surface স্টেটে সংরক্ষিত থাকবে... শেয়ার্ড cross-surface store-এ না, কারণ সাবমিশনগুলো bubble-এর নিজের মধ্যেই সীমাবদ্ধ।" **`example/demos/InputSubmitFloatingApp.tsx`** তৈরি করুন:

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { PopScreenContent } from 'popscreen';

/**
 * Deliberately uses plain useState, NOT usePopScreen() — per the main
 * plan, "submissions are scoped to the bubble itself," proving the
 * inverse case from the Counter app: local component state living
 * entirely inside the overlay ReactSurface, with zero main-app
 * involvement, works exactly as it would on a normal RN screen.
 *
 * This component is ALSO this milestone's first real test of text
 * input focus inside a TYPE_APPLICATION_OVERLAY window — the
 * FLAG_NOT_FOCUSABLE flag set back in Milestone 2's WindowManager.
 * LayoutParams has been sitting unused until a real TextInput exists
 * to actually request focus and trigger the soft keyboard. See Step 9
 * for the manual IME test sequence this enables.
 */
export default function InputSubmitOverlayContent() {
  const [draft, setDraft] = useState('');
  const [submissions, setSubmissions] = useState<string[]>([]);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    setSubmissions((prev) => [trimmed, ...prev]); // most recent at top
    setDraft('');
  };

  return (
    <PopScreenContent>
      <View style={styles.container}>
        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>≡ Input Submit</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type something…"
              placeholderTextColor="#666"
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
            />
            <Pressable style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </Pressable>
          </View>

          <FlatList
            style={styles.list}
            data={submissions}
            keyExtractor={(item, index) => `${index}-${item}`}
            renderItem={({ item }) => (
              <Text style={styles.listItem}>• {item}</Text>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No submissions yet</Text>}
          />
        </View>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(30,30,45,0.95)', borderRadius: 20, overflow: 'hidden' },
  dragHandle: { height: 32, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  dragHandleText: { color: '#888', fontSize: 11 },
  content: { flex: 1, padding: 10, gap: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  submitButton: { backgroundColor: '#60a5fa', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' },
  submitButtonText: { color: '#0a1a2e', fontWeight: '700' },
  list: { flex: 1, marginTop: 4 },
  listItem: { color: '#cbd5e1', fontSize: 13, paddingVertical: 3 },
  emptyText: { color: '#666', fontSize: 12, fontStyle: 'italic' },
});
```

---

## Step 5 — দুটো ডেমোই example app-এর সারফেস রেজিস্ট্রেশন এবং নেভিগেশনে wire করুন

**`example/index.js`** আপডেট করুন — যেহেতু `registerOverlaySurface` (Milestone 2-এ বানানো) শুধুমাত্র একটি single রেজিস্টার্ড সারফেস সাপোর্ট করে, এই মাইলফলকের একটি উপায় প্রয়োজন কোন ডেমোর কনটেন্ট বর্তমানে ওভারলেতে দেখানো হচ্ছে তা সুইচ করার জন্য, পুনরায়-রেজিস্টার না করে। একটি ছোট demo-selection লেয়ার যুক্ত করুন:

```js
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import OverlaySwitcher from './OverlaySwitcher';

registerRootComponent(App);
registerOverlaySurface(OverlaySwitcher);
```

**`example/OverlaySwitcher.tsx`** তৈরি করুন — ওভারলের root হিসেবে আসলে রেজিস্টার্ড একমাত্র কম্পোনেন্ট, যা Step 2-এ বানানো শেয়ার্ড স্টোর থেকে কোন ডেমোটি অ্যাক্টিভ তা পড়ে এবং সংশ্লিষ্ট ডেমো রেন্ডার করে:

```tsx
import React from 'react';
import { usePopScreen } from 'popscreen';
import CounterOverlayContent from './demos/CounterFloatingApp';
import InputSubmitOverlayContent from './demos/InputSubmitFloatingApp';

export default function OverlaySwitcher() {
  const [activeDemo] = usePopScreen<'counter' | 'inputSubmit'>('activeDemo', 'counter');

  if (activeDemo === 'inputSubmit') {
    return <InputSubmitOverlayContent />;
  }
  return <CounterOverlayContent />;
}
```

> **খেয়াল করুন এই demo-switcher নিজেই `usePopScreen()` ব্যবহার করে বানানো** — Counter app-এর নিজস্ব count value-এর বাইরে হুকের একটি ছোট কিন্তু আসল real-world ব্যবহার, কোন ওভারলে UI দেখানো হবে তা শেয়ার্ড স্টেট-এর উপর ভিত্তি করে সুইচ করে, যা main app নিয়ন্ত্রণ করে।

ডেমো-সুইচিং কন্ট্রোল এবং Counter-এর main-app-সাইড প্যানেল যুক্ত করতে **`example/App.tsx`** আপডেট করুন:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as PopScreen from 'popscreen';
import { usePopScreen } from 'popscreen';
import CounterMainAppPanel from './demos/CounterMainAppPanel';

export default function App() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [activeDemo, setActiveDemo] = usePopScreen<'counter' | 'inputSubmit'>('activeDemo', 'counter');

  useEffect(() => {
    PopScreen.hasOverlayPermission().then(setHasPermission);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen — Milestone 5 Verification</Text>
      <Text>Overlay permission: {String(hasPermission)}</Text>

      <View style={styles.demoSwitch}>
        <Button title="Counter Demo" onPress={() => setActiveDemo('counter')} />
        <Button title="Input Submit Demo" onPress={() => setActiveDemo('inputSubmit')} />
      </View>
      <Text>Active demo: {activeDemo}</Text>

      {activeDemo === 'counter' && <CounterMainAppPanel />}

      <Button title="Request Overlay Permission" onPress={() => PopScreen.requestOverlayPermission()} />
      <Button title="Show Overlay" onPress={() => PopScreen.show()} />
      <Button title="Hide Overlay" onPress={() => PopScreen.hide()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  demoSwitch: { flexDirection: 'row', gap: 10 },
});
```

---

## Step 6 — drag-handle height, resize-handle size, এবং minimized সাইজ ডেভেলপার-কনফিগারেবল করুন

Milestone 3 এবং 4-এর স্পষ্টভাবে প্রতিশ্রুত পাবলিক-API-চূড়ান্তকরণ কাজ এটিই। configuration props গ্রহণ করতে **`src/PopScreenContent.tsx`** আপডেট করুন:

```tsx
import React, { useEffect } from 'react';
import PopScreenModule from './PopScreenModule';

type PopScreenContentProps = {
  children: React.ReactNode;
  dragHandleHeight?: number; // in dp; defaults to native's DRAG_HANDLE_HEIGHT_DP
  resizeHandleSize?: number; // in dp; defaults to native's RESIZE_HANDLE_SIZE_DP
};

export default function PopScreenContent({
  children,
  dragHandleHeight,
  resizeHandleSize,
}: PopScreenContentProps) {
  useEffect(() => {
    if (dragHandleHeight !== undefined || resizeHandleSize !== undefined) {
      PopScreenModule.setHandleDimensions(dragHandleHeight, resizeHandleSize);
    }
  }, [dragHandleHeight, resizeHandleSize]);

  return <>{children}</>;
}
```

**`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`**-এ সংশ্লিষ্ট নেটিভ ফাংশন যুক্ত করুন:

```kotlin
AsyncFunction("setHandleDimensions") { dragHandleHeightDp: Double?, resizeHandleSizeDp: Double? ->
  PopScreenOverlayService.activeInstance?.setHandleDimensions(dragHandleHeightDp, resizeHandleSizeDp)
}
```

এবং **`PopScreenOverlayService.kt`**-এ, একটি মেথড যুক্ত করুন যা লাইভ ইন্টারসেপ্টরের handle dimension আপডেট করে (এর জন্য `PopScreenTouchInterceptorView`-কে এর আগে `val`/constructor-only `dragHandleHeightPx`/`resizeHandleSizePx` ফিল্ডগুলোর জন্য setter মেথড দিতে হবে — এটি সাপোর্ট করতে `PopScreenTouchInterceptorView.kt`-এ এই দুটি প্রপার্টিকে `val` থেকে `var`-এ পরিবর্তন করুন):

```kotlin
fun setHandleDimensions(dragHandleHeightDp: Double?, resizeHandleSizeDp: Double?) {
    val density = resources.displayMetrics.density
    dragHandleHeightDp?.let {
        interceptorView?.dragHandleHeightPx = (it * density).toInt()
    }
    resizeHandleSizeDp?.let {
        interceptorView?.resizeHandleSizePx = (it * density).toInt()
    }
}
```

একইভাবে, **`src/minimizeRestore.ts`**-এ `minimize()`-এর নিজের উপরই minimized সাইজ/পজিশন একটি কনফিগারেবল অপশন হিসেবে এক্সপোজ করুন (Milestone 4-এর ভার্সনটি extend করে, এর মূল লজিক প্রতিস্থাপন না করে):

```ts
type MinimizeOptions = {
  width?: number;
  height?: number;
};

export async function minimize(
  currentRect?: { x: number; y: number; width: number; height: number },
  options?: MinimizeOptions
) {
  if (isMinimized) return;
  if (currentRect) lastFullRect = currentRect;
  isMinimized = true;

  const width = options?.width ?? MINIMIZED_SIZE.width;
  const height = options?.height ?? MINIMIZED_SIZE.height;

  await PopScreenModule.setWindowRect(undefined, undefined, width, height);
}
```

---

## Step 7 — লাইব্রেরি consumer-দের জন্য শেয়ার্ড-স্টোর প্যাটার্ন ডকুমেন্ট করুন

লাইব্রেরি রিপোজিটরির ভেতরে **`docs/state-sync.md`** তৈরি করুন (প্রজেক্টের প্ল্যানিং `docs/implementation-plan.md` থেকে আলাদা) — এটি মূল প্ল্যানের "শেয়ার্ড-স্টোর প্যাটার্ন ডকুমেন্টেড এবং টেস্টেড" অনুসারে একটি আসল deliverable:

```markdown
# State Sync with PopScreen

PopScreen renders your overlay content as a *second, independent* React
Native surface alongside your main app screen. They share the same JS
engine, but are separate component trees with separate roots — so React
Context providers wrapped around one will not be visible to the other.

## Sharing state between your app and the overlay

Use the `usePopScreen(key, defaultValue)` hook anywhere in either
surface. Both surfaces reading/writing the same key are reading/writing
the exact same underlying value — there is no synchronization delay,
network call, or serialization step involved; it's the same in-memory
store, because both surfaces run in the same JS process.

\`\`\`tsx
// In your overlay content:
const [count, setCount] = usePopScreen('count', 0);

// In your main app screen:
const [count] = usePopScreen('count', 0);
\`\`\`

## Keeping state LOCAL to the overlay

If state should only exist inside your floating bubble — form drafts,
scroll position, anything not meaningful to your main app — just use
ordinary `useState`/`useReducer` inside your `<PopScreenContent>` tree,
exactly as you would on any other screen. Don't route everything through
`usePopScreen()` by default; only use it for state that genuinely needs
to be visible from both surfaces.
```

---

## Step 8 — POCO M3-এ বিল্ড এবং রান করুন, দুটো example app-ই

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

পুরোনো-আর্কিটেকচার example app-এর জন্যও একই পুনরাবৃত্তি করুন।

---

## Step 9 — ম্যানুয়াল টেস্ট সিকোয়েন্স (দুটো অ্যাপের জন্যই পুনরাবৃত্তি করুন)

**Counter cross-surface সিঙ্ক:**

১. Counter ডেমো অ্যাক্টিভ অবস্থায় ওভারলে দেখান। নিশ্চিত করুন ওভারলের count এবং main app-এর "Main app sees count as:" প্যানেল দুটোই একই শুরুর ভ্যালু দেখাচ্ছে (0)।
২. ওভারলেতে **+**-এ কয়েকবার ট্যাপ করুন। নিশ্চিত করুন ওভারলের count বাড়ে এবং main app-এর প্যানেল মিলিয়ে আপডেট হয়, লাইভ, কোনো দৃশ্যমান বিলম্ব ছাড়াই।
৩. main app-এর বাটনের মাধ্যমে Input Submit ডেমোতে সুইচ করুন, তারপর আবার Counter-এ ফিরে যান। নিশ্চিত করুন count ভ্যালুটি সংরক্ষিত ছিল (যেহেতু এটি শেয়ার্ড স্টোরে থাকে, local স্টেটে না যা unmount হয়ে যেত)।

**Input Submit local স্টেট এবং IME-in-overlay:**

৪. Input Submit ডেমোতে সুইচ করুন। ওভারলের ভেতরের টেক্সট ইনপুটে ট্যাপ করুন। **এটিই গুরুত্বপূর্ণ টেস্ট:** নিশ্চিত করুন Android সফট কীবোর্ড সঠিকভাবে দেখা যায়, এবং নিশ্চিত করুন আপনি আসলেই ফিল্ডে টাইপ করতে পারেন (শুধু একটি cursor দেখা যাচ্ছে এমন না, কোনো ইনপুট রেজিস্টার না হয়ে)।
৫. একটি ছোট ভ্যালু টাইপ করুন, **Submit**-এ ট্যাপ করুন। নিশ্চিত করুন এটি নিচের লিস্টে দেখা যাচ্ছে, এবং ইনপুট ফিল্ড পরিষ্কার হয়ে যাচ্ছে।
৬. আরও দুই-তিনটি ভ্যালু সাবমিট করুন। নিশ্চিত করুন প্রতিটি প্রত্যাশিত ক্রমে লিস্টে দেখা যাচ্ছে (এই গাইডের ইমপ্লিমেন্টেশন অনুসারে সবচেয়ে নতুনটি প্রথমে)।
৭. কীবোর্ড dismiss করুন (back বাটন বা ইনপুটের বাইরে ট্যাপ করে)। নিশ্চিত করুন ওভারলে উইন্ডো নিজেই স্থিতিশীল থাকে — কীবোর্ড দেখা/অদৃশ্য হওয়ার সময় কোনো resizing, jumping, বা crash না।
৮. **নিশ্চিত করুন IME main app-এ leak করে না:** ওভারলের কীবোর্ড খোলা থাকা অবস্থায়, চেক করুন host অ্যাপের নিজস্ব স্ক্রিন/কীবোর্ড স্টেট প্রভাবিত হয় না — ওভারলেতে টাইপ করা main app-এ কোনোভাবে ফোকাস পরিবর্তন প্রভাবিত বা প্রয়োজন করা উচিত না।
৯. কীবোর্ড খোলা থাকা অবস্থায় (drag handle ব্যবহার করে) ওভারলে উইন্ডোটি drag করুন। নিশ্চিত করুন এটি কীবোর্ডের visibility বা ইনপুটের ফোকাস অপ্রত্যাশিতভাবে না ভেঙে এখনও কাজ করে।

**সাধারণ রিগ্রেশন চেক:**

১০. Counter ডেমো অ্যাক্টিভ থাকা অবস্থায়, আগের মাইলফলকের মতো ওভারলে drag এবং resize করুন — নিশ্চিত করুন ভেতরে নতুন `usePopScreen`-driven কনটেন্ট সহ Milestone ৩–৪-এর window mechanics এখনও সঠিকভাবে কাজ করে।

---

## Step 10 — পাস / ফেইল মানদণ্ড

এই মাইলফলকটি **PASS** হবে শুধুমাত্র যদি নিচের সবগুলো সত্য হয়, **New Architecture এবং পুরোনো-আর্কিটেকচার দুটো example app-এই**:

- [ ] Counter Floating App-এর `+`/`−` বাটন ওভারলে সারফেস এবং main app-এর নিজস্ব স্ক্রিন—দুটোতেই দৃশ্যমান একটি ভ্যালু আপডেট করে, লাইভ, দুটো reads-ই ঠিক একই `usePopScreen('count', 0)` কলের মাধ্যমে — দুটো আলাদাভাবে-sync করা কপি না।
- [ ] Input Submit Floating App-এর টেক্সট ইনপুট `TYPE_APPLICATION_OVERLAY` উইন্ডোর ভেতরে সঠিকভাবে ফোকাস পায় এবং টাইপ করা ইনপুট গ্রহণ করে, Android সফট কীবোর্ড স্বাভাবিকভাবে দেখা যায় এবং কাজ করে।
- [ ] Input Submit অ্যাপে সাবমিট করা ভ্যালুগুলো local component স্টেটে সঠিকভাবে persist করে এবং `usePopScreen()` বা কোনো শেয়ার্ড store মেকানিজমের মাধ্যমে দৃশ্যমান **না** — চেক করে নিশ্চিত করুন যে ডেমো সুইচ করে আবার ফিরে আসলে সাবমিশনগুলো সংরক্ষিত থাকে না (যেহেতু এগুলো local `useState`, demo switcher-এর মাধ্যমে `InputSubmitOverlayContent` unmount হলে এগুলো রিসেট হওয়া উচিত)।
- [ ] `<PopScreenContent>`-এ `dragHandleHeight`/`resizeHandleSize` props সঠিকভাবে নেটিভ ইন্টারসেপ্টরের আসল hit-test অঞ্চল পরিবর্তন করে, শুধু একটি ভিজুয়াল ইন্ডিকেটর না — একটি লক্ষণীয়ভাবে ভিন্ন ভ্যালু পাস করে এবং draggable/resizable অঞ্চলের আসল সাইজ সেই অনুসারে পরিবর্তিত হচ্ছে কিনা নিশ্চিত করে ভেরিফাই করুন।
- [ ] বিশেষভাবে POCO M3-এ Input Submit টেস্ট সিকোয়েন্স চলাকালীন কোনো crash, ANR, বা IME-সংক্রান্ত glitch (কীবোর্ড দেখা না যাওয়া, কীবোর্ড খোলার সময় উইন্ডো অপ্রত্যাশিতভাবে resize হওয়া, বা ভুল সারফেস দ্বারা ফোকাস চুরি হওয়া) ঘটে না।
- [ ] `docs/state-sync.md` (বা সমতুল্য) উপস্থিত এবং শেয়ার্ড এবং local স্টেট প্যাটার্ন দুটোই সঠিকভাবে বর্ণনা করে, কারণ মূল প্ল্যান স্পষ্টভাবে দাবি করে এই প্যাটার্ন "ডকুমেন্টেড এবং টেস্টেড" হতে হবে, শুধু ইমপ্লিমেন্টেড না।

Step 9-এর IME টেস্টে যদি গুরুতর সমস্যা প্রকাশ পায় (কীবোর্ড না আসা, কীবোর্ড খোলা/বন্ধ হওয়ার সময় উইন্ডো অস্থিতিশীলতা), এটিকে চুপচাপ workaround করার মতো কিছু হিসেবে গণ্য করবেন না — Android-এর IME-over-overlay-window ইন্টারঅ্যাকশন একটি পরিচিত কঠিন এলাকা বলে এটি আসল clarification লিস্টে স্পষ্টভাবে একটি খোলা প্রশ্ন হিসেবে ফ্ল্যাগ করা হয়েছিল ঠিক এই কারণেই; Milestone 6-এ অগ্রসর হওয়ার আগে নির্দিষ্ট ব্যর্থতার মোডটি স্পষ্টভাবে ডকুমেন্ট করুন, কারণ Milestone 6-এর লাইফসাইকেল হার্ডেনিং কাজে এখানে আবিষ্কৃত যেকোনো IME সীমাবদ্ধতা বিবেচনায় নেওয়া উচিত, পরে এতে অপ্রস্তুতভাবে আক্রান্ত হওয়ার বদলে।

---

## এই মাইলফলক ইচ্ছাকৃতভাবে যা অন্তর্ভুক্ত করে না (পরবর্তী মাইলফলকের জন্য রাখা হয়েছে)

- Milestone ১–২ ইতিমধ্যে যা বানিয়েছে তার বাইরে পারমিশন revocation হ্যান্ডলিং, প্রসেস-ডেথ আচরণ হার্ডেনিং, এবং OEM ব্যাকগ্রাউন্ড-কিল স্ট্রেস টেস্টিং (Milestone 6)।
- Snap-to-edge (এখনও v1.1, এই মাইলফলকের কাজে প্রভাবিত না)।
- অ্যাপ রিস্টার্ট জুড়ে `usePopScreen()` স্টেটের কোনো persistence (যেমন AsyncStorage/MMKV-তে) — এই মাইলফলকে বানানো শেয়ার্ড স্টোরটি সম্পূর্ণভাবে in-memory, মূল প্ল্যানের "single JS runtime" মডেলের সাথে সামঞ্জস্যপূর্ণ; cross-restart persistence কখনো v1 স্কোপের অংশ ছিল না এবং এখানে চুপচাপ যুক্ত করা হয়নি।
- হুক এবং স্টোরের জন্য ব্যাপক Jest unit test কভারেজ (সম্পূর্ণ টেস্ট কভারেজ Milestone 7-এর কাজ) — এই মাইলফলকের "টেস্টেড" বলতে Step 9-এর ম্যানুয়াল টেস্ট সিকোয়েন্স আসলেই চালানো এবং পাস করা বোঝায়, automated test suite না।

---

*Milestone 5 গাইডের সমাপ্তি। দুটো আর্কিটেকচার পাথেই একটি ক্লিন PASS-এর পর, মূল implementation plan-এ (`docs/implementation-plan-bn.md`) Milestone 6-এ অগ্রসর হন, যা পারমিশন revocation, প্রসেস-ডেথ আচরণ, এবং OEM ব্যাকগ্রাউন্ড-কিল resilience হার্ডেন করবে — প্রাইমারি স্ট্রেস-টেস্ট ডিভাইস হিসেবে POCO M3 ব্যবহার করে — এই মাইলফলক যে এখন-সম্পূর্ণ পাবলিক API প্রদান করেছে তার উপরে।*
