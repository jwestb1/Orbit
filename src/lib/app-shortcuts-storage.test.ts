import { afterEach, describe, expect, it, vi } from "vitest";
import { clearOverride, loadOverride, saveOverride } from "./app-shortcuts-storage";
import type { AppShortcut } from "../types";

function fakeLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("app-shortcuts-storage", () => {
  it("returns null when nothing is stored for a given entity", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    expect(loadOverride("remote.shield")).toBeNull();
  });

  it("round-trips both package- and source-based shortcuts", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const apps: AppShortcut[] = [
      { name: "Netflix", icon: "mdi:netflix", source: "Netflix" },
      { name: "Kodi", icon: "mdi:kodi", package: "org.xbmc.kodi" },
    ];
    saveOverride("remote.shield", apps);
    expect(loadOverride("remote.shield")).toEqual(apps);
  });

  it("returns null on malformed JSON", () => {
    const storage = fakeLocalStorage();
    storage.setItem("shield-remote-card.apps.remote.shield", "{not json");
    vi.stubGlobal("localStorage", storage);
    expect(loadOverride("remote.shield")).toBeNull();
  });

  it("filters out shape-invalid entries from an otherwise-valid array", () => {
    const storage = fakeLocalStorage();
    storage.setItem(
      "shield-remote-card.apps.remote.shield",
      JSON.stringify([
        { name: "Netflix", icon: "mdi:netflix", source: "Netflix" },
        { name: "Missing launch mode", icon: "mdi:apps" },
        { icon: "mdi:apps", package: "com.example" },
        "not an object",
      ])
    );
    vi.stubGlobal("localStorage", storage);
    expect(loadOverride("remote.shield")).toEqual([
      { name: "Netflix", icon: "mdi:netflix", source: "Netflix" },
    ]);
  });

  it("keeps distinct remote entities isolated under different keys", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    saveOverride("remote.shield_a", [{ name: "A", icon: "mdi:apps", package: "com.a" }]);
    saveOverride("remote.shield_b", [{ name: "B", icon: "mdi:apps", package: "com.b" }]);
    expect(loadOverride("remote.shield_a")).toEqual([{ name: "A", icon: "mdi:apps", package: "com.a" }]);
    expect(loadOverride("remote.shield_b")).toEqual([{ name: "B", icon: "mdi:apps", package: "com.b" }]);
  });

  it("removes a stored override on clearOverride", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    saveOverride("remote.shield", [{ name: "A", icon: "mdi:apps", package: "com.a" }]);
    clearOverride("remote.shield");
    expect(loadOverride("remote.shield")).toBeNull();
  });

  it("fails silently when localStorage access throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {
        throw new Error("storage disabled");
      },
      removeItem: () => {
        throw new Error("storage disabled");
      },
    } as unknown as Storage;
    vi.stubGlobal("localStorage", throwing);

    expect(loadOverride("remote.shield")).toBeNull();
    expect(() => saveOverride("remote.shield", [])).not.toThrow();
    expect(() => clearOverride("remote.shield")).not.toThrow();
  });

  it("fails silently when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadOverride("remote.shield")).toBeNull();
    expect(() => saveOverride("remote.shield", [])).not.toThrow();
  });
});
