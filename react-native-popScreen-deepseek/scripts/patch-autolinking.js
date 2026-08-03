// Postinstall patch for expo-modules-autolinking (Expo SDK 52, version 2.0.x).
//
// WHY:
// The `react-native-config` command (invoked by the prebuild-generated
// `android/settings.gradle` to produce `android/build/generated/autolinking/autolinking.json`)
// prints its output with:
//
//   console.log(require('util').inspect(results, false, null, true));
//
// The last argument (`colors = true`) unconditionally enables ANSI color codes,
// so the generated `autolinking.json` is full of escape sequences like `\u001b[32m`.
// React Native's Gradle plugin (RNGP) then fails to parse the file with Gson:
//
//   RNGP - Autolinking: Could not parse autolinking config file:
//   .../android/build/generated/autolinking/autolinking.json
//   The file is either missing or not containing valid JSON so the build won't succeed.
//
// This breaks `eas build` and local Gradle builds on Expo SDK 52 (expo-modules-autolinking
// is pinned to the last 2.0.x release, which still has the bug). The upstream fix
// (https://github.com/expo/expo/pull/43915) only landed for newer SDKs.
//
// FIX: swap the colored `util.inspect` dump for a plain `JSON.stringify`, so the
// autolinking config file is always valid JSON.
//
// NOTE: the same exact output line also exists in the `search` CLI command, so both
// occurrences get patched. Their default output changes from a colored dump to plain
// JSON too — harmless, and strictly more machine-readable.
//
// This script runs on `npm install`/`npm ci` (including on EAS Build servers), and is
// idempotent + safe when this package is installed as a dependency of other projects.
'use strict';

const fs = require('fs');
const path = require('path');

const pkgDir = path.join(
  process.cwd(),
  'node_modules',
  'expo-modules-autolinking'
);
const indexFile = path.join(pkgDir, 'build', 'index.js');

// Colored, non-JSON output that breaks RNGP's autolinking.json parser.
const BROKEN_PATTERN = "console.log(require('util').inspect(results, false, null, true));";
const FIXED_OUTPUT = 'console.log(JSON.stringify(results));';

if (!fs.existsSync(indexFile)) {
  // Package not installed (e.g. when this repo is consumed as a dependency and the
  // module is hoisted elsewhere). Nothing to patch.
  console.log('[patch-autolinking] expo-modules-autolinking not found, skipping.');
  process.exit(0);
}

// Only the affected 2.0.x line needs patching. Newer versions (2.1.0+) ship the
// upstream NO_COLOR fix and must be left untouched.
const pkgJsonFile = path.join(pkgDir, 'package.json');
if (fs.existsSync(pkgJsonFile)) {
  const version = JSON.parse(fs.readFileSync(pkgJsonFile, 'utf8')).version || '';
  if (!version.startsWith('2.0.')) {
    console.log(
      `[patch-autolinking] expo-modules-autolinking ${version} does not need the patch, skipping.`
    );
    process.exit(0);
  }
}

const source = fs.readFileSync(indexFile, 'utf8');

if (!source.includes(BROKEN_PATTERN)) {
  // Either this script already ran, or (unexpectedly) a 2.0.x release changed the
  // output code. Treat it as already fixed and move on.
  console.log('[patch-autolinking] already patched, skipping.');
  process.exit(0);
}

const count = source.split(BROKEN_PATTERN).length - 1;
const patched = source.split(BROKEN_PATTERN).join(FIXED_OUTPUT);
fs.writeFileSync(indexFile, patched, 'utf8');
console.log(
  `[patch-autolinking] patched ${count} occurrence(s) in ${indexFile} ` +
    '(util.inspect with forced ANSI colors -> JSON.stringify).'
);
