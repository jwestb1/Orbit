import { forwardHaptic } from "custom-card-helpers";
import type { HapticType } from "custom-card-helpers";

// `haptics` defaults to on (spec §5.2 config schema default) — only an
// explicit `false` opts out.
export function triggerHaptic(haptics: boolean | undefined, type: HapticType = "light"): void {
  if (haptics === false) return;
  forwardHaptic(type);
}
