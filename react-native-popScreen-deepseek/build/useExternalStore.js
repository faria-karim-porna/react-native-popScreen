"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExternalStore = useExternalStore;
const react_1 = require("react");
// Connects a React component to a slice of an OverlayStore.
// Re-renders the component only when the selected value changes.
function useExternalStore(store, selector) {
    return (0, react_1.useSyncExternalStore)(store.subscribe, () => selector(store.getState()));
}
//# sourceMappingURL=useExternalStore.js.map