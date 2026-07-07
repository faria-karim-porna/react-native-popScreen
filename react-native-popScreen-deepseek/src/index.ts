import { PopScreenModule } from './PopScreenModule';

// ─── Permission functions ────────────────────────────────────────────

export async function hasOverlayPermission(): Promise<boolean> {
  return PopScreenModule.hasOverlayPermission();
}

export async function requestOverlayPermission(): Promise<void> {
  return PopScreenModule.requestOverlayPermission();
}

// ─── Overlay lifecycle (Milestone 2 canonical API) ───────────────────

export async function show(): Promise<void> {
  return PopScreenModule.show();
}

export async function hide(): Promise<void> {
  return PopScreenModule.hide();
}

// ─── Architecture detection (Milestone 1) ────────────────────────────

export async function getReactArchitectureInfo() {
  return PopScreenModule.getReactArchitectureInfo();
}

// ─── Components & helpers ────────────────────────────────────────────

export { default as PopScreenContent } from './PopScreenContent';
export { registerOverlaySurface } from './registerOverlaySurface';

// ─── Re-export types ─────────────────────────────────────────────────

export * from './PopScreen.types';
