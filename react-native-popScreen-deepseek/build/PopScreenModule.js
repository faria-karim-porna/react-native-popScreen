"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NATIVE_DRAG_MODE = exports.PopScreenModule = void 0;
exports.resolveDragMode = resolveDragMode;
const react_native_1 = require("react-native");
const { PopScreen } = react_native_1.NativeModules;
const DEFAULT_MIN_SIZE_DP = 150;
const DEFAULT_DRAG_HANDLE_DP = 32;
const DEFAULT_RESIZE_HANDLE_DP = 24;
// Fallback stub used when the native module is unavailable (e.g. in tests or on iOS).
const fallbackModule = {
    hasOverlayPermission: async () => false,
    requestOverlayPermission: async () => { },
    hasBatteryOptimizationExemption: async () => false,
    requestBatteryOptimizationExemption: async () => { },
    show: async () => { },
    hide: async () => { },
    destroy: async () => { },
    openApp: async () => { },
    getReactArchitectureInfo: async () => ({
        architecture: 'UNKNOWN',
        isNewArchitecture: false,
        reactNativeVersion: null,
    }),
    setWindowRect: async () => { },
    setSizeConstraints: async () => { },
    setHandleDimensions: async () => { },
    setDragMode: async () => { },
};
const rawModule = PopScreen !== null && PopScreen !== void 0 ? PopScreen : fallbackModule;
/**
 * Typed wrapper around the native PopScreen module.
 * Fills in default values for optional number params so the Android bridge
 * never receives `undefined` (which would cause a NullPointerException).
 */
exports.PopScreenModule = {
    ...rawModule,
    setWindowRect: (x, y, width, height) => { var _a, _b; return (_b = (_a = rawModule.setWindowRect) === null || _a === void 0 ? void 0 : _a.call(rawModule, x !== null && x !== void 0 ? x : -1, y !== null && y !== void 0 ? y : -1, width !== null && width !== void 0 ? width : -1, height !== null && height !== void 0 ? height : -1)) !== null && _b !== void 0 ? _b : Promise.resolve(); },
    setSizeConstraints: (minWidth, minHeight, maxWidth, maxHeight) => {
        var _a, _b;
        return (_b = (_a = rawModule.setSizeConstraints) === null || _a === void 0 ? void 0 : _a.call(rawModule, minWidth !== null && minWidth !== void 0 ? minWidth : DEFAULT_MIN_SIZE_DP, minHeight !== null && minHeight !== void 0 ? minHeight : DEFAULT_MIN_SIZE_DP, maxWidth !== null && maxWidth !== void 0 ? maxWidth : 0, maxHeight !== null && maxHeight !== void 0 ? maxHeight : 0)) !== null && _b !== void 0 ? _b : Promise.resolve();
    },
    setHandleDimensions: (dragHandleHeightDp, resizeHandleSizeDp) => {
        var _a, _b;
        return (_b = (_a = rawModule.setHandleDimensions) === null || _a === void 0 ? void 0 : _a.call(rawModule, dragHandleHeightDp !== null && dragHandleHeightDp !== void 0 ? dragHandleHeightDp : DEFAULT_DRAG_HANDLE_DP, resizeHandleSizeDp !== null && resizeHandleSizeDp !== void 0 ? resizeHandleSizeDp : DEFAULT_RESIZE_HANDLE_DP)) !== null && _b !== void 0 ? _b : Promise.resolve();
    },
    setDragMode: (mode) => { var _a, _b; return (_b = (_a = rawModule.setDragMode) === null || _a === void 0 ? void 0 : _a.call(rawModule, mode !== null && mode !== void 0 ? mode : exports.NATIVE_DRAG_MODE.BAND)) !== null && _b !== void 0 ? _b : Promise.resolve(); },
};
/**
 * Numeric drag-mode constants that match the values in OverlayService.kt.
 * 1 = top drag-handle band, 2 = whole body.
 */
exports.NATIVE_DRAG_MODE = { BAND: 1, BODY: 2 };
/** Convert a friendly DragMode string to its native numeric constant. */
function resolveDragMode(mode) {
    return mode === 'body' ? exports.NATIVE_DRAG_MODE.BODY : exports.NATIVE_DRAG_MODE.BAND;
}
//# sourceMappingURL=PopScreenModule.js.map