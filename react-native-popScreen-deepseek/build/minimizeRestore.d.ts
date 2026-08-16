type Rect = {
    x: number;
    y: number;
    width: number;
    height: number;
};
type MinimizeOptions = {
    width?: number;
    height?: number;
};
/** Shrink the overlay to a small bubble. Pass the current rect to restore it later. */
export declare function minimize(currentRect?: Rect, options?: MinimizeOptions): Promise<void>;
/** Restore the overlay to its original size and position. */
export declare function restore(): Promise<void>;
/** Returns true if the overlay is currently minimized. */
export declare function getIsMinimized(): boolean;
export {};
//# sourceMappingURL=minimizeRestore.d.ts.map