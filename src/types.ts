import type { LovelaceCardConfig } from "custom-card-helpers";

export interface AppShortcut {
  name: string;
  icon: string;
  /** Launch via `remote.turn_on` + `activity` on the remote entity. */
  package?: string;
  /** Launch via `media_player.select_source` on the media_player entity. */
  source?: string;
}

export interface TrackpadConfig {
  sensitivity?: number;
  tap_action?: string;
  two_finger_tap_action?: string;
  long_press_action?: string;
}

export interface ShieldRemoteCardConfig extends LovelaceCardConfig {
  type: string;
  remote_entity: string;
  media_player_entity?: string;
  trackpad?: TrackpadConfig;
  apps?: AppShortcut[];
  haptics?: boolean;
  theme?: "auto" | "light" | "dark";
}

export type RemoteDirection = "SHORT" | "START_LONG" | "END_LONG";
