import { OverlayStore } from './createOverlayStore';
export declare function useExternalStore<T extends Record<string, any>, S>(store: OverlayStore<T>, selector: (state: T) => S): S;
//# sourceMappingURL=useExternalStore.d.ts.map