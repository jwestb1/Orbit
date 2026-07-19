import type { LovelaceCardConfig } from "custom-card-helpers";

export interface AppShortcut {
  name: string;
  icon: string;
  package: string;
}

export interface TrackpadConfig {
  sensitivity?: number;
  tap_action?: string;
  two_finger_tap_action?: string;
  long_press_action?: string;
}

// One box in switcher mode. `id` is a stable key for tab selection and
// personal-override storage; falls back to `remote_entity` when omitted, so
// hand-authored YAML doesn't need to invent one.
export interface BoxConfig {
  id?: string;
  name?: string;
  remote_entity: string;
  media_player_entity?: string;
  apps?: AppShortcut[];
}

export interface OrbitRemoteCardConfig extends LovelaceCardConfig {
  type: string;
  // Inferred from `boxes` presence when omitted: "switcher" if non-empty,
  // otherwise "single".
  mode?: "single" | "switcher";
  // Single-box shape — required when `boxes` is absent (enforced in
  // setConfig, not the type, since the two shapes are mutually exclusive).
  remote_entity?: string;
  media_player_entity?: string;
  apps?: AppShortcut[];
  // Switcher shape.
  boxes?: BoxConfig[];
  default_box?: string;
  trackpad?: TrackpadConfig;
  haptics?: boolean;
  theme?: "auto" | "light" | "dark";
}

export type RemoteDirection = "SHORT" | "START_LONG" | "END_LONG";

export interface UiSettingsOverride {
  trackpadHeight?: number;
  dpadButtonSize?: number;
  sensitivity?: number;
}
