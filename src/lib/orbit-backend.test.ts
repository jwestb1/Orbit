import { describe, expect, it, vi } from "vitest";
import { getOrbitOptions, tryListOrbitBoxes } from "./orbit-backend";
import type { HomeAssistant } from "custom-card-helpers";

function fakeHass(callWS: (msg: Record<string, unknown>) => unknown): HomeAssistant {
  return { callWS: vi.fn(callWS) } as unknown as HomeAssistant;
}

describe("tryListOrbitBoxes", () => {
  it("returns the box list when Orbit is installed", async () => {
    const boxes = [
      { box_id: "abc", name: "Living Room", remote_entity_id: "remote.living_room", media_player_entity_id: null },
    ];
    const hass = fakeHass(() => ({ boxes }));
    expect(await tryListOrbitBoxes(hass)).toEqual(boxes);
    expect(hass.callWS).toHaveBeenCalledWith({ type: "orbit/list_boxes" });
  });

  it("returns null (does not throw) when Orbit isn't installed and the WS call rejects", async () => {
    const hass = fakeHass(() => {
      throw new Error("Unknown command");
    });
    expect(await tryListOrbitBoxes(hass)).toBeNull();
  });
});

describe("getOrbitOptions", () => {
  it("returns the options when Orbit is installed", async () => {
    const hass = fakeHass(() => ({ installed: true, restrict_admin_only: false }));
    expect(await getOrbitOptions(hass)).toEqual({ installed: true, restrict_admin_only: false });
  });

  it("returns safe defaults (not installed, admin-only) when the WS call rejects", async () => {
    const hass = fakeHass(() => {
      throw new Error("Unknown command");
    });
    expect(await getOrbitOptions(hass)).toEqual({ installed: false, restrict_admin_only: true });
  });
});
