import { PopScreenModule } from './PopScreenModule';

// ─── Permission functions ────────────────────────────────────────────

export async function hasOverlayPermission(): Promise<boolean> {
  return PopScreenModule.hasOverlayPermission();
}

export async function requestOverlayPermission(): Promise<void> {
  return PopScreenModule.requestOverlayPermission();
}

// ─── Overlay lifecycle (Milestone 0 spike) ───────────────────────────

export async function startOverlay(): Promise<void> {
  return PopScreenModule.startOverlay();
}

export async function stopOverlay(): Promise<void> {
  return PopScreenModule.stopOverlay();
}

// ─── Architecture detection (Milestone 1) ────────────────────────────

export async function getReactArchitectureInfo() {
  return PopScreenModule.getReactArchitectureInfo();
}

// ─── Re-export types ─────────────────────────────────────────────────

export * from './PopScreen.types';
