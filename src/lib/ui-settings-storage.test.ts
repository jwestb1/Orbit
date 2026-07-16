import { afterEach, describe, expect, it, vi } from "vitest";
import { clearUiSettings, loadUiSettings, saveUiSettings } from "./ui-settings-storage";

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

describe("ui-settings-storage", () => {
  it("returns null when nothing is stored for a given entity", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    expect(loadUiSettings("remote.shield")).toBeNull();
  });

  it("round-trips a full settings override", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    const settings = { trackpadHeight: 220, dpadButtonSize: 52, sensitivity: 14 };
    saveUiSettings("remote.shield", settings);
    expect(loadUiSettings("remote.shield")).toEqual(settings);
  });

  it("returns null on malformed JSON", () => {
    const storage = fakeLocalStorage();
    storage.setItem("shield-remote-card.ui-settings.remote.shield", "{not json");
    vi.stubGlobal("localStorage", storage);
    expect(loadUiSettings("remote.shield")).toBeNull();
  });

  it("drops shape-invalid fields but keeps valid ones", () => {
    const storage = fakeLocalStorage();
    storage.setItem(
      "shield-remote-card.ui-settings.remote.shield",
      JSON.stringify({ trackpadHeight: 200, dpadButtonSize: "big", sensitivity: null })
    );
    vi.stubGlobal("localStorage", storage);
    expect(loadUiSettings("remote.shield")).toEqual({ trackpadHeight: 200 });
  });

  it("keeps distinct remote entities isolated under different keys", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    saveUiSettings("remote.shield_a", { trackpadHeight: 200 });
    saveUiSettings("remote.shield_b", { trackpadHeight: 300 });
    expect(loadUiSettings("remote.shield_a")).toEqual({ trackpadHeight: 200 });
    expect(loadUiSettings("remote.shield_b")).toEqual({ trackpadHeight: 300 });
  });

  it("removes a stored override on clearUiSettings", () => {
    vi.stubGlobal("localStorage", fakeLocalStorage());
    saveUiSettings("remote.shield", { sensitivity: 12 });
    clearUiSettings("remote.shield");
    expect(loadUiSettings("remote.shield")).toBeNull();
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

    expect(loadUiSettings("remote.shield")).toBeNull();
    expect(() => saveUiSettings("remote.shield", {})).not.toThrow();
    expect(() => clearUiSettings("remote.shield")).not.toThrow();
  });

  it("fails silently when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadUiSettings("remote.shield")).toBeNull();
    expect(() => saveUiSettings("remote.shield", {})).not.toThrow();
  });
});
