import React from 'react';
import { create, act } from 'react-test-renderer';
// jest.mock is hoisted — the mock factory runs before any imports.
// It provides ALL the react-native exports our module and react-test-renderer need.
jest.mock('react-native', () => ({
  NativeModules: {
    PopScreen: {
      setHandleDimensions: jest.fn().mockResolvedValue(undefined),
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

describe('PopScreenContent', () => {
  beforeEach(() => mockSetHandleDimensions.mockClear());

  it('calls setHandleDimensions when dragHandleHeight prop is provided', () => {
    act(() => {
      create(<PopScreenContent dragHandleHeight={48}><></></PopScreenContent>);
    });
    expect(mockSetHandleDimensions).toHaveBeenCalledWith(48, undefined);
  });

  it('calls setHandleDimensions when resizeHandleSize prop is provided', () => {
    act(() => {
      create(<PopScreenContent resizeHandleSize={36}><></></PopScreenContent>);
    });
    expect(mockSetHandleDimensions).toHaveBeenCalledWith(undefined, 36);
  });

  it('does not call setHandleDimensions when no handle props are provided', () => {
    act(() => {
      create(<PopScreenContent><></></PopScreenContent>);
    });
    expect(mockSetHandleDimensions).not.toHaveBeenCalled();
  });
});
