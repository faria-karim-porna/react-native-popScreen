# PopScreen FAQ

## 1. Can I use PopScreen on my Xiaomi POCO M3?

**Yes, absolutely.** The Xiaomi POCO M3 (Android 12, API 31, MIUI 14) is listed in the compatibility matrix as the **primary test device** and passed with a ✅. The full manual test sequence was run on it — permission grant/revoke, show/hide/destroy, drag, resize, minimize/restore, background persistence, and even MIUI battery-kill stress.

### Important MIUI-specific setup

On MIUI, you need to grant **unrestricted battery usage** to prevent MIUI's aggressive battery optimizer from killing the overlay's foreground service:

**Settings → Battery & performance → App battery saver → [Your App] → "No restrictions"**

For a full per-manufacturer guide, see: https://dontkillmyapp.com

---

## 2. How can I test PopScreen?

There are three tiers of testing:

### Tier 1 — JavaScript unit tests (quick, no device needed)

```bash
npm test           # runs all 4 Jest test files
npm run test:ci    # runs with coverage
npm run typecheck  # TypeScript type-checking
```

These test the core JS logic — the shared state store (`createOverlayStore`), the `usePopScreen` hook, the minimize/restore logic, and the `PopScreenContent` component rendering. Mocks are in `src/__mocks__/`.

### Tier 2 — Building and running on your device

This tests everything end-to-end on your Android device:

```bash
# 1. Build the library
npm run build
npm run build:plugin

# 2. Set up the Android project
npx expo prebuild --platform android --clean

# 3. Build & install the debug APK
cd android
./gradlew assembleDebug

# Then install via ADB:
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Tier 3 — Manual feature testing on device

Once installed, the demo app includes two overlays you can test:

| Test | What to verify |
|------|---------------|
| **Counter demo** | Open overlay → press +/– → confirm the main app panel updates in real-time (proves cross-surface state sync) |
| **Input Submit demo** | Type text → submit → confirm a list builds up. Test with the soft keyboard (proves `TextInput` works inside a `FLAG_NOT_FOCUSABLE` overlay) |
| **Drag** | Drag the overlay by the handle bar |
| **Resize** | Drag the bottom-right corner of the overlay |
| **Minimize/Restore** | Shrink and restore the overlay |
| **Permissions** | Revoke overlay permission mid-session → verify graceful teardown |

The full API surface is listed in `docs/api-reference.md` for programmatic testing via `PopScreen.show()`, `PopScreen.hide()`, `PopScreen.destroy()`, `PopScreen.setWindowRect()`, etc.

---

## 3. Can I test PopScreen using Expo EAS Build (Expo dashboard)?

**Yes, absolutely.** EAS Build is actually the **recommended** way to test this library on a real device, since PopScreen requires `expo-dev-client` (Expo Go won't work).

### Why EAS Build works here

PopScreen already has everything EAS Build needs:

1. **Config plugin** — `app.plugin.js` (via `plugin/build/index.js`) auto-injects the `SYSTEM_ALERT_WINDOW` permission, foreground service declaration, etc. into `AndroidManifest.xml` during the EAS prebuild step. No manual manifest editing needed.

2. **Expo module config** — `expo-module.config.json` declares `platforms: ["android"]`, so EAS recognizes it as a native module.

3. **Example app built in** — `App.js`, `app.json`, and `OverlaySwitcher.js` are already set up as a working Expo app that consumes the library from source (using relative imports from `./src/`).

### How to build and test via EAS Build

From the project root (since it's already configured as an Expo app):

```bash
# 1. Install EAS CLI if you haven't already
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Create a development build for Android
eas build --platform android --profile development
```

EAS will:
- Upload your project to Expo's cloud servers
- Run `expo prebuild` (which triggers the config plugin to inject permissions)
- Compile the native Android code (including `PopScreenModule`, the foreground Service, etc.)
- Output an `.apk` or `.aab` you can install on your device

### Development workflow after the build

Once the dev build is installed on your device:
- **JS changes** (editing source code in `src/`, `demos/`, etc.) — just reload/restart Metro, no rebuild needed
- **Native changes** (editing Kotlin code in `android/`) — you'd need a new EAS build

### Important note

This project is a **library**, not a standalone Expo app that's been published to EAS. The `app.json` has `"slug": "popscreen-example"` and an Android package name of `com.fariakarim.reactnativepopScreendeepseek`, so you'd need to either:

- **Create an Expo project on expo.dev** and link it, or
- Use `eas build --local` to build on your machine without needing an Expo project

For simplicity, you can also build locally:

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```
