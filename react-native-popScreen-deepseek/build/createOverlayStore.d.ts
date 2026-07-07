/**
 * A minimal external store — subscribe/getState/setState pattern,
 * modeled on Zustand's vanilla store. Lives at MODULE scope so both
 * RN surfaces (main app + overlay) import the same instance.
 */
export declare function createOverlayStore<T extends Record<string, any>>(initialState: T): {
    getState: () => T;
    setState: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void;
    subscribe: (listener: () => void) => () => void;
};
export type OverlayStore<T extends Record<string, any>> = ReturnType<typeof createOverlayStore<T>>;
//# sourceMappingURL=createOverlayStore.d.ts.map