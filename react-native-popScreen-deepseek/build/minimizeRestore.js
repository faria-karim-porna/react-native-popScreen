"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimize = minimize;
exports.restore = restore;
exports.getIsMinimized = getIsMinimized;
const PopScreenModule_1 = require("./PopScreenModule");
const DEFAULT_MINIMIZED_SIZE = { width: 64, height: 64 };
// Saved before minimizing so we can restore the original position/size.
let savedRect = null;
let minimized = false;
/** Shrink the overlay to a small bubble. Pass the current rect to restore it later. */
async function minimize(currentRect, options) {
    var _a, _b;
    if (minimized)
        return;
    if (currentRect)
        savedRect = currentRect;
    minimized = true;
    const width = (_a = options === null || options === void 0 ? void 0 : options.width) !== null && _a !== void 0 ? _a : DEFAULT_MINIMIZED_SIZE.width;
    const height = (_b = options === null || options === void 0 ? void 0 : options.height) !== null && _b !== void 0 ? _b : DEFAULT_MINIMIZED_SIZE.height;
    await PopScreenModule_1.PopScreenModule.setWindowRect(undefined, undefined, width, height);
}
/** Restore the overlay to its original size and position. */
async function restore() {
    if (!minimized || !savedRect)
        return;
    minimized = false;
    await PopScreenModule_1.PopScreenModule.setWindowRect(savedRect.x, savedRect.y, savedRect.width, savedRect.height);
}
/** Returns true if the overlay is currently minimized. */
function getIsMinimized() {
    return minimized;
}
//# sourceMappingURL=minimizeRestore.js.map