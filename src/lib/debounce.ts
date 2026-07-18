// Trailing-edge debounce: coalesces rapid-fire calls (slider drags, keystrokes)
// into a single invocation after `delayMs` of silence. `flush()` runs a
// pending call immediately (e.g. right before the dialog closes, so the
// final value isn't dropped); `cancel()` discards it (e.g. superseded by Reset).
export function debounce(
  fn: () => void,
  delayMs: number
): (() => void) & { flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const invoke = (): void => {
    timer = undefined;
    fn();
  };

  const debounced = (() => {
    clearTimeout(timer);
    timer = setTimeout(invoke, delayMs);
  }) as (() => void) & { flush: () => void; cancel: () => void };

  debounced.flush = (): void => {
    if (timer === undefined) return;
    clearTimeout(timer);
    invoke();
  };

  debounced.cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
