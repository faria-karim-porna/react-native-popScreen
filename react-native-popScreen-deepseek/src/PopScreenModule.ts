import { NativeModules } from 'react-native';
import { ReactArchitectureInfo } from './PopScreen.types';

const { PopScreen } = NativeModules;

export interface PopScreenNativeModule {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  startOverlay(): Promise<void>;
  stopOverlay(): Promise<void>;
  getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
}

/**
 * The native PopScreen module.
 * Falls back to a stub if the native module is not available.
 */
export const PopScreenModule: PopScreenNativeModule = PopScreen ?? {
  hasOverlayPermission: async () => false,
  requestOverlayPermission: async () => {},
  startOverlay: async () => {},
  stopOverlay: async () => {},
  getReactArchitectureInfo: async () => ({
    architecture: 'UNKNOWN' as const,
    isNewArchitecture: false,
    reactNativeVersion: null,
  }),
};
