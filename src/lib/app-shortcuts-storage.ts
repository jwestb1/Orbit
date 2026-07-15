import type { AppShortcut } from "../types";

const STORAGE_PREFIX = "shield-remote-card.apps.";

function storageKey(remoteEntity: string): string {
  return `${STORAGE_PREFIX}${remoteEntity}`;
}

function isValidShortcut(value: unknown): value is AppShortcut {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.icon === "string" &&
    (typeof v.package === "string" || typeof v.source === "string")
  );
}

// Returns null if there is no override, storage is unavailable, or the stored value is malformed.
export function loadOverride(remoteEntity: string): AppShortcut[] | null {
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(remoteEntity));
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isValidShortcut);
  } catch {
    return null;
  }
}

// Fails silently (e.g. private browsing, quota exceeded, storage disabled).
export function saveOverride(remoteEntity: string, apps: AppShortcut[]): void {
  try {
    globalThis.localStorage?.setItem(storageKey(remoteEntity), JSON.stringify(apps));
  } catch {
    // ignore
  }
}

// Fails silently.
export function clearOverride(remoteEntity: string): void {
  try {
    globalThis.localStorage?.removeItem(storageKey(remoteEntity));
  } catch {
    // ignore
  }
}
