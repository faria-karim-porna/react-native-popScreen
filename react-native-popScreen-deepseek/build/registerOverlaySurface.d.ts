/**
 * Call once, early in the host app's lifecycle (e.g. at the top of
 * index.js, alongside the main app's registerRootComponent call), passing
 * the component tree to render inside the floating overlay window.
 *
 * This must match PopScreenReactSurfaceHost's surfaceName parameter
 * exactly, or the native side will attach to a surface name nothing has
 * registered, resulting in a blank overlay window.
 */
export function registerOverlaySurface(component: any): void;
//# sourceMappingURL=registerOverlaySurface.d.ts.map