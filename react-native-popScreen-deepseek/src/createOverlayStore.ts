/**
 * A tiny key-value store that lives at module scope.
 * Because both the main app and the overlay share the same JS process,
 * they import the same instance — so state changes made in one surface
 * instantly appear in the other.
 */
export function createOverlayStore<T extends Record<string, any>>(initialState: T) {
  let state = initialState;
  const subscribers = new Set<() => void>();

  function getState(): T {
    return state;
  }

  function setState(update: Partial<T> | ((prev: T) => Partial<T>)) {
    const changes = typeof update === 'function' ? update(state) : update;
    state = { ...state, ...changes };
    subscribers.forEach((notify) => notify());
  }

  function subscribe(listener: () => void): () => void {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  return { getState, setState, subscribe };
}

export type OverlayStore<T extends Record<string, any>> = ReturnType<typeof createOverlayStore<T>>;
