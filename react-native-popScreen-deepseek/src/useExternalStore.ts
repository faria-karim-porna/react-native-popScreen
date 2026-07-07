import { useSyncExternalStore } from 'react';
import { OverlayStore } from './createOverlayStore';

/**
 * Subscribes a component to a slice of an OverlayStore using
 * useSyncExternalStore (React 18+), guaranteeing both surfaces
 * see consistent snapshots during concurrent rendering.
 */
export function useExternalStore<T extends Record<string, any>, S>(
  store: OverlayStore<T>,
  selector: (state: T) => S
): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
