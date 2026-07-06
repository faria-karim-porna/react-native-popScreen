# PopScreen — Implementation Plan

**Android-only floating overlay library for React Native (Expo) apps**
*(YouTube PiP / Messenger chat-bubble style, generic native layer, RN-driven UI)*

> **Locked-in decisions (confirmed by project owner):**
> - **Target devices:** `minSdkVersion 26` (Android 8.0), `targetSdkVersion`/`compileSdkVersion` tracking latest stable Android. Confirmed against a Xiaomi POCO M3 (codename `citrus`) as the primary dev/test device — this device shipped on Android 10 and was updated to its final official version, **MIUI 14 / Android 12 (API 31)**, before reaching end-of-life with no further OS updates. API 26+ comfortably covers it on the low end; no legacy `TYPE_PHONE` fallback is needed. Because this device is MIUI-based (one of the most aggressive OEMs for background/battery-kill behavior), it is also adopted as the **canonical "worst case" OEM test device** for §16 Testing Strategy and §18 Risks.
> - **Architecture support:** Support **both old and new React Native architecture** (not Fabric-only), to maximize compatibility for third-party npm consumers who may not yet be on the New Architecture.
> - **Distribution:** Publish to **npm for third-party use** — standalone module scaffold (`create-expo-module` without `--local`), generic/configurable public API, semver compatibility matrix.
> - **v1 feature scope:** **Drag + resize + minimize/restore**, no snap-to-edge in v1 (candidate for v1.1).
>
> These decisions are reflected throughout the document below and removed from the open-questions list at the end.

---

## 1. Feasibility Analysis

**Verdict: Yes, this is technically possible**, and the architecture you described (generic Kotlin shell + RN-controlled UI) is in fact the *correct* and *only* clean way to build this. It's the same pattern used by libraries like `react-native-android-overlay` and is conceptually identical to how Messenger's bubbles work under the hood.

### The key question: can RN render directly into a system overlay window?

**No — and this is the most important architectural fact in this whole document.** React Native does not have a rendering mode that targets a `WindowManager` overlay surface directly from JavaScript. RN always renders into a `View` subclass:

- Old architecture: `ReactRootView`
- New architecture (Fabric): a `ReactSurface` / `ReactSurfaceView`, ultimately still backed by a `View`

What *is* true is that **any Android `View` — including a `ReactRootView`/Fabric surface — can be attached to a system-level window** via:

```kotlin
windowManager.addView(reactRootView, layoutParams)
```

where `layoutParams.type = TYPE_APPLICATION_OVERLAY` (API 26+) and the app holds the `SYSTEM_ALERT_WINDOW` ("draw over other apps") permission.

So the real architecture is:

> **Native Kotlin hosts a second window. React Native renders normally (it doesn't know or care it's in an overlay window). Kotlin just relocates the RN view tree's container into that window instead of the Activity's window.**

This means:
- ✅ The Kotlin layer can be **fully generic** — it never inspects RN's component tree, never knows about buttons, business logic, or app-specific state. It only manages a window + a view container + lifecycle/drag/resize chrome around it.
- ✅ All UI logic, layout, styling, animation, and interaction logic stays 100% in React Native/JS.
- ✅ Kotlin's only "UI update" responsibility is: *"a RN root view's content changed — make sure the window draws the new frames."* In practice this requires almost no action from Kotlin at all, because once a `ReactRootView` is attached to a window, **RN's own UI updates render directly into that window automatically** — there is no discrete "push new UI to native" step needed for ordinary re-renders. Kotlin's real job is window lifecycle (create/destroy/resize/position), not frame-by-frame UI diffing.

### What is NOT possible / hard constraints

- **iOS cannot do this.** iOS has no equivalent of `TYPE_APPLICATION_OVERLAY` / a system alert window API available to third-party apps. PiP on iOS is OS-controlled (`AVPictureInPictureController`) and cannot host arbitrary RN UI from outside your own app process. This confirms your Android-only scope is correct, not just a choice.
- **Expo Go cannot run this**, under any circumstances. Expo Go is a precompiled binary containing only Expo's own native modules. A custom Kotlin module (and a custom permission, a `Service`, a second `ReactRootView`) cannot be side-loaded into it. **A custom development build (`expo-dev-client` + `expo prebuild`/EAS Build) is mandatory.**
- **`SYSTEM_ALERT_WINDOW` requires special, user-facing permission grant flow** (`Settings.canDrawOverlays()` + `ACTION_MANAGE_OVERLAY_PERMISSION` intent) — it cannot be requested via the normal runtime permission dialog, and Google Play has policy scrutiny on apps that use it (app must have an "exempt" or clearly justified core use case).
- **Two independent JS/RN surfaces require careful design.** The moment you have a floating window with RN content *and* your main app Activity with RN content, you either (a) run two separate RN surfaces off one JS instance, or (b) run two JS instances. Both are workable but have different tradeoffs — detailed in §5.

