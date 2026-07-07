import { createOverlayStore } from './createOverlayStore';
import { useExternalStore } from './useExternalStore';

export type PopScreenSharedState = Record<string, any>;

/**
 * The default shared store both surfaces import. Lives at module scope
 * so both surfaces' component trees subscribe to the exact same instance.
 */
const sharedStore = createOverlayStore<PopScreenSharedState>({});

/**
 * Subscribe to a single key in the shared cross-surface store.
 * Re-renders whenever that key changes on EITHER surface.
 *
 * @param key - The store key to read/write
 * @param defaultValue - Value returned when the key hasn't been set yet
 * @returns [value, setValue] — same shape as React's useState
 */
export function usePopScreen<T = any>(
  key: string,
  defaultValue?: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const value = useExternalStore(sharedStore, (state) =>
    key in state ? state[key] : defaultValue
  ) as T;

  const setValue = (next: T | ((prev: T) => T)) => {
    sharedStore.setState((prev) => {
      const prevValue = key in prev ? prev[key] : defaultValue;
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prevValue) : next;
      return { [key]: resolved };
    });
  };

  return [value, setValue];
}

/**
 * Read the shared store outside a React component.
 */
export function getPopScreenState(): PopScreenSharedState {
  return sharedStore.getState();
}
