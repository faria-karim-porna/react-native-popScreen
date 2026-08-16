import { AppRegistry } from 'react-native';
import type { ComponentType } from 'react';

const OVERLAY_SURFACE_NAME = 'PopScreenOverlay';

let alreadyRegistered = false;

/**
 * Register the component to render inside the floating overlay window.
 * Call this once in your app's entry file (e.g. index.tsx), alongside
 * `registerRootComponent`. Calling it more than once is a no-op.
 */
export function registerOverlaySurface(component: ComponentType<any>) {
  if (alreadyRegistered) {
    console.warn('[PopScreen] registerOverlaySurface called more than once — ignoring.');
    return;
  }
  alreadyRegistered = true;
  AppRegistry.registerComponent(OVERLAY_SURFACE_NAME, () => component);
}
