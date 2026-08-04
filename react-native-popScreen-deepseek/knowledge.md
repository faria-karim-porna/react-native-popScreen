# Project knowledge

PopScreen — Android-only floating overlay library for React Native (Expo).
Renders any RN UI as a system-level floating window (TYPE_APPLICATION_OVERLAY)
via a foreground Service. Like YouTube PiP or Messenger bubbles, but on top
of other apps.

## Quickstart
- Install: `npx expo install popscreen` + `expo-dev-client` + `npx expo prebuild --platform android`
- Build library: `npm run build` (tsc build, outputs to `build/`)
- Build plugin: `npm run build:plugin` (cd plugin && npx tsc)
- Test: `npm test` (jest); 4 test files in `src/__tests__/`
- CI test: `npm run test:ci`
- Typecheck: `npm run typecheck` (tsc --noEmit)
- Clean: `npm run clean`

## Architecture
- **Source**: `src/` — TypeScript/JS source files, Expo Module API
- **Build output**: `build/` — compiled JS + declarations, what gets published
- **Native Android**: Kotlin sources live as templates in `plugin/native/` (`PopScreenModule.kt`, `OverlayService.kt`, `PopScreenPackage.kt`) and are injected into `android/app/src/main/java/` by the config plugin (`withDangerousMod`) during `expo prebuild` — this survives EAS builds, which regenerate `android/` from scratch. The plugin also patches `MainApplication.kt` to register `PopScreenPackage` (legacy bridge module, name `PopScreen`)
- **Config plugin**: `plugin/src/index.ts` (compiled to `plugin/build/`), auto-injects Android manifest entries
- **Mocks**: `src/__mocks__/` — native module mock (`PopScreenModule.ts`) and expo-modules-core mock
- **Demos**: `demos/` — Counter (cross-surface state sync) and Input Submit (local state) demos
- **Docs**: `docs/` — API reference, compatibility, state-sync, known-limitations, Play Policy guidance
- **Entry point (app)**: root `index.js` calls `registerRootComponent(App)` + `registerOverlaySurface(...)`. `package.json` `main` MUST point at `index.js` — Expo/Metro resolves the app entry purely from `package.json#main`; if it points at `build/index.js` (the library build, which never calls `AppRegistry.registerComponent`), the APK builds fine but crashes at launch with `"main" has not been registered`.
- **Entry point (library)**: consumers resolve the published library via the `exports` field → `build/index.js` (works on RN ≥ 0.73 / Node ≥ 12.7).
- **Surface registration**: `registerOverlaySurface(Component)` called in root `index.js` alongside `registerRootComponent()`
- **State sync**: `usePopScreen(key, default)` hook backed by module-scoped external store — no Context needed

## Conventions
- **Android only**: API 26+; iOS cannot support system-wide overlays from third-party apps
- **Expo Go not supported**: requires `expo-dev-client`
- **TypeScript strict**: `strict: true` in both tsconfig files
- **Build tsconfig** (`tsconfig.build.json`): targets ES2019/commonjs, excludes tests + mocks
- **No linting**: no ESLint/Prettier config found
- **Peer deps**: expo (\*), react (\*), react-native (\*); expo optional
- **Module name**: `popscreen`, Android-only (`expo-module.config.json` platforms: ["android"])
- **Dual architecture**: auto-detects old (legacy bridge) vs new (Fabric) RN architecture at runtime
- **Native module mocks**: required for Jest — `src/__mocks__/PopScreenModule.ts` + `expo-modules-core.ts`
- **CI**: GitHub Actions runs JS tests + plugin build + Android build check
- **Jest config** lives in `package.json`; uses `babel-jest` with `babel-preset-expo`; transforms react-native packages
- **Known issue workaround**: `scripts/patch-autolinking.js` runs as `postinstall` and patches `expo-modules-autolinking@2.0.x` (Expo SDK 52) so its `react-native-config` command emits clean JSON instead of ANSI-colored `util.inspect` output — otherwise RNGP fails with "Could not parse autolinking config file" (see `docs/faq.md` §4). Idempotent; newer autolinking versions are skipped.

## EAS Build (APK)

Build an Android APK for testing/demoing the library via EAS Build.

### Prerequisites (run first)
- Ensure EAS CLI is installed: `npm install -g eas-cli`
- Install project deps: `npm install`
- Build library source: `npm run build` (compiles `src/` → `build/`)
- Build config plugin: `npm run build:plugin` (compiles `plugin/src/` → `plugin/build/`)
- Generate native android dir (skip if it exists): `npx expo prebuild --platform android`

### Build steps (execute in order)
1. **Login to Expo**: `eas login`2. **Configure EAS Build**: `eas build:configure` → select **android** when prompted
   (This auto-generates `eas.json` with default profiles.)

3. **Edit `eas.json`** — add/replace the `production` profile with APK buildType:

   ```json
   {
     "build": {
       "production": {
         "android": {
           "buildType": "apk"
         }
       }
     }
   }
   ```

4. **Run the build**: `eas build --platform android --profile production`

### Notes
- The `android/` directory must exist before running `eas build:configure` — run `npx expo prebuild --platform android` first if missing
- Uses the `popscreen-example` Expo app defined in `app.json`
- The produced APK can be installed directly on an Android device (API 26+)
