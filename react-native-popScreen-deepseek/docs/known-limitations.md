# PopScreen v1 — Known Limitations

## Overlay does not survive host app process death

**What this means:** if Android kills the host app's process (due to
memory pressure, or the user swiping the app from the Recents screen
on aggressive OEMs like Xiaomi/MIUI), the floating overlay also
disappears. The overlay will NOT automatically reappear when the user
relaunches the app.

**Why this is the correct v1 behavior:** implementing true process-death
survival would require running a standalone Hermes JS engine inside a
Service with no host React Native instance — a significantly harder
problem involving bundle distribution, JS engine lifecycle management
inside a Service, and IPC between the standalone Service and the
relaunched Activity. Most real-world chat-bubble and PiP libraries
behave the same way; process-death survival is a v2 consideration.

**What consumers should do:** treat PopScreen overlays as session-scoped.
Call `PopScreen.show()` at the appropriate point in your app's lifecycle
(after the user initiates the relevant feature) and call
`PopScreen.destroy()` when the feature session ends. Do not design UX
that depends on the overlay surviving a process kill.

## OEM background-kill behavior

On aggressive OEMs (Xiaomi/MIUI, Huawei/EMUI, some Samsung OneUI
configurations), the foreground service backing the overlay may be killed
by the OS's battery optimizer even with `FOREGROUND_SERVICE` declared,
unless the user explicitly grants "unrestricted battery usage" or adds
the app to the battery whitelist.

**Required user action on MIUI devices:** Settings → Battery & performance
→ App battery saver → [Your App] → set to "No restrictions".

For a full per-manufacturer guide, see: https://dontkillmyapp.com

## FLAG_NOT_FOCUSABLE and soft keyboard behavior

When the overlay contains a `TextInput`, receiving focus requires the
overlay window's `FLAG_NOT_FOCUSABLE` to be cleared. This is handled
automatically inside the library, but on some OEM skins the soft keyboard
may resize or shift the overlay window in unexpected ways when it appears.
If you observe this, set a fixed window size via `PopScreen.setSizeConstraints`
to prevent the window from being affected by the keyboard's inset changes.
