import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { PopScreenModule } from './PopScreenModule';

export interface PopScreenHeaderProps {
  /** Title text shown in the middle of the header */
  title?: string;
  /** Custom callback for Cancel button (defaults to hiding the overlay) */
  onCancel?: () => void;
  /** Custom callback for Back to Main App button (defaults to opening main app and hiding overlay) */
  onBackToApp?: () => void;
  /** Whether to show the Cancel button (default: true) */
  showCancel?: boolean;
  /** Whether to show the Back to Main App button (default: true) */
  showBackToApp?: boolean;
  /** Custom text for Cancel button (default: "Cancel") */
  cancelText?: string;
  /** Custom text for Back to Main App button (default: "Back to Main App") */
  backToAppText?: string;
  /** Whether to force compact layout for small overlay widths */
  compact?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom title text style */
  titleStyle?: StyleProp<TextStyle>;
  /** Custom button container style */
  buttonStyle?: StyleProp<ViewStyle>;
  /** Custom button text style */
  buttonTextStyle?: StyleProp<TextStyle>;
  /** Custom header children node (overrides default title and buttons if provided) */
  children?: React.ReactNode;
}

export default function PopScreenHeader({
  title = 'Overlay',
  onCancel,
  onBackToApp,
  showCancel = true,
  showBackToApp = true,
  cancelText = 'Cancel',
  backToAppText = 'Back to Main App',
  compact,
  style,
  titleStyle,
  buttonStyle,
  buttonTextStyle,
  children,
}: PopScreenHeaderProps) {
  const [headerWidth, setHeaderWidth] = React.useState<number | undefined>(undefined);
  const isNarrow = compact ?? (headerWidth !== undefined ? headerWidth < 280 : false);

  const resolvedBackToAppText =
    backToAppText === 'Back to Main App' && isNarrow ? 'Back' : backToAppText;
  const resolvedCancelText =
    cancelText === 'Cancel' && isNarrow && headerWidth !== undefined && headerWidth < 200 ? '✕' : cancelText;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      PopScreenModule.hide();
    }
  };

  const handleBackToApp = async () => {
    if (onBackToApp) {
      onBackToApp();
    } else {
      await PopScreenModule.openApp();
      await PopScreenModule.hide();
    }
  };

  if (children) {
    return <View style={[styles.headerContainer, style]}>{children}</View>;
  }

  return (
    <View
      style={[styles.headerContainer, style]}
      onLayout={(e) => {
        const w = e.nativeEvent?.layout?.width;
        if (w && w !== headerWidth) {
          setHeaderWidth(w);
        }
      }}
    >
      {showBackToApp ? (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.backButton,
            buttonStyle,
            pressed && styles.pressed,
          ]}
          onPress={handleBackToApp}
          accessibilityRole="button"
          accessibilityLabel={resolvedBackToAppText}
          testID="header-back-to-app-button"
        >
          <Text style={[styles.backButtonText, buttonTextStyle]} numberOfLines={1}>
            {resolvedBackToAppText}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.buttonPlaceholder} />
      )}

      {title ? (
        <Text style={[styles.titleText, titleStyle]} numberOfLines={1} testID="header-title">
          {title}
        </Text>
      ) : null}

      {showCancel ? (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.cancelButton,
            buttonStyle,
            pressed && styles.pressed,
          ]}
          onPress={handleCancel}
          accessibilityRole="button"
          accessibilityLabel={resolvedCancelText}
          testID="header-cancel-button"
        >
          <Text style={[styles.cancelButtonText, buttonTextStyle]} numberOfLines={1}>
            {resolvedCancelText}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.buttonPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  button: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  backButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  backButtonText: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  cancelButtonText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  titleText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
    flexShrink: 1,
    marginHorizontal: 4,
  },
  buttonPlaceholder: {
    width: 44,
  },
  pressed: {
    opacity: 0.7,
  },
});
