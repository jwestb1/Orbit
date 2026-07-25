// Grid-cell layout model for the card's "resize & reorder" edit mode.
// Positions/sizes are all in whole grid cells — resize is snap-to-grid, not
// free pixel dragging — so "no two items may overlap" reduces to a plain
// axis-aligned rectangle intersection test.

export type LayoutItemId =
  | "trackpad"
  | "dpad"
  | "back"
  | "home"
  | "power"
  | "volume_down"
  | "mute"
  | "volume_up"
  | "keyboard"
  | "apps"
  | "rewind"
  | "play_pause"
  | "fast_forward"
  | "volume_slider";

export interface LayoutItem {
  id: LayoutItemId;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Runtime-checkable form of LayoutItemId, for validating persisted/loaded
// data (e.g. in ui-settings-storage.ts's sanitize()) where the type system
// can't help.
export const LAYOUT_ITEM_IDS: readonly LayoutItemId[] = [
  "trackpad",
  "dpad",
  "back",
  "home",
  "power",
  "volume_down",
  "mute",
  "volume_up",
  "keyboard",
  "apps",
  "rewind",
  "play_pause",
  "fast_forward",
  "volume_slider",
];

export const GRID_COLUMNS = 6;
export const MIN_ITEM_SIZE = 1;

// Reproduces today's fixed template as starting grid coordinates: trackpad
// + D-pad side by side up top, then the button row, then media row, then
// the volume slider. The D-pad is one rect here — its 5 sub-buttons stay
// arranged by dpad-cluster.ts's own internal 3x3 grid, so it always moves
// and resizes as a single unit.
export const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "trackpad", x: 0, y: 0, w: 4, h: 3 },
  { id: "dpad", x: 4, y: 0, w: 2, h: 3 },
  { id: "back", x: 0, y: 3, w: 1, h: 1 },
  { id: "home", x: 1, y: 3, w: 1, h: 1 },
  { id: "power", x: 2, y: 3, w: 1, h: 1 },
  { id: "volume_down", x: 3, y: 3, w: 1, h: 1 },
  { id: "mute", x: 4, y: 3, w: 1, h: 1 },
  { id: "volume_up", x: 5, y: 3, w: 1, h: 1 },
  { id: "keyboard", x: 0, y: 4, w: 1, h: 1 },
  { id: "apps", x: 1, y: 4, w: 1, h: 1 },
  { id: "rewind", x: 1, y: 5, w: 1, h: 1 },
  { id: "play_pause", x: 2, y: 5, w: 1, h: 1 },
  { id: "fast_forward", x: 3, y: 5, w: 1, h: 1 },
  { id: "volume_slider", x: 0, y: 6, w: 6, h: 1 },
];

export function rectsOverlap(a: LayoutItem, b: LayoutItem): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function isWithinBounds(rect: { x: number; y: number; w: number; h: number }): boolean {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.w >= MIN_ITEM_SIZE &&
    rect.h >= MIN_ITEM_SIZE &&
    rect.x + rect.w <= GRID_COLUMNS
  );
}

// True if `candidate` fits on the grid and doesn't overlap any other item
// in `layout` (the item being moved/resized is excluded from the check).
export function isPlacementValid(
  layout: LayoutItem[],
  itemId: LayoutItemId,
  candidate: { x: number; y: number; w: number; h: number }
): boolean {
  if (!isWithinBounds(candidate)) return false;
  const candidateRect: LayoutItem = { id: itemId, ...candidate };
  return layout.every((item) => item.id === itemId || !rectsOverlap(item, candidateRect));
}

// Returns a new layout with `itemId` moved to (x, y), or null if that
// placement is invalid (out of bounds or overlapping another item) — the
// caller should simply keep the item at its last valid position on null.
export function moveItem(
  layout: LayoutItem[],
  itemId: LayoutItemId,
  x: number,
  y: number
): LayoutItem[] | null {
  const item = layout.find((i) => i.id === itemId);
  if (!item) return null;
  const candidate = { x, y, w: item.w, h: item.h };
  if (!isPlacementValid(layout, itemId, candidate)) return null;
  return layout.map((i) => (i.id === itemId ? { ...i, x, y } : i));
}

// Returns a new layout with `itemId` resized to (w, h), or null if that
// size is invalid (below the minimum, out of bounds, or overlapping
// another item at the item's current position).
export function resizeItem(
  layout: LayoutItem[],
  itemId: LayoutItemId,
  w: number,
  h: number
): LayoutItem[] | null {
  const item = layout.find((i) => i.id === itemId);
  if (!item) return null;
  const candidate = { x: item.x, y: item.y, w, h };
  if (!isPlacementValid(layout, itemId, candidate)) return null;
  return layout.map((i) => (i.id === itemId ? { ...i, w, h } : i));
}
