import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { PopScreenModule, resolveDragMode } from './PopScreenModule';
import PopScreenHeader, { PopScreenHeaderProps } from './PopScreenHeader';
import { OverlayShape, DragMode } from './PopScreen.types';

const DEFAULT_HEADER_HEIGHT_DP = 40;

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

export default function PopScreenContent({
  children,
  dragHandleHeight,
  resizeHandleSize,
  showHeader = false,
  header,
  headerProps,
  dragMode,
  shape,
  borderRadius,
  width,
  height,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  scrollable = true,
  style,
  contentContainerStyle,
}: PopScreenContentProps) {
  // In 'header' mode, match drag height to the header height unless overridden
  const effectiveDragHandleHeight =
    dragMode === 'header' ? (dragHandleHeight ?? DEFAULT_HEADER_HEIGHT_DP) : dragHandleHeight;

  useEffect(() => {
    if (effectiveDragHandleHeight !== undefined || resizeHandleSize !== undefined) {
      PopScreenModule.setHandleDimensions(effectiveDragHandleHeight, resizeHandleSize);
    }
  }, [effectiveDragHandleHeight, resizeHandleSize]);

  useEffect(() => {
    if (dragMode !== undefined) {
      PopScreenModule.setDragMode(resolveDragMode(dragMode));
    }
  }, [dragMode]);

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
    const activeShape = shape ?? 'rounded';
    let defaultRadius = 16;
    let aspectRatio: number | undefined = undefined;
    let shapePadding: ViewStyle = {};

    switch (activeShape) {
      case 'circle':
        defaultRadius = 9999;
        aspectRatio = 1;
        shapePadding = { paddingHorizontal: 12, paddingVertical: 10 };
        break;
      case 'pill':
        defaultRadius = 9999;
        shapePadding = { paddingHorizontal: 12, paddingVertical: 6 };
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

    return {
      borderRadius: borderRadius ?? defaultRadius,
      overflow: 'hidden',
      ...(aspectRatio !== undefined ? { aspectRatio } : {}),
      ...shapePadding,
    };
  };

  const renderBody = () => {
    if (!scrollable) {
      return <View style={styles.body}>{children}</View>;
    }

    return (
      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <ScrollView
          horizontal
          contentContainerStyle={styles.bodyContent}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {children}
        </ScrollView>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, getComputedShapeStyle(), style]}>
      {renderHeader()}
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
});

