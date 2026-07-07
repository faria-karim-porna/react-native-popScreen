import React, { useEffect } from 'react';
import { NativeModules } from 'react-native';

const { PopScreen } = NativeModules;

type PopScreenContentProps = {
  children: React.ReactNode;
  dragHandleHeight?: number;
  resizeHandleSize?: number;
};

/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. Also accepts optional config props that propagate
 * to the native interceptor's touch regions.
 */
export default function PopScreenContent({
  children,
  dragHandleHeight,
  resizeHandleSize,
}: PopScreenContentProps) {
  useEffect(() => {
    if (dragHandleHeight !== undefined || resizeHandleSize !== undefined) {
      PopScreen?.setHandleDimensions(dragHandleHeight, resizeHandleSize);
    }
  }, [dragHandleHeight, resizeHandleSize]);

  return <>{children}</>;
}
