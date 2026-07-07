"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePopScreen = usePopScreen;
exports.getPopScreenState = getPopScreenState;
const createOverlayStore_1 = require("./createOverlayStore");
const useExternalStore_1 = require("./useExternalStore");
/**
 * The default shared store both surfaces import. Lives at module scope
 * so both surfaces' component trees subscribe to the exact same instance.
 */
const sharedStore = (0, createOverlayStore_1.createOverlayStore)({});
/**
 * Subscribe to a single key in the shared cross-surface store.
 * Re-renders whenever that key changes on EITHER surface.
 *
 * @param key - The store key to read/write
 * @param defaultValue - Value returned when the key hasn't been set yet
 * @returns [value, setValue] — same shape as React's useState
 */
function usePopScreen(key, defaultValue) {
    const value = (0, useExternalStore_1.useExternalStore)(sharedStore, (state) => key in state ? state[key] : defaultValue);
    const setValue = (next) => {
        sharedStore.setState((prev) => {
            const prevValue = key in prev ? prev[key] : defaultValue;
            const resolved = typeof next === 'function' ? next(prevValue) : next;
            return { [key]: resolved };
        });
    };
    return [value, setValue];
}
/**
 * Read the shared store outside a React component.
 */
function getPopScreenState() {
    return sharedStore.getState();
}
//# sourceMappingURL=usePopScreen.js.map