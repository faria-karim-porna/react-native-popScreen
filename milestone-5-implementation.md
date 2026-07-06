# PopScreen — Milestone 5: State Sync & Hook API — Full Implementation Guide

**Goal of this document:** a literal, step-by-step build guide for Milestone 5 only, as described in `docs/implementation-plan.md` §20:

> Milestone 5 — State Sync & Hook API
> `usePopScreen()` hook, shared-store pattern documented and tested.
> Example app 1 — Counter Floating App: increment/decrement buttons, cross-surface state sync demo.
> Example app 2 — Input Submit Floating App: TextInput + Submit, local overlay-surface state + IME-in-overlay demo.

**What this milestone delivers, concretely:** the public-facing developer API that everything from Milestones 1–4 was infrastructure *for*. Three deliverables: (1) a tiny external store plus a `usePopScreen()` hook implementing the main plan's §9 "Zustand-style, no Context needed" pattern, proven to work correctly across the two independently-mounted RN surfaces; (2) the **Counter Floating App**, proving cross-surface state sync genuinely works end-to-end; (3) the **Input Submit Floating App**, proving the opposite case — local, overlay-only state — *and* serving as the first real test of text input focus inside a `TYPE_APPLICATION_OVERLAY` window, which exercises the `FLAG_NOT_FOCUSABLE` toggle that's been sitting unused since Milestone 2.

**What this milestone is NOT:** this is not where drag-handle height, resize-handle size, or minimized size/position become developer-configurable purely as an afterthought — the main plan explicitly assigns "full configurability is Milestone 5's job" to those, and this guide treats that as a real deliverable (Step 6), not optional polish.

**Primary test device:** Xiaomi POCO M3 (MIUI 14, Android 12, API 31). This milestone's most device-sensitive risk is the IME (soft keyboard) interaction with the overlay window — keyboard show/hide behavior over a `TYPE_APPLICATION_OVERLAY` window is known to vary across OEM skins, so Step 9's manual test sequence must be run here, not assumed from emulator behavior.

---

## Step 0 — Prerequisites

Continue in the same `popscreen` repository, with Milestone 4 passing on both example apps. Confirm `setWindowRect`, `minimize()`, and `restore()` all work correctly before starting, since the Counter and Input Submit apps will be built as new screens alongside the existing demo content, not replacements for it.

---

## Step 1 — Build the minimal external store primitive

Per the main plan's §9, this needs to be "Zustand-style, no Context needed" — not actually the `zustand` package (avoiding an extra runtime dependency for the library), but the same underlying pattern: a plain JS closure holding state outside React, exposing `subscribe`/`getSnapshot`/`setState`, consumed via React's own `useSyncExternalStore` (available natively since React 18, which is the realistic minimum for any currently-supported RN/Expo version).

Create **`src/createOverlayStore.ts`**:

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

Create the hook that bridges this into React, **`src/useExternalStore.ts`**:

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

> **Why not just depend on the real `zustand` npm package?** Either choice is defensible, but for a library meant to be published to npm and used inside arbitrary consumer apps, minimizing PopScreen's own dependency footprint avoids version-conflict risk with whatever state library (Zustand, Redux, Jotai, or nothing) the consuming app already uses for its own state. If your team prefers depending on `zustand` directly, the underlying mechanism is the same — Zustand's own vanilla store is, per its own source, this same `subscribe`/`getState`/`setState` closure pattern wrapped around `useSyncExternalStore`.

---

## Step 2 — Build the `usePopScreen()` hook around a default shared store

Create **`src/usePopScreen.ts`**:

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

Export it from **`src/index.ts`**:

```ts
export { usePopScreen, getPopScreenState } from './usePopScreen';
```

---

## Step 3 — Build the Counter Floating App (Example app 1)

Per the main plan: "the overlay window shows a count value with two buttons, Increment (+) and Decrement (−)... the count re-renders live in both the main app screen and the floating overlay simultaneously." Create **`example/demos/CounterFloatingApp.tsx`**:

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

