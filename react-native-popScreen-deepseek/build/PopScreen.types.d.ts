export type ReactArchitecture = 'NEW_ARCHITECTURE' | 'OLD_ARCHITECTURE' | 'UNKNOWN';
export type ReactArchitectureInfo = {
    architecture: ReactArchitecture;
    isNewArchitecture: boolean;
    reactNativeVersion: string | null;
};
export type DragUpdatePhase = 'start' | 'move' | 'end';
export type DragUpdateEvent = {
    phase: DragUpdatePhase;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
};
export type ResizeUpdateEvent = {
    phase: 'start' | 'move' | 'end';
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