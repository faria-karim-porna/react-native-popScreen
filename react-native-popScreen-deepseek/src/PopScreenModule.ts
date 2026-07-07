import { NativeModules } from 'react-native';
import { ReactArchitectureInfo } from './PopScreen.types';

const { PopScreen } = NativeModules;

export interface PopScreenNativeModule {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
  setWindowRect(x?: number, y?: number, width?: number, height?: number): Promise<void>;
  setSizeConstraints(minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<void>;
  setHandleDimensions(dragHandleHeightDp?: number, resizeHandleSizeDp?: number): Promise<void>;
}

/**
 * The native PopScreen module.
 * Falls back to a stub if the native module is not available.
 */
export const PopScreenModule: PopScreenNativeModule = PopScreen ?? {
  hasOverlayPermission: async () => false,
  requestOverlayPermission: async () => {},
  show: async () => {},
  hide: async () => {},
  getReactArchitectureInfo: async () => ({
    architecture: 'UNKNOWN' as const,
    isNewArchitecture: false,
    reactNativeVersion: null,
  }),
  setWindowRect: async () => {},
  setSizeConstraints: async () => {},
  setHandleDimensions: async () => {},
};
