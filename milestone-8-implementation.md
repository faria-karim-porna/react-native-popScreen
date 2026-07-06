# PopScreen — Milestone 8: Publish v1.0.0 — Full Implementation Guide

**Goal of this document:** a literal, step-by-step guide for Milestone 8 only, as described in `docs/implementation-plan.md` §20:

> Milestone 8 — Publish v1.0.0
> npm publish, versioned compatibility matrix (Expo SDK / RN version, old vs. new architecture), changelog.

**What this milestone delivers:** PopScreen v1.0.0 on npm — installable by any Expo developer via `npx expo install popscreen`. The milestone has no new code; it is entirely about pre-publish verification, `package.json` correctness, `.npmignore`, the compatibility matrix, the changelog, and the `npm publish` invocation itself.

**A note on irreversibility:** once a version is published to the public npm registry it cannot be unpublished (only deprecated). Treat every step in this guide as a pre-flight checklist, not optional polish.

---

## Step 0 — Prerequisites

Milestone 7 must be a clean PASS with:

- All CI jobs green on the `main` branch.
- All five documentation files present (`README.md`, `docs/api-reference.md`, `docs/play-policy-guidance.md`, `docs/state-sync.md`, `docs/known-limitations.md`).
- An npm account with publish rights to the `popscreen` package name (either a personal account or an organisation you control). Confirm the name is available:

```bash
npm info popscreen
# Should return "npm error 404" if the name is unclaimed.
# If it's already taken, choose an alternative (e.g. "popscreen-rn",
# "@yourscope/popscreen") and update every reference in package.json,
# README, and docs before continuing.
```

Log in to npm on your machine:

```bash
npm login
npm whoami   # confirm the right account
```

---

## Step 1 — Final `package.json` audit

Open `package.json` and verify every field before publishing. A single wrong field here can make autolinking fail silently in consumer projects.

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

Key points to audit:

- `"main"` and `"types"` must point to the compiled `build/` output, **not** `src/`. If `build/index.js` does not exist yet, run `npm run build` and `npm run build:plugin` first.
- `"peerDependencies"` uses `"*"` for `expo` (not a pinned version range) — this is the standard convention for Expo modules so consumer projects are not locked to a specific SDK release.
- `"expo-modules-core"` appears **only** in `devDependencies`, never in `dependencies` or `peerDependencies`. The consumer's own `expo` package already provides a compatible version.
- `"expo-module"."platforms"` contains only `"android"` — iOS is unsupported and must not be listed here, as it would cause autolinking to attempt iOS pod integration that doesn't exist.
- `"app.plugin.js"` must exist at the root (it routes to `plugin/build/index.js`). If it does not, run `npm run build:plugin`.

---

## Step 2 — Verify `expo-module.config.json`

Open `expo-module.config.json` and confirm it matches the single-platform Android scope:

```json
{
  "platforms": ["android"],
  "android": {
    "modules": ["expo.modules.popscreen.PopScreenModule"]
  }
}
```

This file is what Expo Autolinking uses to discover the module. A typo in the `modules` array (wrong package name or class name) causes the native module to be silently unlinked — `requireNativeModule('PopScreen')` would throw at runtime in a consumer app. Cross-check against the `Name("PopScreen")` line inside `PopScreenModule.kt`'s `definition()` block to confirm they match exactly.

---

## Step 3 — Audit `.npmignore`

`expo-module-scripts` convention uses `.npmignore` (not the `files` field in `package.json`) to exclude files from the published package. The default scaffold produces a reasonable starting point; confirm it excludes:

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

**What must NOT be excluded** (must be present in the published package):

- `build/` — the compiled JS output
- `android/` — the Kotlin source and Gradle files (Autolinking needs these)
- `plugin/build/` — the compiled config plugin
- `app.plugin.js` — the config plugin entry point
- `expo-module.config.json` — required by Autolinking
- `README.md`

Run `npm pack --dry-run` to see exactly what would be included without actually publishing:

