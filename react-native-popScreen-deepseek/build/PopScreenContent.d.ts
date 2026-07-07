/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. Also accepts optional config props that propagate
 * to the native interceptor's touch regions.
 *
 * @param {{ children: React.ReactNode, dragHandleHeight?: number, resizeHandleSize?: number }} props
 */
export default function PopScreenContent({ children, dragHandleHeight, resizeHandleSize, }: {
    children: React.ReactNode;
    dragHandleHeight?: number;
    resizeHandleSize?: number;
}): React.JSX.Element;
import React from 'react';
//# sourceMappingURL=PopScreenContent.d.ts.map