### Conclusion

The architecture is feasible, aligns with platform capabilities, and your proposed separation of concerns (dumb native window host, smart RN brain) is the architecturally correct design — it minimizes native maintenance surface and maximizes what library consumers can do without touching Kotlin.

---

## 2. Overall Architecture

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

### Two-surface model (recommended)

PopScreen uses **one JS engine instance, two RN surfaces**:

1. **Main surface** — the host app's normal Activity-hosted RN root (unchanged, untouched).
2. **Overlay surface** — a second `ReactRootView`/`ReactSurface` rendering a *different* RN component tree (whatever the developer wraps in `<PopScreenContent>`), hosted inside `PopScreenOverlayService`'s window.

Both surfaces share the same JS runtime, same Redux/Zustand/Context state, same module registry. This is supported by React Native's `ReactInstanceManager` (old arch) / `ReactHost` (new arch), which already support multiple "surfaces" per instance — this is exactly the mechanism RN itself uses for things like Android widgets or multiple activities sharing one bundle.

This is the most scalable choice (see §6 for why, vs. alternatives).

---

## 3. Expo vs Native Responsibilities

| Responsibility | Owner | Notes |
|---|---|---|
| Permission request UI flow | Native (Kotlin) + JS-exposed method | `Settings.canDrawOverlays`, `ACTION_MANAGE_OVERLAY_PERMISSION` |
| Foreground `Service` lifecycle | Native (Kotlin) | Required so the overlay survives the host app backgrounding |
| `WindowManager` window creation/teardown | Native (Kotlin) | Generic — just manages a window + container view |
| Hosting a `ReactRootView`/Surface inside that window | Native (Kotlin), via Expo Modules API + RN's own `ReactHost`/`ReactInstanceManager` APIs | This is the "bridge" between the generic shell and RN content |
| Drag, resize, snap-to-edge, minimize/restore **chrome mechanics** (i.e., translating raw touch deltas into window position/size updates) | Native (Kotlin) | Must be native because `WindowManager.updateViewLayout()` is the only way to move a *system* window; RN gesture handlers can't move a window they don't own |
| Deciding *what* drag/resize/minimize *means visually* (e.g., what the minimized bubble looks like, animation easing, snap zones styling) | React Native (JS) | Native only reports raw gesture deltas/state; JS can also choose to layer its own internal RN gesture handling for sub-elements within the floating view |
| All actual UI: buttons, text, images, lists, animations, theming | React Native (JS) | 100% — Kotlin never parses or knows this |
| All business logic, state, app-specific behavior | React Native (JS) | 100% |
| Config (permissions in `AndroidManifest.xml`, foreground service type) | Expo Config Plugin | Generated at `expo prebuild` time, not hand-edited |
| Build orchestration | Expo (`expo-dev-client`, `eas build`) | No raw `react-native init` workflow needed |

---

## 4. React Native Rendering Strategy

- The overlay content is **just a normal RN component tree**, written by the *consumer* of the PopScreen library — e.g.:

  ```tsx
  <PopScreenContent>
    <MyBubbleUI onExpand={...} progress={progress} />
  </PopScreenContent>
  ```

- This tree is registered as a **second AppRegistry/RN surface** with its own surface name (e.g. `"PopScreenOverlay"`), analogous to how a RN app can register multiple root components for multiple Activities/widgets.
- State flows into it the same way state flows into any RN tree: props, context, global stores (Redux/Zustand/Jotai/Recoil all work — they're just JS module-level singletons shared across both surfaces since it's one JS runtime).
- **No special "diffing" or "serialization" of UI is required** between JS and Kotlin for ordinary re-renders — this is the part that's easy to over-engineer. Once the Fabric/RootView is mounted in the overlay window, RN's normal Yoga layout + Fabric commit pipeline draws directly into that window's surface, exactly like it draws into the main Activity's window. Kotlin doesn't need to be "told to refresh" on every state change.
- Kotlin **does** need to be told about a small, fixed set of *window-level* (not UI-level) events:
  - "show now" / "hide now" / "destroy"
  - "resize window to W×H"
  - "reposition window to X,Y"
  - "minimize to bubble" / "restore to full"
  - "set window touch-passthrough mode" (e.g., fully click-through vs interactive)

  These are the *only* messages crossing the JS↔Kotlin boundary related to "UI update" — and notably, they're about the **window**, not the **UI inside it**. This is what keeps Kotlin generic: it's manipulating a black-box container, never the contents.

---

## 5. Android Overlay Architecture

### Core building blocks

