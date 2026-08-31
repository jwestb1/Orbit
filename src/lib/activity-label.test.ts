import { describe, expect, it } from "vitest";
import { resolveActivityLabel } from "./activity-label";
import type { AppShortcut } from "../types";

const apps: AppShortcut[] = [
  { name: "Netflix", icon: "mdi:netflix", package: "com.netflix.ninja" },
  { name: "YouTube", icon: "mdi:youtube", package: "com.google.android.youtube.tv" },
];

describe("resolveActivityLabel", () => {
  it("returns undefined when there is no activity (e.g. Enable IME is off)", () => {
    expect(resolveActivityLabel(undefined, apps)).toBeUndefined();
  });

  it("maps a bare package id to its configured app name", () => {
    expect(resolveActivityLabel("com.netflix.ninja", apps)).toBe("Netflix");
  });

  it("strips an /ActivityClassName suffix before matching", () => {
    expect(resolveActivityLabel("com.netflix.ninja/.MainActivity", apps)).toBe("Netflix");
  });

  it("falls back to the bare package id when no app shortcut matches", () => {
    expect(resolveActivityLabel("com.google.android.tv.launcher", apps)).toBe(
      "com.google.android.tv.launcher"
    );
  });
});
