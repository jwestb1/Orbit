import { describe, expect, it, vi } from "vitest";
import { LongPressController } from "./long-press";

function pointerEvent(x: number, y: number): PointerEvent {
  return { clientX: x, clientY: y } as PointerEvent;
}

describe("LongPressController", () => {
  it("fires the long-press callback after the hold duration", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const controller = new LongPressController(onLongPress, 500);

    controller.onPointerDown(pointerEvent(0, 0));
    vi.advanceTimersByTime(500);

    expect(onLongPress).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("does not fire the long-press callback if released early", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const controller = new LongPressController(onLongPress, 500);

    controller.onPointerDown(pointerEvent(0, 0));
    vi.advanceTimersByTime(300);
    controller.onPointerUp();
    vi.advanceTimersByTime(300);

    expect(onLongPress).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("cancels the pending long-press when the pointer moves past the threshold", () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const controller = new LongPressController(onLongPress, 500);

    controller.onPointerDown(pointerEvent(0, 0));
    controller.onPointerMove(pointerEvent(20, 0));
    vi.advanceTimersByTime(500);

    expect(onLongPress).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("consumeClick reports true exactly once after a long press fires", () => {
    vi.useFakeTimers();
    const controller = new LongPressController(vi.fn(), 500);

    controller.onPointerDown(pointerEvent(0, 0));
    vi.advanceTimersByTime(500);

    expect(controller.consumeClick()).toBe(true);
    expect(controller.consumeClick()).toBe(false);
    vi.useRealTimers();
  });

  it("consumeClick reports false for a normal short click", () => {
    const controller = new LongPressController(vi.fn(), 500);
    expect(controller.consumeClick()).toBe(false);
  });
});
