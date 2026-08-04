import {
  ConfigPlugin,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  AndroidConfig,
} from 'expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const OVERLAY_SERVICE_NAME = '.OverlayService';

const withPopScreenAndroidManifest: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Step 1 — permissions
    AndroidConfig.Permissions.ensurePermissions(manifest, [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.POST_NOTIFICATIONS',
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

/**
 * The native implementation of the library lives as plain Kotlin templates
 * next to this plugin (plugin/native/*.kt). Because EAS builds regenerate the
 * android/ project from scratch, we re-inject these files on every prebuild.
 */
const withPopScreenNativeSources: ConfigPlugin = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidPackage =
        config.android?.package ?? 'com.fariakarim.reactnativepopScreendeepseek';
      const srcDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        ...androidPackage.split('.')
      );

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
const withPopScreenMainApplication: ConfigPlugin = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    const marker = 'return packages';
    if (contents.includes('PopScreenPackage')) {
      return config;
    }
    if (!contents.includes(marker)) {
      console.warn(
        '[popscreen] Could not find the MainApplication `return packages` marker — ' +
        'PopScreenPackage was NOT registered. The native module will be unavailable.'
      );
      return config;
    }

    contents = contents.replace(
      marker,
      `            packages.add(PopScreenPackage());\n            ${marker}`
    );

    config.modResults.contents = contents;
    return config;
  });
};

const withPopScreen: ConfigPlugin = (config) => {
  config = withPopScreenAndroidManifest(config);
  config = withPopScreenNativeSources(config);
  config = withPopScreenMainApplication(config);
  return config;
};

export default withPopScreen;
