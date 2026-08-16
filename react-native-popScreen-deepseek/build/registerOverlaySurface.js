"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOverlaySurface = registerOverlaySurface;
const react_native_1 = require("react-native");
const OVERLAY_SURFACE_NAME = 'PopScreenOverlay';
let alreadyRegistered = false;
/**
 * Register the component to render inside the floating overlay window.
 * Call this once in your app's entry file (e.g. index.tsx), alongside
 * `registerRootComponent`. Calling it more than once is a no-op.
 */
function registerOverlaySurface(component) {
    if (alreadyRegistered) {
        console.warn('[PopScreen] registerOverlaySurface called more than once — ignoring.');
        return;
    }
    alreadyRegistered = true;
    react_native_1.AppRegistry.registerComponent(OVERLAY_SURFACE_NAME, () => component);
}
//# sourceMappingURL=registerOverlaySurface.js.map