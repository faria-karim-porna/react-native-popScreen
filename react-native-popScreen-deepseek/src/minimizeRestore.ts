import { PopScreenModule } from './PopScreenModule';

let lastFullRect: { x: number; y: number; width: number; height: number } | null = null;
let isMinimized = false;

const MINIMIZED_SIZE = { width: 64, height: 64 };

type MinimizeOptions = {
  width?: number;
  height?: number;
};

export async function minimize(
  currentRect?: { x: number; y: number; width: number; height: number },
  options?: MinimizeOptions
) {
  if (isMinimized) return;
  if (currentRect) lastFullRect = currentRect;
  isMinimized = true;

  const width = options?.width ?? MINIMIZED_SIZE.width;
  const height = options?.height ?? MINIMIZED_SIZE.height;

  await PopScreenModule.setWindowRect(undefined, undefined, width, height);
}

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
