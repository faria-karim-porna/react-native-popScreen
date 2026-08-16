import React from 'react';
import { create, act } from 'react-test-renderer';
// jest.mock is hoisted — the mock factory runs before any imports.
// It provides ALL the react-native exports our module and react-test-renderer need.
jest.mock('react-native', () => ({
  NativeModules: {
    PopScreen: {
      setHandleDimensions: jest.fn().mockResolvedValue(undefined),
      setWindowRect: jest.fn().mockResolvedValue(undefined),
      setSizeConstraints: jest.fn().mockResolvedValue(undefined),
      setDragMode: jest.fn().mockResolvedValue(undefined),
    },
  },
  Platform: { OS: 'android', Version: 30, select: (obj: any) => obj.android ?? obj.default },
  Dimensions: { get: () => ({ width: 400, height: 800 }), addEventListener: jest.fn() },
  StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
  PixelRatio: { get: () => 2, getFontScale: () => 1 },
  I18nManager: { isRTL: false },
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  Animated: {
    View: 'Animated.View',
    Text: 'Animated.Text',
    Value: class {
      _value: number;
      constructor(v: number) { this._value = v; }
      setValue(v: number) { this._value = v; }
    },
    timing: () => ({ start: (cb?: () => void) => cb?.() }),
    spring: () => ({ start: (cb?: () => void) => cb?.() }),
  },
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  Pressable: 'Pressable',
  ActivityIndicator: 'ActivityIndicator',
  FlatList: 'FlatList',
  TextInput: 'TextInput',
  Modal: 'Modal',
  SafeAreaView: 'SafeAreaView',
  StatusBar: { currentHeight: 24 },
  useColorScheme: () => 'light',
  useWindowDimensions: () => ({ width: 400, height: 800 }),
  processColor: (c: any) => c,
  requireNativeComponent: () => 'View',
  UIManager: { getViewManagerConfig: () => ({}), createView: () => {} },
  LayoutAnimation: { configureNext: () => {}, create: () => ({}) },
  LogBox: { ignoreLogs: () => {}, ignoreAllLogs: () => {} },
  Appearance: { getColorScheme: () => 'light', addChangeListener: () => ({ remove: () => {} }) },
  Alert: { alert: jest.fn() },
  findNodeHandle: () => 1,
}));

import { NativeModules, View } from 'react-native';
import PopScreenContent from '../PopScreenContent';

const mockSetHandleDimensions = NativeModules.PopScreen.setHandleDimensions;
const mockSetWindowRect = NativeModules.PopScreen.setWindowRect;
const mockSetSizeConstraints = NativeModules.PopScreen.setSizeConstraints;
const mockSetDragMode = NativeModules.PopScreen.setDragMode;

