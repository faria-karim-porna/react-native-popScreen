import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { PopScreenHeaderProps } from './PopScreenHeader';
export interface PopScreenContentProps {
    children?: React.ReactNode;
    dragHandleHeight?: number;
    resizeHandleSize?: number;
    /** Whether to show the overlay header (default: false) */
    showHeader?: boolean;
    /** Custom header element to render (overrides default PopScreenHeader) */
    header?: React.ReactNode;
    /** Props passed to default PopScreenHeader when showHeader is true */
    headerProps?: PopScreenHeaderProps;
    /** Container style for PopScreenContent */
    style?: StyleProp<ViewStyle>;
}
/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. Also accepts optional config props that propagate
 * to the native interceptor's touch regions and header customization options.
 */
export default function PopScreenContent({ children, dragHandleHeight, resizeHandleSize, showHeader, header, headerProps, style, }: PopScreenContentProps): React.JSX.Element;
//# sourceMappingURL=PopScreenContent.d.ts.map