// Pointer-drag controller for the card's edit-mode grid. Reports how many
// whole grid cells the pointer has moved from its down position, so the
// caller can compute a candidate placement (button-layout.ts's moveItem)
// and either commit it or ignore it if invalid — same controller instance
// is used for both dragging an item (dx/dy applied to x/y) and resizing one
// (dx/dy applied to w/h) since it only ever reports a raw cell delta.
//
// Modeled on long-press.ts's shape: a small class taking injected
// callbacks, wired to pointerdown/move/up in the template.
export class DragReorderController {
  private active = false;
  private startX = 0;
  private startY = 0;
  private lastDx = 0;
  private lastDy = 0;

  constructor(
    private onDelta: (dx: number, dy: number) => void,
    private getCellSize: () => { width: number; height: number }
  ) {}

  onPointerDown = (e: PointerEvent): void => {
    this.active = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.lastDx = 0;
    this.lastDy = 0;
  };

  // Reports the delta relative to the pointerdown position, not
  // incrementally from the previous move — so a rejected candidate (the
  // caller ignored an overlapping onDelta) doesn't compound drift; the very
  // next move is still measured from the original down point.
  onPointerMove = (e: PointerEvent): void => {
    if (!this.active) return;
    const { width, height } = this.getCellSize();
    if (width <= 0 || height <= 0) return;
    const dx = Math.round((e.clientX - this.startX) / width);
    const dy = Math.round((e.clientY - this.startY) / height);
    if (dx === this.lastDx && dy === this.lastDy) return;
    this.lastDx = dx;
    this.lastDy = dy;
    this.onDelta(dx, dy);
  };

  onPointerUp = (): void => {
    this.active = false;
  };
}
