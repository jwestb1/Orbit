import { describe, expect, it } from "vitest";
import {
  DEFAULT_LAYOUT,
  GRID_COLUMNS,
  LAYOUT_ITEM_IDS,
  isPlacementValid,
  moveItem,
  resizeItem,
  rectsOverlap,
  type LayoutItem,
} from "./button-layout";

describe("rectsOverlap", () => {
  it("detects overlapping rects", () => {
    const a: LayoutItem = { id: "back", x: 0, y: 0, w: 2, h: 2 };
    const b: LayoutItem = { id: "home", x: 1, y: 1, w: 2, h: 2 };
    expect(rectsOverlap(a, b)).toBe(true);
  });

  it("treats edge-touching rects as not overlapping", () => {
    const a: LayoutItem = { id: "back", x: 0, y: 0, w: 2, h: 2 };
    const b: LayoutItem = { id: "home", x: 2, y: 0, w: 2, h: 2 };
    expect(rectsOverlap(a, b)).toBe(false);
  });

  it("detects disjoint rects as not overlapping", () => {
    const a: LayoutItem = { id: "back", x: 0, y: 0, w: 1, h: 1 };
    const b: LayoutItem = { id: "home", x: 5, y: 5, w: 1, h: 1 };
    expect(rectsOverlap(a, b)).toBe(false);
  });
});

describe("isPlacementValid", () => {
  const layout: LayoutItem[] = [
    { id: "back", x: 0, y: 0, w: 1, h: 1 },
    { id: "home", x: 1, y: 0, w: 1, h: 1 },
  ];

  it("accepts a candidate that fits on the grid without overlapping others", () => {
    expect(isPlacementValid(layout, "back", { x: 2, y: 0, w: 1, h: 1 })).toBe(true);
  });

  it("rejects a candidate that overlaps another item", () => {
    expect(isPlacementValid(layout, "back", { x: 1, y: 0, w: 1, h: 1 })).toBe(false);
  });

  it("does not count the item's own current rect as an overlap", () => {
    expect(isPlacementValid(layout, "back", { x: 0, y: 0, w: 1, h: 1 })).toBe(true);
  });

  it("rejects negative coordinates", () => {
    expect(isPlacementValid(layout, "back", { x: -1, y: 0, w: 1, h: 1 })).toBe(false);
  });

  it("rejects a candidate that runs past the right edge of the grid", () => {
    expect(isPlacementValid(layout, "back", { x: GRID_COLUMNS - 1, y: 0, w: 2, h: 1 })).toBe(
      false
    );
  });

  it("rejects a size below the minimum", () => {
    expect(isPlacementValid(layout, "back", { x: 0, y: 0, w: 0, h: 1 })).toBe(false);
  });
});

describe("moveItem", () => {
  const layout: LayoutItem[] = [
    { id: "back", x: 0, y: 0, w: 1, h: 1 },
    { id: "home", x: 1, y: 0, w: 1, h: 1 },
  ];

  it("moves the item to a free position", () => {
    const result = moveItem(layout, "back", 3, 3);
    expect(result?.find((i) => i.id === "back")).toEqual({ id: "back", x: 3, y: 3, w: 1, h: 1 });
    // untouched items are unaffected
    expect(result?.find((i) => i.id === "home")).toEqual(layout[1]);
  });

  it("returns null when the target position is occupied by another item", () => {
    expect(moveItem(layout, "back", 1, 0)).toBeNull();
  });

  it("returns null when the target position is out of bounds", () => {
    expect(moveItem(layout, "back", -1, 0)).toBeNull();
  });

  it("returns null for an unknown item id", () => {
    // @ts-expect-error deliberately invalid id for the null-safety check
    expect(moveItem(layout, "does_not_exist", 0, 0)).toBeNull();
  });
});

describe("resizeItem", () => {
  const layout: LayoutItem[] = [
    { id: "back", x: 0, y: 0, w: 1, h: 1 },
    { id: "home", x: 1, y: 0, w: 1, h: 1 },
  ];

  it("grows the item into free space", () => {
    const result = resizeItem(layout, "home", 2, 2);
    expect(result?.find((i) => i.id === "home")).toEqual({ id: "home", x: 1, y: 0, w: 2, h: 2 });
  });

  it("returns null when growing would overlap another item", () => {
    // growing "back" to width 2 at x=0 would collide with "home" at x=1
    expect(resizeItem(layout, "back", 2, 1)).toBeNull();
  });

  it("returns null when shrinking below the minimum size", () => {
    expect(resizeItem(layout, "back", 0, 1)).toBeNull();
  });

  it("returns null when growing past the grid edge", () => {
    expect(resizeItem(layout, "home", GRID_COLUMNS, 1)).toBeNull();
  });
});

describe("DEFAULT_LAYOUT", () => {
  it("contains every layout item exactly once with no overlaps", () => {
    const ids = new Set(DEFAULT_LAYOUT.map((i) => i.id));
    expect(ids.size).toBe(DEFAULT_LAYOUT.length);

    for (let i = 0; i < DEFAULT_LAYOUT.length; i++) {
      for (let j = i + 1; j < DEFAULT_LAYOUT.length; j++) {
        expect(rectsOverlap(DEFAULT_LAYOUT[i], DEFAULT_LAYOUT[j])).toBe(false);
      }
    }
  });

  it("keeps every item within the grid bounds", () => {
    for (const item of DEFAULT_LAYOUT) {
      expect(isPlacementValid(DEFAULT_LAYOUT, item.id, item)).toBe(true);
    }
  });

  it("covers every id in LAYOUT_ITEM_IDS exactly once", () => {
    expect(new Set(DEFAULT_LAYOUT.map((i) => i.id))).toEqual(new Set(LAYOUT_ITEM_IDS));
    expect(DEFAULT_LAYOUT.length).toBe(LAYOUT_ITEM_IDS.length);
  });
});
