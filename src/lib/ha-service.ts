import type { HomeAssistant } from "custom-card-helpers";
import type { RemoteDirection } from "../types";

// Thin wrapper around hass.callService — keeps the androidtv_remote
// service/entity contract (spec §3.3) in one place.
export class HaService {
  constructor(private hass: HomeAssistant, private remoteEntity: string) {}

  sendCommand(command: string, holdSecs?: number, numRepeats?: number): void {
    const data: Record<string, unknown> = { command };
    if (holdSecs !== undefined) data.hold_secs = holdSecs;
    if (numRepeats !== undefined) data.num_repeats = numRepeats;
    this.hass.callService("remote", "send_command", data, {
      entity_id: this.remoteEntity,
    });
  }

  sendKey(command: string, direction: RemoteDirection = "SHORT"): void {
    if (direction === "START_LONG") {
      this.sendCommand(command, 0.5);
    } else {
      this.sendCommand(command);
    }
  }

  launchApp(packageId: string): void {
    this.hass.callService(
      "remote",
      "turn_on",
      { activity: packageId },
      { entity_id: this.remoteEntity }
    );
  }

  playMedia(mediaPlayerEntity: string, contentId: string, contentType: string): void {
    this.hass.callService(
      "media_player",
      "play_media",
      {
        media_content_id: contentId,
        media_content_type: contentType,
      },
      { entity_id: mediaPlayerEntity }
    );
  }
}
