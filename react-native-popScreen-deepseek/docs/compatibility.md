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
