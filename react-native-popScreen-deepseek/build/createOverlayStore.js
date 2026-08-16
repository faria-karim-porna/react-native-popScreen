"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOverlayStore = createOverlayStore;
/**
 * A tiny key-value store that lives at module scope.
 * Because both the main app and the overlay share the same JS process,
 * they import the same instance — so state changes made in one surface
 * instantly appear in the other.
 */
function createOverlayStore(initialState) {
    let state = initialState;
    const subscribers = new Set();
    function getState() {
        return state;
    }
    function setState(update) {
        const changes = typeof update === 'function' ? update(state) : update;
        state = { ...state, ...changes };
        subscribers.forEach((notify) => notify());
    }
    function subscribe(listener) {
        subscribers.add(listener);
        return () => subscribers.delete(listener);
    }
    return { getState, setState, subscribe };
}
//# sourceMappingURL=createOverlayStore.js.map