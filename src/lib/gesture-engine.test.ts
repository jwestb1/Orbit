import { describe, expect, it, vi } from "vitest";
import { GestureEngine } from "./gesture-engine";
import { KEYCODE } from "../const";

describe("GestureEngine", () => {
  it("sends DPAD_RIGHT once the horizontal drag crosses the sensitivity threshold", () => {
    const sendKey = vi.fn();
    const engine = new GestureEngine(sendKey, 6, 0);

    engine.onPointerDown(0, 0);
    engine.onPointerMove(10, 0);

    expect(sendKey).toHaveBeenCalledWith(KEYCODE.DPAD_RIGHT);
  });

  it("picks the dominant axis instead of sending both directions", () => {
    const sendKey = vi.fn();
    const engine = new GestureEngine(sendKey, 6, 0);

    engine.onPointerDown(0, 0);
    engine.onPointerMove(2, 10);

    expect(sendKey).toHaveBeenCalledTimes(1);
    expect(sendKey).toHaveBeenCalledWith(KEYCODE.DPAD_DOWN);
  });

  it("does not send a command below the sensitivity threshold", () => {
    const sendKey = vi.fn();
    const engine = new GestureEngine(sendKey, 6, 0);

    engine.onPointerDown(0, 0);
    engine.onPointerMove(2, 0);

    expect(sendKey).not.toHaveBeenCalled();
  });

  it("sends DPAD_CENTER on tap", () => {
    const sendKey = vi.fn();
    const engine = new GestureEngine(sendKey);

    engine.onTap();

    expect(sendKey).toHaveBeenCalledWith(KEYCODE.DPAD_CENTER);
  });

  it("sends a long-press DPAD_CENTER with hold_secs on long press", () => {
    const sendKey = vi.fn();
    const engine = new GestureEngine(sendKey);

    engine.onLongPress();

    expect(sendKey).toHaveBeenCalledWith(KEYCODE.DPAD_CENTER, 0.5);
  });

  it("sends BACK on two-finger tap", () => {
    const sendKey = vi.fn();
    const engine = new GestureEngine(sendKey);

    engine.onTwoFingerTap();

    expect(sendKey).toHaveBeenCalledWith(KEYCODE.BACK);
  });
});
