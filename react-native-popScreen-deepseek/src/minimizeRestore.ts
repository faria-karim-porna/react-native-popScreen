import { PopScreenModule } from './PopScreenModule';

type Rect = { x: number; y: number; width: number; height: number };

const DEFAULT_MINIMIZED_SIZE = { width: 64, height: 64 };

// Saved before minimizing so we can restore the original position/size.
let savedRect: Rect | null = null;
let minimized = false;

type MinimizeOptions = {
  width?: number;
  height?: number;
};

/** Shrink the overlay to a small bubble. Pass the current rect to restore it later. */
export async function minimize(currentRect?: Rect, options?: MinimizeOptions) {
  if (minimized) return;
  if (currentRect) savedRect = currentRect;
  minimized = true;

  const width = options?.width ?? DEFAULT_MINIMIZED_SIZE.width;
  const height = options?.height ?? DEFAULT_MINIMIZED_SIZE.height;
  await PopScreenModule.setWindowRect(undefined, undefined, width, height);
}

/** Restore the overlay to its original size and position. */
export async function restore() {
  if (!minimized || !savedRect) return;
  minimized = false;
  await PopScreenModule.setWindowRect(savedRect.x, savedRect.y, savedRect.width, savedRect.height);
}

/** Returns true if the overlay is currently minimized. */
export function getIsMinimized() {
  return minimized;
}
