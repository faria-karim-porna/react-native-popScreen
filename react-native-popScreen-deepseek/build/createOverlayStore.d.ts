/**
 * A tiny key-value store that lives at module scope.
 * Because both the main app and the overlay share the same JS process,
 * they import the same instance — so state changes made in one surface
 * instantly appear in the other.
 */
export declare function createOverlayStore<T extends Record<string, any>>(initialState: T): {
    getState: () => T;
    setState: (update: Partial<T> | ((prev: T) => Partial<T>)) => void;
    subscribe: (listener: () => void) => () => void;
};
export type OverlayStore<T extends Record<string, any>> = ReturnType<typeof createOverlayStore<T>>;
//# sourceMappingURL=createOverlayStore.d.ts.map