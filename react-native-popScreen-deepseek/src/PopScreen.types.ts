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
};
