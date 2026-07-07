# Play Store Policy Guidance for PopScreen Consumers

PopScreen uses `SYSTEM_ALERT_WINDOW` ("draw over other apps"), a sensitive permission subject to Google Play policy review.

## Is your use case eligible?

Google Play restricts `SYSTEM_ALERT_WINDOW` to apps with a core use case requiring overlays. Historically-approved categories include:
- Floating action buttons / productivity launchers
- Chat head / messaging bubble UIs
- Video/audio mini-player overlays
- Accessibility overlays with a documented accessibility purpose

## What to include in your Play Store declaration

1. A written justification for why your app requires drawing over other apps.
2. A demonstration video showing the permission being used in context.
3. Confirmation that the overlay is user-initiated.

## What this library does NOT do

- Does **not** capture or mirror content from other apps (`MediaProjection` is not used).
- Does **not** show the overlay without explicit `PopScreen.show()` being called.
- Does **not** send or log any data to external servers.

## Notification requirement

Android requires a persistent notification while the foreground Service is running. Do not attempt to suppress this notification.

## Further reading

- [Android developer docs — SYSTEM_ALERT_WINDOW](https://developer.android.com/reference/android/Manifest.permission#SYSTEM_ALERT_WINDOW)
- [Google Play policy — Device and network abuse](https://support.google.com/googleplay/android-developer/answer/10964491)
