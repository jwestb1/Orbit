import type { UiSettingsOverride } from "../types";

const STORAGE_PREFIX = "shield-remote-card.ui-settings.";

function storageKey(remoteEntity: string): string {
  return `${STORAGE_PREFIX}${remoteEntity}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Drops shape-invalid fields instead of rejecting the whole object, so a
// partially-corrupt stored value doesn't lose otherwise-valid settings.
function sanitize(value: unknown): UiSettingsOverride | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const result: UiSettingsOverride = {};
  if (isFiniteNumber(v.trackpadHeight)) result.trackpadHeight = v.trackpadHeight;
  if (isFiniteNumber(v.dpadButtonSize)) result.dpadButtonSize = v.dpadButtonSize;
  if (isFiniteNumber(v.sensitivity)) result.sensitivity = v.sensitivity;
  return result;
}

// Returns null if there is no override, storage is unavailable, or the stored value is malformed.
export function loadUiSettings(remoteEntity: string): UiSettingsOverride | null {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(remoteEntity));
    if (raw == null) return null;
    return sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

// Fails silently (e.g. private browsing, quota exceeded, storage disabled).
export function saveUiSettings(remoteEntity: string, settings: UiSettingsOverride): void {
  try {
    globalThis.localStorage?.setItem(storageKey(remoteEntity), JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// Fails silently.
export function clearUiSettings(remoteEntity: string): void {
  try {
    globalThis.localStorage?.removeItem(storageKey(remoteEntity));
  } catch {
    // ignore
  }
}