1. **`PopScreenOverlayService`** — an Android `Service` (foreground service, since Android 8+ background restrictions and Android 14's foreground service type enforcement require this for any long-lived overlay) that:
   - Owns the `WindowManager` reference and the overlay `View` hierarchy.
   - Starts/stops based on commands from the Expo module.
   - Holds the `ReactRootView`/`ReactSurface` instance once attached.
   - Must declare `foregroundServiceType="specialUse"` (or the closest matching type) per Android 14+ requirements, with a manifest justification string.

2. **`PopScreenWindowManager`** (internal Kotlin helper class, not the Android `WindowManager`) — wraps `WindowManager.LayoutParams` setup:
   ```kotlin
   WindowManager.LayoutParams(
       width, height,
       WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, // API 26+
       FLAG_NOT_FOCUSABLE or FLAG_LAYOUT_NO_LIMITS,          // toggled per mode
       PixelFormat.TRANSLUCENT
   )
   ```
   - Toggles `FLAG_NOT_FOCUSABLE` on/off depending on whether the bubble needs text input focus (rare, but matters if a dev wants an editable field in the bubble).
   - Toggles `FLAG_NOT_TOUCHABLE` for "ghost"/click-through states.

3. **`PopScreenReactSurfaceHost`** — the piece that bridges into RN internals:
   - On new architecture (Bridgeless/Fabric, which is now the RN default), uses `ReactHost.createSurface(surfaceId, "PopScreenOverlay", initialProps)` to get a `ReactSurface`, whose `view` property is what gets attached to the overlay window.
   - On old architecture fallback, uses `ReactRootView` + `reactInstanceManager.attachRootViewToInstance(rootView)`, with `rootView.startReactApplication(reactInstanceManager, "PopScreenOverlay", initialProps)`.
   - Either way, this view object is what `windowManager.addView()` consumes. **This is the literal answer to "must the native layer host a RN root view" — yes, structurally it must, but functionally it requires almost no custom RN-aware code, since RN's own classes do the heavy lifting.**

4. **Drag/resize touch interceptor** — a thin `View.OnTouchListener` (or a custom `FrameLayout` overriding `onInterceptTouchEvent`) wrapped *around* the RN surface view, that:
   - Captures raw `ACTION_DOWN/MOVE/UP` deltas on the window's chrome/edges.
   - Calls `windowManager.updateViewLayout(view, updatedParams)` to actually move/resize the system window.
   - Forwards a lightweight, generic event (`{ type: 'drag', dx, dy }` or `{ type: 'resize', width, height }`) up to JS via the Expo Modules `Events` mechanism — **not** "button X was pressed," just raw gesture telemetry, keeping Kotlin's vocabulary generic.
   - Passes through any touches *inside* content bounds (when not on a drag handle) to the RN surface untouched, so buttons/gestures within the floating UI work normally via RN's own gesture system.

### Lifecycle states the native layer manages (generic, UI-agnostic)

```
UNINITIALIZED → PERMISSION_PENDING → READY → SHOWN ⇄ MINIMIZED → HIDDEN → DESTROYED
```

Kotlin exposes transitions between these states; JS decides *when* to trigger them and *what each state looks like visually* (it's still RN content either way — "minimized" is just a smaller window with a different RN render tree props, e.g. `<PopScreenContent minimized={true}>`).

---

## 6. Kotlin Native Module Design

Built with the **Expo Modules API** (not legacy bridge-style native modules), since it:
- Supports both old and new RN architecture without separate code paths — **confirmed requirement**, since PopScreen targets third-party npm consumers who may not yet be on the New Architecture (Fabric/Bridgeless). The module itself writes to one Kotlin API surface; Expo Modules' own abstraction handles routing to whichever architecture the consuming app uses.
- Uses JSI directly — lower overhead than the JSON bridge for frequent calls (drag deltas, resize streams).
- Gives a clean declarative DSL for functions, async functions, events, and even native views if needed.

**Practical implication for the `ReactSurfaceHost` (§5 above):** since dual-architecture support is required, the overlay-surface-mounting code needs **both** code paths — `ReactHost.createSurface(...)` for apps running the New Architecture, and `ReactRootView` + `ReactInstanceManager.attachRootViewToInstance(...)` for apps still on the old architecture/bridge. At module init, PopScreen detects which `ReactInstanceManager`/`ReactHost` type the host app exposes and selects the matching path. This roughly doubles the surface-hosting code (two implementations instead of one) but is the right tradeoff given the npm-publishing goal — many consumer apps in the wild are still mid-migration off the old architecture.

### Module surface (`PopScreenModule.kt`)

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

**Crucially:** every function here is about **window mechanics or opaque prop-passing**, never about "what the UI does." `updateProps` is the closest thing to a "generic UI update mechanism," and even that is just forwarding an arbitrary serializable blob to the RN surface's props — Kotlin never inspects its contents.

### Why a `Service` instead of just an `Activity`-bound view

Chat-bubble-style overlays must persist when the host app is backgrounded or even killed (within OS limits) — that's the whole point (Messenger bubbles survive leaving Messenger). Binding the window's lifecycle to a `Service` (rather than an `Activity`) is what allows this.

---

## 7. Communication Between React Native and Kotlin

Two channels, matching the Expo Modules API's primitives:

### JS → Native (commands)
Direct async function calls via JSI (no serialization overhead beyond normal JS↔native marshalling):
```ts
await PopScreenModule.show({ minimized: false });
await PopScreenModule.setWindowRect(x, y, w, h);
await PopScreenModule.updateProps({ progress: 0.42, title: "Track 3" });
```

### Native → JS (events)
Expo's `Events()` + `sendEvent()`:
```kotlin
sendEvent("onDragUpdate", mapOf("dx" to dx, "dy" to dy, "x" to newX, "y" to newY))
```
```ts
PopScreenModule.addListener('onDragUpdate', (e) => { ... });
```

### What is intentionally *not* a separate channel
There is **no special "push UI to native" RPC.** Once the overlay `ReactSurface` is mounted, the normal RN render pipeline (state change → re-render → Fabric commit → paint) updates the overlay window automatically, the same way any RN screen updates. The "communication" that matters here is:
- Commands about window state/position/size (JS→Native)
- Raw gesture/lifecycle telemetry (Native→JS)

This is what keeps the system both generic *and* simple — there's no custom serialization format for "UI trees" to invent or maintain.

---

## 8. Generic UI Update Mechanism

To directly answer the core design constraint: **"native should not know what changed, only that it should refresh."**

Mechanism:
1. Dev wraps content in `<PopScreenContent>{...}</PopScreenContent>` (a small RN component the library exports).
2. This is registered as the root component of the **overlay surface** at startup (`AppRegistry.registerComponent('PopScreenOverlay', () => PopScreenRoot)`).
3. Any state change anywhere in the dev's app (Redux dispatch, Context update, local `useState` inside the bubble UI, etc.) that affects something rendered inside `<PopScreenContent>` triggers RN's normal re-render → Fabric commit, **scoped to the overlay surface**, independent of the main app surface.
4. Kotlin's `ReactSurface`/`ReactRootView` simply *is* the live window content — there is nothing to "refresh" because it's not a snapshot/screenshot system, it's a live mounted view. The window repaints itself whenever the surface beneath it repaints, exactly like any Android view invalidation.
5. The only case Kotlin needs an explicit instruction is **non-rendering window properties** — size/position changing because of programmatic (not drag) resize, or visibility toggling. Those go through `setWindowRect` / `show` / `hide`, which again are generic, opaque commands.

This satisfies your requirement precisely: Kotlin never parses props, never knows "which button," never executes business logic — it owns a window and a live view; React owns everything rendered inside it.

---

## 9. State Synchronization Strategy

Given the **single JS runtime, two-surface** model from §2:

- **No cross-process/cross-runtime sync is needed** for state shared between the main app and the bubble — they're the same JS heap. A Zustand store, Redux store, or React Context (if lifted above both surfaces' registration points) is trivially shared.
- **Caveat:** Context providers don't automatically span two independently-mounted RN root trees (since they're literally different component trees with different roots) — so Context-based state must be provided by *wrapping each surface's root individually* in the same `Provider` (pointing at the same store instance, e.g. Zustand/Redux which live outside React's tree anyway). This is a one-time setup detail for the library's docs, not a runtime sync problem.
- **Recommended pattern:** ship a `usePopScreen()` hook backed by a tiny external store (Zustand-style, no Context needed) so both surfaces subscribe to the same source of truth without provider-tree gymnastics.
- **Process death:** if Android kills the host app process while the overlay `Service` survives (foreground services get killed last, but can still be killed under memory pressure), the JS runtime dies with it, and the overlay would need to either also die or restart its own embedded JS bundle. **Recommendation for v1: tie the overlay Service's lifecycle to the host process** (i.e., if the process dies, the overlay also disappears) — this avoids a much harder class of bugs around restarting a JS engine standalone inside a Service. Document this as a known limitation; it matches how most bubble libraries behave today.

