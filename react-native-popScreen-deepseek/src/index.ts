import { PopScreenModule } from './PopScreenModule';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { DragUpdateEvent, ResizeUpdateEvent } from './PopScreen.types';

const { PopScreen } = NativeModules;

// ─── Permission functions ────────────────────────────────────────────

export async function hasOverlayPermission(): Promise<boolean> {
  return PopScreenModule.hasOverlayPermission();
}

export async function requestOverlayPermission(): Promise<void> {
  return PopScreenModule.requestOverlayPermission();
}

// ─── Overlay lifecycle ───────────────────────────────────────────────

export async function show(): Promise<void> {
  return PopScreenModule.show();
}

export async function hide(): Promise<void> {
  return PopScreenModule.hide();
}

// ─── Architecture detection ──────────────────────────────────────────

export async function getReactArchitectureInfo() {
  return PopScreenModule.getReactArchitectureInfo();
}

// ─── Drag / Resize event listeners (Milestones 3-4) ──────────────────

const eventEmitter = PopScreen ? new NativeEventEmitter(PopScreen) : null;

export function addDragUpdateListener(
  listener: (event: DragUpdateEvent) => void
) {
  const subscription = eventEmitter?.addListener('onDragUpdate', listener);
  return { remove: () => subscription?.remove() };
}

export function addResizeUpdateListener(
  listener: (event: ResizeUpdateEvent) => void
) {
  const subscription = eventEmitter?.addListener('onResizeUpdate', listener);
  return { remove: () => subscription?.remove() };
}

// ─── Generic window rect control (Milestone 4) ───────────────────────

export async function setWindowRect(
  x?: number,
  y?: number,
  width?: number,
  height?: number
): Promise<void> {
  return PopScreenModule.setWindowRect(x, y, width, height);
}

export async function setSizeConstraints(
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<void> {
  return PopScreenModule.setSizeConstraints(minWidth, minHeight, maxWidth, maxHeight);
}

// ─── Minimize / Restore (pure JS on top of setWindowRect) ────────────

export { minimize, restore, getIsMinimized } from './minimizeRestore';

// ─── Components & helpers ────────────────────────────────────────────

export { default as PopScreenContent } from './PopScreenContent';
export { registerOverlaySurface } from './registerOverlaySurface';

// ─── Re-export types ─────────────────────────────────────────────────

export * from './PopScreen.types';
