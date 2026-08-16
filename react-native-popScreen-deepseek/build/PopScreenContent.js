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
const DEFAULT_HEADER_HEIGHT_DP = 40;
function PopScreenContent({ children, dragHandleHeight, resizeHandleSize, showHeader = false, header, headerProps, dragMode, shape, borderRadius, width, height, minWidth, minHeight, maxWidth, maxHeight, scrollable = true, style, contentContainerStyle, }) {
    // In 'header' mode, match drag height to the header height unless overridden
    const effectiveDragHandleHeight = dragMode === 'header' ? (dragHandleHeight !== null && dragHandleHeight !== void 0 ? dragHandleHeight : DEFAULT_HEADER_HEIGHT_DP) : dragHandleHeight;
    (0, react_1.useEffect)(() => {
        if (effectiveDragHandleHeight !== undefined || resizeHandleSize !== undefined) {
            PopScreenModule_1.PopScreenModule.setHandleDimensions(effectiveDragHandleHeight, resizeHandleSize);
        }
    }, [effectiveDragHandleHeight, resizeHandleSize]);
    (0, react_1.useEffect)(() => {
        if (dragMode !== undefined) {
            PopScreenModule_1.PopScreenModule.setDragMode((0, PopScreenModule_1.resolveDragMode)(dragMode));
        }
    }, [dragMode]);
    (0, react_1.useEffect)(() => {
        if (width !== undefined || height !== undefined) {
            PopScreenModule_1.PopScreenModule.setWindowRect(undefined, undefined, width, height);
        }
    }, [width, height]);
    (0, react_1.useEffect)(() => {
        if (minWidth !== undefined || minHeight !== undefined || maxWidth !== undefined || maxHeight !== undefined) {
            PopScreenModule_1.PopScreenModule.setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight);
        }
    }, [minWidth, minHeight, maxWidth, maxHeight]);
    const renderHeader = () => {
        if (!showHeader && !header)
            return null;
        if (header)
            return header;
        return (0, jsx_runtime_1.jsx)(PopScreenHeader_1.default, { ...headerProps });
    };
    const getComputedShapeStyle = () => {
        const activeShape = shape !== null && shape !== void 0 ? shape : 'rounded';
        let defaultRadius = 16;
        let aspectRatio = undefined;
        let shapePadding = {};
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
            borderRadius: borderRadius !== null && borderRadius !== void 0 ? borderRadius : defaultRadius,
            overflow: 'hidden',
            ...(aspectRatio !== undefined ? { aspectRatio } : {}),
            ...shapePadding,
        };
    };
    const renderBody = () => {
        if (!scrollable) {
            return (0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.body, children: children });
        }
        return ((0, jsx_runtime_1.jsx)(react_native_1.ScrollView, { style: styles.body, contentContainerStyle: [styles.bodyContent, contentContainerStyle], keyboardShouldPersistTaps: "handled", showsVerticalScrollIndicator: false, nestedScrollEnabled: true, children: (0, jsx_runtime_1.jsx)(react_native_1.ScrollView, { horizontal: true, contentContainerStyle: styles.bodyContent, showsHorizontalScrollIndicator: false, keyboardShouldPersistTaps: "handled", nestedScrollEnabled: true, children: children }) }));
    };
    return ((0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [styles.container, getComputedShapeStyle(), style], children: [renderHeader(), renderBody()] }));
}
const styles = react_native_1.StyleSheet.create({
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
//# sourceMappingURL=PopScreenContent.js.map