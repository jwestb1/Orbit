import type { AppShortcut } from "../types";

// androidtv_remote's `current_activity` attribute is the foreground app's
// package name, sometimes with an "/ActivityClassName" suffix (e.g.
// "com.netflix.ninja/.MainActivity") — strip that before matching against
// configured app shortcuts by package id. Only populated when the
// integration's "Enable IME" option is on; undefined otherwise.
export function resolveActivityLabel(
  activity: string | undefined,
  apps: AppShortcut[]
): string | undefined {
  if (!activity) return undefined;
  const packageId = activity.split("/")[0];
  const match = apps.find((app) => app.package === packageId);
  return match?.name ?? packageId;
}
