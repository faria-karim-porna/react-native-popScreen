import React from 'react';
import { StyleProp, ViewStyle, TextStyle } from 'react-native';
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
export default function PopScreenHeader({ title, onCancel, onBackToApp, showCancel, showBackToApp, cancelText, backToAppText, compact, style, titleStyle, buttonStyle, buttonTextStyle, children, }: PopScreenHeaderProps): React.JSX.Element;
//# sourceMappingURL=PopScreenHeader.d.ts.map