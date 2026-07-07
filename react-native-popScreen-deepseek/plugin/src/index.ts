import {
  ConfigPlugin,
  withAndroidManifest,
  AndroidConfig,
} from 'expo/config-plugins';

const OVERLAY_SERVICE_NAME = '.OverlayService';

const withPopScreenAndroidManifest: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Step 1 — permissions
    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
    ]);

    // Step 2 — service declaration
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const alreadyDeclared = mainApplication.service.some(
      (s: any) => s.$['android:name'] === OVERLAY_SERVICE_NAME
    );

    if (!alreadyDeclared) {
      mainApplication.service.push({
        $: {
          'android:name': OVERLAY_SERVICE_NAME,
          'android:foregroundServiceType': 'specialUse',
          'android:exported': 'false',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'floating_overlay_spike',
            },
          },
        ],
      } as any);
    }

    return config;
  });
};

export default withPopScreenAndroidManifest;