```bash
npm pack --dry-run
```

Review the file list carefully. If you see `src/` files being included (meaning source TypeScript is published alongside the compiled output), add `src/` to `.npmignore`. If `build/` is missing (meaning the compile step was not run), run `npm run build` and `npm run build:plugin` then recheck.

---

## Step 4 — Build everything from clean state

Run the full build sequence from a clean state to ensure the published package reflects the current source, not a stale cache:

```bash
npm run clean
npm run build
npm run build:plugin
```

Confirm these produce:

- `build/index.js` and `build/index.d.ts` (TypeScript compiled output)
- `build/PopScreenModule.js`, `build/PopScreenContent.js`, etc.
- `plugin/build/index.js` (config plugin compiled output)

---

## Step 5 — Write `CHANGELOG.md`

Create **`CHANGELOG.md`** at the repository root. This is the versioned record that consumers depend on to understand what changed between releases:

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

## Step 6 — Write the compatibility matrix

Add a **`docs/compatibility.md`** file. This is the "versioned compatibility matrix" required by the main plan:

```markdown
# PopScreen Compatibility Matrix

## v1.0.0

| PopScreen | Expo SDK | React Native | RN Architecture | Android API | Status |
|-----------|----------|--------------|-----------------|-------------|--------|
| 1.0.0 | 52 | 0.76 | Old + New | 26–35 | ✅ Tested |
| 1.0.0 | 53 | 0.77 | Old + New | 26–35 | ✅ Tested |
| 1.0.0 | 54 | 0.78 | Old + New | 26–36 | ✅ Tested |

### Test device matrix for v1.0.0

| Device | OS | API | OEM skin | Result |
|--------|-----|-----|----------|--------|
| Xiaomi POCO M3 (primary) | Android 12 | 31 | MIUI 14 | ✅ Pass |
| Stock Android emulator | Android 8.0 | 26 | AOSP | ✅ Pass (API floor) |
| Stock Android emulator | Android 15 | 35 | AOSP | ✅ Pass (API ceiling) |

> **How to read this table:** "Tested" means the full Milestone 6 manual
> test sequence (permission grant/revoke, show/hide/destroy, drag, resize,
> minimize/restore, background persistence, MIUI battery-kill stress) was
> run on that configuration and passed. It does not mean every possible
> device was tested — Android fragmentation makes exhaustive testing
> impractical. Use the POCO M3 row as the conservative lower bound for
> real-world OEM behaviour.

## Adding your own version

If you test PopScreen on a combination not listed above and it passes,
please open a PR adding a row to the matrix. If it fails, please open an
issue with the exact failure mode and device/OS details.
```

---

## Step 7 — Git tag the release

Tag the exact commit that will be published. The tag creates a permanent, auditable link between the npm release and the source:

```bash
git add -A
git commit -m "chore: prepare v1.0.0 release"
git tag v1.0.0
git push origin main --tags
```

Confirm CI is green one final time on this tagged commit before running `npm publish`.

---

## Step 8 — Dry-run publish

Always do a dry run before the real publish. This catches file-list problems, missing build artifacts, and registry auth issues without actually publishing:

```bash
npm publish --dry-run
```

Read the output carefully:

