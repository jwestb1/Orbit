import type { HomeAssistant } from "custom-card-helpers";

export type UserDataResult = { found: true; data: unknown } | { found: false };

// Values are wrapped in a { data } envelope rather than stored raw, so a
// server response of `null` (key never written) can be told apart from an
// explicit `{ data: null }` (reset) — the latter must not be resurrected
// from legacy localStorage on a later load.
export async function getUserData(hass: HomeAssistant, key: string): Promise<UserDataResult> {
  try {
    const response = await hass.callWS<{ value: { data: unknown } | null }>({
      type: "frontend/get_user_data",
      key,
    });
    if (response.value == null) return { found: false };
    return { found: true, data: response.value.data };
  } catch {
    return { found: false };
  }
}

export async function setUserData(hass: HomeAssistant, key: string, data: unknown): Promise<boolean> {
  try {
    await hass.callWS({ type: "frontend/set_user_data", key, value: { data } });
    return true;
  } catch {
    return false;
  }
}

// Best-effort read of a legacy per-browser localStorage value; used only
// as a one-time migration source when the server has no value yet.
export function readLegacyLocalStorage(key: string): unknown {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}
