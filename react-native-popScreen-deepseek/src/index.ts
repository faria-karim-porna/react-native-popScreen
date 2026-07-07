import { PopScreenModule } from './PopScreenModule';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { DragUpdateEvent } from './PopScreen.types';

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

// ─── Drag event listener (Milestone 3) ───────────────────────────────

const eventEmitter = PopScreen ? new NativeEventEmitter(PopScreen) : null;

export function addDragUpdateListener(
  listener: (event: DragUpdateEvent) => void
) {
  const subscription = eventEmitter?.addListener('onDragUpdate', listener);
  return {
    remove: () => subscription?.remove(),
  };
}

// ─── Components & helpers ────────────────────────────────────────────

export { default as PopScreenContent } from './PopScreenContent';
export { registerOverlaySurface } from './registerOverlaySurface';

// ─── Re-export types ─────────────────────────────────────────────────

export * from './PopScreen.types';
