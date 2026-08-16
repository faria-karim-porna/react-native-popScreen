import { NativeModules } from 'react-native';
import { ReactArchitectureInfo, DragMode } from './PopScreen.types';

const { PopScreen } = NativeModules;

export interface PopScreenNativeModule {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  hasBatteryOptimizationExemption(): Promise<boolean>;
  requestBatteryOptimizationExemption(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  destroy(): Promise<void>;
  openApp(): Promise<void>;
  getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
  setWindowRect(x?: number, y?: number, width?: number, height?: number): Promise<void>;
  setSizeConstraints(minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<void>;
  setHandleDimensions(dragHandleHeightDp?: number, resizeHandleSizeDp?: number): Promise<void>;
  setDragMode(mode?: number): Promise<void>;
}

const DEFAULT_MIN_SIZE_DP = 150;
const DEFAULT_DRAG_HANDLE_DP = 32;
const DEFAULT_RESIZE_HANDLE_DP = 24;

// Fallback stub used when the native module is unavailable (e.g. in tests or on iOS).
const fallbackModule: PopScreenNativeModule = {
  hasOverlayPermission: async () => false,
  requestOverlayPermission: async () => {},
  hasBatteryOptimizationExemption: async () => false,
  requestBatteryOptimizationExemption: async () => {},
  show: async () => {},
  hide: async () => {},
  destroy: async () => {},
  openApp: async () => {},
  getReactArchitectureInfo: async () => ({
    architecture: 'UNKNOWN' as const,
    isNewArchitecture: false,
    reactNativeVersion: null,
  }),
  setWindowRect: async () => {},
  setSizeConstraints: async () => {},
  setHandleDimensions: async () => {},
  setDragMode: async () => {},
};

const rawModule = PopScreen ?? fallbackModule;

/**
 * Typed wrapper around the native PopScreen module.
 * Fills in default values for optional number params so the Android bridge
 * never receives `undefined` (which would cause a NullPointerException).
 */
export const PopScreenModule: PopScreenNativeModule = {
  ...rawModule,
  setWindowRect: (x, y, width, height) =>
    rawModule.setWindowRect?.(x ?? -1, y ?? -1, width ?? -1, height ?? -1) ?? Promise.resolve(),
  setSizeConstraints: (minWidth, minHeight, maxWidth, maxHeight) =>
    rawModule.setSizeConstraints?.(
      minWidth ?? DEFAULT_MIN_SIZE_DP,
      minHeight ?? DEFAULT_MIN_SIZE_DP,
      maxWidth ?? 0,
      maxHeight ?? 0
    ) ?? Promise.resolve(),
  setHandleDimensions: (dragHandleHeightDp, resizeHandleSizeDp) =>
    rawModule.setHandleDimensions?.(
      dragHandleHeightDp ?? DEFAULT_DRAG_HANDLE_DP,
      resizeHandleSizeDp ?? DEFAULT_RESIZE_HANDLE_DP
    ) ?? Promise.resolve(),
  setDragMode: (mode) => rawModule.setDragMode?.(mode ?? NATIVE_DRAG_MODE.BAND) ?? Promise.resolve(),
};

/**
 * Numeric drag-mode constants that match the values in OverlayService.kt.
 * 1 = top drag-handle band, 2 = whole body.
 */
export const NATIVE_DRAG_MODE = { BAND: 1, BODY: 2 } as const;

/** Convert a friendly DragMode string to its native numeric constant. */
export function resolveDragMode(mode?: DragMode): number {
  return mode === 'body' ? NATIVE_DRAG_MODE.BODY : NATIVE_DRAG_MODE.BAND;
}
