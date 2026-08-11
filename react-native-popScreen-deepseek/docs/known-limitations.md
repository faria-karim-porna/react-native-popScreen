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

The overlay window is permanently `FLAG_NOT_FOCUSABLE` so it never steals
focus from the app behind and touches outside the panel keep passing
through. When the user taps a `TextInput`, the library requests focus and
force-opens the soft keyboard (`showSoftInput(SHOW_FORCED)`) **without
clearing `FLAG_NOT_FOCUSABLE`**, so the app behind the overlay stays
interactive even while the keyboard is open.

On the rare OEM that refuses to show the keyboard for a non-focusable
window, the library automatically falls back to temporarily clearing
`FLAG_NOT_FOCUSABLE` (keeping `FLAG_NOT_TOUCH_MODAL` set). The keyboard
opens reliably, and because the window never consumes touches outside the
panel, the app behind the overlay stays fully interactive while the
keyboard is up. Tapping the app behind takes window focus away from the
overlay, which dismisses the keyboard and restores the non-focusable flags.

Because the window stays non-focusable it never receives IME insets, so the
overlay will not pan or resize to stay above the keyboard. If the overlay is
positioned low on screen, the keyboard may cover its lower part — keep text
fields in the upper area of the panel, or have the app move the window (via
`PopScreen.setWindowRect`) before showing the keyboard.

Some OEM skins may also resize or shift the overlay window in unexpected
ways when the keyboard appears. If you observe this, set a fixed window
size via `PopScreen.setSizeConstraints` to prevent the window from being
affected by the keyboard's inset changes.
