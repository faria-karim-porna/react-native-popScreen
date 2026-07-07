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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPopScreenState = exports.usePopScreen = exports.registerOverlaySurface = exports.PopScreenContent = exports.getIsMinimized = exports.restore = exports.minimize = void 0;
exports.hasOverlayPermission = hasOverlayPermission;
exports.requestOverlayPermission = requestOverlayPermission;
exports.hasBatteryOptimizationExemption = hasBatteryOptimizationExemption;
exports.requestBatteryOptimizationExemption = requestBatteryOptimizationExemption;
exports.show = show;
exports.hide = hide;
exports.destroy = destroy;
exports.getReactArchitectureInfo = getReactArchitectureInfo;
exports.addDragUpdateListener = addDragUpdateListener;
exports.addResizeUpdateListener = addResizeUpdateListener;
exports.addWindowStateChangeListener = addWindowStateChangeListener;
exports.addPermissionResultListener = addPermissionResultListener;
exports.setWindowRect = setWindowRect;
exports.setSizeConstraints = setSizeConstraints;
const PopScreenModule_1 = require("./PopScreenModule");
const react_native_1 = require("react-native");
const { PopScreen } = react_native_1.NativeModules;
// ─── Permission functions ────────────────────────────────────────────
async function hasOverlayPermission() {
    return PopScreenModule_1.PopScreenModule.hasOverlayPermission();
}
async function requestOverlayPermission() {
    return PopScreenModule_1.PopScreenModule.requestOverlayPermission();
}
// ─── Battery optimization (Milestone 6) ──────────────────────────────
async function hasBatteryOptimizationExemption() {
    return PopScreenModule_1.PopScreenModule.hasBatteryOptimizationExemption();
}
async function requestBatteryOptimizationExemption() {
    return PopScreenModule_1.PopScreenModule.requestBatteryOptimizationExemption();
}
// ─── Overlay lifecycle ───────────────────────────────────────────────
async function show() {
    return PopScreenModule_1.PopScreenModule.show();
}
async function hide() {
    return PopScreenModule_1.PopScreenModule.hide();
}
async function destroy() {
    return PopScreenModule_1.PopScreenModule.destroy();
}
// ─── Architecture detection ──────────────────────────────────────────
async function getReactArchitectureInfo() {
    return PopScreenModule_1.PopScreenModule.getReactArchitectureInfo();
}
// ─── Drag / Resize event listeners (Milestones 3-4) ──────────────────
const eventEmitter = PopScreen ? new react_native_1.NativeEventEmitter(PopScreen) : null;
function addDragUpdateListener(listener) {
    const subscription = eventEmitter === null || eventEmitter === void 0 ? void 0 : eventEmitter.addListener('onDragUpdate', listener);
    return { remove: () => subscription === null || subscription === void 0 ? void 0 : subscription.remove() };
}
function addResizeUpdateListener(listener) {
    const subscription = eventEmitter === null || eventEmitter === void 0 ? void 0 : eventEmitter.addListener('onResizeUpdate', listener);
    return { remove: () => subscription === null || subscription === void 0 ? void 0 : subscription.remove() };
}
// ─── Lifecycle event listeners (Milestone 6) ─────────────────────────
function addWindowStateChangeListener(listener) {
    const subscription = eventEmitter === null || eventEmitter === void 0 ? void 0 : eventEmitter.addListener('onWindowStateChange', listener);
    return { remove: () => subscription === null || subscription === void 0 ? void 0 : subscription.remove() };
}
function addPermissionResultListener(listener) {
    const subscription = eventEmitter === null || eventEmitter === void 0 ? void 0 : eventEmitter.addListener('onPermissionResult', listener);
    return { remove: () => subscription === null || subscription === void 0 ? void 0 : subscription.remove() };
}
// ─── Generic window rect control (Milestone 4) ───────────────────────
async function setWindowRect(x, y, width, height) {
    return PopScreenModule_1.PopScreenModule.setWindowRect(x, y, width, height);
}
async function setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight) {
    return PopScreenModule_1.PopScreenModule.setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight);
}
// ─── Minimize / Restore ──────────────────────────────────────────────
var minimizeRestore_1 = require("./minimizeRestore");
Object.defineProperty(exports, "minimize", { enumerable: true, get: function () { return minimizeRestore_1.minimize; } });
Object.defineProperty(exports, "restore", { enumerable: true, get: function () { return minimizeRestore_1.restore; } });
Object.defineProperty(exports, "getIsMinimized", { enumerable: true, get: function () { return minimizeRestore_1.getIsMinimized; } });
// ─── Components & helpers ────────────────────────────────────────────
var PopScreenContent_1 = require("./PopScreenContent");
Object.defineProperty(exports, "PopScreenContent", { enumerable: true, get: function () { return __importDefault(PopScreenContent_1).default; } });
var registerOverlaySurface_1 = require("./registerOverlaySurface");
Object.defineProperty(exports, "registerOverlaySurface", { enumerable: true, get: function () { return registerOverlaySurface_1.registerOverlaySurface; } });
// ─── Shared store hook ───────────────────────────────────────────────
var usePopScreen_1 = require("./usePopScreen");
Object.defineProperty(exports, "usePopScreen", { enumerable: true, get: function () { return usePopScreen_1.usePopScreen; } });
Object.defineProperty(exports, "getPopScreenState", { enumerable: true, get: function () { return usePopScreen_1.getPopScreenState; } });
// ─── Re-export types ─────────────────────────────────────────────────
__exportStar(require("./PopScreen.types"), exports);
//# sourceMappingURL=index.js.map