import React from 'react';
import { create, act } from 'react-test-renderer';

jest.mock('react-native', () => ({
  NativeModules: {
    PopScreen: {
      hide: jest.fn().mockResolvedValue(undefined),
      openApp: jest.fn().mockResolvedValue(undefined),
    },
  },
  Platform: { OS: 'android', Version: 30, select: (obj: any) => obj.android ?? obj.default },
  StyleSheet: { create: (s: any) => s, flatten: (s: any) => s, hairlineWidth: 1 },
  View: 'View',
  Text: 'Text',
  Pressable: (props: any) => {
    const React = require('react');
    const children = typeof props.children === 'function' ? props.children({ pressed: false }) : props.children;
    return React.createElement('Pressable', props, children);
  },
}));

import PopScreenHeader from '../PopScreenHeader';
import { PopScreenModule } from '../PopScreenModule';

describe('PopScreenHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders default title and buttons', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenHeader title="Test Header" />);
    });
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Test Header');
    expect(json).toContain('Back to Main App');
    expect(json).toContain('Cancel');
  });

  it('calls hide when Cancel button is pressed', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenHeader />);
    });
    const cancelButton = root.root.findByProps({ testID: 'header-cancel-button' });
    act(() => {
      cancelButton.props.onPress();
    });
    expect(PopScreenModule.hide).toHaveBeenCalled();
  });

  it('calls openApp and hide when Back to Main App button is pressed', async () => {
    let root: any;
    act(() => {
      root = create(<PopScreenHeader />);
    });
    const backButton = root.root.findByProps({ testID: 'header-back-to-app-button' });
    await act(async () => {
      await backButton.props.onPress();
    });
    expect(PopScreenModule.openApp).toHaveBeenCalled();
    expect(PopScreenModule.hide).toHaveBeenCalled();
  });

  it('supports custom callbacks onCancel and onBackToApp', () => {
    const mockCancel = jest.fn();
    const mockBack = jest.fn();
    let root: any;
    act(() => {
      root = create(<PopScreenHeader onCancel={mockCancel} onBackToApp={mockBack} />);
    });

    const cancelButton = root.root.findByProps({ testID: 'header-cancel-button' });
    act(() => {
      cancelButton.props.onPress();
    });
    expect(mockCancel).toHaveBeenCalled();

    const backButton = root.root.findByProps({ testID: 'header-back-to-app-button' });
    act(() => {
      backButton.props.onPress();
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('can hide Cancel or Back to Main App buttons via props', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenHeader showCancel={false} showBackToApp={false} title="No Buttons" />);
    });
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('No Buttons');
    expect(json).not.toContain('header-cancel-button');
    expect(json).not.toContain('header-back-to-app-button');
  });

  it('renders compact button labels when compact prop is true', () => {
    let root: any;
    act(() => {
      root = create(<PopScreenHeader compact={true} title="Compact Header" />);
    });
    const json = JSON.stringify(root.toJSON());
    expect(json).toContain('Compact Header');
    expect(json).toContain('Back');
    expect(json).not.toContain('Back to Main App');
  });
});
