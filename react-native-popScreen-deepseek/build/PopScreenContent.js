"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PopScreenContent;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const PopScreenModule_1 = require("./PopScreenModule");
const PopScreenHeader_1 = __importDefault(require("./PopScreenHeader"));
/**
 * Wraps whatever arbitrary RN content the developer wants shown in the
 * floating overlay. Also accepts optional config props that propagate
 * to the native interceptor's touch regions and header customization options.
 */
function PopScreenContent({ children, dragHandleHeight, resizeHandleSize, showHeader = false, header, headerProps, style, }) {
    (0, react_1.useEffect)(() => {
        if (dragHandleHeight !== undefined || resizeHandleSize !== undefined) {
            PopScreenModule_1.PopScreenModule.setHandleDimensions(dragHandleHeight, resizeHandleSize);
        }
    }, [dragHandleHeight, resizeHandleSize]);
    const renderHeader = () => {
        if (!showHeader && !header)
            return null;
        if (header)
            return header;
        return (0, jsx_runtime_1.jsx)(PopScreenHeader_1.default, { ...headerProps });
    };
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, style], children: [renderHeader(), children] }));
}
const styles = react_native_1.StyleSheet.create({
    container: {
        flex: 1,
    },
});
//# sourceMappingURL=PopScreenContent.js.map