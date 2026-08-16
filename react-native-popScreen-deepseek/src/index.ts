import { PopScreenModule, resolveDragMode } from './PopScreenModule';
import { NativeEventEmitter, NativeModules } from 'react-native';
import {
  DragUpdateEvent,
  ResizeUpdateEvent,
  WindowStateChangeEvent,
  PermissionResultEvent,
  DragMode,
} from './PopScreen.types';

const { PopScreen } = NativeModules;

// ─── Permission ───────────────────────────────────────────────────────

export async function hasOverlayPermission(): Promise<boolean> {
  return PopScreenModule.hasOverlayPermission();
}

export async function requestOverlayPermission(): Promise<void> {
  return PopScreenModule.requestOverlayPermission();
}

export async function hasBatteryOptimizationExemption(): Promise<boolean> {
  return PopScreenModule.hasBatteryOptimizationExemption();
}

export async function requestBatteryOptimizationExemption(): Promise<void> {
  return PopScreenModule.requestBatteryOptimizationExemption();
}

// ─── Overlay lifecycle ────────────────────────────────────────────────

export async function show(): Promise<void> {
  return PopScreenModule.show();
}

export async function hide(): Promise<void> {
  return PopScreenModule.hide();
}

export async function destroy(): Promise<void> {
  return PopScreenModule.destroy();
}

export async function openApp(): Promise<void> {
  return PopScreenModule.openApp();
}

export async function getReactArchitectureInfo() {
  return PopScreenModule.getReactArchitectureInfo();
}

// ─── Event listeners ──────────────────────────────────────────────────

const eventEmitter = PopScreen ? new NativeEventEmitter(PopScreen) : null;

export function addDragUpdateListener(listener: (event: DragUpdateEvent) => void) {
  const sub = eventEmitter?.addListener('onDragUpdate', listener);
  return { remove: () => sub?.remove() };
}

export function addResizeUpdateListener(listener: (event: ResizeUpdateEvent) => void) {
  const sub = eventEmitter?.addListener('onResizeUpdate', listener);
  return { remove: () => sub?.remove() };
}

export function addWindowStateChangeListener(listener: (event: WindowStateChangeEvent) => void) {
  const sub = eventEmitter?.addListener('onWindowStateChange', listener);
  return { remove: () => sub?.remove() };
}

export function addPermissionResultListener(listener: (event: PermissionResultEvent) => void) {
  const sub = eventEmitter?.addListener('onPermissionResult', listener);
  return { remove: () => sub?.remove() };
}

// ─── Window control ───────────────────────────────────────────────────

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

/** Set where the overlay can be dragged from: 'handle', 'header', or 'body'. */
export async function setDragMode(mode: DragMode): Promise<void> {
  return PopScreenModule.setDragMode(resolveDragMode(mode));
}

// ─── Minimize / Restore ───────────────────────────────────────────────

export { minimize, restore, getIsMinimized } from './minimizeRestore';

// ─── Components & hooks ───────────────────────────────────────────────

export { default as PopScreenContent } from './PopScreenContent';
export type { PopScreenContentProps } from './PopScreenContent';
export { default as PopScreenHeader } from './PopScreenHeader';
export type { PopScreenHeaderProps } from './PopScreenHeader';
export { registerOverlaySurface } from './registerOverlaySurface';
export { usePopScreen, getPopScreenState } from './usePopScreen';

// ─── Types ────────────────────────────────────────────────────────────

export * from './PopScreen.types';
