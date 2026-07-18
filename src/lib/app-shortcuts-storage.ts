import type { HomeAssistant } from "custom-card-helpers";
import type { AppShortcut } from "../types";
import { getUserData, readLegacyLocalStorage, setUserData } from "./user-data-storage";

const KEY_PREFIX = "shield-remote-card.apps.";

function storageKey(remoteEntity: string): string {
  return `${KEY_PREFIX}${remoteEntity}`;
}

function isValidShortcut(value: unknown): value is AppShortcut {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && typeof v.icon === "string" && typeof v.package === "string";
}

function sanitize(value: unknown): AppShortcut[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter(isValidShortcut);
}

// Returns null if there is no override, the connection is unavailable, or
// the stored value is malformed. Falls back to (and migrates) a legacy
// per-browser localStorage value the first time the server has none.
export async function loadOverride(
  hass: HomeAssistant,
  remoteEntity: string
): Promise<AppShortcut[] | null> {
  const key = storageKey(remoteEntity);
  const result = await getUserData(hass, key);
  if (result.found) return sanitize(result.data);

  const legacy = sanitize(readLegacyLocalStorage(key));
  if (legacy) void setUserData(hass, key, legacy);
  return legacy;
}

// Returns false (fails silently) on connection errors.
export async function saveOverride(
  hass: HomeAssistant,
  remoteEntity: string,
  apps: AppShortcut[]
): Promise<boolean> {
  return setUserData(hass, storageKey(remoteEntity), apps);
}

// Returns false (fails silently) on connection errors.
export async function clearOverride(hass: HomeAssistant, remoteEntity: string): Promise<boolean> {
  return setUserData(hass, storageKey(remoteEntity), null);
}
