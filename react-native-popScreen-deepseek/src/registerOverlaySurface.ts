import { AppRegistry } from 'react-native';
import type { ComponentType } from 'react';

const SURFACE_NAME = 'PopScreenOverlay';

let registered = false;

/**
 * Call once, early in the host app's lifecycle (e.g. at the top of
 * index.tsx, alongside the main app's registerRootComponent call), passing
 * the component tree to render inside the floating overlay window.
 *
 * This must match PopScreenReactSurfaceHost's surfaceName parameter
 * exactly, or the native side will attach to a surface name nothing has
 * registered, resulting in a blank overlay window.
 */
export function registerOverlaySurface(component: ComponentType<any>) {
  if (registered) {
    console.warn('[PopScreen] registerOverlaySurface called more than once — ignoring.');
    return;
  }
  registered = true;
  AppRegistry.registerComponent(SURFACE_NAME, () => component);
}
