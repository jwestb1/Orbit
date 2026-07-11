export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  minIntervalMs: number
): T {
  let lastCallTs = 0;
  return ((...args: Parameters<T>) => {
    const now = performance.now();
    if (now - lastCallTs < minIntervalMs) return;
    lastCallTs = now;
    fn(...args);
  }) as T;
}
