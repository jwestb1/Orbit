import type { HomeAssistant } from "custom-card-helpers";
import type { RemoteDirection } from "../types";

// Where diagnostic entries land when a card/box has diagnostic logging
// enabled — Settings > System > Logs. "sent"/"accepted"/"REJECTED" describe
// Home Assistant's own handling of the service call, not the set-top box:
// the Android TV Remote Protocol has no per-command device acknowledgement,
// so this is the ceiling of what we can honestly report.
const DIAGNOSTIC_LOGGER = "custom_components.orbit_card";

// Thin wrapper around hass.callService — keeps the androidtv_remote
// service/entity contract (spec §3.3) in one place.
export class HaService {
  constructor(
    private hass: HomeAssistant,
    private remoteEntity: string,
    private diagnostics?: boolean
  ) {}

  private _log(level: "debug" | "warning", message: string): void {
    if (!this.diagnostics) return;
    // Best-effort: a broken system_log call must never affect the remote.
    void this.hass
      .callService("system_log", "write", { message, level, logger: DIAGNOSTIC_LOGGER })
      .catch(() => {});
  }

  // Foreground app on the box at the moment of the call — read straight off
  // the remote entity's state, so it's always what HA last saw, not a fresh
  // round-trip. Only populated when the androidtv_remote integration has
  // "Enable IME" turned on; otherwise this is "unknown".
  private _currentActivity(): string {
    const activity = this.hass.states?.[this.remoteEntity]?.attributes?.current_activity;
    return typeof activity === "string" && activity ? activity : "unknown";
  }

  private _callService(
    domain: string,
    service: string,
    data: Record<string, unknown>,
    entityId: string
  ): void {
    const label = `${domain}.${service}(${JSON.stringify(data)}) on ${entityId} [current_activity: ${this._currentActivity()}]`;
    this._log("debug", `Orbit sent ${label}`);
    Promise.resolve(this.hass.callService(domain, service, data, { entity_id: entityId }))
      .then(() => this._log("debug", `Home Assistant accepted ${label}`))
      .catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err);
        this._log("warning", `Home Assistant REJECTED ${label}: ${detail}`);
      });
  }

  sendCommand(command: string, holdSecs?: number, numRepeats?: number): void {
    const data: Record<string, unknown> = { command };
    if (holdSecs !== undefined) data.hold_secs = holdSecs;
    if (numRepeats !== undefined) data.num_repeats = numRepeats;
    this._callService("remote", "send_command", data, this.remoteEntity);
  }

  sendKey(command: string, direction: RemoteDirection = "SHORT"): void {
    if (direction === "START_LONG") {
      this.sendCommand(command, 0.5);
    } else {
      this.sendCommand(command);
    }
  }

  launchApp(packageId: string): void {
    this._callService("remote", "turn_on", { activity: packageId }, this.remoteEntity);
  }

  playMedia(mediaPlayerEntity: string, contentId: string, contentType: string): void {
    this._callService(
      "media_player",
      "play_media",
      { media_content_id: contentId, media_content_type: contentType },
      mediaPlayerEntity
    );
  }
}
