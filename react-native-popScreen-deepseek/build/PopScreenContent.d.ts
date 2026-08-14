import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PopScreenHeaderProps } from './PopScreenHeader';
import { OverlayShape, DragMode } from './PopScreen.types';
export interface PopScreenContentProps {
    children?: React.ReactNode;
    /** Height of the top drag-handle strip in dp when `dragMode` is 'handle' (default: 32) */
    dragHandleHeight?: number;
    /** Bottom-right resize handle target size in dp (default: 24) */
    resizeHandleSize?: number;
    /**
     * Where the overlay can be dragged from (default: 'handle').
     * - 'handle': a top strip sized by `dragHandleHeight`.
     * - 'header': only the header is draggable — the strip auto-matches the
     *   header height (default 40dp) unless `dragHandleHeight` overrides it.
     * - 'body': the whole overlay body is draggable.
     */
    dragMode?: DragMode;
    /** Whether to show the overlay header (default: false) */
    showHeader?: boolean;
    /** Custom header element to render (overrides default PopScreenHeader) */
    header?: React.ReactNode;
    /** Props passed to default PopScreenHeader when showHeader is true */
    headerProps?: PopScreenHeaderProps;
    /** Overlay shape preset: 'rectangle' | 'rounded' | 'circle' | 'square' | 'pill' (default: 'rounded') */
    shape?: OverlayShape;
    /** Corner radius in dp (overrides shape default radius if set) */
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
     * Whether the content body scrolls when it exceeds the overlay size
     * (default: true). Set to `false` if children manage their own scrolling
     * (e.g. a `FlatList`) — nesting a VirtualizedList inside the ScrollView
     * would break scrolling.
     */
    scrollable?: boolean;
    /** Container style for PopScreenContent */
    style?: StyleProp<ViewStyle>;
    /** Content container style for inner ScrollView */
    contentContainerStyle?: StyleProp<ViewStyle>;
}
/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. Also accepts optional config props that propagate
 * to the native interceptor's touch regions, window rect, constraints, shape, and radius options.
 */
export default function PopScreenContent({ children, dragHandleHeight, resizeHandleSize, showHeader, header, headerProps, dragMode, shape, borderRadius, width, height, minWidth, minHeight, maxWidth, maxHeight, scrollable, style, contentContainerStyle, }: PopScreenContentProps): React.JSX.Element;
//# sourceMappingURL=PopScreenContent.d.ts.map