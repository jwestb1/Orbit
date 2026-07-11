const DEFAULT_LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;

// Detects hold-to-fire long presses on top of a normal @click-driven button,
// so keyboard activation (Enter/Space, which never sees pointer events)
// keeps working via the native click path. `consumeClick()` tells the click
// handler to skip the short-press action when a long press already fired.
export class LongPressController {
  private timer?: number;
  private fired = false;
  private downX = 0;
  private downY = 0;

  constructor(
    private onLongPress: () => void,
    private longPressMs: number = DEFAULT_LONG_PRESS_MS
  ) {}

  onPointerDown = (e: PointerEvent): void => {
    this.fired = false;
    this.downX = e.clientX;
    this.downY = e.clientY;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.fired = true;
      this.onLongPress();
    }, this.longPressMs);
  };

  onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.downX;
    const dy = e.clientY - this.downY;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      clearTimeout(this.timer);
    }
  };

  onPointerUp = (): void => {
    clearTimeout(this.timer);
  };

  consumeClick(): boolean {
    if (!this.fired) return false;
    this.fired = false;
    return true;
  }
}
