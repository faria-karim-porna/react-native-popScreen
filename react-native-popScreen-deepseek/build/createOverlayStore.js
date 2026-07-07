"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOverlayStore = createOverlayStore;
/**
 * A minimal external store — subscribe/getState/setState pattern,
 * modeled on Zustand's vanilla store. Lives at MODULE scope so both
 * RN surfaces (main app + overlay) import the same instance.
 */
function createOverlayStore(initialState) {
    let state = initialState;
    const listeners = new Set();
    function getState() {
        return state;
    }
    function setState(partial) {
        const next = typeof partial === 'function' ? partial(state) : partial;
        state = { ...state, ...next };
        listeners.forEach((listener) => listener());
    }
    function subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    }
    return { getState, setState, subscribe };
}
//# sourceMappingURL=createOverlayStore.js.map