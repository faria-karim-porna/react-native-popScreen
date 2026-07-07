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
- **Native Android**: generated into `android/` via `expo prebuild`
- **Config plugin**: `plugin/src/index.ts` (compiled to `plugin/build/`), auto-injects Android manifest entries
- **Mocks**: `src/__mocks__/` — native module mock (`PopScreenModule.ts`) and expo-modules-core mock
- **Demos**: `demos/` — Counter (cross-surface state sync) and Input Submit (local state) demos
- **Docs**: `docs/` — API reference, compatibility, state-sync, known-limitations, Play Policy guidance
- **Entry point**: `index.js` re-exports from `build/index.js`
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
