import React, { useState } from 'react';
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
  /** Title text shown in the middle of the header (default: "Overlay") */
  title?: string;
  /** Custom callback when Cancel button is tapped (defaults to hiding the overlay) */
  onCancel?: () => void;
  /** Custom callback when Back button is tapped (defaults to opening main app and hiding overlay) */
  onBackToApp?: () => void;
  /** Whether to show the Cancel button (default: true) */
  showCancel?: boolean;
  /** Whether to show the Back to Main App button (default: true) */
  showBackToApp?: boolean;
  /** Text for Cancel button (default: "Cancel") */
  cancelText?: string;
  /** Text for Back button (default: "Back to Main App") */
  backToAppText?: string;
  /** Force compact layout for narrow windows */
  compact?: boolean;
  /** Custom header container style */
  style?: StyleProp<ViewStyle>;
  /** Custom title text style */
  titleStyle?: StyleProp<TextStyle>;
  /** Custom button container style */
  buttonStyle?: StyleProp<ViewStyle>;
  /** Custom button text style */
  buttonTextStyle?: StyleProp<TextStyle>;
  /** Custom header content (replaces default title and buttons) */
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
  const [headerWidth, setHeaderWidth] = useState<number | undefined>(undefined);

  // Adapt labels on narrow screens so text doesn't overflow
  const isNarrow = compact ?? (headerWidth !== undefined && headerWidth < 280);
  const isVeryNarrow = headerWidth !== undefined && headerWidth < 200;

  const displayBackText = backToAppText === 'Back to Main App' && isNarrow ? 'Back' : backToAppText;
  const displayCancelText = cancelText === 'Cancel' && isNarrow && isVeryNarrow ? '✕' : cancelText;

  const handleCancelPress = () => {
    if (onCancel) {
      onCancel();
    } else {
      PopScreenModule.hide();
    }
  };

  const handleBackToAppPress = async () => {
    if (onBackToApp) {
      onBackToApp();
    } else {
      await PopScreenModule.openApp();
      await PopScreenModule.hide();
    }
  };

  if (children) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => {
        const width = e.nativeEvent?.layout?.width;
        if (width && width !== headerWidth) {
          setHeaderWidth(width);
        }
      }}
    >
      {showBackToApp ? (
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.backButton,
            buttonStyle,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleBackToAppPress}
          accessibilityRole="button"
          accessibilityLabel={displayBackText}
          testID="header-back-to-app-button"
        >
          <Text style={[styles.backButtonText, buttonTextStyle]} numberOfLines={1}>
            {displayBackText}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.buttonSpacer} />
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
            pressed && styles.buttonPressed,
          ]}
          onPress={handleCancelPress}
          accessibilityRole="button"
          accessibilityLabel={displayCancelText}
          testID="header-cancel-button"
        >
          <Text style={[styles.cancelButtonText, buttonTextStyle]} numberOfLines={1}>
            {displayCancelText}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.buttonSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    flexShrink: 1,
    minWidth: 0,
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
  buttonSpacer: {
    width: 44,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});

