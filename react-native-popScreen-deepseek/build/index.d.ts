import { DragUpdateEvent, ResizeUpdateEvent, WindowStateChangeEvent, PermissionResultEvent, DragMode } from './PopScreen.types';
export declare function hasOverlayPermission(): Promise<boolean>;
export declare function requestOverlayPermission(): Promise<void>;
export declare function hasBatteryOptimizationExemption(): Promise<boolean>;
export declare function requestBatteryOptimizationExemption(): Promise<void>;
export declare function show(): Promise<void>;
export declare function hide(): Promise<void>;
export declare function destroy(): Promise<void>;
export declare function openApp(): Promise<void>;
export declare function getReactArchitectureInfo(): Promise<import("./PopScreen.types").ReactArchitectureInfo>;
export declare function addDragUpdateListener(listener: (event: DragUpdateEvent) => void): {
    remove: () => void | undefined;
};
export declare function addResizeUpdateListener(listener: (event: ResizeUpdateEvent) => void): {
    remove: () => void | undefined;
};
export declare function addWindowStateChangeListener(listener: (event: WindowStateChangeEvent) => void): {
    remove: () => void | undefined;
};
export declare function addPermissionResultListener(listener: (event: PermissionResultEvent) => void): {
    remove: () => void | undefined;
};
export declare function setWindowRect(x?: number, y?: number, width?: number, height?: number): Promise<void>;
export declare function setSizeConstraints(minWidth?: number, minHeight?: number, maxWidth?: number, maxHeight?: number): Promise<void>;
/** Set where the overlay can be dragged from: 'handle', 'header', or 'body'. */
export declare function setDragMode(mode: DragMode): Promise<void>;
export { minimize, restore, getIsMinimized } from './minimizeRestore';
export { default as PopScreenContent } from './PopScreenContent';
export type { PopScreenContentProps } from './PopScreenContent';
export { default as PopScreenHeader } from './PopScreenHeader';
export type { PopScreenHeaderProps } from './PopScreenHeader';
export { registerOverlaySurface } from './registerOverlaySurface';
export { usePopScreen, getPopScreenState } from './usePopScreen';
export * from './PopScreen.types';
//# sourceMappingURL=index.d.ts.map