Create the main-app-side counterpart, **`example/demos/CounterMainAppPanel.tsx`** — deliberately a separate file/component, rendered on the host app's own screen, to make the cross-surface nature of the sync unmistakable during testing:

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

## Step 4 — Build the Input Submit Floating App (Example app 2)

Per the main plan: "a single-line `TextInput` and a Submit button; below the button, a list renders each previously submitted value... all stored in local overlay-surface state... not in the shared cross-surface store, since submissions are scoped to the bubble itself." Create **`example/demos/InputSubmitFloatingApp.tsx`**:

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

## Step 5 — Wire both demos into the example app's surface registration and navigation

Update **`example/index.js`** — since `registerOverlaySurface` (built in Milestone 2) only supports a single registered surface, this milestone needs a way to switch which demo's content is currently shown in the overlay without re-registering. Add a tiny demo-selection layer:

```js
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import OverlaySwitcher from './OverlaySwitcher';

registerRootComponent(App);
registerOverlaySurface(OverlaySwitcher);
```

Create **`example/OverlaySwitcher.tsx`** — the single component actually registered as the overlay's root, which reads which demo is active from the shared store built in Step 2 and renders the corresponding demo:

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

> **Note this demo-switcher itself is built using `usePopScreen()`** — a small but genuine real-world usage of the hook beyond the Counter app's own count value, switching which overlay UI is shown based on shared state the main app's screen controls.

Update **`example/App.tsx`** to add demo-switching controls and the Counter's main-app-side panel:

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

## Step 6 — Make drag-handle height, resize-handle size, and minimized size developer-configurable

This is the public-API-finalization work explicitly promised by Milestones 3 and 4. Update **`src/PopScreenContent.tsx`** to accept configuration props:

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

Add the corresponding native function in **`android/src/main/java/expo/modules/popscreen/PopScreenModule.kt`**:

```kotlin
AsyncFunction("setHandleDimensions") { dragHandleHeightDp: Double?, resizeHandleSizeDp: Double? ->
  PopScreenOverlayService.activeInstance?.setHandleDimensions(dragHandleHeightDp, resizeHandleSizeDp)
}
```

And in **`PopScreenOverlayService.kt`**, add a method that updates the live interceptor's handle dimensions (requires giving `PopScreenTouchInterceptorView` setter methods for its previously `val`/constructor-only `dragHandleHeightPx`/`resizeHandleSizePx` fields — change those two properties from `val` to `var` in `PopScreenTouchInterceptorView.kt` to support this):

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

