import type { AppShortcut, BoxConfig, OrbitRemoteCardConfig } from "../types";

export interface ResolvedBox {
  id: string;
  name: string;
  remote_entity: string;
  media_player_entity?: string;
  apps?: AppShortcut[];
}

function toResolvedBox(box: BoxConfig): ResolvedBox {
  return {
    id: box.id ?? box.remote_entity,
    name: box.name ?? box.remote_entity,
    remote_entity: box.remote_entity,
    media_player_entity: box.media_player_entity,
    apps: box.apps,
  };
}

// Normalizes both card-config shapes (single box vs. switcher `boxes[]`)
// into one list, so the rest of the card only ever deals with "a list of
// boxes" plus "which one is active" — never the two config shapes directly.
export function resolveBoxes(config: OrbitRemoteCardConfig): ResolvedBox[] {
  if (config.boxes && config.boxes.length > 0) {
    return config.boxes.map(toResolvedBox);
  }
  if (!config.remote_entity) return [];
  return [
    {
      id: config.remote_entity,
      name: config.remote_entity,
      remote_entity: config.remote_entity,
      media_player_entity: config.media_player_entity,
      apps: config.apps,
    },
  ];
}

// Prefers `preferredId` (e.g. the current tab selection) if it still exists
// in `boxes` — so switching config out from under an open card doesn't jump
// the active tab unless the selected box was actually removed — then
// `config.default_box`, then the first box.
export function resolveActiveBox(
  boxes: ResolvedBox[],
  config: OrbitRemoteCardConfig,
  preferredId?: string
): ResolvedBox | undefined {
  if (preferredId) {
    const preferred = boxes.find((b) => b.id === preferredId);
    if (preferred) return preferred;
  }
  if (config.default_box) {
    const byDefault = boxes.find((b) => b.id === config.default_box);
    if (byDefault) return byDefault;
  }
  return boxes[0];
}
