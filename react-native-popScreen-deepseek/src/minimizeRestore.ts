import { PopScreenModule } from './PopScreenModule';

// Module-level state survives across re-renders.
let lastFullRect: { x: number; y: number; width: number; height: number } | null = null;
let isMinimized = false;

const MINIMIZED_SIZE = { width: 64, height: 64 };

/**
 * Shrinks the overlay to a small fixed size at the bottom-right corner,
 * remembering the pre-minimize rect so restore() can return to it.
 * Pure JS on top of setWindowRect — native has no minimize concept.
 */
export async function minimize(currentRect?: { x: number; y: number; width: number; height: number }) {
  if (isMinimized) return;
  if (currentRect) {
    lastFullRect = currentRect;
  }
  isMinimized = true;

  await PopScreenModule.setWindowRect(
    undefined,
    undefined,
    MINIMIZED_SIZE.width,
    MINIMIZED_SIZE.height
  );
}

/**
 * Returns the window to the exact rect it had before minimize().
 * No-op if minimize() was never called.
 */
export async function restore() {
  if (!isMinimized || !lastFullRect) return;
  isMinimized = false;

  await PopScreenModule.setWindowRect(
    lastFullRect.x,
    lastFullRect.y,
    lastFullRect.width,
    lastFullRect.height
  );
}

export function getIsMinimized() {
  return isMinimized;
}
