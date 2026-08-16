/** Shape of the floating overlay window. */
export type OverlayShape = 'rectangle' | 'rounded' | 'circle' | 'square' | 'pill';
/**
 * Where the overlay window can be dragged from:
 * - `'handle'` — a top drag-handle strip (default, 32dp tall).
 * - `'header'` — the header area is draggable (auto-sizes to header height).
 * - `'body'`   — the whole overlay is draggable.
 */
export type DragMode = 'handle' | 'header' | 'body';
export type ReactArchitecture = 'NEW_ARCHITECTURE' | 'OLD_ARCHITECTURE' | 'UNKNOWN';
export type ReactArchitectureInfo = {
    architecture: ReactArchitecture;
    isNewArchitecture: boolean;
    reactNativeVersion: string | null;
};
export type GesturePhase = 'start' | 'move' | 'end';
export type DragUpdateEvent = {
    phase: GesturePhase;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
};
export type ResizeUpdateEvent = {
    phase: GesturePhase;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
};
export type WindowState = 'shown' | 'hidden' | 'destroyed';
export type WindowStateChangeEvent = {
    state: WindowState;
    reason?: 'permission_revoked' | 'not_granted' | string;
};
export type PermissionResultEvent = {
    granted: boolean;
    reason?: string;
};
//# sourceMappingURL=PopScreen.types.d.ts.map