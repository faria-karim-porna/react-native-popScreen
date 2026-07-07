import React, { useEffect } from 'react';
import { NativeModules } from 'react-native';

const { PopScreen } = NativeModules;

/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. Also accepts optional config props that propagate
 * to the native interceptor's touch regions.
 *
 * @param {{ children: React.ReactNode, dragHandleHeight?: number, resizeHandleSize?: number }} props
 */
export default function PopScreenContent({
  children,
  dragHandleHeight,
  resizeHandleSize,
}) {
  useEffect(() => {
    if (dragHandleHeight !== undefined || resizeHandleSize !== undefined) {
      PopScreen?.setHandleDimensions(dragHandleHeight, resizeHandleSize);
    }
  }, [dragHandleHeight, resizeHandleSize]);

  return <>{children}</>;
}
