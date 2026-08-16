"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePopScreen = usePopScreen;
exports.getPopScreenState = getPopScreenState;
const createOverlayStore_1 = require("./createOverlayStore");
const useExternalStore_1 = require("./useExternalStore");
// One store shared by both the main app and the floating overlay.
const store = (0, createOverlayStore_1.createOverlayStore)({});
/**
 * Read and write a value in the shared cross-surface store.
 * Works the same as React's `useState`, but changes are visible
 * on both the main app screen and the floating overlay at the same time.
 *
 * @param key - A unique name for this piece of state (e.g. 'count', 'todos')
 * @param defaultValue - The value to use before anything has been written
 */
function usePopScreen(key, defaultValue) {
    const value = (0, useExternalStore_1.useExternalStore)(store, (state) => key in state ? state[key] : defaultValue);
    function setValue(next) {
        store.setState((prev) => {
            const current = key in prev ? prev[key] : defaultValue;
            const resolved = typeof next === 'function' ? next(current) : next;
            return { [key]: resolved };
        });
    }
    return [value, setValue];
}
/** Read the shared store outside a React component (e.g. in a callback). */
function getPopScreenState() {
    return store.getState();
}
//# sourceMappingURL=usePopScreen.js.map