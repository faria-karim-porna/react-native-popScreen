"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minimize = minimize;
exports.restore = restore;
exports.getIsMinimized = getIsMinimized;
const PopScreenModule_1 = require("./PopScreenModule");
let lastFullRect = null;
let isMinimized = false;
const MINIMIZED_SIZE = { width: 64, height: 64 };
async function minimize(currentRect, options) {
    var _a, _b;
    if (isMinimized)
        return;
    if (currentRect)
        lastFullRect = currentRect;
    isMinimized = true;
    const width = (_a = options === null || options === void 0 ? void 0 : options.width) !== null && _a !== void 0 ? _a : MINIMIZED_SIZE.width;
    const height = (_b = options === null || options === void 0 ? void 0 : options.height) !== null && _b !== void 0 ? _b : MINIMIZED_SIZE.height;
    await PopScreenModule_1.PopScreenModule.setWindowRect(undefined, undefined, width, height);
}
async function restore() {
    if (!isMinimized || !lastFullRect)
        return;
    isMinimized = false;
    await PopScreenModule_1.PopScreenModule.setWindowRect(lastFullRect.x, lastFullRect.y, lastFullRect.width, lastFullRect.height);
}
function getIsMinimized() {
    return isMinimized;
}
//# sourceMappingURL=minimizeRestore.js.map