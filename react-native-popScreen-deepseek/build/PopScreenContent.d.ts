import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PopScreenHeaderProps } from './PopScreenHeader';
import { OverlayShape, DragMode } from './PopScreen.types';
export interface PopScreenContentProps {
    children?: React.ReactNode;
    /** Height of top drag strip in dp when dragMode is 'handle' (default: 32) */
    dragHandleHeight?: number;
    /** Bottom-right resize handle size in dp (default: 24) */
    resizeHandleSize?: number;
    /** Where to drag from: 'handle' (top strip), 'header' (header area), or 'body' (whole window) */
    dragMode?: DragMode;
    /** Whether to show the overlay header (default: false) */
    showHeader?: boolean;
    /** Custom header element to render */
    header?: React.ReactNode;
    /** Props passed to default PopScreenHeader */
    headerProps?: PopScreenHeaderProps;
    /** Overlay shape: 'rectangle' | 'rounded' | 'circle' | 'square' | 'pill' (default: 'rounded') */
    shape?: OverlayShape;
    /** Custom corner radius in dp (overrides shape preset radius) */
    borderRadius?: number;
    /** Initial overlay width in dp */
    width?: number;
    /** Initial overlay height in dp */
    height?: number;
    /** Minimum overlay width in dp */
    minWidth?: number;
    /** Minimum overlay height in dp */
    minHeight?: number;
    /** Maximum overlay width in dp */
    maxWidth?: number;
    /** Maximum overlay height in dp */
    maxHeight?: number;
    /**
     * Whether inner content should scroll if it overflows the window (default: true).
     * Set to false if children manage their own scrolling (e.g. FlatList).
     */
    scrollable?: boolean;
    /** Custom style for the root container */
    style?: StyleProp<ViewStyle>;
    /** Custom style for the inner scroll container */
    contentContainerStyle?: StyleProp<ViewStyle>;
}
export default function PopScreenContent({ children, dragHandleHeight, resizeHandleSize, showHeader, header, headerProps, dragMode, shape, borderRadius, width, height, minWidth, minHeight, maxWidth, maxHeight, scrollable, style, contentContainerStyle, }: PopScreenContentProps): React.JSX.Element;
//# sourceMappingURL=PopScreenContent.d.ts.map