import type { HomeAssistant } from "custom-card-helpers";

export interface OrbitBox {
  box_id: string;
  name: string;
  remote_entity_id: string;
  media_player_entity_id: string | null;
}

export interface OrbitOptions {
  installed: boolean;
  restrict_admin_only: boolean;
}

// Returns null when the Orbit companion integration isn't installed (an
// unregistered WS command simply throws) or the call otherwise fails —
// callers fall back to the raw ha-entity-picker UX, which works identically
// with or without Orbit installed.
export async function tryListOrbitBoxes(hass: HomeAssistant): Promise<OrbitBox[] | null> {
  try {
    const { boxes } = await hass.callWS<{ boxes: OrbitBox[] }>({ type: "orbit/list_boxes" });
    return boxes;
  } catch {
    return null;
  }
}

// Safe defaults (not installed, admin-only) if Orbit isn't installed or the
// call fails — matches the integration's own default so behavior is
// identical whether Orbit is absent or just unreachable.
export async function getOrbitOptions(hass: HomeAssistant): Promise<OrbitOptions> {
  try {
    return await hass.callWS<OrbitOptions>({ type: "orbit/get_options" });
  } catch {
    return { installed: false, restrict_admin_only: true };
  }
}
