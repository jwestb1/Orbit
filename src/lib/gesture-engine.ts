import {
  DEFAULT_LONG_PRESS_HOLD_SECS,
  DEFAULT_MIN_SEND_INTERVAL_MS,
  DEFAULT_TRACKPAD_SENSITIVITY_PX,
  KEYCODE,
} from "../const";

// Converts drag deltas into discrete D-pad key sends, since the Android TV
// Remote Protocol has no raw pointer/mouse message (spec §3.2/§5.3).
export class GestureEngine {
  private originX = 0;
  private originY = 0;
  private accumX = 0;
  private accumY = 0;
  private lastSendTs = 0;

  constructor(
    private sendKey: (code: string, holdSecs?: number) => void,
    private sensitivityPx: number = DEFAULT_TRACKPAD_SENSITIVITY_PX,
    private minIntervalMs: number = DEFAULT_MIN_SEND_INTERVAL_MS
  ) {}

  onPointerDown(x: number, y: number): void {
    this.originX = x;
    this.originY = y;
    this.accumX = 0;
    this.accumY = 0;
  }

  onPointerMove(x: number, y: number): void {
    const dx = x - this.originX;
    const dy = y - this.originY;
    this.originX = x;
    this.originY = y;
    this.accumX += dx;
    this.accumY += dy;

    const now = performance.now();
    if (now - this.lastSendTs < this.minIntervalMs) return;

    // Dominant-axis wins per tick, avoids diagonal key spam
    if (Math.abs(this.accumX) > Math.abs(this.accumY)) {
      if (Math.abs(this.accumX) >= this.sensitivityPx) {
        this.sendKey(this.accumX > 0 ? KEYCODE.DPAD_RIGHT : KEYCODE.DPAD_LEFT);
        this.accumX = 0;
        this.lastSendTs = now;
      }
    } else if (Math.abs(this.accumY) >= this.sensitivityPx) {
      this.sendKey(this.accumY > 0 ? KEYCODE.DPAD_DOWN : KEYCODE.DPAD_UP);
      this.accumY = 0;
      this.lastSendTs = now;
    }
  }

  onTap(): void {
    this.sendKey(KEYCODE.DPAD_CENTER);
  }

  onLongPress(): void {
    this.sendKey(KEYCODE.DPAD_CENTER, DEFAULT_LONG_PRESS_HOLD_SECS);
  }

  onTwoFingerTap(): void {
    this.sendKey(KEYCODE.BACK);
  }
}
