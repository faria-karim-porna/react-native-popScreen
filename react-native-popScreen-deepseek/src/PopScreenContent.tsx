import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { PopScreenModule } from './PopScreenModule';
import PopScreenHeader, { PopScreenHeaderProps } from './PopScreenHeader';
import { OverlayShape } from './PopScreen.types';

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
  /** Container style for PopScreenContent */
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. Also accepts optional config props that propagate
 * to the native interceptor's touch regions, window rect, constraints, shape, and radius options.
 */
export default function PopScreenContent({
  children,
  dragHandleHeight,
  resizeHandleSize,
  showHeader = false,
  header,
  headerProps,
  shape,
  borderRadius,
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  style,
}: PopScreenContentProps) {
  useEffect(() => {
    if (dragHandleHeight !== undefined || resizeHandleSize !== undefined) {
      PopScreenModule.setHandleDimensions(dragHandleHeight, resizeHandleSize);
    }
  }, [dragHandleHeight, resizeHandleSize]);

  useEffect(() => {
    if (width !== undefined || height !== undefined) {
      PopScreenModule.setWindowRect(undefined, undefined, width, height);
    }
  }, [width, height]);

  useEffect(() => {
    if (minWidth !== undefined || minHeight !== undefined || maxWidth !== undefined || maxHeight !== undefined) {
      PopScreenModule.setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight);
    }
  }, [minWidth, minHeight, maxWidth, maxHeight]);

  const renderHeader = () => {
    if (!showHeader && !header) return null;
    if (header) return header;
    return <PopScreenHeader {...headerProps} />;
  };

  const getComputedShapeStyle = (): ViewStyle => {
    const effectiveShape = shape ?? (borderRadius !== undefined ? 'rounded' : 'rounded');
    let defaultRadius = 16;
    let aspectRatio: number | undefined = undefined;

    switch (effectiveShape) {
      case 'circle':
        defaultRadius = 9999;
        aspectRatio = 1;
        break;
      case 'pill':
        defaultRadius = 9999;
        break;
      case 'square':
        defaultRadius = 0;
        aspectRatio = 1;
        break;
      case 'rectangle':
        defaultRadius = 0;
        break;
      case 'rounded':
      default:
        defaultRadius = 16;
        break;
    }

    const computedRadius = borderRadius ?? defaultRadius;

    return {
      borderRadius: computedRadius,
      overflow: 'hidden',
      ...(aspectRatio !== undefined ? { aspectRatio } : {}),
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
    };
  };

  return (
    <View style={[styles.container, getComputedShapeStyle(), style]}>
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