Similarly, expose minimized size/position as a configurable option on `minimize()` itself in **`src/minimizeRestore.ts`** (extending Milestone 4's version rather than replacing its core logic):

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

## Step 7 — Document the shared-store pattern for library consumers

Create **`docs/state-sync.md`** inside the library repository (distinct from the project's planning `docs/implementation-plan.md`) — this is a real deliverable per the main plan's "shared-store pattern documented and tested":

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

## Step 8 — Build and run on the POCO M3, both example apps

```bash
cd example
npx expo prebuild --platform android --clean
npx expo run:android --device
```

Repeat for the old-architecture example app.

---

## Step 9 — Manual test sequence (repeat for both apps)

**Counter cross-surface sync:**

1. Show the overlay with the Counter demo active. Confirm both the overlay's count and the main app's "Main app sees count as:" panel show the same starting value (0).
2. Tap **+** in the overlay several times. Confirm the overlay's count increases AND the main app's panel updates to match, live, with no visible delay.
3. Switch to the Input Submit demo via the main app's button, then switch back to Counter. Confirm the count value was preserved (since it lives in the shared store, not local state that would have been unmounted).

**Input Submit local state and IME-in-overlay:**

4. Switch to the Input Submit demo. Tap the text input inside the overlay. **This is the critical test:** confirm the Android soft keyboard appears correctly, and confirm you can actually type into the field (not just see a cursor with no input registering).
5. Type a short value, tap **Submit**. Confirm it appears in the list below, and the input field clears.
6. Submit two or three more values. Confirm each appears in the list in the expected order (most recent first, per this guide's implementation).
7. Dismiss the keyboard (back button or tapping outside the input). Confirm the overlay window itself remains stable — no resizing, jumping, or crash when the keyboard appears/disappears.
8. **Confirm IME does not leak into the main app:** while the overlay's keyboard is open, check that the host app's own screen/keyboard state is unaffected — typing in the overlay should not somehow also affect or require focus changes in the main app.
9. Drag the overlay window (using the drag handle) while the keyboard is open. Confirm this still works without breaking the keyboard's visibility or the input's focus unexpectedly.

**General regression check:**

10. With the Counter demo active, drag and resize the overlay as in previous milestones — confirm window mechanics from Milestones 3–4 still work correctly with the new `usePopScreen`-driven content inside.

---

## Step 10 — Pass / fail criteria

This milestone is a **PASS** only if all of the following are true, **on both the New Architecture and old-architecture example apps**:

- [ ] The Counter Floating App's `+`/`−` buttons update a value visible on both the overlay surface and the main app's own screen, live, with both reads going through the exact same `usePopScreen('count', 0)` call — not two separately-synced copies.
- [ ] The Input Submit Floating App's text input correctly receives focus and accepts typed input inside the `TYPE_APPLICATION_OVERLAY` window, with the Android soft keyboard appearing and functioning normally.
- [ ] Submitted values in the Input Submit app persist correctly in local component state and are NOT visible through `usePopScreen()` or any shared store mechanism — confirm this by checking that switching demos and back does not preserve submissions (since they're local `useState`, they should reset when `InputSubmitOverlayContent` unmounts via the demo switcher).
- [ ] `dragHandleHeight`/`resizeHandleSize` props on `<PopScreenContent>` correctly change the native interceptor's actual hit-test regions, not just a visual indicator — verify by passing a noticeably different value and confirming the draggable/resizable area's actual size changes accordingly.
- [ ] No crash, ANR, or IME-related glitch (keyboard failing to appear, window resizing unexpectedly when the keyboard opens, or focus being stolen by the wrong surface) occurs during the Input Submit test sequence on the POCO M3 specifically.
- [ ] `docs/state-sync.md` (or equivalent) exists and accurately describes both the shared and local state patterns, since the main plan explicitly requires this pattern to be "documented and tested," not just implemented.

If the IME tests in Step 9 reveal serious problems (keyboard not appearing, window instability when the keyboard opens/closes), do not treat this as something to silently work around — this was flagged as an open question in the original clarification list precisely because Android's IME-over-overlay-window interaction is a known difficult area; document the specific failure mode clearly before proceeding to Milestone 6, since Milestone 6's lifecycle hardening work should account for whatever IME limitations are discovered here rather than being blindsided by them later.

---

## What this milestone deliberately does NOT include (left for later milestones)

- Permission revocation handling beyond what Milestones 1–2 already built, process-death behavior hardening, and OEM background-kill stress testing (Milestone 6).
- Snap-to-edge (still v1.1, unaffected by this milestone's work).
- Any persistence of `usePopScreen()` state across app restarts (e.g. to AsyncStorage/MMKV) — the shared store built in this milestone is purely in-memory, matching the main plan's "single JS runtime" model; cross-restart persistence was never part of the v1 scope and is not silently added here.
- Comprehensive Jest unit test coverage for the hook and store (full test coverage is Milestone 7's job) — this milestone's "tested" refers to the manual test sequence in Step 9 actually being run and passing, not automated test suites.

---

*End of Milestone 5 guide. On a clean PASS on both architecture paths, proceed to Milestone 6 in the main implementation plan (`docs/implementation-plan.md`), which hardens permission revocation, process-death behavior, and OEM background-kill resilience — using the POCO M3 as the primary stress-test device — on top of the now-complete public API this milestone delivered.*