---

## 10. Overlay Lifecycle Management

| Trigger | Behavior |
|---|---|
| `PopScreen.show()` called | Check permission → start foreground `Service` → create window → mount/attach `ReactSurface` → fade/scale in (JS-driven animation, native just makes the window visible) |
| App backgrounded | Overlay persists (it's a separate window owned by the `Service`, independent of the Activity lifecycle) |
| App force-killed by user (swipe from recents) | `Service` may or may not survive depending on OS/manufacturer aggressiveness; document as best-effort, not guaranteed, in line with Android's general background-execution constraints |
| User revokes overlay permission mid-session | Kotlin detects via permission re-check on next `show()`/resume, tears down window gracefully, emits `onPermissionResult: revoked` event |
| `PopScreen.hide()` | Window removed from `WindowManager`, `ReactSurface` detached (not destroyed — can be cheaply re-shown) |
| `PopScreen.destroy()` | Full teardown: surface destroyed, `Service` stopped, all native refs released |
| Device rotation / config change | Service-hosted windows aren't tied to Activity config changes, but should still listen to `Configuration` changes to adjust DP→PX conversions if needed |

---

## 11. Touch Event Handling

Two touch domains that must be cleanly separated:

1. **Chrome-level touch (native-owned):** drag handles, resize handles, the "grab area" of a minimized bubble. Handled by Kotlin's touch interceptor, which calls `WindowManager.updateViewLayout()` directly — this *must* be native, because moving a system-level window's screen position is not something JS or RN's gesture responder system has access to (RN gestures operate within a view's own bounds/coordinate space, not the OS window manager).
2. **Content-level touch (RN-owned):** taps, scrolls, swipes *within* the floating UI's content area (e.g., a button inside the bubble, a swipeable card). These pass through untouched to the RN surface, which uses RN's normal gesture responder system / `react-native-gesture-handler` exactly as it would in a regular screen.

