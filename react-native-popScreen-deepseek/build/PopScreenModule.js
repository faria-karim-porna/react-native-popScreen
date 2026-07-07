"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopScreenModule = void 0;
const react_native_1 = require("react-native");
const { PopScreen } = react_native_1.NativeModules;
/**
 * The native PopScreen module.
 * Falls back to a stub if the native module is not available.
 */
exports.PopScreenModule = PopScreen !== null && PopScreen !== void 0 ? PopScreen : {
    hasOverlayPermission: async () => false,
    requestOverlayPermission: async () => { },
    hasBatteryOptimizationExemption: async () => false,
    requestBatteryOptimizationExemption: async () => { },
    show: async () => { },
    hide: async () => { },
    destroy: async () => { },
    getReactArchitectureInfo: async () => ({
        architecture: 'UNKNOWN',
        isNewArchitecture: false,
        reactNativeVersion: null,
    }),
    setWindowRect: async () => { },
    setSizeConstraints: async () => { },
    setHandleDimensions: async () => { },
};
//# sourceMappingURL=PopScreenModule.js.map