import type { HomeAssistant } from "custom-card-helpers";
import type { UiSettingsOverride } from "../types";
import { LAYOUT_ITEM_IDS, type LayoutItem, type LayoutItemId } from "./button-layout";
import { getUserData, readLegacyLocalStorage, setUserData } from "./user-data-storage";

const KEY_PREFIX = "shield-remote-card.ui-settings.";

function storageKey(remoteEntity: string): string {
  return `${KEY_PREFIX}${remoteEntity}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLayoutItemId(value: unknown): value is LayoutItemId {
  return typeof value === "string" && (LAYOUT_ITEM_IDS as readonly string[]).includes(value);
}

function isLayoutItem(value: unknown): value is LayoutItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    isLayoutItemId(v.id) &&
    isFiniteNumber(v.x) &&
    isFiniteNumber(v.y) &&
    isFiniteNumber(v.w) &&
    isFiniteNumber(v.h)
  );
}

// Drops shape-invalid fields instead of rejecting the whole object, so a
// partially-corrupt stored value doesn't lose otherwise-valid settings.
// Drops individual malformed layout entries the same way, rather than the
// whole buttonLayout array, for the same reason.
function sanitize(value: unknown): UiSettingsOverride | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const result: UiSettingsOverride = {};
  if (isFiniteNumber(v.sensitivity)) result.sensitivity = v.sensitivity;
  if (Array.isArray(v.buttonLayout)) {
    const layout = v.buttonLayout.filter(isLayoutItem);
    if (layout.length > 0) result.buttonLayout = layout;
  }
  return result;
}

// Returns null if there is no override, the connection is unavailable, or
// the stored value is malformed. Falls back to (and migrates) a legacy
// per-browser localStorage value the first time the server has none.
export async function loadUiSettings(
  hass: HomeAssistant,
  remoteEntity: string
): Promise<UiSettingsOverride | null> {
  const key = storageKey(remoteEntity);
  const result = await getUserData(hass, key);
  if (result.found) return sanitize(result.data);

  const legacy = sanitize(readLegacyLocalStorage(key));
  if (legacy) void setUserData(hass, key, legacy);
  return legacy;
}

// Returns false (fails silently) on connection errors.
export async function saveUiSettings(
  hass: HomeAssistant,
  remoteEntity: string,
  settings: UiSettingsOverride
): Promise<boolean> {
  return setUserData(hass, storageKey(remoteEntity), settings);
}

// Returns false (fails silently) on connection errors.
export async function clearUiSettings(hass: HomeAssistant, remoteEntity: string): Promise<boolean> {
  return setUserData(hass, storageKey(remoteEntity), null);
}