Implementation detail: the native container is typically a custom `FrameLayout` wrapping the RN surface view, where `onInterceptTouchEvent` checks if the touch originated in a designated "drag handle" region (configurable from JS, e.g. `dragHandleHeight` prop) vs. content region, and only intercepts in the former case.

---

## 12. Dragging, Resizing, Minimizing, Restoring

| Feature | Native responsibility | RN responsibility |
|---|---|---|
| **Drag** | Track touch deltas, call `updateViewLayout` to move the window in real time, emit `onDragUpdate` events (throttled) | Decide visual feedback during drag (e.g., dim/scale), decide snap-to-edge target zones and call `setWindowRect` to finalize position, render any "drop zone" indicator UI |
| **Resize** | Same as drag, but adjusting `width`/`height` in `LayoutParams` | Decide min/max size constraints (passed to native as config), render resize handle visuals |
| **Minimize** | Receives `minimize()` call → shrinks window to a fixed small size/position (e.g., bottom-right corner) | Re-renders `<PopScreenContent minimized={true}>` with a smaller layout (e.g., just an icon/avatar) — native doesn't know the content changed shape, it just resized the window to match what JS told it via `setWindowRect` |
| **Restore** | Receives `restore()` call → grows window back to last full size/position | Re-renders `<PopScreenContent minimized={false}>` with full layout |
| **Snap-to-edge** | Optionally implemented natively for smoothness (animating `updateViewLayout` calls), but the *decision* of where snap zones are can be config passed from JS | Can also be done in pure JS if margin of error in window-edge animation smoothness is acceptable — recommend starting JS-driven, optimize to native animation only if jank is observed |

---

## 13. Performance Considerations

