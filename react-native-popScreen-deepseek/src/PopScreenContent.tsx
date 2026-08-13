import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { PopScreenModule } from './PopScreenModule';
import PopScreenHeader, { PopScreenHeaderProps } from './PopScreenHeader';

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
export default function PopScreenContent({
  children,
  dragHandleHeight,
  resizeHandleSize,
  showHeader = false,
  header,
  headerProps,
  style,
}: PopScreenContentProps) {
  useEffect(() => {
    if (dragHandleHeight !== undefined || resizeHandleSize !== undefined) {
      PopScreenModule.setHandleDimensions(dragHandleHeight, resizeHandleSize);
    }
  }, [dragHandleHeight, resizeHandleSize]);

  const renderHeader = () => {
    if (!showHeader && !header) return null;
    if (header) return header;
    return <PopScreenHeader {...headerProps} />;
  };

  return (
    <View style={[styles.container, style]}>
      {renderHeader()}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
