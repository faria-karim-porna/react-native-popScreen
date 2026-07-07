/**
 * A minimal external store — subscribe/getState/setState pattern,
 * modeled on Zustand's vanilla store. Lives at MODULE scope so both
 * RN surfaces (main app + overlay) import the same instance.
 */
export function createOverlayStore<T extends Record<string, any>>(initialState: T) {
  let state = initialState;
  const listeners = new Set<() => void>();

  function getState(): T {
    return state;
  }

  function setState(partial: Partial<T> | ((prev: T) => Partial<T>)) {
    const next = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}

export type OverlayStore<T> = ReturnType<typeof createOverlayStore<T>>;
