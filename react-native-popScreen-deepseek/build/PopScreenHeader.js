"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PopScreenHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_native_1 = require("react-native");
const PopScreenModule_1 = require("./PopScreenModule");
function PopScreenHeader({ title = 'Overlay', onCancel, onBackToApp, showCancel = true, showBackToApp = true, cancelText = 'Cancel', backToAppText = 'Back to Main App', style, titleStyle, buttonStyle, buttonTextStyle, children, }) {
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        else {
            PopScreenModule_1.PopScreenModule.hide();
        }
    };
    const handleBackToApp = async () => {
        if (onBackToApp) {
            onBackToApp();
        }
        else {
            await PopScreenModule_1.PopScreenModule.openApp();
            await PopScreenModule_1.PopScreenModule.hide();
        }
    };
    if (children) {
        return (0, jsx_runtime_1.jsx)(react_native_1.View, { style: [styles.headerContainer, style], children: children });
    }
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.headerContainer, style], children: [showBackToApp ? ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { style: ({ pressed }) => [
                    styles.button,
                    styles.backButton,
                    buttonStyle,
                    pressed && styles.pressed,
                ], onPress: handleBackToApp, accessibilityRole: "button", accessibilityLabel: backToAppText, testID: "header-back-to-app-button", children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.backButtonText, buttonTextStyle], numberOfLines: 1, children: backToAppText }) })) : ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.buttonPlaceholder })), title ? ((0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.titleText, titleStyle], numberOfLines: 1, testID: "header-title", children: title })) : null, showCancel ? ((0, jsx_runtime_1.jsx)(react_native_1.Pressable, { style: ({ pressed }) => [
                    styles.button,
                    styles.cancelButton,
                    buttonStyle,
                    pressed && styles.pressed,
                ], onPress: handleCancel, accessibilityRole: "button", accessibilityLabel: cancelText, testID: "header-cancel-button", children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [styles.cancelButtonText, buttonTextStyle], numberOfLines: 1, children: cancelText }) })) : ((0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.buttonPlaceholder }))] }));
}
const styles = react_native_1.StyleSheet.create({
    headerContainer: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderBottomWidth: react_native_1.StyleSheet.hairlineWidth,
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
//# sourceMappingURL=PopScreenHeader.js.map