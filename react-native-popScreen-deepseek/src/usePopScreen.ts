import { createOverlayStore } from './createOverlayStore';
import { useExternalStore } from './useExternalStore';

export type SharedState = Record<string, any>;

// One store shared by both the main app and the floating overlay.
const store = createOverlayStore<SharedState>({});

/**
 * Read and write a value in the shared cross-surface store.
 * Works the same as React's `useState`, but changes are visible
 * on both the main app screen and the floating overlay at the same time.
 *
 * @param key - A unique name for this piece of state (e.g. 'count', 'todos')
 * @param defaultValue - The value to use before anything has been written
 */
export function usePopScreen<T = any>(
  key: string,
  defaultValue?: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const value = useExternalStore(store, (state) =>
    key in state ? state[key] : defaultValue
  ) as T;

  function setValue(next: T | ((prev: T) => T)) {
    store.setState((prev) => {
      const current = key in prev ? prev[key] : defaultValue;
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(current) : next;
      return { [key]: resolved };
    });
  }

  return [value, setValue];
}

/** Read the shared store outside a React component (e.g. in a callback). */
export function getPopScreenState(): SharedState {
  return store.getState();
}

// Keep the old type name exported so existing code doesn't break.
export type PopScreenSharedState = SharedState;
