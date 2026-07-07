"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("expo/config-plugins");
const OVERLAY_SERVICE_NAME = '.OverlayService';
const withPopScreenAndroidManifest = (config) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const manifest = config.modResults;
        // Step 1 — permissions
        config_plugins_1.AndroidConfig.Permissions.ensurePermissions(manifest, [
            'android.permission.SYSTEM_ALERT_WINDOW',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
        ]);
        // Step 2 — service declaration
        const mainApplication = config_plugins_1.AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
        if (!mainApplication.service) {
            mainApplication.service = [];
        }
        const alreadyDeclared = mainApplication.service.some((s) => s.$['android:name'] === OVERLAY_SERVICE_NAME);
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
            });
        }
        return config;
    });
};
exports.default = withPopScreenAndroidManifest;
