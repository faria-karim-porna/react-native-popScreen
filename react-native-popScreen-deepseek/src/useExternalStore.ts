import { useSyncExternalStore } from 'react';
import { OverlayStore } from './createOverlayStore';

// Connects a React component to a slice of an OverlayStore.
// Re-renders the component only when the selected value changes.
export function useExternalStore<T extends Record<string, any>, S>(
  store: OverlayStore<T>,
  selector: (state: T) => S
): S {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
