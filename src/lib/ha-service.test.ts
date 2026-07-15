import { describe, expect, it, vi } from "vitest";
import { HaService } from "./ha-service";
import type { HomeAssistant } from "custom-card-helpers";

function fakeHass(): HomeAssistant {
  return { callService: vi.fn() } as unknown as HomeAssistant;
}

describe("HaService", () => {
  it("sendCommand calls remote.send_command with the command payload", () => {
    const hass = fakeHass();
    new HaService(hass, "remote.shield").sendCommand("DPAD_UP");
    expect(hass.callService).toHaveBeenCalledWith(
      "remote",
      "send_command",
      { command: "DPAD_UP" },
      { entity_id: "remote.shield" }
    );
  });

  it("launchApp calls remote.turn_on with the activity payload", () => {
    const hass = fakeHass();
    new HaService(hass, "remote.shield").launchApp("com.netflix.ninja");
    expect(hass.callService).toHaveBeenCalledWith(
      "remote",
      "turn_on",
      { activity: "com.netflix.ninja" },
      { entity_id: "remote.shield" }
    );
  });

  it("selectSource calls media_player.select_source against the media_player entity", () => {
    const hass = fakeHass();
    new HaService(hass, "remote.shield").selectSource("media_player.shield", "Netflix");
    expect(hass.callService).toHaveBeenCalledWith(
      "media_player",
      "select_source",
      { source: "Netflix" },
      { entity_id: "media_player.shield" }
    );
  });
});
