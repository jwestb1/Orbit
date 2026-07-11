import type { AppShortcut } from "./types";

export const CARD_TYPE = "shield-remote-card";
export const CARD_NAME = "Nvidia Shield Remote";
export const CARD_DESCRIPTION = "Trackpad, D-pad and app shortcuts for Android TV / Shield.";

// Subset of the protobuf RemoteKeyCode enum relevant to this card (spec §3.3)
export const KEYCODE = {
  DPAD_UP: "DPAD_UP",
  DPAD_DOWN: "DPAD_DOWN",
  DPAD_LEFT: "DPAD_LEFT",
  DPAD_RIGHT: "DPAD_RIGHT",
  DPAD_CENTER: "DPAD_CENTER",
  BACK: "BACK",
  HOME: "HOME",
  POWER: "POWER",
  VOLUME_UP: "VOLUME_UP",
  VOLUME_DOWN: "VOLUME_DOWN",
  VOLUME_MUTE: "VOLUME_MUTE",
  MUTE: "MUTE",
  MEDIA_PLAY_PAUSE: "MEDIA_PLAY_PAUSE",
  MEDIA_PLAY: "MEDIA_PLAY",
  MEDIA_PAUSE: "MEDIA_PAUSE",
  MEDIA_STOP: "MEDIA_STOP",
  MEDIA_NEXT: "MEDIA_NEXT",
  MEDIA_PREVIOUS: "MEDIA_PREVIOUS",
  MEDIA_REWIND: "MEDIA_REWIND",
  MEDIA_FAST_FORWARD: "MEDIA_FAST_FORWARD",
  MENU: "MENU",
  SETTINGS: "SETTINGS",
  SEARCH: "SEARCH",
  ASSIST: "ASSIST",
  INFO: "INFO",
  GUIDE: "GUIDE",
} as const;

export type KeyCode = (typeof KEYCODE)[keyof typeof KEYCODE];

// Default app shortcut catalog (spec §5.5), matching HA's own documented package IDs
export const DEFAULT_APPS: AppShortcut[] = [
  { name: "YouTube", icon: "mdi:youtube", package: "com.google.android.youtube.tv" },
  { name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja" },
  { name: "Prime Video", icon: "mdi:amazon", package: "com.amazon.amazonvideo.livingroom" },
  { name: "Disney+", icon: "mdi:plus-circle", package: "com.disney.disneyplus" },
  { name: "Plex", icon: "mdi:plex", package: "com.plexapp.android" },
  { name: "Kodi", icon: "mdi:kodi", package: "org.xbmc.kodi" },
  { name: "Twitch", icon: "mdi:twitch", package: "tv.twitch.android.app" },
  { name: "Steam Link", icon: "mdi:steam", package: "com.valvesoftware.steamlink" },
];

export const DEFAULT_TRACKPAD_SENSITIVITY_PX = 6;
export const DEFAULT_MIN_SEND_INTERVAL_MS = 40;
export const DEFAULT_LONG_PRESS_HOLD_SECS = 0.5;
