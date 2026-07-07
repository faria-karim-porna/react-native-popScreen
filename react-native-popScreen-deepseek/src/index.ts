import { PopScreenModule } from './PopScreenModule';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { DragUpdateEvent, ResizeUpdateEvent, WindowStateChangeEvent, PermissionResultEvent } from './PopScreen.types';

const { PopScreen } = NativeModules;

// ─── Permission functions ────────────────────────────────────────────

export async function hasOverlayPermission(): Promise<boolean> {
  return PopScreenModule.hasOverlayPermission();
}

export async function requestOverlayPermission(): Promise<void> {
  return PopScreenModule.requestOverlayPermission();
}

// ─── Battery optimization (Milestone 6) ──────────────────────────────

export async function hasBatteryOptimizationExemption(): Promise<boolean> {
  return PopScreenModule.hasBatteryOptimizationExemption();
}

export async function requestBatteryOptimizationExemption(): Promise<void> {
  return PopScreenModule.requestBatteryOptimizationExemption();
}

// ─── Overlay lifecycle ───────────────────────────────────────────────

export async function show(): Promise<void> {
  return PopScreenModule.show();
}

export async function hide(): Promise<void> {
  return PopScreenModule.hide();
}

export async function destroy(): Promise<void> {
  return PopScreenModule.destroy();
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

// ─── Lifecycle event listeners (Milestone 6) ─────────────────────────

export function addWindowStateChangeListener(
  listener: (event: WindowStateChangeEvent) => void
) {
  const subscription = eventEmitter?.addListener('onWindowStateChange', listener);
  return { remove: () => subscription?.remove() };
}

export function addPermissionResultListener(
  listener: (event: PermissionResultEvent) => void
) {
  const subscription = eventEmitter?.addListener('onPermissionResult', listener);
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

// ─── Minimize / Restore ──────────────────────────────────────────────

export { minimize, restore, getIsMinimized } from './minimizeRestore';

// ─── Components & helpers ────────────────────────────────────────────

export { default as PopScreenContent } from './PopScreenContent';
export { registerOverlaySurface } from './registerOverlaySurface';

// ─── Shared store hook ───────────────────────────────────────────────

export { usePopScreen, getPopScreenState } from './usePopScreen';

// ─── Re-export types ─────────────────────────────────────────────────

export * from './PopScreen.types';
