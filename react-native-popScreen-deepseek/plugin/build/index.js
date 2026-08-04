"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const OVERLAY_SERVICE_NAME = '.OverlayService';
const withPopScreenAndroidManifest = (config) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const manifest = config.modResults;
        // Step 1 — permissions
        config_plugins_1.AndroidConfig.Permissions.ensurePermissions(manifest, [
            'android.permission.SYSTEM_ALERT_WINDOW',
            'android.permission.FOREGROUND_SERVICE',
            'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
            'android.permission.POST_NOTIFICATIONS',
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
/**
 * The native implementation of the library lives as plain Kotlin templates
 * next to this plugin (plugin/native/*.kt). Because EAS builds regenerate the
 * android/ project from scratch, we re-inject these files on every prebuild.
 */
const withPopScreenNativeSources = (config) => {
    return (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (config) => {
            var _a, _b;
            const androidPackage = (_b = (_a = config.android) === null || _a === void 0 ? void 0 : _a.package) !== null && _b !== void 0 ? _b : 'com.fariakarim.reactnativepopScreendeepseek';
            const srcDir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...androidPackage.split('.'));
            const templatesDir = path.join(__dirname, '..', 'native');
            const templates = fs
                .readdirSync(templatesDir)
                .filter((f) => f.endsWith('.kt'));
            fs.mkdirSync(srcDir, { recursive: true });
            for (const file of templates) {
                const source = fs.readFileSync(path.join(templatesDir, file), 'utf8');
                const rendered = source.replace(/__PACKAGE__/g, androidPackage);
                fs.writeFileSync(path.join(srcDir, file), rendered, 'utf8');
            }
            return config;
        },
    ]);
};
/**
 * Registers PopScreenPackage in MainApplication.getPackages() so the
 * native module is exposed to JS as NativeModules.PopScreen.
 */
const withPopScreenMainApplication = (config) => {
    return (0, config_plugins_1.withMainApplication)(config, (config) => {
        let contents = config.modResults.contents;
        const marker = 'return packages';
        if (contents.includes('PopScreenPackage')) {
            return config;
        }
        if (!contents.includes(marker)) {
            console.warn('[popscreen] Could not find the MainApplication `return packages` marker — ' +
                'PopScreenPackage was NOT registered. The native module will be unavailable.');
            return config;
        }
        contents = contents.replace(marker, `            packages.add(PopScreenPackage());\n            ${marker}`);
        config.modResults.contents = contents;
        return config;
    });
};
const withPopScreen = (config) => {
    config = withPopScreenAndroidManifest(config);
    config = withPopScreenNativeSources(config);
    config = withPopScreenMainApplication(config);
    return config;
};
exports.default = withPopScreen;
