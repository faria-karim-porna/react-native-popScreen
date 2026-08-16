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
 * Typed wrapper around the native PopScreen module.
 * Fills in default values for optional number params so the Android bridge
 * never receives `undefined` (which would cause a NullPointerException).
 */
export declare const PopScreenModule: PopScreenNativeModule;
/**
 * Numeric drag-mode constants that match the values in OverlayService.kt.
 * 1 = top drag-handle band, 2 = whole body.
 */
export declare const NATIVE_DRAG_MODE: {
    readonly BAND: 1;
    readonly BODY: 2;
};
/** Convert a friendly DragMode string to its native numeric constant. */
export declare function resolveDragMode(mode?: DragMode): number;
//# sourceMappingURL=PopScreenModule.d.ts.map