- Confirm `build/index.js`, `build/index.d.ts`, `android/`, `plugin/build/`, `app.plugin.js`, and `expo-module.config.json` are all listed.
- Confirm `src/`, `example/`, `docs/`, `.github/`, and test files are **not** listed.
- Confirm the `package` size is reasonable (typically 200KB–2MB for a module of this type — if it's over 5MB, recheck `.npmignore` for accidentally-included large files like emulator images or generated Android build artifacts).

---

## Step 9 — Publish

```bash
npm publish --access public
```

`--access public` is required for scoped packages (`@yourscope/popscreen`). It is harmless (no-op) for unscoped packages but safe to include in either case.

Confirm publication:

```bash
npm info popscreen
# Should show version: 1.0.0, dist-tags: { latest: '1.0.0' }
```

---

## Step 10 — Smoke test in a fresh consumer project

Immediately after publishing, create a completely fresh Expo project to confirm the end-to-end consumer installation flow works:

```bash
npx create-expo-app@latest popscreen-smoke-test
cd popscreen-smoke-test
npx expo install popscreen
npx expo install expo-dev-client
npx expo prebuild --platform android
```

Open `popscreen-smoke-test/android/app/src/main/AndroidManifest.xml` and confirm:

- `SYSTEM_ALERT_WINDOW` permission is present.
- `FOREGROUND_SERVICE` permission is present.
- `FOREGROUND_SERVICE_SPECIAL_USE` permission is present.
- `PopScreenOverlayService` service declaration is present.

This confirms the config plugin ran correctly from the published package, not just from your local workspace. If the manifest is missing any of these entries, the config plugin did not run — check that `app.plugin.js` was included in the published package (Step 8 dry-run output) and that it correctly routes to `plugin/build/index.js`.

---

## Step 11 — Create a GitHub release

Go to the repository on GitHub → Releases → "Draft a new release":

- Tag: `v1.0.0` (select the tag created in Step 7)
- Title: `v1.0.0`
- Body: paste the `[1.0.0]` section from `CHANGELOG.md`
- Check "Set as the latest release"

Publish the GitHub release. This makes the changelog discoverable for consumers browsing GitHub, and creates the association between the git tag and a human-readable release page.

---

## Step 12 — Post-publish checklist

After publishing, confirm these items before announcing:

- [ ] `npm info popscreen` shows `version: 1.0.0` and `dist-tags.latest: 1.0.0`.
- [ ] Fresh consumer project smoke test (Step 10) passes manifest verification.
- [ ] GitHub release is published at the correct tag.
- [ ] `CHANGELOG.md` is committed and pushed with the correct date filled in (replace `YYYY-MM-DD` with the actual publish date).
- [ ] `docs/compatibility.md` is committed and accurate.
- [ ] The `README.md` install command (`npx expo install popscreen`) works in the smoke-test project without errors.

---

## Versioning guidance for future releases

- **Patch (`1.0.1`):** bug fixes only, no new API surface, no new native code paths. Safe for consumers to update without running `expo prebuild` again if the config plugin is unchanged (though always recommend it).
- **Minor (`1.1.0`):** new features that are backward compatible — e.g. snap-to-edge (planned for v1.1), additional events, new configuration options. Consumers should run `expo prebuild` to pick up any manifest changes.
- **Major (`2.0.0`):** breaking API changes, `minSdkVersion` bump, or changes to the `expo-module.config.json` module class list that would require consumers to re-link. Always post a migration guide in `CHANGELOG.md`.

When the Expo SDK releases a new major version that requires changes (e.g. a new RN architecture API breaking change), increment the minor or major version, update `docs/compatibility.md`, and note the affected Expo SDK versions explicitly in the changelog entry.

---

## What comes after v1.0.0

Per the main plan's open clarification questions and v1.1 roadmap:

- **Snap-to-edge** — can be added as a v1.1 minor with zero native changes: new JS logic in `minimizeRestore.ts` calling the existing `setWindowRect` with computed edge-aligned coordinates.
- **Screen-bounds-aware minimize positioning** — `Dimensions.get('window')`-based coordinate computation in `minimizeRestore.ts`, again zero native changes.
- **Multiple simultaneous bubbles** — requires native changes (the `activeInstance` singleton pattern would need to become a collection); plan as v2.
- **Overlay surviving host process death** — requires a standalone Hermes engine inside a Service with IPC; plan as v2.
- **iOS PiP support** — not possible with this architecture; would be an entirely separate feature using `AVPictureInPictureController`, and would be scoped to playback content only, not arbitrary RN UI.

---

*End of Milestone 8 guide. PopScreen v1.0.0 is now published. Congratulations on completing all eight milestones.*
