import React from 'react';
import { StyleProp, ViewStyle, TextStyle } from 'react-native';
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
export default function PopScreenHeader({ title, onCancel, onBackToApp, showCancel, showBackToApp, cancelText, backToAppText, style, titleStyle, buttonStyle, buttonTextStyle, children, }: PopScreenHeaderProps): React.JSX.Element;
//# sourceMappingURL=PopScreenHeader.d.ts.map