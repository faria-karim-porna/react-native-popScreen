export type PopScreenSharedState = Record<string, any>;
/**
 * Subscribe to a single key in the shared cross-surface store.
 * Re-renders whenever that key changes on EITHER surface.
 *
 * @param key - The store key to read/write
 * @param defaultValue - Value returned when the key hasn't been set yet
 * @returns [value, setValue] — same shape as React's useState
 */
export declare function usePopScreen<T = any>(key: string, defaultValue?: T): [T, (value: T | ((prev: T) => T)) => void];
/**
 * Read the shared store outside a React component.
 */
export declare function getPopScreenState(): PopScreenSharedState;
//# sourceMappingURL=usePopScreen.d.ts.map