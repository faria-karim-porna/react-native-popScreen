import { ReactArchitectureInfo } from './PopScreen.types';
export interface PopScreenNativeModule {
    hasOverlayPermission(): Promise<boolean>;
    requestOverlayPermission(): Promise<void>;
    hasBatteryOptimizationExemption(): Promise<boolean>;
    requestBatteryOptimizationExemption(): Promise<void>;
    show(): Promise<void>;
    hide(): Promise<void>;
    destroy(): Promise<void>;
    getReactArchitectureInfo(): Promise<ReactArchitectureInfo>;
    setWindowRect(x?: number, y?: number, width?: number, height?: number): Promise<void>;
    setSizeConstraints(minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<void>;
    setHandleDimensions(dragHandleHeightDp?: number, resizeHandleSizeDp?: number): Promise<void>;
}
/**
 * The native PopScreen module.
 * Falls back to a stub if the native module is not available.
 */
export declare const PopScreenModule: PopScreenNativeModule;
//# sourceMappingURL=PopScreenModule.d.ts.map