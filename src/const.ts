import type { AppShortcut } from "./types";

export const CARD_TYPE = "orbit-remote-card";
// Permanent alias — keeps existing dashboards' `type: custom:shield-remote-card`
// YAML working indefinitely after the rebrand. Never remove.
export const LEGACY_CARD_TYPE = "shield-remote-card";
export const CARD_NAME = "Orbit Remote";
export const CARD_DESCRIPTION = "Trackpad, D-pad and app shortcuts for Android TV boxes.";

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

// Default app shortcut catalog (spec §5.5). Package ids match HA's own
// documented ones; `link` values come from HA's androidtv_remote docs and the
// community "App Links/Deep Linking" guide. Entries without a `link` (Hulu,
// Peacock, Kodi, Steam Link) have no known reliable deep link and launch by
// package id, which the Play Store change may block — see
// lib/app-launch-target.ts.
export const DEFAULT_APPS: AppShortcut[] = [
  { name: "YouTube", icon: "mdi:youtube", package: "com.google.android.youtube.tv", link: "https://www.youtube.com" },
  { name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja", link: "https://www.netflix.com/title" },
  { name: "Prime Video", icon: "mdi:amazon", package: "com.amazon.amazonvideo.livingroom", link: "https://app.primevideo.com" },
  { name: "Disney+", icon: "mdi:plus-circle", package: "com.disney.disneyplus", link: "https://www.disneyplus.com" },
  { name: "Hulu", icon: "mdi:hulu", package: "com.hulu.livingroomplus" },
  { name: "Max", icon: "mdi:apps", package: "com.wbd.stream", link: "https://play.hbomax.com" },
  { name: "Peacock", icon: "mdi:apps", package: "com.peacocktv.peacockandroid" },
  { name: "Paramount+", icon: "mdi:apps", package: "com.cbs.ott", link: "https://www.paramountplus.com/" },
  { name: "Apple TV", icon: "mdi:apple", package: "com.apple.atve.androidtv.appletv", link: "https://tv.apple.com" },
  { name: "Spotify", icon: "mdi:spotify", package: "com.spotify.tv.android", link: "spotify://" },
  { name: "Tubi", icon: "mdi:apps", package: "com.tubitv", link: "https://tubitv.com/" },
  { name: "Pluto TV", icon: "mdi:apps", package: "tv.pluto.android", link: "https://pluto.tv/en/live-tv" },
  { name: "Plex", icon: "mdi:plex", package: "com.plexapp.android", link: "plex://" },
  { name: "Kodi", icon: "mdi:kodi", package: "org.xbmc.kodi" },
  { name: "Twitch", icon: "mdi:twitch", package: "tv.twitch.android.app", link: "twitch://home" },
  { name: "Steam Link", icon: "mdi:steam", package: "com.valvesoftware.steamlink" },
];

// Bumped up from 6px: at 6px, small swipes fired D-pad repeats fast enough
// that on-screen list scrolling felt out of control.
export const DEFAULT_TRACKPAD_SENSITIVITY_PX = 10;
export const DEFAULT_MIN_SEND_INTERVAL_MS = 40;
export const DEFAULT_LONG_PRESS_HOLD_SECS = 0.5;

// Pixel pitch of one row in the card's button-layout grid (see
// lib/button-layout.ts) — columns are elastic (fr units, responsive to card
// width) but rows are this fixed height, so a resize/drag in edit mode has
// a stable, predictable cell size to snap to.
export const GRID_ROW_HEIGHT_PX = 44;
export const GRID_GAP_PX = 8;

// Grace period before showing the unavailable state, so the reported
// ~15s disconnect/reconnect blips (spec §3.4) don't flicker the UI.
export const UNAVAILABLE_GRACE_MS = 2000;

// Delay before an in-card customization dialog auto-saves an edit to the
// server, so a slider drag or a run of keystrokes coalesces into one write.
export const AUTOSAVE_DEBOUNCE_MS = 500;

// Relevant bits of media_player's SUPPORT_* feature bitmask (HA core const.py)
export const MEDIA_PLAYER_FEATURE = {
  VOLUME_SET: 4,
} as const;
