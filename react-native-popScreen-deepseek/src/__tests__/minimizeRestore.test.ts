// Use jest.doMock (factory-based, called inside describe) instead of jest.mock
// to ensure the mock is used for the clone imported by minimizeRestore during require().
let mockSetWindowRect: jest.Mock;
let minimize: any, restore: any, getIsMinimized: any;

beforeEach(() => {
  mockSetWindowRect = jest.fn().mockResolvedValue(undefined);
  jest.resetModules();
  jest.doMock('../PopScreenModule', () => ({
    PopScreenModule: {
      setWindowRect: mockSetWindowRect,
    },
  }));
  const mod = require('../minimizeRestore');
  minimize = mod.minimize;
  restore = mod.restore;
  getIsMinimized = mod.getIsMinimized;
});

describe('minimize / restore', () => {
  it('minimize calls setWindowRect with small dimensions', async () => {
    await minimize({ x: 80, y: 250, width: 500, height: 350 });
    expect(mockSetWindowRect).toHaveBeenCalledWith(
      undefined, undefined,
      expect.any(Number), expect.any(Number)
    );
    expect(getIsMinimized()).toBe(true);
  });

  it('restore calls setWindowRect with the pre-minimize rect', async () => {
    const rect = { x: 80, y: 250, width: 500, height: 350 };
    await minimize(rect);
    mockSetWindowRect.mockClear();
    await restore();
    expect(mockSetWindowRect).toHaveBeenCalledWith(
      rect.x, rect.y, rect.width, rect.height
    );
    expect(getIsMinimized()).toBe(false);
  });

  it('calling minimize twice is a no-op the second time', async () => {
    await minimize({ x: 0, y: 0, width: 100, height: 100 });
    mockSetWindowRect.mockClear();
    await minimize({ x: 0, y: 0, width: 100, height: 100 });
    expect(mockSetWindowRect).not.toHaveBeenCalled();
  });

  it('restore is a no-op if minimize was never called', async () => {
    await restore();
    expect(mockSetWindowRect).not.toHaveBeenCalled();
  });
});
