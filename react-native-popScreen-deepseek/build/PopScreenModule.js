"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DRAG_MODE = exports.PopScreenModule = void 0;
exports.resolveDragMode = resolveDragMode;
const react_native_1 = require("react-native");
const { PopScreen } = react_native_1.NativeModules;
const DEFAULT_MIN_SIZE = 150;
const DEFAULT_DRAG_HANDLE_DP = 32;
const DEFAULT_RESIZE_HANDLE_DP = 24;
const rawModule = PopScreen !== null && PopScreen !== void 0 ? PopScreen : {
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
/**
 * The native PopScreen module wrapper.
 * Sanitizes undefined numbers with default values so the Android bridge never throws NullPointerException on primitive unboxing.
 * Falls back to a stub if the native module is not available.
 */
exports.PopScreenModule = {
    ...rawModule,
    setWindowRect: (x, y, width, height) => {
        var _a, _b;
        return (_b = (_a = rawModule.setWindowRect) === null || _a === void 0 ? void 0 : _a.call(rawModule, x !== null && x !== void 0 ? x : -1, y !== null && y !== void 0 ? y : -1, width !== null && width !== void 0 ? width : -1, height !== null && height !== void 0 ? height : -1)) !== null && _b !== void 0 ? _b : Promise.resolve();
    },
    setSizeConstraints: (minWidth, minHeight, maxWidth, maxHeight) => {
        var _a, _b;
        return (_b = (_a = rawModule.setSizeConstraints) === null || _a === void 0 ? void 0 : _a.call(rawModule, minWidth !== null && minWidth !== void 0 ? minWidth : DEFAULT_MIN_SIZE, minHeight !== null && minHeight !== void 0 ? minHeight : DEFAULT_MIN_SIZE, maxWidth !== null && maxWidth !== void 0 ? maxWidth : 0, maxHeight !== null && maxHeight !== void 0 ? maxHeight : 0)) !== null && _b !== void 0 ? _b : Promise.resolve();
    },
    setHandleDimensions: (dragHandleHeightDp, resizeHandleSizeDp) => {
        var _a, _b;
        return (_b = (_a = rawModule.setHandleDimensions) === null || _a === void 0 ? void 0 : _a.call(rawModule, dragHandleHeightDp !== null && dragHandleHeightDp !== void 0 ? dragHandleHeightDp : DEFAULT_DRAG_HANDLE_DP, resizeHandleSizeDp !== null && resizeHandleSizeDp !== void 0 ? resizeHandleSizeDp : DEFAULT_RESIZE_HANDLE_DP)) !== null && _b !== void 0 ? _b : Promise.resolve();
    },
    setDragMode: (mode) => { var _a, _b; return (_b = (_a = rawModule.setDragMode) === null || _a === void 0 ? void 0 : _a.call(rawModule, mode !== null && mode !== void 0 ? mode : exports.DRAG_MODE.BAND)) !== null && _b !== void 0 ? _b : Promise.resolve(); },
};
/**
 * Native drag interceptor modes. Mirrors OverlayService.kt `DRAG_MODE_*`:
 * 1 = top drag-handle band, 2 = whole body draggable.
 */
exports.DRAG_MODE = { BAND: 1, BODY: 2 };
/** Maps the public `DragMode` string to the native interceptor mode. */
function resolveDragMode(mode) {
    return mode === 'body' ? exports.DRAG_MODE.BODY : exports.DRAG_MODE.BAND;
}
//# sourceMappingURL=PopScreenModule.js.map