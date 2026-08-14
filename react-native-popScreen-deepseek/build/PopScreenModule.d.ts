import { ReactArchitectureInfo, DragMode } from './PopScreen.types';
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
/**
 * The native PopScreen module wrapper.
 * Sanitizes undefined numbers with default values so the Android bridge never throws NullPointerException on primitive unboxing.
 * Falls back to a stub if the native module is not available.
 */
export declare const PopScreenModule: PopScreenNativeModule;
/**
 * Native drag interceptor modes. Mirrors OverlayService.kt `DRAG_MODE_*`:
 * 1 = top drag-handle band, 2 = whole body draggable.
 */
export declare const DRAG_MODE: {
    readonly BAND: 1;
    readonly BODY: 2;
};
/** Maps the public `DragMode` string to the native interceptor mode. */
export declare function resolveDragMode(mode?: DragMode): number;
//# sourceMappingURL=PopScreenModule.d.ts.map