"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExternalStore = useExternalStore;
const react_1 = require("react");
/**
 * Subscribes a component to a slice of an OverlayStore using
 * useSyncExternalStore (React 18+), guaranteeing both surfaces
 * see consistent snapshots during concurrent rendering.
 */
function useExternalStore(store, selector) {
    return (0, react_1.useSyncExternalStore)(store.subscribe, () => selector(store.getState()));
}
//# sourceMappingURL=useExternalStore.js.map