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
 * to the native interceptor's touch regions, window rect, constraints, shape, and radius options.
 */
function PopScreenContent({ children, dragHandleHeight, resizeHandleSize, showHeader = false, header, headerProps, dragMode, shape, borderRadius, width, height, minWidth, minHeight, maxWidth, maxHeight, scrollable = true, style, contentContainerStyle, }) {
    // In 'header' mode the drag strip matches the header height (default 40dp)
    // unless the caller explicitly overrides it via dragHandleHeight.
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
        const effectiveShape = shape !== null && shape !== void 0 ? shape : (borderRadius !== undefined ? 'rounded' : 'rounded');
        let defaultRadius = 16;
        let aspectRatio = undefined;
        let shapePadding = {};
        switch (effectiveShape) {
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
        const computedRadius = borderRadius !== null && borderRadius !== void 0 ? borderRadius : defaultRadius;
        return {
            borderRadius: computedRadius,
            overflow: 'hidden',
            ...(aspectRatio !== undefined ? { aspectRatio } : {}),
            ...shapePadding,
        };
    };
    const renderBody = () => {
        if (!scrollable) {
            return (0, jsx_runtime_1.jsx)(react_native_1.View, { style: styles.body, children: children });
        }
        return ((0, jsx_runtime_1.jsx)(react_native_1.ScrollView, { style: styles.body, contentContainerStyle: [styles.bodyContent, contentContainerStyle], keyboardShouldPersistTaps: "handled", showsVerticalScrollIndicator: false, nestedScrollEnabled: true, children: children }));
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
/** Default height of the built-in PopScreenHeader (dp). */
const DEFAULT_HEADER_HEIGHT_DP = 40;
//# sourceMappingURL=PopScreenContent.js.map