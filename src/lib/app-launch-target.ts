import { DEFAULT_APPS } from "../const";
import type { AppShortcut } from "../types";

const CATALOG_LINKS = new Map(
  DEFAULT_APPS.filter((app) => !!app.link).map((app) => [app.package, app.link as string])
);

// What to send as remote.turn_on's `activity` for a shortcut.
//
// androidtvremote2 sends a bare package id as "market://launch?id=<pkg>",
// i.e. it asks the Play Store app to launch it — and a Google Play Store
// change broke that for many apps (HA's androidtv_remote docs now say to
// use a deep link instead). So prefer, in order:
//   1. the shortcut's own `link`,
//   2. the built-in catalog's link for the same package — so shortcuts saved
//      (or hand-written in YAML) before `link` existed still get the fix,
//   3. the package id, as a last resort.
export function resolveLaunchTarget(app: AppShortcut): string {
  const link = app.link?.trim();
  if (link) return link;
  return CATALOG_LINKS.get(app.package) ?? app.package;
}
