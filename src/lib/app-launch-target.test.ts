import { describe, expect, it } from "vitest";
import { resolveLaunchTarget } from "./app-launch-target";
import { DEFAULT_APPS } from "../const";

describe("resolveLaunchTarget", () => {
  it("prefers the shortcut's own deep link", () => {
    expect(
      resolveLaunchTarget({
        name: "Netflix",
        icon: "mdi:netflix",
        package: "com.netflix.ninja",
        link: "netflix://",
      })
    ).toBe("netflix://");
  });

  it("falls back to the catalog link for a known package saved without one", () => {
    expect(
      resolveLaunchTarget({ name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja" })
    ).toBe("https://www.netflix.com/title");
  });

  it("uses the package id when neither the shortcut nor the catalog has a link", () => {
    expect(
      resolveLaunchTarget({ name: "Custom", icon: "mdi:apps", package: "com.example.tv" })
    ).toBe("com.example.tv");
  });

  it("treats a blank link as absent", () => {
    expect(
      resolveLaunchTarget({ name: "Plex", icon: "mdi:plex", package: "com.plexapp.android", link: "  " })
    ).toBe("plex://");
  });

  it("gives every catalog entry with a link a URL-shaped target", () => {
    for (const app of DEFAULT_APPS.filter((a) => a.link)) {
      expect(resolveLaunchTarget(app)).toMatch(/^[a-z.]+:\/\//);
    }
  });
});
