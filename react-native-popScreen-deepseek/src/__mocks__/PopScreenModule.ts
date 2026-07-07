const listeners: Record<string, Set<Function>> = {};

const PopScreenModuleMock = {
  hasOverlayPermission: jest.fn().mockResolvedValue(false),
  requestOverlayPermission: jest.fn().mockResolvedValue(undefined),
  hasBatteryOptimizationExemption: jest.fn().mockResolvedValue(true),
  requestBatteryOptimizationExemption: jest.fn().mockResolvedValue(undefined),
  getReactArchitectureInfo: jest.fn().mockResolvedValue({
    architecture: 'NEW_ARCHITECTURE',
    isNewArchitecture: true,
  }),
  show: jest.fn().mockResolvedValue(undefined),
  hide: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined),
  setWindowRect: jest.fn().mockResolvedValue(undefined),
  setSizeConstraints: jest.fn().mockResolvedValue(undefined),
  setHandleDimensions: jest.fn().mockResolvedValue(undefined),

  addListener: jest.fn((eventName: string, listener: Function) => {
    if (!listeners[eventName]) listeners[eventName] = new Set();
    listeners[eventName].add(listener);
    return { remove: () => listeners[eventName]?.delete(listener) };
  }),

  // Test helper: simulate a native event firing.
  __simulateEvent: (eventName: string, payload: unknown) => {
    listeners[eventName]?.forEach((fn) => fn(payload));
  },
};

export default PopScreenModuleMock;
// Named export so jest.mock() resolves named imports (used by minimizeRestore.ts)
export { PopScreenModuleMock as PopScreenModule };
