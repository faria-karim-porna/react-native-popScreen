import { createOverlayStore } from '../createOverlayStore';

describe('createOverlayStore', () => {
  it('returns initial state', () => {
    const store = createOverlayStore({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('updates state with a partial object', () => {
    const store = createOverlayStore({ count: 0, name: 'a' });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, name: 'a' });
  });

  it('updates state with a function', () => {
    const store = createOverlayStore({ count: 5 });
    store.setState((prev) => ({ count: prev.count + 1 }));
    expect(store.getState().count).toBe(6);
  });

  it('notifies all subscribers on setState', () => {
    const store = createOverlayStore({ count: 0 });
    const listener = jest.fn();
    store.subscribe(listener);
    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes correctly — unsubscribed listener not called', () => {
    const store = createOverlayStore({ count: 0 });
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.setState({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('getState returns same reference if nothing changed', () => {
    const store = createOverlayStore({ count: 0 });
    const snapshot1 = store.getState();
    const snapshot2 = store.getState();
    expect(snapshot1).toBe(snapshot2);
  });

  it('getState returns new reference after setState', () => {
    const store = createOverlayStore({ count: 0 });
    const snapshot1 = store.getState();
    store.setState({ count: 1 });
    const snapshot2 = store.getState();
    expect(snapshot1).not.toBe(snapshot2);
  });
});
