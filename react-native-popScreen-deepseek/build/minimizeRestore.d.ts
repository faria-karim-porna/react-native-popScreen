type MinimizeOptions = {
    width?: number;
    height?: number;
};
export declare function minimize(currentRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
}, options?: MinimizeOptions): Promise<void>;
export declare function restore(): Promise<void>;
export declare function getIsMinimized(): boolean;
export {};
//# sourceMappingURL=minimizeRestore.d.ts.map