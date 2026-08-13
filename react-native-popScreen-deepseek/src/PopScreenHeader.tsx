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
  style,
  titleStyle,
  buttonStyle,
  buttonTextStyle,
  children,
}: PopScreenHeaderProps) {
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
    <View style={[styles.headerContainer, style]}>
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
          accessibilityLabel={backToAppText}
          testID="header-back-to-app-button"
        >
          <Text style={[styles.backButtonText, buttonTextStyle]} numberOfLines={1}>
            {backToAppText}
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
          accessibilityLabel={cancelText}
          testID="header-cancel-button"
        >
          <Text style={[styles.cancelButtonText, buttonTextStyle]} numberOfLines={1}>
            {cancelText}
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
    height: 40,
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
    marginHorizontal: 4,
  },
  buttonPlaceholder: {
    width: 60,
  },
  pressed: {
    opacity: 0.7,
  },
});
