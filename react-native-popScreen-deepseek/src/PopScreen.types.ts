export type OverlayShape = 'rectangle' | 'rounded' | 'circle' | 'square' | 'pill';

/**
 * Where the overlay window can be dragged from:
 * - `'handle'` — a top drag-handle strip sized by `dragHandleHeight` (default 32dp).
 * - `'header'` — only the header is draggable (band auto-matches the header height, default 40dp).
 * - `'body'`   — the whole overlay body is draggable (bottom-right resize corner still works).
 */
export type DragMode = 'handle' | 'header' | 'body';

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
