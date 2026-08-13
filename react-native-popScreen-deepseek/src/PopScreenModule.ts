import { NativeModules } from 'react-native';
import { ReactArchitectureInfo } from './PopScreen.types';

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
}

const DEFAULT_MIN_SIZE = 150;
const DEFAULT_DRAG_HANDLE_DP = 32;
const DEFAULT_RESIZE_HANDLE_DP = 24;

const rawModule = PopScreen ?? {
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
};

/**
 * The native PopScreen module wrapper.
 * Sanitizes undefined numbers with default values so the Android bridge never throws NullPointerException on primitive unboxing.
 * Falls back to a stub if the native module is not available.
 */
export const PopScreenModule: PopScreenNativeModule = {
  ...rawModule,
  setWindowRect: (x, y, width, height) =>
    rawModule.setWindowRect?.(
      x ?? -1,
      y ?? -1,
      width ?? -1,
      height ?? -1
    ) ?? Promise.resolve(),
  setSizeConstraints: (minWidth, minHeight, maxWidth, maxHeight) =>
    rawModule.setSizeConstraints?.(
      minWidth ?? DEFAULT_MIN_SIZE,
      minHeight ?? DEFAULT_MIN_SIZE,
      maxWidth ?? 0,
      maxHeight ?? 0
    ) ?? Promise.resolve(),
  setHandleDimensions: (dragHandleHeightDp, resizeHandleSizeDp) =>
    rawModule.setHandleDimensions?.(
      dragHandleHeightDp ?? DEFAULT_DRAG_HANDLE_DP,
      resizeHandleSizeDp ?? DEFAULT_RESIZE_HANDLE_DP
    ) ?? Promise.resolve(),
};

