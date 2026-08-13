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

import { NativeModules } from 'react-native';
import PopScreenContent from '../PopScreenContent';

const mockSetHandleDimensions = NativeModules.PopScreen.setHandleDimensions;
const mockSetWindowRect = NativeModules.PopScreen.setWindowRect;
const mockSetSizeConstraints = NativeModules.PopScreen.setSizeConstraints;

describe('PopScreenContent', () => {
  beforeEach(() => {
    mockSetHandleDimensions.mockClear();
    mockSetWindowRect.mockClear();
    mockSetSizeConstraints.mockClear();
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
});
