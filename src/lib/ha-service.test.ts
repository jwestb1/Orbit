import { describe, expect, it, vi } from "vitest";
import { HaService } from "./ha-service";
import type { HomeAssistant } from "custom-card-helpers";

function fakeHass(
  callService = vi.fn().mockResolvedValue(undefined),
  states: Record<string, { attributes: Record<string, unknown> }> = {}
): HomeAssistant {
  return { callService, states } as unknown as HomeAssistant;
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

  it("does not touch system_log when diagnostics is off", () => {
    const hass = fakeHass();
    new HaService(hass, "remote.shield").sendCommand("DPAD_UP");
    expect(hass.callService).toHaveBeenCalledTimes(1);
    expect(hass.callService).not.toHaveBeenCalledWith("system_log", "write", expect.anything());
  });

  it("logs a debug 'sent' entry via system_log.write when diagnostics is on", () => {
    const hass = fakeHass();
    new HaService(hass, "remote.shield", true).sendCommand("DPAD_UP");
    expect(hass.callService).toHaveBeenCalledWith(
      "system_log",
      "write",
      expect.objectContaining({
        level: "debug",
        logger: "custom_components.orbit_card",
        message: expect.stringContaining("remote.send_command"),
      })
    );
  });

  it("includes current_activity from the remote entity's state in the log", () => {
    const hass = fakeHass(vi.fn().mockResolvedValue(undefined), {
      "remote.shield": { attributes: { current_activity: "com.netflix.ninja" } },
    });
    new HaService(hass, "remote.shield", true).sendCommand("DPAD_UP");
    expect(hass.callService).toHaveBeenCalledWith(
      "system_log",
      "write",
      expect.objectContaining({
        message: expect.stringContaining("current_activity: com.netflix.ninja"),
      })
    );
  });

  it("logs current_activity as 'unknown' when the attribute is absent", () => {
    const hass = fakeHass();
    new HaService(hass, "remote.shield", true).sendCommand("DPAD_UP");
    expect(hass.callService).toHaveBeenCalledWith(
      "system_log",
      "write",
      expect.objectContaining({
        message: expect.stringContaining("current_activity: unknown"),
      })
    );
  });

  it("logs a warning when Home Assistant rejects the command", async () => {
    const callService = vi.fn((domain: string, service: string) =>
      domain === "remote" && service === "send_command"
        ? Promise.reject(new Error("box unreachable"))
        : Promise.resolve(undefined)
    );
    const hass = fakeHass(callService);
    new HaService(hass, "remote.shield", true).sendCommand("DPAD_UP");

    // Let the rejected callService promise's .catch() chain flush.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callService).toHaveBeenCalledWith(
      "system_log",
      "write",
      expect.objectContaining({
        level: "warning",
        logger: "custom_components.orbit_card",
        message: expect.stringContaining("REJECTED"),
      })
    );
  });
});
