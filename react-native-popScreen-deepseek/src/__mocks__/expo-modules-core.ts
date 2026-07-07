import PopScreenModuleMock from './PopScreenModule';

export const requireNativeModule = jest.fn((_moduleName: string) => PopScreenModuleMock);
export const NativeModule = class {};
export const EventEmitter = class {
  addListener = jest.fn();
  removeAllListeners = jest.fn();
};
