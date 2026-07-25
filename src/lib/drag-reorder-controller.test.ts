import { describe, expect, it, vi } from "vitest";
import { DragReorderController } from "./drag-reorder-controller";

function pointerEvent(x: number, y: number): PointerEvent {
  return { clientX: x, clientY: y } as PointerEvent;
}

const CELL = { width: 50, height: 40 };

describe("DragReorderController", () => {
  it("does not report a delta before the threshold of half a cell", () => {
    const onDelta = vi.fn();
    const controller = new DragReorderController(onDelta, () => CELL);

    controller.onPointerDown(pointerEvent(0, 0));
    controller.onPointerMove(pointerEvent(10, 5));

    expect(onDelta).not.toHaveBeenCalled();
  });

  it("reports a whole-cell delta once the pointer crosses a cell boundary", () => {
    const onDelta = vi.fn();
    const controller = new DragReorderController(onDelta, () => CELL);

    controller.onPointerDown(pointerEvent(100, 100));
    controller.onPointerMove(pointerEvent(155, 100)); // +55px / 50px wide -> +1 cell

    expect(onDelta).toHaveBeenCalledWith(1, 0);
  });

  it("reports negative deltas", () => {
    const onDelta = vi.fn();
    const controller = new DragReorderController(onDelta, () => CELL);

    controller.onPointerDown(pointerEvent(100, 100));
    controller.onPointerMove(pointerEvent(40, 55)); // -60px x, -45px y

    expect(onDelta).toHaveBeenCalledWith(-1, -1);
  });

  it("does not call onDelta again for the same cell delta", () => {
    const onDelta = vi.fn();
    const controller = new DragReorderController(onDelta, () => CELL);

    controller.onPointerDown(pointerEvent(0, 0));
    controller.onPointerMove(pointerEvent(60, 0));
    controller.onPointerMove(pointerEvent(65, 0)); // still within the same cell

    expect(onDelta).toHaveBeenCalledTimes(1);
  });

  it("measures each move from the original down position, not the previous move", () => {
    const onDelta = vi.fn();
    const controller = new DragReorderController(onDelta, () => CELL);

    controller.onPointerDown(pointerEvent(0, 0));
    controller.onPointerMove(pointerEvent(55, 0)); // +1 cell
    controller.onPointerMove(pointerEvent(0, 0)); // back to origin -> 0 cells

    expect(onDelta).toHaveBeenNthCalledWith(1, 1, 0);
    expect(onDelta).toHaveBeenNthCalledWith(2, 0, 0);
  });

  it("ignores moves once the pointer is released", () => {
    const onDelta = vi.fn();
    const controller = new DragReorderController(onDelta, () => CELL);

    controller.onPointerDown(pointerEvent(0, 0));
    controller.onPointerUp();
    controller.onPointerMove(pointerEvent(100, 100));

    expect(onDelta).not.toHaveBeenCalled();
  });

  it("ignores moves before any pointerdown", () => {
    const onDelta = vi.fn();
    const controller = new DragReorderController(onDelta, () => CELL);

    controller.onPointerMove(pointerEvent(100, 100));

    expect(onDelta).not.toHaveBeenCalled();
  });
});