describe('PopScreenContent', () => {
  beforeEach(() => {
    mockSetHandleDimensions.mockClear();
    mockSetWindowRect.mockClear();
    mockSetSizeConstraints.mockClear();
    mockSetDragMode.mockClear();
  });

  it('calls setHandleDimensions when dragHandleHeight prop is provided', () => {
    act(() => {
      create(<PopScreenContent dragHandleHeight={48}><></></PopScreenContent>);
    });
    expect(mockSetHandleDimensions).toHaveBeenCalledWith(48, 24);
  });

  it('calls setHandleDimensions when resizeHandleSize prop is provided', () => {
    act(() => {
      create(<PopScreenContent resizeHandleSize={36}><></></PopScreenContent>);
    });
    expect(mockSetHandleDimensions).toHaveBeenCalledWith(32, 36);
  });

  it('does not call setHandleDimensions when no handle props are provided', () => {
    act(() => {
      create(<PopScreenContent><></></PopScreenContent>);
    });
    expect(mockSetHandleDimensions).not.toHaveBeenCalled();
  });

  it('does not call setDragMode when dragMode is not provided', () => {
    act(() => {
      create(<PopScreenContent><></></PopScreenContent>);
    });
    expect(mockSetDragMode).not.toHaveBeenCalled();
  });

  it('calls setDragMode with the body mode when dragMode is "body"', () => {
    act(() => {
      create(<PopScreenContent dragMode="body"><></></PopScreenContent>);
    });
    expect(mockSetDragMode).toHaveBeenCalledWith(2);
  });

  it('calls setDragMode with the band mode when dragMode is "handle"', () => {
    act(() => {
      create(<PopScreenContent dragMode="handle"><></></PopScreenContent>);
    });
    expect(mockSetDragMode).toHaveBeenCalledWith(1);
  });

  it('calls setDragMode with the band mode when dragMode is "header"', () => {
    act(() => {
      create(<PopScreenContent dragMode="header"><></></PopScreenContent>);
    });
    expect(mockSetDragMode).toHaveBeenCalledWith(1);
  });

  it('auto-sizes the drag strip to the header height in header mode', () => {
    act(() => {
      create(<PopScreenContent dragMode="header"><></></PopScreenContent>);
    });
    expect(mockSetHandleDimensions).toHaveBeenCalledWith(40, 24);
  });

  it('respects dragHandleHeight override in header mode', () => {
    act(() => {
      create(<PopScreenContent dragMode="header" dragHandleHeight={60}><></></PopScreenContent>);
    });
    expect(mockSetHandleDimensions).toHaveBeenCalledWith(60, 24);
  });

  it('calls setWindowRect when width or height props are provided', () => {
    act(() => {
      create(<PopScreenContent width={300} height={400}><></></PopScreenContent>);
    });
    expect(mockSetWindowRect).toHaveBeenCalledWith(-1, -1, 300, 400);
  });

  it('calls setSizeConstraints when min/max constraints are provided', () => {
    act(() => {
      create(<PopScreenContent minWidth={200} minHeight={200} maxWidth={500} maxHeight={500}><></></PopScreenContent>);
    });
    expect(mockSetSizeConstraints).toHaveBeenCalledWith(200, 200, 500, 500);
  });

  it('applies shape and borderRadius container styles', () => {
    let rootCircle: any;
    let rootCustom: any;
    act(() => {
      rootCircle = create(<PopScreenContent shape="circle"><></></PopScreenContent>);
      rootCustom = create(<PopScreenContent shape="rounded" borderRadius={28}><></></PopScreenContent>);
    });

    const circleStyle = rootCircle.toJSON().props.style;
    const customStyle = rootCustom.toJSON().props.style;

    expect(circleStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderRadius: 9999, aspectRatio: 1, overflow: 'hidden' }),
      ])
    );
    expect(customStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderRadius: 28, overflow: 'hidden' }),
      ])
    );
  });

  it('renders header when showHeader prop is true', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenContent showHeader={true} headerProps={{ title: 'My Header' }} />);
    });
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('My Header');
  });

  it('renders custom header component passed via header prop', () => {
    let root: any;
    act(() => {
      root = create(
        <PopScreenContent header={<PopScreenContent children={<></>} />} />
      );
    });
    expect(root.toJSON()).toBeTruthy();
  });

  it('wraps children in a ScrollView by default so content adapts to small overlays', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenContent><View /></PopScreenContent>);
    });
    const json = root.toJSON();
    // Container children: [scroll body]. No header by default.
    expect(json.children[0].type).toBe('ScrollView');
  });

  it('nests a horizontal ScrollView inside the vertical ScrollView so content scrolls both axes', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenContent><View /></PopScreenContent>);
    });
    const json = root.toJSON();
    const outer = json.children[0];
    expect(outer.type).toBe('ScrollView');
    expect(outer.props.horizontal).not.toBe(true);
    // The vertical ScrollView wraps a horizontal ScrollView which holds the children.
    const inner = outer.children[0];
    expect(inner.type).toBe('ScrollView');
    expect(inner.props.horizontal).toBe(true);
  });

  it('renders children inside the inner horizontal ScrollView', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenContent><View /></PopScreenContent>);
    });
    const json = root.toJSON();
    const inner = json.children[0].children[0];
    expect(inner.type).toBe('ScrollView');
    expect(inner.children[0].type).toBe('View');
  });

  it('renders a plain View body when scrollable={false}', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenContent scrollable={false}><View /></PopScreenContent>);
    });
    const json = root.toJSON();
    expect(json.children[0].type).toBe('View');
  });

  it('keeps the header outside the scrollable body', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenContent showHeader={true} headerProps={{ title: 'Scroll Header' }}><View /></PopScreenContent>);
    });
    const json = root.toJSON();
    expect(json.children[0].type).toBe('View'); // header container
    expect(json.children[1].type).toBe('ScrollView'); // scroll body
    expect(JSON.stringify(json)).toContain('Scroll Header');
  });

  it('does not pin the container to the width/height props so content adapts to window resizes', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenContent width={300} height={400}><></></PopScreenContent>);
    });
    const json = root.toJSON();
    const style = json.props.style;
    expect(style).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ width: 300 })])
    );
    expect(style).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ height: 400 })])
    );
  });

  it('applies shape-aware padding for circle and pill shapes', () => {
    let rootCircle: any;
    let rootPill: any;
    act(() => {
      rootCircle = create(<PopScreenContent shape="circle"><></></PopScreenContent>);
      rootPill = create(<PopScreenContent shape="pill"><></></PopScreenContent>);
    });

    const circleStyle = rootCircle.toJSON().props.style;
    const pillStyle = rootPill.toJSON().props.style;

    expect(circleStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paddingHorizontal: 12, paddingVertical: 10 }),
      ])
    );
    expect(pillStyle).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paddingHorizontal: 12, paddingVertical: 6 }),
      ])
    );
  });

  it('passes contentContainerStyle to the inner ScrollView', () => {
    let root: any;
    act(() => {
      root = create(
        <PopScreenContent contentContainerStyle={{ paddingBottom: 20 }}>
          <View />
        </PopScreenContent>
      );
    });
    const json = root.toJSON();
    const scrollView = json.children[0];
    expect(scrollView.type).toBe('ScrollView');
    expect(scrollView.props.contentContainerStyle).toEqual(
      expect.arrayContaining([expect.objectContaining({ paddingBottom: 20 })])
    );
  });
});
