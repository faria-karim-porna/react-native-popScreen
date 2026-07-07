import { renderHook, act } from '@testing-library/react-hooks';
import { usePopScreen } from '../usePopScreen';

describe('usePopScreen', () => {
  it('returns defaultValue when key has not been set', () => {
    const { result } = renderHook(() => usePopScreen('testKey', 42));
    expect(result.current[0]).toBe(42);
  });

  it('setter updates the value', () => {
    const { result } = renderHook(() => usePopScreen<number>('setterKey', 0));
    act(() => { result.current[1](99); });
    expect(result.current[0]).toBe(99);
  });

  it('setter accepts a function', () => {
    const { result } = renderHook(() => usePopScreen<number>('fnKey', 10));
    act(() => { result.current[1]((prev) => prev + 5); });
    expect(result.current[0]).toBe(15);
  });

  it('two hooks sharing the same key see the same value', () => {
    const { result: r1 } = renderHook(() => usePopScreen<number>('sharedKey', 0));
    const { result: r2 } = renderHook(() => usePopScreen<number>('sharedKey', 0));
    act(() => { r1.current[1](77); });
    expect(r2.current[0]).toBe(77);
  });

  it('two hooks with different keys are independent', () => {
    const { result: r1 } = renderHook(() => usePopScreen<number>('keyA', 0));
    const { result: r2 } = renderHook(() => usePopScreen<number>('keyB', 0));
    act(() => { r1.current[1](55); });
    expect(r2.current[0]).toBe(0);
  });
});
