# PopScreen

[![npm version](https://img.shields.io/npm/v/popscreen.svg)](https://www.npmjs.com/package/popscreen)
[![license](https://img.shields.io/npm/l/popscreen.svg)](https://github.com/faria-karim-porna/react-native-popScreen/blob/main/LICENSE)
[![Platform](https://img.shields.io/badge/platform-android-green.svg)](https://developer.android.com)

**PopScreen** is an Android-native floating overlay library for React Native and Expo. It renders any React Native UI as a system-level floating window on top of other applications — just like YouTube Picture-in-Picture (PiP) or Facebook Messenger chat heads.

---

## 🌟 Key Features

- 🪟 **System-Level Floating Window**: Renders any React Native component tree over all apps using Android's `TYPE_APPLICATION_OVERLAY`.
- ⚡ **Zero-Bridge State Synchronization**: Share and sync state instantly between your main app and the overlay with `usePopScreen()` — no Context, no EventEmitters, no network overhead.
- 🖐️ **Native Gesture Controls**: Smooth native touch dragging, bottom-right resizing, minimizing, and restoring.
- 🎨 **Adaptive Shapes & Styling**: Built-in support for `rounded`, `pill`, `circle`, `square`, and `rectangle` shapes.
- 📜 **Dual-Axis Content Scrolling**: Inner content automatically handles vertical and horizontal overflow without cutting off text or controls.
- 🧭 **Responsive Overlay Header**: Pre-built header with auto-compact labels for narrow floating windows.
- ⚙️ **Dual Architecture Ready**: Fully compatible with both React Native New Architecture (Fabric) and Legacy Bridge.
- 🔌 **Zero Native Setup (Expo Config Plugin)**: Auto-configures permissions, manifest declarations, and native services during `expo prebuild`.

---

## 📋 Platform Requirements

| Requirement | Supported Version | Notes |
|---|---|---|
| **Android OS** | API 26+ (Android 8.0 Oreo and above) | Required for system overlay window |
| **React Native** | ≥ 0.73 | Supports Old & New Architecture |
| **Expo SDK** | SDK 50+ | Requires custom dev client (`expo-dev-client`) |
| **iOS** | ❌ Not Supported | iOS does not permit system-wide floating windows for third-party apps |
| **Expo Go** | ❌ Not Supported | Requires native custom code via `expo prebuild` |

---

## 📦 Installation

```bash
# 1. Install PopScreen and Expo build dependencies
npx expo install popscreen expo-build-properties expo-dev-client

# 2. Prebuild the native Android project
npx expo prebuild --platform android
```

### Expo Config Plugin Setup

Add `popscreen` to your `app.json` plugins array:

```json
{
  "expo": {
    "plugins": [
      "popscreen",
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 24,
            "kotlinVersion": "1.9.25"
          }
        }
      ]
    ]
  }
}
```

---

## 🚀 Quick Start Guide

### Step 1: Register the Overlay in your Root Entry Point

In your root `index.ts` or `index.js`, register your overlay component alongside `registerRootComponent`:

```tsx
// index.ts
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import FloatingOverlay from './FloatingOverlay';

// 1. Register main application
registerRootComponent(App);

// 2. Register floating overlay surface
registerOverlaySurface(FloatingOverlay);
```

---

### Step 2: Create the Floating Overlay Component

Wrap your overlay UI inside `PopScreenContent`:

```tsx
// FloatingOverlay.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PopScreenContent, usePopScreen } from 'popscreen';

export default function FloatingOverlay() {
  const [count, setCount] = usePopScreen<number>('counter', 0);

  return (
    <PopScreenContent
      shape="rounded"
      showHeader={true}
      dragMode="header"
      headerProps={{ title: 'Live Counter' }}
    >
      <View style={styles.container}>
        <Text style={styles.text}>Count: {count}</Text>
        <Pressable style={styles.button} onPress={() => setCount(c => c + 1)}>
          <Text style={styles.buttonText}>+ Increment</Text>
        </Pressable>
      </View>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center', backgroundColor: '#1e293b' },
  text: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  button: { marginTop: 12, backgroundColor: '#3b82f6', padding: 8, borderRadius: 6 },
  buttonText: { color: 'white', fontWeight: '600' },
});
```

---

### Step 3: Show & Control Overlay from your Main App

```tsx
// App.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as PopScreen from 'popscreen';
import { usePopScreen } from 'popscreen';

export default function App() {
  const [hasPermission, setHasPermission] = useState(false);
  const [count, setCount] = usePopScreen<number>('counter', 0);

  useEffect(() => {
    // Check if SYSTEM_ALERT_WINDOW permission is granted
    PopScreen.hasOverlayPermission().then(setHasPermission);

    // Listen to permission result events
    const sub = PopScreen.addPermissionResultListener((e) => {
      setHasPermission(e.granted);
    });
    return () => sub.remove();
  }, []);

  const handleOpenOverlay = async () => {
    if (!hasPermission) {
      await PopScreen.requestOverlayPermission();
      return;
    }
    await PopScreen.show();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PopScreen Main App</Text>
      <Text style={styles.counterText}>Synced Count: {count}</Text>

      <Button title="Increment from App" onPress={() => setCount(c => c + 1)} />

      <View style={styles.spacer} />

      <Button
        title={hasPermission ? "Show Floating Overlay" : "Grant Overlay Permission"}
        onPress={handleOpenOverlay}
      />
      <View style={styles.spacer} />
      <Button title="Hide Overlay" onPress={() => PopScreen.hide()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  counterText: { fontSize: 18, marginBottom: 16 },
  spacer: { height: 10 },
});
```

---

## 🔄 Cross-Surface State Synchronization (`usePopScreen`)

The `usePopScreen` hook lets both the Main App and the Floating Overlay share reactive state seamlessly because they run in the **same JavaScript engine process**.

```tsx
const [state, setState] = usePopScreen<T>(key: string, defaultValue?: T);
```

### Synchronizing Arrays and Objects

> ⚠️ **Important**: When passing default arrays or objects, define them at **module scope** so their reference remains stable across renders:

```tsx
// ✅ Correct: Stable module-scope reference
const DEFAULT_TODOS: string[] = [];

export default function TodoWidget() {
  const [todos, setTodos] = usePopScreen<string[]>('todos_key', DEFAULT_TODOS);
  // ...
}

// ❌ Avoid: Inline object/array literal creates a new reference on every render
const [todos, setTodos] = usePopScreen<string[]>('todos_key', []);
```

---

## 🎨 Overlay Customization & Props

### Window Shapes

`PopScreenContent` supports pre-styled presets via the `shape` prop:

| Shape | Description |
|---|---|
| `"rounded"` *(default)* | Rectangular with soft rounded corners (default radius: `16dp`) |
| `"pill"` | Rounded stadium/pill shape with horizontal padding |
| `"circle"` | 1:1 Aspect ratio circular bubble |
| `"square"` | 1:1 Aspect ratio sharp square |
| `"rectangle"` | Standard sharp rectangle window |

```tsx
<PopScreenContent shape="pill" borderRadius={24}>
  <YourContent />
</PopScreenContent>
```

---

### Dragging Modes (`dragMode`)

| Mode | Behavior |
|---|---|
| `"handle"` *(default)* | Top strip (`dragHandleHeight`, default: `32dp`) intercepts touch gestures for dragging |
| `"header"` | Entire header area acts as the drag region with deferred touch-slop (buttons remain clickable!) |
| `"body"` | The entire floating window can be dragged from anywhere |

```tsx
<PopScreenContent dragMode="header" showHeader={true}>
  <YourContent />
</PopScreenContent>
```

---

### Minimize and Restore

PopScreen provides pure-JS window minimize & restore helpers:

```tsx
import { minimize, restore, getIsMinimized } from 'popscreen';

// Minimize overlay to a 64x64 floating bubble
await minimize();

// Check state
console.log(getIsMinimized()); // true

// Restore to original position and size
await restore();
```

---

## 📖 API Reference

### Top-Level Methods

| Method | Return Type | Description |
|---|---|---|
| `hasOverlayPermission()` | `Promise<boolean>` | Checks if `SYSTEM_ALERT_WINDOW` permission is granted |
| `requestOverlayPermission()` | `Promise<void>` | Opens Android system settings for overlay permission |
| `hasBatteryOptimizationExemption()` | `Promise<boolean>` | Checks if app is exempted from battery optimizations |
| `requestBatteryOptimizationExemption()` | `Promise<void>` | Prompts user for battery optimization exemption |
| `show()` | `Promise<void>` | Starts ForegroundService and displays the overlay |
| `hide()` | `Promise<void>` | Hides the overlay window without tearing down state |
| `destroy()` | `Promise<void>` | Completely tears down overlay and stops foreground service |
| `openApp()` | `Promise<void>` | Brings the host app from background to foreground |
| `setWindowRect(x, y, w, h)` | `Promise<void>` | Sets floating window coordinates and dimensions in dp |
| `setSizeConstraints(minW, minH, maxW, maxH)` | `Promise<void>` | Configures min/max window boundaries in dp |
| `setDragMode(mode)` | `Promise<void>` | Changes active drag mode (`'handle'`, `'header'`, `'body'`) |
| `registerOverlaySurface(Component)` | `void` | Registers root overlay component with React Native AppRegistry |

---

### Event Listeners

```tsx
import * as PopScreen from 'popscreen';

// Window state changes: 'shown' | 'hidden' | 'destroyed'
const sub1 = PopScreen.addWindowStateChangeListener((event) => {
  console.log('Window State:', event.state, event.reason);
});

// Drag movement updates
const sub2 = PopScreen.addDragUpdateListener((event) => {
  console.log('Dragging:', event.phase, event.x, event.y);
});

// Resize gesture updates
const sub3 = PopScreen.addResizeUpdateListener((event) => {
  console.log('Resizing:', event.phase, event.width, event.height);
});

// Clean up subscriptions
sub1.remove();
sub2.remove();
sub3.remove();
```

---

### `PopScreenContent` Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `shape` | `'rectangle' | 'rounded' | 'circle' | 'square' | 'pill'` | `'rounded'` | Shape preset of the overlay |
| `dragMode` | `'handle' | 'header' | 'body'` | `'handle'` | Active drag interaction zone |
| `showHeader` | `boolean` | `false` | Displays default or custom header |
| `headerProps` | `PopScreenHeaderProps` | `undefined` | Props forwarded to `PopScreenHeader` |
| `dragHandleHeight` | `number` | `32` | Height of top drag strip in dp |
| `resizeHandleSize` | `number` | `24` | Size of bottom-right resize corner in dp |
| `width` | `number` | `undefined` | Initial overlay width in dp |
| `height` | `number` | `undefined` | Initial overlay height in dp |
| `minWidth` | `number` | `150` | Minimum allowed width |
| `minHeight` | `number` | `150` | Minimum allowed height |
| `scrollable` | `boolean` | `true` | Enables dual-axis nested scrolling on overflow |
| `style` | `StyleProp<ViewStyle>` | `undefined` | Outer container styling |

---

## 🔒 Android Permissions & Google Play Guidelines

PopScreen automatically declares the following in your `AndroidManifest.xml`:

- `android.permission.SYSTEM_ALERT_WINDOW`: Allows drawing on top of other applications.
- `android.permission.FOREGROUND_SERVICE`: Keeps the overlay service alive when app is backgrounded.
- `android.permission.FOREGROUND_SERVICE_SPECIAL_USE`: Android 14 (API 34)+ compliance for custom overlay services.
- `android.permission.POST_NOTIFICATIONS`: Android 13 (API 33)+ ongoing notification for foreground service.

### Google Play Policy Tip
When publishing to Google Play, explain your overlay's primary utility (e.g., Picture-in-Picture, floating navigation assistant, quick audio/video player controls) in your store listing and app permission declarations.

---

## 🛠️ Troubleshooting

#### 1. "PopScreenOverlay has not been registered"
Make sure `registerOverlaySurface(YourComponent)` is called in your top-level `index.ts` (or `index.js`), alongside `registerRootComponent(App)`.

#### 2. NativeMethods / PopScreen is null
Ensure you executed `npx expo prebuild --platform android` and ran the project using a development build (`npx expo run:android`). PopScreen contains custom native Kotlin code and cannot run inside the standard Expo Go client app.

#### 3. Overlay not rendering on screen
Check if overlay permissions are granted by calling `PopScreen.hasOverlayPermission()`. If false, prompt the user with `PopScreen.requestOverlayPermission()`.

---

## 📄 License

MIT © [Faria Karim Porna](https://github.com/faria-karim-porna)
