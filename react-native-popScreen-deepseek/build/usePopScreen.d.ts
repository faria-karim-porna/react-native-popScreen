export type SharedState = Record<string, any>;
/**
 * Read and write a value in the shared cross-surface store.
 * Works the same as React's `useState`, but changes are visible
 * on both the main app screen and the floating overlay at the same time.
 *
 * @param key - A unique name for this piece of state (e.g. 'count', 'todos')
 * @param defaultValue - The value to use before anything has been written
 */
export declare function usePopScreen<T = any>(key: string, defaultValue?: T): [T, (value: T | ((prev: T) => T)) => void];
/** Read the shared store outside a React component (e.g. in a callback). */
export declare function getPopScreenState(): SharedState;
export type PopScreenSharedState = SharedState;
//# sourceMappingURL=usePopScreen.d.ts.map