- **Avoid creating a second full JS engine.** Reusing one `ReactHost`/`ReactInstanceManager` across two surfaces (per §2) avoids duplicating JS heap, module registry, and bundle parse cost — this is the single biggest performance decision in this project.
- **Throttle drag/resize event emission** from native to JS (e.g., only emit `onDragUpdate` every ~16ms or only on `ACTION_UP` if continuous tracking isn't needed by JS) — the actual window movement during drag should happen natively without round-tripping to JS per pixel, only the *final* position needs to sync back for state purposes.
- **Overlay surface should be lightweight by convention** — document that the floating UI is meant for small, focused widgets (like Messenger bubbles/YT PiP), not full screens, to avoid Fabric layout/paint cost competing with the main app's surface for JS thread time (still one JS thread, shared between two surfaces).
- **Avoid unnecessary re-renders across surfaces** — if using Zustand/Redux, makes sure selectors are scoped per-surface so a state change relevant only to the main app doesn't trigger work in the bubble surface's React tree (and vice versa).
- **Use `RNGestureHandlerEnabled` / Reanimated where possible** for in-content animations (e.g., minimized bubble pulse) so they run off the JS thread on the UI thread, reducing risk of jank if the JS thread is ever busy with main-app work.

---

## 14. Security and Privacy Considerations

- **`SYSTEM_ALERT_WINDOW` is a sensitive permission** — Android shows users a system-level warning when granted, and Play Store policy requires justifying its use (it's historically been abused by tapjacking/overlay-attack malware). Document this clearly for library consumers shipping to Play Store; they will likely face Play Console policy review questions.
- **Tapjacking mitigation:** ensure the overlay window does not silently capture sensitive taps intended for underlying apps — only the developer-defined content area should intercept touch; outside that, the window region should either not exist (size matches content tightly) or explicitly use `FLAG_NOT_TOUCHABLE` for non-interactive padding.
- **No automatic screen-content capture.** This library does not, and should not, attempt to read/mirror content from *other* apps (unlike `MediaProjection`-based screen-recording overlays) — clarify in docs that this is a "draw your own RN UI on top," not a "see what's on screen" capability, which avoids a much heavier privacy/permission burden (`MediaProjection` requires per-session user consent every time).
- **Foreground service notification:** Android requires a persistent notification while the foreground service runs — be transparent with end users about why the overlay is active (standard Android UX, also a Play policy expectation).
- **Data passed via `updateProps`** crosses the same JS↔native boundary as any other React Native data — no special encryption needed beyond what the host app already does for its own state, but don't put highly sensitive data (auth tokens, etc.) into overlay props unnecessarily, since it's now duplicated into a second surface's render tree (still in-memory, same process, same trust boundary — not a hard security issue, just a "minimize what you expose" hygiene note).

---

## 15. Required Android Permissions

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

- All of the above should be injected via an **Expo Config Plugin** (so consumers of the npm package don't hand-edit `AndroidManifest.xml`, and CNG/`expo prebuild` regenerates correctly).
- `SYSTEM_ALERT_WINDOW` additionally requires the **runtime grant flow** (`Settings.canDrawOverlays()` check + `ACTION_MANAGE_OVERLAY_PERMISSION` settings-screen redirect) — this cannot be skipped or auto-granted; exposed from JS as `PopScreenModule.requestOverlayPermission()`.

---

## 16. Testing Strategy

| Layer | Approach |
|---|---|
| Kotlin module unit tests | JVM-based unit tests for pure logic (layout param calculation, state machine transitions) using standard Android instrumentation/JUnit; mock `WindowManager` |
| Kotlin integration tests | Android instrumented tests (`androidTest`) on an emulator/device to verify window add/remove, permission flow, Service lifecycle |
| JS/TS unit tests | Jest for the `usePopScreen()` hook, the `<PopScreenContent>` component's prop handling, mocked native module (Expo Modules support a JS-side mock for native modules in test envs) |
| End-to-end | Manual + scripted (Maestro or Detox, if Detox's Android support covers Service-hosted windows — likely needs custom test taps via `adb` for true overlay-window interaction, since standard E2E frameworks target Activity-bound view hierarchies) |
| Device/OEM matrix testing | Critical given Android fragmentation around background execution. **Primary test device: Xiaomi POCO M3 (MIUI 14 / Android 12, API 31)** — chosen as the project's reference hardware and doubling as the canonical "worst case" OEM, since MIUI is among the most aggressive platforms for killing background services/overlays. Supplement with a stock Android emulator/device (Pixel) at both API 26 (floor) and the latest stable API (ceiling), and ideally one Samsung OneUI device, to cover the three major background-restriction behavior profiles |
| Permission-flow testing | Explicitly test: permission denied, permission revoked mid-session, permission re-requested after denial |
| Example app | Ship a full Expo example app in the repo (`/example`) exercising every public API, anchored by two canonical demos built in Milestone 5: the **Counter Floating App** (increment/decrement buttons, proves cross-surface state sync) and the **Input Submit Floating App** (`TextInput` + Submit button + list of past submissions, proves local overlay-surface state and text-input focus inside the overlay window). These double as a manual test harness and as living documentation |

---

## 17. Build and Deployment Process

1. **Library repo structure** uses `create-expo-module` scaffolding (standalone module, not `--local`), since this is meant to be published to npm/used across multiple consumer apps.
2. **Consumers install via:**
   ```bash
   npx expo install popscreen
   npx expo prebuild   # materializes android/ with the config plugin applied
   ```
3. **No Expo Go support** — document prominently in README that `expo-dev-client` is required:
   ```bash
   npx expo install expo-dev-client
   eas build --profile development --platform android
   ```
4. **CI for the library itself:** GitHub Actions running:
   - TS typecheck + lint + Jest
   - Android `assembleDebug` build of the example app (catches Kotlin compile errors, manifest merge issues)
   - Optionally, instrumented tests on a Firebase Test Lab / emulator matrix
5. **Publishing:** standard npm publish flow with `expo-module-scripts` build tooling (handles TS compilation, Kotlin AAR-adjacent packaging via Gradle module, autolinking metadata).
6. **Versioning:** semver, with explicit notes in changelogs about minimum Expo SDK / RN version compatibility, since Expo Modules API + new-architecture support has version-dependent behavior.

---

## 18. Potential Limitations and Risks

| Risk | Detail | Mitigation |
|---|---|---|
| **Play Store policy rejection risk** | `SYSTEM_ALERT_WINDOW` apps face manual review; some categories of apps get rejected outright | Document clearly that *consumers* of this library bear Play policy responsibility for their specific use case; library itself is a neutral tool |
| **OEM background-kill aggressiveness** | Xiaomi/Huawei/Samsung battery optimizers may kill the foreground service despite "foreground" status. The project's own reference device (POCO M3, MIUI 14) falls squarely into this risk category, so this is not a theoretical edge case — it will surface during normal development/testing | Document need for users to manually allow "unrestricted battery usage" / disable MIUI's "battery saver" for the app; test the exact revoke→detect→graceful-teardown path on the POCO M3 itself before v1 ships, since it's representative of a large share of real-world Android devices |
| **Two-surface shared JS thread contention** | A heavy main-app render could cause the bubble to visibly stutter (one JS thread for both) | Document performance guidance (§13); consider (v2) optional separate Hermes instance if this becomes a real pain point — bigger complexity, defer past v1 |
| **New Architecture / Fabric API surface for multi-surface hosting is less publicly documented than single-surface apps** | RN's own internal APIs for `ReactHost.createSurface` are used by RN itself but less commonly by third-party libraries — expect some trial-and-error and version sensitivity across RN releases | Pin tested RN/Expo SDK version ranges explicitly; budget extra R&D time in Milestone 2 (§19) |
| **Process-death edge cases** | Backgrounded app process killed by OS while Service "survives" briefly, then JS-dependent overlay has nothing to render | v1 ties overlay lifecycle to host process (§9) — accept as a known limitation rather than over-engineering a standalone-JS-in-Service solution prematurely |
| **No iOS support, ever, for true system-wide overlay** | Platform limitation, not a library gap | Clearly scope and message as Android-only in all docs/branding |
| **Android version fragmentation** | `TYPE_APPLICATION_OVERLAY` requires API 26+; older flags (`TYPE_PHONE`, etc.) are deprecated/removed | Set `minSdkVersion` appropriately; don't attempt backward compat below API 26 for this feature |

---

## 19. Recommended Folder Structure

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

## 20. Development Milestones

**Milestone 0 — Spike / Validation (de-risking, ~1 week)**
- Minimal Kotlin POC: a hardcoded `ReactRootView` (not yet generic) attached to a `TYPE_APPLICATION_OVERLAY` window via a bare `Service`, no Expo Modules yet. Goal: prove a live RN surface can render and update inside a system overlay window at all on the target device. **Run this spike on the POCO M3 first** (the most constrained real device available) before testing on any emulator — if it works there, emulator/other-device validation is comparatively low-risk.

**Milestone 1 — Expo Module Scaffolding**
- `create-expo-module` setup (standalone, npm-publishable — no `--local` flag), config plugin for manifest permissions/service declaration, basic `requestOverlayPermission`/`hasOverlayPermission` functions working end-to-end from a dev-client example app.
- Stand up the **dual old/new-architecture surface-hosting code path** (per §6) early, since retrofitting it later would touch nearly every native file.

**Milestone 2 — Generic Overlay Window + Static Content**
- `PopScreenOverlayService` + `WindowManager` integration hosting a *static* RN surface (no drag/resize yet) showing arbitrary developer-provided RN content via `<PopScreenContent>`. Validates the "generic Kotlin, smart RN" boundary end-to-end. Test on both an old-architecture and new-architecture example app.

**Milestone 3 — Touch Interaction**
- Drag implementation (native window movement + JS event emission), content-area touch passthrough validated with real buttons/gestures inside the bubble.

**Milestone 4 — Resize, Minimize, Restore**
- Window resizing (confirmed in v1 scope), minimize/restore state machine. Snap-to-edge explicitly deferred to v1.1 — not built now, but resize/minimize APIs should be designed so snap-to-edge can be layered on top later without breaking changes.

**Milestone 5 — State Sync & Hook API**
- `usePopScreen()` hook, shared-store pattern documented and tested.
- **Example app 1 — Counter Floating App:** the overlay window shows a count value with two buttons, **Increment (+)** and **Decrement (−)**. Each button dispatches an update to the shared external store (per §9); the count re-renders live in both the main app screen and the floating overlay simultaneously. This is the canonical end-to-end proof that cross-surface state sync (§9) actually works in practice — both buttons live entirely in RN/JS, Kotlin never knows a button was pressed, it only ever sees the resulting window stay the same size/position while its content repaints.
- **Example app 2 — Input Submit Floating App:** the overlay window shows a single-line `TextInput` and a **Submit** button; below the button, a list renders each previously submitted value (most recent at top or bottom — implementer's choice), all stored in local overlay-surface state (`useState`/`useReducer`), not in the shared cross-surface store, since submissions are scoped to the bubble itself. This example does double duty: it's the first real exercise of (a) local React state living entirely inside the overlay `ReactSurface` with no main-app involvement, and (b) **text input focus inside a `TYPE_APPLICATION_OVERLAY` window** — i.e. the first concrete test of the `FLAG_NOT_FOCUSABLE` toggle and IME (soft keyboard) behavior referenced as an open question (§ Open Clarification Questions, "text input focus"). Build this app early enough in Milestone 5 that any IME-over-overlay surprises surface before Milestone 6's lifecycle hardening work, not after.

**Milestone 6 — Lifecycle Hardening**
- Permission revocation handling, process-death behavior, **OEM background-kill testing with the POCO M3 (MIUI 14) as the primary stress-test device**, supplemented by stock Android and one Samsung device if available, foreground service notification UX.

**Milestone 7 — Testing & Docs**
- Full Jest + instrumented test coverage (old-arch and new-arch example apps both green), README, API reference, example app polish, Play policy guidance doc for consumers.

**Milestone 8 — Publish v1.0.0**
- npm publish, versioned compatibility matrix (Expo SDK / RN version, old vs. new architecture), changelog.

---

## Direct Answers to Your Numbered Questions

1. **Parts implementable entirely in React Native:** All UI rendering, styling, animation, business logic, state management, content-area gesture handling (taps/swipes within the bubble), deciding what minimized vs. restored looks like, snap-zone visuals, and all app-specific behavior. This is the large majority of the actual "product" code.

2. **Parts requiring native Kotlin:** Overlay permission request flow, `WindowManager` window creation/movement/resizing (system-level window positioning cannot be done from JS/RN), foreground `Service` for persistence, hosting the `ReactRootView`/`ReactSurface` inside that window, low-level touch interception to distinguish "drag chrome" from "content" before handing off to RN's gesture system.

3. **Expo Go support:** **Not possible, under any circumstances.** A custom development build via `expo-dev-client` + `expo prebuild`/EAS Build is mandatory because this requires a custom native module, custom permission, and a custom `Service`.

4. **Android-specific limitations:** `SYSTEM_ALERT_WINDOW` special permission flow + Play policy scrutiny; Android 14+ foreground service type declaration requirements; OEM-specific background/battery restrictions (especially Xiaomi, Samsung, Huawei) that can kill the overlay despite foreground status; `minSdkVersion 26` requirement for `TYPE_APPLICATION_OVERLAY`; no equivalent capability exists on iOS at all.

5. **Can RN render directly into a system overlay, or must native host a RN root view?** Native **must** host a RN root view (`ReactRootView`/`ReactSurface`) — there's no JS-level API to target a `WindowManager` window directly. However, this requirement is almost entirely boilerplate-once: after attaching the surface to the window, ordinary RN re-renders flow through automatically with no further native involvement, which is what makes the "generic Kotlin layer" goal achievable.

6. **Most scalable architecture for keeping floating UI in sync with the app:** One JS runtime (`ReactHost`/`ReactInstanceManager`), two RN surfaces (main app + overlay), sharing state through an external store (Zustand/Redux-style, outside React's Context tree) rather than React Context alone — this avoids duplicating the JS engine, avoids inventing a custom cross-process sync protocol, and scales cleanly as the bubble UI grows in complexity.

---

## Open Clarification Questions (please answer before implementation begins)

Three of the original questions are now resolved (target API/device, npm distribution, drag+resize+minimize v1 scope — see the locked-in decisions banner at the top of this document). The remaining open items:

**Functional scope for v1**
1. Should v1 include **snap-to-edge** behavior (like Messenger bubbles snapping to screen edges)? *(Currently deferred to v1.1 per the locked-in scope — confirm this is acceptable, or pull it into v1 if it's important for the initial release.)*
2. Should the floating window support **text input focus** (e.g., a chat-style text field inside the bubble)? This changes `FLAG_NOT_FOCUSABLE` handling and adds IME (keyboard) interaction complexity with overlay windows, which is a known tricky area on Android.
3. Do you want the overlay to support **multiple simultaneous bubbles** (like multiple Messenger chat heads), or is a single floating window sufficient for v1?

**Persistence & lifecycle expectations**
4. What's the expected behavior when the **host app is fully killed** by the user (swiped from recents)? Should the bubble disappear immediately (simpler, recommended for v1 — and especially relevant given MIUI's aggressive process management on the POCO M3 reference device), or attempt to persist independently (significantly harder, requires a standalone-JS-in-Service approach)?
5. Do you need the overlay to **survive device reboot** (auto-restart on boot), or only persist during an active session?

**Distribution & compliance**
6. Since this is going on npm for third-party use: is **Google Play compatibility** a hard requirement for consumers (i.e., should the README/config plugin optimize hard for Play policy compliance), or should the library also explicitly support sideloaded/enterprise/internal-distribution consumers who may have different constraints?
7. Do you have a specific **primary use case in mind** for the first consumer/example app (e.g., music mini-player, chat bubble, call overlay, video PiP)? This doesn't change the generic architecture, but it would help prioritize which example app to build first and sanity-check the API ergonomics against a real use case.

**Design/UX defaults**
8. Should PopScreen ship with **any default visual chrome** (e.g., a default drag handle, default minimize button styling), or should literally 100% of visuals — including drag handles — be left to the consuming developer's RN code, with native only exposing raw gesture zones via configuration (e.g., `dragHandleHeight`)?

---

*End of plan. Awaiting your answers to the remaining clarification questions and final approval before any implementation begins.*
